/**
 * Paying an agreed repair price. Three ways, all optional except the office:
 *   PAYSTACK       online card/transfer through Paystack (needs PAYSTACK_SECRET_KEY)
 *   BANK_TRANSFER  shows the business bank account (needs REPAIR_BANK_NAME, _ACCOUNT_NAME, _ACCOUNT_NUMBER)
 *   OFFICE         pay at the workshop/office
 * Bank and office payments are recorded by an administrator once the money is received.
 */
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { randomCode } from '@/lib/ids';
import { BASE_CURRENCY, convertMinor, formatMoney, getStoreCurrency } from '@/lib/currency';
import { formattedAddress, site } from '@/lib/site';
import { initializeTransaction, isPaystackMockMode, paystackMode, verifyTransaction, type PaystackTransactionData } from '@/lib/paystack';
import { notifyCustomer, notifyStaff } from '@/lib/repair-notify';
import type { RepairPaymentOptionsDTO } from '@/types/repair';
import { addEvent, requireByCode } from './repair.service';

export function paymentOptions(): RepairPaymentOptionsDTO {
  const bankName = process.env.REPAIR_BANK_NAME?.trim();
  const accountName = process.env.REPAIR_BANK_ACCOUNT_NAME?.trim();
  const accountNumber = process.env.REPAIR_BANK_ACCOUNT_NUMBER?.trim();
  return {
    paystack: paystackMode() !== 'missing',
    bank: bankName && accountName && accountNumber ? { bankName, accountName, accountNumber } : null,
    office: { address: formattedAddress() || null, hours: site.businessHours },
  };
}

function outstanding(request: { agreedAmount: number | null; paidAmount: number }): number {
  if (request.agreedAmount == null) throw new ApiError(409, 'Agree a price before paying.', 'NO_PRICE');
  const due = request.agreedAmount - request.paidAmount;
  if (due <= 0) throw new ApiError(409, 'This repair is already fully paid.', 'ALREADY_PAID');
  return due;
}

export async function chooseMethod(code: string, method: 'PAYSTACK' | 'BANK_TRANSFER' | 'OFFICE'): Promise<{ authorizationUrl: string | null; reference: string | null }> {
  const request = await requireByCode(code);
  if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(request.status)) throw new ApiError(409, 'This request is closed.', 'REPAIR_CLOSED');
  const due = outstanding(request);
  const options = paymentOptions();

  if (method === 'BANK_TRANSFER') {
    if (!options.bank) throw new ApiError(503, 'Bank transfer is not set up yet. Choose another payment method or contact us.', 'BANK_NOT_CONFIGURED');
  }
  if (method === 'PAYSTACK') {
    if (!options.paystack) throw new ApiError(503, 'Online payment is not set up yet. Choose another payment method or contact us.', 'PAYSTACK_NOT_CONFIGURED');
    const chargeCurrency = getStoreCurrency();
    const chargeAmount = convertMinor(due, BASE_CURRENCY, chargeCurrency);
    const reference = `RP-${randomCode(10)}`;
    const callbackUrl = `${site.url}/repairs/pay/callback`;
    const payment = await prisma.repairPayment.create({ data: { requestId: request.id, reference, amount: due } });
    if (isPaystackMockMode()) {
      const url = `${callbackUrl}?reference=${encodeURIComponent(reference)}&mock=1`;
      await prisma.repairPayment.update({ where: { id: payment.id }, data: { authorizationUrl: url } });
      await prisma.repairRequest.update({ where: { id: request.id }, data: { paymentMethod: 'PAYSTACK' } });
      return { authorizationUrl: url, reference };
    }
    try {
      const result = await initializeTransaction({
        email: request.email,
        amount: chargeAmount,
        currency: chargeCurrency,
        reference,
        callbackUrl,
        metadata: { repair_reference: request.reference, custom_fields: [{ display_name: 'Repair request', variable_name: 'repair_reference', value: request.reference }] },
      });
      await prisma.repairPayment.update({ where: { id: payment.id }, data: { authorizationUrl: result.authorization_url } });
      await prisma.repairRequest.update({ where: { id: request.id }, data: { paymentMethod: 'PAYSTACK' } });
      return { authorizationUrl: result.authorization_url, reference };
    } catch (error) {
      await prisma.repairPayment.update({ where: { id: payment.id }, data: { status: 'FAILED', gatewayResponse: error instanceof Error ? error.message : 'Initialization failed' } });
      throw error;
    }
  }

  await prisma.repairRequest.update({ where: { id: request.id }, data: { paymentMethod: method } });
  const label = method === 'BANK_TRANSFER' ? 'bank transfer' : 'payment at our office';
  await addEvent(request.id, 'PAYMENT_METHOD', `Customer chose ${label} for ${formatMoney(due)}.`, 'customer');
  notifyStaff(`Payment method chosen: ${request.reference}`, `${request.name} will pay ${formatMoney(due)} by ${label}.`, `/admin/repairs/${request.id}`);
  return { authorizationUrl: null, reference: null };
}

