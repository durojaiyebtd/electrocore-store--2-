/**
 * Browser helper: uploads one photo to the admin uploads endpoint and returns its URL.
 * (apiFetch only sends JSON, so file uploads use their own small helper.)
 */
import type { ApiResponse } from '@/types';

const MAX_BYTES = 3 * 1024 * 1024;

export async function uploadImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  if (file.size > MAX_BYTES) throw new Error('That photo is larger than 3 MB. Resize it and try again.');
  const body = new FormData();
  body.append('file', file);
  let response: Response;
  try {
    response = await fetch('/api/admin/uploads', { method: 'POST', body, credentials: 'same-origin' });
  } catch {
    throw new Error('Network error. Check your internet connection and try again.');
  }
  let json: ApiResponse<{ url: string }> | null = null;
  try {
    json = (await response.json()) as ApiResponse<{ url: string }>;
  } catch {
    json = null;
  }
  if (!response.ok || !json || !json.success) {
    throw new Error(json && !json.success ? json.error.message : 'The upload failed. Please try again.');
  }
  return json.data.url;
}
