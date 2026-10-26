/**
 * Photos attached to repair requests and messages. Files are checked by their real contents
 * (JPEG, PNG or WebP only; SVG is refused because it can carry scripts), size-limited and stored
 * in the database. They are private: they are only served with the request's secret access code,
 * or to a signed-in administrator.
 */
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { getAdminUser } from '@/lib/admin-auth';
import { MAX_REPAIR_PHOTOS, MAX_REPAIR_PHOTO_BYTES } from '@/lib/repair-constants';
import { sniffImageType } from './admin/image.service';

export function pickFiles(form: FormData, field: string): File[] {
  return form.getAll(field).filter((v): v is File => typeof v === 'object' && v !== null && 'arrayBuffer' in v && (v as File).size > 0);
}

/** Validates every file first, so nothing is saved if one is bad. */
export async function validateImages(files: File[], max = MAX_REPAIR_PHOTOS): Promise<Array<{ mimeType: string; bytes: Uint8Array; fileName: string }>> {
  if (files.length > max) throw new ApiError(400, `You can attach up to ${max} photos.`, 'TOO_MANY_PHOTOS');
  const checked: Array<{ mimeType: string; bytes: Uint8Array; fileName: string }> = [];
  for (const file of files) {
    if (file.size > MAX_REPAIR_PHOTO_BYTES) throw new ApiError(413, `"${file.name.slice(0, 40)}" is larger than 3 MB. Resize it and try again.`, 'FILE_TOO_LARGE');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffImageType(bytes);
    if (!mimeType) throw new ApiError(415, `"${file.name.slice(0, 40)}" is not a JPG, PNG or WebP photo.`, 'UNSUPPORTED_IMAGE');
    checked.push({ mimeType, bytes, fileName: file.name.replace(/[^\w.\- ]/g, '').slice(0, 80) });
  }
  return checked;
}

export async function saveValidatedImages(
  requestId: string,
  images: Array<{ mimeType: string; bytes: Uint8Array; fileName: string }>,
  messageId?: string,
): Promise<string[]> {
  const ids: string[] = [];
  for (const image of images) {
    const row = await prisma.repairImage.create({
      data: { requestId, messageId: messageId ?? null, mimeType: image.mimeType, size: image.bytes.length, data: Buffer.from(image.bytes), fileName: image.fileName },
      select: { id: true },
    });
    ids.push(row.id);
  }
  return ids;
}

/** Returns the image if the caller holds the request's access code, or is an administrator. */
export async function loadRepairImage(id: string, accessCode: string | null): Promise<{ mimeType: string; data: Uint8Array } | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const image = await prisma.repairImage.findUnique({ where: { id } });
  if (!image) return null;
  const admin = await getAdminUser();
  if (!admin) {
    if (!accessCode || !/^[a-f0-9]{48}$/.test(accessCode)) return null;
    const request = await prisma.repairRequest.findUnique({ where: { id: image.requestId }, select: { accessCode: true } });
    if (!request || request.accessCode !== accessCode) return null;
  }
  return { mimeType: image.mimeType, data: image.data };
}
