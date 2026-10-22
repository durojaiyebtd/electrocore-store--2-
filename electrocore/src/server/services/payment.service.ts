/**
 * Paystack payment flow
 *
 *   1. initializeCheckout()   cart -> PENDING order -> Paystack transaction -> authorization URL
 *   2. Shopper pays on Paystack, is redirected to /checkout/success?reference=...
 *   3. verifyPayment()        called by the success page; asks Paystack for the real status
 *   4. handleWebhook()        Paystack's server-to-server notification (charge.success)
 *
 * Steps 3 and 4 can arrive in any order or both at once; finalizeSuccessfulPayment()
 * is idempotent, so the order is marked PAID and stock deducted exactly once.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { getSession } from '@/lib/auth';
import { generatePaymentReference } from '@/lib/ids';
import { BASE_CURRENCY, convertMinor, getStoreCurrency } from '@/lib/currency';
import { site } from '@/lib/site';
import {
  initializeTransaction,
  isPaystackMockMode,
  isValidWebhookSignature,
  verifyTransaction,
  type PaystackTransactionData,
} from '@/lib/paystack';
import type { CheckoutInput } from '@/lib/validators';
import type { CheckoutInitDTO, VerifyResultDTO } from '@/types';
import { clearCartById, resolveCart } from './cart.service';
import { deductStockForOrder } from './inventory.service';
import { createPendingOrder, orderInclude, toOrderDTO } from './order.service';

export async function initializeCheckout(input: CheckoutInput): Promise<CheckoutInitDTO> {
  const cart = await resolveCart({ create: false });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty.', 'CART_EMPTY');
  }
  const session = await getSession();
  const order = await createPendingOrder(cart, input, session?.userId ?? null);

  const chargeCurrency = getStoreCurrency();
  const chargeAmount = convertMinor(order.total, BASE_CURRENCY, chargeCurrency);
  const reference = generatePaymentReference(order.orderNumber);
  const callbackUrl = `${site.url}/checkout/success`;
  const mock = isPaystackMockMode();

  const transaction = await prisma.paystackTransaction.create({
    data: {
      orderId: order.id,
      reference,
      amount: chargeAmount,
      currency: chargeCurrency,
      status: 'INITIALIZED',
      customerEmail: order.email,
      isMock: mock,
    },
  });

  if (mock) {
    const authorizationUrl = `${callbackUrl}?reference=${encodeURIComponent(reference)}&mock=1`;
    await prisma.paystackTransaction.update({
      where: { id: transaction.id },
      data: { authorizationUrl, rawInitialize: { mock: true } },
    });
    return { orderNumber: order.orderNumber, reference, authorizationUrl, accessCode: null, mock: true };
  }

  try {
    const result = await initializeTransaction({
      email: order.email,
      amount: chargeAmount,
      currency: chargeCurrency,
      reference,
      callbackUrl,
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
        cancel_action: `${site.url}/checkout`,
        custom_fields: [
          { display_name: 'Order Number', variable_name: 'order_number', value: order.orderNumber },
          { display_name: 'Customer', variable_name: 'customer', value: `${input.firstName} ${input.lastName}` },
          { display_name: 'Phone', variable_name: 'phone', value: input.phone },
        ],
      },
    });
    await prisma.paystackTransaction.update({
      where: { id: transaction.id },
      data: {
        accessCode: result.access_code,
        authorizationUrl: result.authorization_url,
        rawInitialize: result as unknown as Prisma.InputJsonValue,
      },
    });
    return {
      orderNumber: order.orderNumber,
      reference,
      authorizationUrl: result.authorization_url,
      accessCode: result.access_code,
      mock: false,
    };
  } catch (error) {
    await prisma.paystackTransaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED', gatewayResponse: error instanceof Error ? error.message : 'Initialization failed' },
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    throw error;
  }
}

/**
 * Marks the order PAID and deducts stock — exactly once, no matter how many
 * times it is called (webhook + success page + retries).
 */
async function finalizeSuccessfulPayment(reference: string, data: PaystackTransactionData): Promise<void> {
  const transaction = await prisma.paystackTransaction.findUnique({
    where: { reference },
    include: { order: { include: { items: true } } },
  });
  if (!transaction) {
    throw new ApiError(404, 'Payment reference not found.', 'REFERENCE_NOT_FOUND');
  }

  // Never trust a payment that does not match what we asked for.
  if (data.amount !== transaction.amount || data.currency.toUpperCase() !== transaction.currency) {
    await prisma.paystackTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        gatewayResponse: `Amount/currency mismatch: expected ${transaction.amount} ${transaction.currency}, got ${data.amount} ${data.currency}`,
        rawVerify: data as unknown as Prisma.InputJsonValue,
      },
    });
    await prisma.order.update({
      where: { id: transaction.orderId },
      data: { needsReview: true, reviewReason: 'Paystack amount/currency did not match the order total.' },
    });
    throw new ApiError(400, 'Payment amount did not match your order. Our team has been notified.', 'AMOUNT_MISMATCH');
  }

  const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();

  await prisma.paystackTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'SUCCESS',
      channel: data.channel,
      gatewayResponse: data.gateway_response,
      paidAt,
      rawVerify: data as unknown as Prisma.InputJsonValue,
    },
  });

  // Atomic claim: only the first caller flips PENDING/FAILED -> PAID.
  const claimed = await prisma.order.updateMany({
    where: { id: transaction.orderId, status: { in: ['PENDING', 'FAILED'] } },
    data: { status: 'PAID', paidAt },
  });
  if (claimed.count === 0) {
    return; // already finalised by another request
  }

  await prisma.order.update({
    where: { id: transaction.orderId },
    data: {
      events: {
        push: {
          status: 'PAID',
          note: `Paid via ${data.channel ?? 'Paystack'} (ref ${reference})`,
          actor: transaction.isMock ? 'mock-payment' : 'paystack',
          at: paidAt,
        },
      },
    },
  });

  const order = transaction.order;
  const result = await deductStockForOrder(
    order.orderNumber,
    order.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      label: `${item.productName} (${item.variantName})`,
    })),
  );

  if (result.oversold.length > 0) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        needsReview: true,
        reviewReason: `Insufficient stock at payment time: ${result.oversold
          .map((o) => `${o.label} — requested ${o.requested}, deducted ${o.deducted}`)
          .join('; ')}`,
      },
    });
  }

  if (order.cartId) {
    await clearCartById(order.cartId);
  }
}

