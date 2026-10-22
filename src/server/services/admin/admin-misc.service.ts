/**
 * Admin services for customers, categories, inventory history and system status.
 */
import type { InventoryReason, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import type { AdminUser } from '@/lib/admin-auth';
import { getNgnPerUsd, getStoreCurrency } from '@/lib/currency';
import { paystackMode } from '@/lib/paystack';
import { site } from '@/lib/site';
import { slugify } from '@/lib/utils';
import type { AdminCategoryDTO, AdminCustomerDTO, InventoryLogDTO, Paginated, SystemStatusDTO } from '@/types/admin';
import { REVENUE_STATUSES } from './dashboard.service';

// ----------------------------------------------------------------- Customers

export async function listCustomers(query: { q?: string; page: number; pageSize: number }): Promise<Paginated<AdminCustomerDTO>> {
  const where: Prisma.UserWhereInput = {};
  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { email: { contains: q.toLowerCase() } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q.replace(/\s+/g, '') } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  const stats = users.length
    ? await prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((u) => u.id) }, status: { in: REVENUE_STATUSES } },
        _count: { _all: true },
        _sum: { total: true },
        _max: { createdAt: true },
      })
    : [];
  const byUser = new Map(stats.map((row) => [row.userId, row]));

  return {
    items: users.map((user) => {
      const row = byUser.get(user.id);
      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone ?? null,
        role: user.role,
        orderCount: row?._count._all ?? 0,
        totalSpent: row?._sum.total ?? 0,
        lastOrderAt: row?._max.createdAt ? row._max.createdAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      };
    }),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function setCustomerRole(userId: string, role: 'CUSTOMER' | 'ADMIN', admin: AdminUser): Promise<void> {
  if (userId === admin.id) {
    throw new ApiError(400, 'You cannot change your own role. Ask another admin.', 'SELF_ROLE_CHANGE');
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new ApiError(404, 'Customer not found.', 'USER_NOT_FOUND');
  if (role === 'CUSTOMER') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) throw new ApiError(400, 'The store needs at least one admin.', 'LAST_ADMIN');
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
}

// ----------------------------------------------------------------- Categories

export async function listAdminCategories(): Promise<AdminCategoryDTO[]> {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.product.groupBy({ by: ['categoryId'], _count: { _all: true } }),
  ]);
  const countById = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon ?? null,
    sortOrder: category.sortOrder,
    productCount: countById.get(category.id) ?? 0,
  }));
}

interface CategoryInput {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
}

async function assertSlugFree(slug: string, excludeId?: string): Promise<void> {
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (existing && existing.id !== excludeId) {
    throw new ApiError(409, `Another category already uses the URL "${slug}".`, 'SLUG_TAKEN');
  }
}

export async function createCategory(input: CategoryInput): Promise<void> {
  const slug = input.slug || slugify(input.name);
  if (!slug) throw new ApiError(400, 'Enter a name with letters or numbers.', 'INVALID_SLUG');
  await assertSlugFree(slug);
  await prisma.category.create({ data: { ...input, slug } });
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!category) throw new ApiError(404, 'Category not found.', 'CATEGORY_NOT_FOUND');
  const slug = input.slug || category.slug;
  await assertSlugFree(slug, id);
  await prisma.category.update({ where: { id }, data: { ...input, slug } });
}

export async function deleteCategory(id: string): Promise<void> {
  const products = await prisma.product.count({ where: { categoryId: id } });
  if (products > 0) {
    throw new ApiError(409, `This category still has ${products} product${products === 1 ? '' : 's'}. Move them to another category first.`, 'CATEGORY_NOT_EMPTY');
  }
  await prisma.category.delete({ where: { id } });
}

// ----------------------------------------------------------------- Inventory history

export async function listInventoryLogs(query: {
  productId?: string;
  variantId?: string;
  reason?: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<InventoryLogDTO>> {
  const where: Prisma.InventoryLogWhereInput = {};
  if (query.productId) where.productId = query.productId;
  if (query.variantId) where.variantId = query.variantId;
  if (query.reason) where.reason = query.reason as InventoryReason;

  const [total, logs] = await Promise.all([
    prisma.inventoryLog.count({ where }),
    prisma.inventoryLog.findMany({
      where,
      include: { product: { select: { name: true } }, variant: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: logs.map((log) => ({
      id: log.id,
      productName: log.product.name,
      variantName: log.variant.name,
      sku: log.variant.sku,
      change: log.change,
      balanceAfter: log.balanceAfter,
      reason: log.reason,
      reference: log.reference ?? null,
      note: log.note ?? null,
      actor: log.actor ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

// ----------------------------------------------------------------- System status

export async function getSystemStatus(): Promise<SystemStatusDTO> {
  const [webhooks, sources] = await Promise.all([
    prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.product.groupBy({ by: ['source'], _count: { _all: true } }),
  ]);
  const mode = paystackMode();
  return {
    paystack: { configured: mode !== 'missing', mode },
    storeCurrency: getStoreCurrency(),
    ngnPerUsd: getNgnPerUsd(),
    supplierProvider: (process.env.SUPPLIER_PROVIDER ?? 'mock').toLowerCase(),
    appUrl: site.url,
    webhookUrl: `${site.url}/api/webhooks/paystack`,
    recentWebhooks: webhooks.map((event) => ({
      id: event.id,
      event: event.event,
      reference: event.reference ?? null,
      signatureValid: event.signatureValid,
      error: event.error ?? null,
      processedAt: event.processedAt ? event.processedAt.toISOString() : null,
      createdAt: event.createdAt.toISOString(),
    })),
    productsBySource: sources.map((row) => ({ source: row.source, count: row._count._all })),
  };
}
