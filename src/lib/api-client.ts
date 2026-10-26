/**
 * Browser-side fetch helper for our own API. Unwraps { success, data } and
 * throws an Error with the server's shopper-friendly message on failure.
 */
import type { ApiResponse } from '@/types';

export class ClientApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ClientApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(url: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: init?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ClientApiError('Network error. Check your internet connection and try again.', 'NETWORK_ERROR', 0);
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    json = null;
  }

  if (!json) {
    throw new ClientApiError(`Unexpected server response (${response.status}).`, 'BAD_RESPONSE', response.status);
  }
  if (!json.success) {
    throw new ClientApiError(json.error.message, json.error.code, response.status, json.error.details);
  }
  return json.data;
}

/** Same as apiFetch, but sends a multipart form (used for photo uploads). The browser sets the form boundary itself. */
export async function apiUpload<T>(url: string, form: FormData, method = 'POST'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method, body: form, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ClientApiError('Network error. Check your internet connection and try again.', 'NETWORK_ERROR', 0);
  }
  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    json = null;
  }
  if (!json) {
    if (response.status === 413) throw new ClientApiError('The photos are too large to upload together. Remove some or use smaller photos.', 'PAYLOAD_TOO_LARGE', 413);
    throw new ClientApiError(`Unexpected server response (${response.status}).`, 'BAD_RESPONSE', response.status);
  }
  if (!json.success) throw new ClientApiError(json.error.message, json.error.code, response.status, json.error.details);
  return json.data;
}
