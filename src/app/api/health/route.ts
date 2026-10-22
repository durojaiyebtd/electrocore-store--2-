/**
 * Health check for hosting platforms (Railway, Vercel, uptime monitors).
 *   GET /api/health          -> 200 as soon as the server is running (used as the deploy health check)
 *   GET /api/health?db=1     -> also pings MongoDB; 503 if the database cannot be reached
 * Never returns secrets or connection details.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const checkDb = req.nextUrl.searchParams.get('db') === '1';
  if (!checkDb) {
    return NextResponse.json({ status: 'ok' });
  }
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return NextResponse.json({ status: 'ok', database: 'ok' });
  } catch {
    return NextResponse.json({ status: 'degraded', database: 'unreachable' }, { status: 503 });
  }
}