function mockPaymentData(transaction: { reference: string; amount: number; currency: string }): PaystackTransactionData {
  return {
    id: 0,
    status: 'success',
    reference: transaction.reference,
    amount: transaction.amount,
    currency: transaction.currency,
    channel: 'mock',
    gateway_response: 'Approved (local mock mode)',
    paid_at: new Date().toISOString(),
  };
}

export async function verifyPayment(reference: string): Promise<VerifyResultDTO> {
  const transaction = await prisma.paystackTransaction.findUnique({ where: { reference } });
  if (!transaction) {
    throw new ApiError(404, 'We could not find that payment. Please contact support with your reference.', 'REFERENCE_NOT_FOUND');
  }

  const loadOrder = async () => {
    const order = await prisma.order.findUnique({ where: { id: transaction.orderId }, include: orderInclude });
    return order ? toOrderDTO(order) : null;
  };

  if (transaction.status === 'SUCCESS') {
    return { status: 'success', message: 'Payment confirmed.', order: await loadOrder() };
  }

  let data: PaystackTransactionData;
  if (transaction.isMock) {
    if (!isPaystackMockMode()) {
      throw new ApiError(400, 'Mock payments are disabled.', 'MOCK_DISABLED');
    }
    data = mockPaymentData(transaction);
  } else {
    data = await verifyTransaction(reference);
  }

  if (data.status === 'success') {
    await finalizeSuccessfulPayment(reference, data);
    return { status: 'success', message: 'Payment confirmed. Thank you for your order!', order: await loadOrder() };
  }

  if (data.status === 'failed' || data.status === 'abandoned' || data.status === 'reversed') {
    const status = data.status === 'abandoned' ? 'ABANDONED' : data.status === 'reversed' ? 'REVERSED' : 'FAILED';
    await prisma.paystackTransaction.update({
      where: { id: transaction.id },
      data: { status, gatewayResponse: data.gateway_response, rawVerify: data as unknown as Prisma.InputJsonValue },
    });
    if (data.status === 'failed') {
      const failed = await prisma.order.updateMany({ where: { id: transaction.orderId, status: 'PENDING' }, data: { status: 'FAILED' } });
      if (failed.count > 0) {
        await prisma.order.update({
          where: { id: transaction.orderId },
          data: { events: { push: { status: 'FAILED', note: data.gateway_response ?? 'Payment failed', actor: 'paystack', at: new Date() } } },
        });
      }
    }
    return {
      status: 'failed',
      message:
        data.status === 'abandoned'
          ? 'The payment was not completed. Your cart is saved — you can try again.'
          : `Payment was not successful${data.gateway_response ? `: ${data.gateway_response}` : ''}. Your cart is saved — please try again.`,
      order: await loadOrder(),
    };
  }

  return {
    status: 'pending',
    message: 'Your payment is still processing. This page will update automatically.',
    order: await loadOrder(),
  };
}

interface PaystackWebhookBody {
  event: string;
  data?: { reference?: string };
}

export async function handleWebhook(rawBody: string, signature: string | null): Promise<void> {
  const signatureValid = isValidWebhookSignature(rawBody, signature);

  let body: PaystackWebhookBody;
  try {
    body = JSON.parse(rawBody) as PaystackWebhookBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON payload.', 'INVALID_JSON');
  }

  const event = await prisma.webhookEvent.create({
    data: {
      provider: 'paystack',
      event: body.event ?? 'unknown',
      reference: body.data?.reference ?? null,
      signatureValid,
      payload: body as unknown as Prisma.InputJsonValue,
    },
  });

  if (!signatureValid) {
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { error: 'Invalid signature' } });
    throw new ApiError(401, 'Invalid signature.', 'INVALID_SIGNATURE');
  }

  try {
    if (body.event === 'charge.success' && body.data?.reference) {
      const reference = body.data.reference;
      const known = await prisma.paystackTransaction.findUnique({ where: { reference }, select: { id: true } });
      if (known) {
        // Defence in depth: confirm with Paystack's API instead of trusting the payload.
        const verified = await verifyTransaction(reference);
        if (verified.status === 'success') {
          await finalizeSuccessfulPayment(reference, verified);
        }
      }
    }
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { error: error instanceof Error ? error.message : 'Processing failed' },
    });
    throw error;
  }
}
