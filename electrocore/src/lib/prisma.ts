import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient instance shared across the app.
 * In development Next.js hot-reloads modules, which would otherwise open a new
 * database connection pool on every save — so we cache the client on globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
