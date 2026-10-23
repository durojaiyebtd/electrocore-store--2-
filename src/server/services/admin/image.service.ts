/**
 * Photo uploads from the admin portal. Files are checked by their real contents
 * (not just the name the browser reports), size-limited, and stored in the database
 * so they survive redeploys on hosts without a permanent disk, such as Vercel.
 */
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import type { AdminUser } from '@/lib/admin-auth';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

/** Looks at the first bytes of the file to find out what it really is. SVG is refused on purpose (it can carry scripts). */
export function sniffImageType(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export async function saveImage(file: File, admin: AdminUser): Promise<{ url: string; id: string; size: number }> {
  if (file.size === 0) throw new ApiError(400, 'That file is empty.', 'EMPTY_FILE');
  if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, 'The photo is larger than 3 MB. Resize it and try again.', 'FILE_TOO_LARGE');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) throw new ApiError(415, 'Upload a JPG, PNG or WebP photo.', 'UNSUPPORTED_IMAGE');
  const created = await prisma.uploadedImage.create({
    data: { mimeType, size: bytes.length, data: Buffer.from(bytes), uploadedBy: admin.email },
    select: { id: true },
  });
  return { id: created.id, url: `/api/images/${created.id}`, size: bytes.length };
}

export async function loadImage(id: string): Promise<{ mimeType: string; data: Uint8Array } | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const image = await prisma.uploadedImage.findUnique({ where: { id }, select: { mimeType: true, data: true } });
  return image ? { mimeType: image.mimeType, data: image.data } : null;
}
