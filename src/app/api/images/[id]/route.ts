import { NextResponse, type NextRequest } from 'next/server';
import { loadImage } from '@/server/services/admin/image.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public: serves a photo uploaded from the admin portal. Uploaded files never change, so browsers may cache them for a year. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const image = await loadImage(id);
  if (!image) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(Buffer.from(image.data), {
    status: 200,
    headers: {
      'Content-Type': image.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
