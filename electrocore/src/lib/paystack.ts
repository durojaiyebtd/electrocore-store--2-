/**
 * Minimal, typed Paystack client.
 * Docs: https://paystack.com/docs/api/transaction/
 *
 * Paystack amounts are in the currency's minor unit (kobo for NGN).
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { ApiError } from './http';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/** True only when explicitly enabled AND not running in production. */
export function isPaystackMockMode(): boolean {
  return process.env.PAYSTACK_MOCK_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY ?? '';
  if (!key.startsWith('sk_') || key.includes('xxxx')) {
    throw new ApiError(
      503,
      'Online payment is not configured yet. Add your PAYSTACK_SECRET_KEY to .env (or set PAYSTACK_MOCK_MODE="true" for local testing).',
      'PAYSTACK_NOT_CONFIGURED',
    );
  }
  return key;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackRequest<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  let json: PaystackEnvelope<T> | null = null;
  try {
    json = (await response.json()) as PaystackEnvelope<T>;
  } catch {
    json = null;
  }

  if (!response.ok || !json || json.status !== true) {
    const message = json?.message ?? `Paystack responded with HTTP ${response.status}`;
    console.error('[paystack] request failed', path, response.status, message);
    throw new ApiError(502, `Payment provider error: ${message}`, 'PAYSTACK_ERROR');
  }
  return json.data;
}

export interface InitializeTransactionInput {
  email: string;
  /** minor units (kobo) */
  amount: number;
  currency: 'NGN' | 'USD';
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  return paystackRequest<InitializeTransactionResult>('/transaction/initialize', {
    method: 'POST',
    body: {
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'qr', 'mobile_money'],
    },
  });
}

export interface PaystackTransactionData {
  id: number;
  status: 'success' | 'failed' | 'abandoned' | 'ongoing' | 'pending' | 'processing' | 'queued' | 'reversed';
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  gateway_response: string | null;
  paid_at: string | null;
  customer?: { email?: string };
  metadata?: Record<string, unknown> | string | null;
}

export function verifyTransaction(reference: string): Promise<PaystackTransactionData> {
  return paystackRequest<PaystackTransactionData>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
}

/**
 * Webhook signature check: Paystack signs the raw request body with HMAC-SHA512
 * using your secret key and sends it in the `x-paystack-signature` header.
 */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface PaystackRefundData {
  id: number;
  status: string; // "pending" | "processing" | "processed" | "failed"
  amount: number;
  currency: string;
  transaction?: { reference?: string };
}

/**
 * Refund a successful transaction (full amount when `amount` is omitted).
 * Docs: https://paystack.com/docs/api/refund/
 */
export function createRefund(reference: string, options: { amount?: number; merchantNote?: string } = {}): Promise<PaystackRefundData> {
  return paystackRequest<PaystackRefundData>('/refund', {
    method: 'POST',
    body: {
      transaction: reference,
      ...(options.amount ? { amount: options.amount } : {}),
      ...(options.merchantNote ? { merchant_note: options.merchantNote } : {}),
    },
  });
}

/** Describes how payments are configured, for the admin settings page. */
export function paystackMode(): 'live' | 'test' | 'mock' | 'missing' {
  if (isPaystackMockMode()) return 'mock';
  const key = process.env.PAYSTACK_SECRET_KEY ?? '';
  if (key.startsWith('sk_live_')) return 'live';
  if (key.startsWith('sk_test_') && !key.includes('xxxx')) return 'test';
  return 'missing';
}