/** Marks a Paystack repair payment as paid exactly once. Amount and currency must match what we asked for. */
async function finalize(paymentId: string, data: PaystackTransactionData): Promise<void> {
  const payment = await prisma.repairPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return;
  const expected = convertMinor(payment.amount, BASE_CURRENCY, getStoreCurrency());
  const mock = data.channel === 'mock';
  if (!mock && (data.amount !== expected || data.currency.toUpperCase() !== getStoreCurrency())) {
    await prisma.repairPayment.update({ where: { id: payment.id }, data: { status: 'FAILED', gatewayResponse: `Amount/currency mismatch: expected ${expected} ${getStoreCurrency()}, got ${data.amount} ${data.currency}` } });
    throw new ApiError(400, 'The payment amount did not match. Our team has been notified.', 'AMOUNT_MISMATCH');
  }
  const claimed = await prisma.repairPayment.updateMany({
    where: { id: payment.id, status: { not: 'SUCCESS' } },
    data: { status: 'SUCCESS', channel: data.channel ?? null, gatewayResponse: data.gateway_response ?? null, paidAt: data.paid_at ? new Date(data.paid_at) : new Date() },
  });
  if (claimed.count !== 1) return; // already counted by the webhook or an earlier check
  const request = await prisma.repairRequest.findUnique({ where: { id: payment.requestId } });
  if (!request) return;
  await prisma.repairRequest.update({ where: { id: request.id }, data: { paidAmount: request.paidAmount + payment.amount, paymentMethod: 'PAYSTACK' } });
  await addEvent(request.id, 'PAID', `Payment of ${formatMoney(payment.amount)} received online (${payment.reference}).`, 'paystack');
  notifyStaff(`Repair paid: ${request.reference}`, `${request.name} paid ${formatMoney(payment.amount)} online.`, `/admin/repairs/${request.id}`);
  notifyCustomer(request.email, `Payment received: ${request.reference}`, `We received your payment of ${formatMoney(payment.amount)}. Thank you.`, request.accessCode);
}

export async function verifyRepairPayment(reference: string): Promise<{ status: 'success' | 'failed' | 'pending'; message: string; accessCode: string | null }> {
  const payment = await prisma.repairPayment.findUnique({ where: { reference } });
  if (!payment) throw new ApiError(404, 'We could not find that payment. Please contact us with your reference.', 'REFERENCE_NOT_FOUND');
  const request = await prisma.repairRequest.findUnique({ where: { id: payment.requestId }, select: { accessCode: true } });
  const accessCode = request?.accessCode ?? null;
  if (payment.status === 'SUCCESS') return { status: 'success', message: 'Payment confirmed. Thank you.', accessCode };

  let data: PaystackTransactionData;
  if (isPaystackMockMode() && payment.authorizationUrl?.includes('mock=1')) {
    data = { id: 0, status: 'success', reference, amount: payment.amount, currency: getStoreCurrency(), channel: 'mock', gateway_response: 'Approved (local mock mode)', paid_at: new Date().toISOString() };
  } else {
    data = await verifyTransaction(reference);
  }
  if (data.status === 'success') {
    await finalize(payment.id, data);
    return { status: 'success', message: 'Payment confirmed. Thank you.', accessCode };
  }
  if (data.status === 'failed' || data.status === 'abandoned' || data.status === 'reversed') {
    await prisma.repairPayment.update({ where: { id: payment.id }, data: { status: 'FAILED', gatewayResponse: data.gateway_response ?? data.status } });
    return { status: 'failed', message: 'The payment was not completed. You can try again from your repair request.', accessCode };
  }
  return { status: 'pending', message: 'Your payment is still processing.', accessCode };
}

/** Called by the Paystack webhook for references that belong to repair payments. Returns true if it handled one. */
export async function handleRepairWebhook(reference: string): Promise<boolean> {
  const payment = await prisma.repairPayment.findUnique({ where: { reference } });
  if (!payment) return false;
  const verified = await verifyTransaction(reference); // confirm with Paystack instead of trusting the payload
  if (verified.status === 'success') await finalize(payment.id, verified);
  return true;
}

/** Administrator records money received by bank transfer or at the office. */
export async function recordManualPayment(requestId: string, amountKobo: number, method: 'BANK_TRANSFER' | 'OFFICE' | 'PAYSTACK'): Promise<void> {
  const request = await prisma.repairRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ApiError(404, 'Repair request not found.', 'REPAIR_NOT_FOUND');
  if (request.agreedAmount == null) throw new ApiError(409, 'Agree a price before recording a payment.', 'NO_PRICE');
  if (request.paidAmount + amountKobo > request.agreedAmount) throw new ApiError(422, `That is more than is still owed (${formatMoney(request.agreedAmount - request.paidAmount)}).`, 'OVERPAYMENT');
  await prisma.repairRequest.update({ where: { id: requestId }, data: { paidAmount: request.paidAmount + amountKobo, paymentMethod: method } });
  await addEvent(requestId, 'PAID', `Payment of ${formatMoney(amountKobo)} recorded (${method === 'OFFICE' ? 'at the office' : method === 'BANK_TRANSFER' ? 'bank transfer' : 'Paystack'}).`, 'admin');
  notifyCustomer(request.email, `Payment received: ${request.reference}`, `We recorded your payment of ${formatMoney(amountKobo)}. Thank you.`, request.accessCode);
}

