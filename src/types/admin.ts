/**
 * Data shapes returned by the admin API. Money values are NGN kobo.
 */
import type { Fulfillment, OrderStatus } from './index';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardDTO {
  /** Revenue = paid orders that were not later cancelled or refunded (NGN kobo). */
  revenue: { today: number; last7Days: number; last30Days: number; previous30Days: number; allTime: number };
  orders: {
    /** Every order ever created, whatever its status */
    total: number;
    /** Orders paid at some point and still counted as sales */
    paidAllTime: number;
    last30Days: number;
    awaitingFulfilment: number;
    needsReview: number;
    byStatus: Record<OrderStatus, number>;
  };
  averageOrderValue30Days: number;
  customers: { total: number; newLast30Days: number };
  salesByDay: Array<{ date: string; revenue: number; orders: number }>;
  /** Most recent paid orders, newest payment first */
  recentSales: AdminOrderSummaryDTO[];
  /** How many on-sale physical variants are at or below the low-stock threshold */
  lowStockCount: number;
  lowStockThreshold: number;
  lowStock: LowStockDTO[];
  topProducts: Array<{ productName: string; productSlug: string; quantity: number; revenue: number }>;
}

export interface LowStockDTO {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  stock: number;
}

export interface AdminOrderSummaryDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  email: string;
  itemCount: number;
  total: number;
  needsReview: boolean;
  createdAt: string;
  paidAt: string | null;
  paymentChannel: string | null;
}

export interface AdminOrderEventDTO {
  status: OrderStatus;
  note: string | null;
  actor: string;
  at: string;
}

export interface AdminTransactionDTO {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  channel: string | null;
  gatewayResponse: string | null;
  paidAt: string | null;
  isMock: boolean;
  createdAt: string;
}

export interface AdminOrderDetailDTO extends AdminOrderSummaryDTO {
  phone: string;
  notes: string | null;
  reviewReason: string | null;
  restockedAt: string | null;
  isRegisteredCustomer: boolean;
  shippingAddress: { line1: string; line2: string | null; city: string; state: string; country: string; postalCode: string | null };
  subtotal: number;
  shippingFee: number;
  discount: number;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    productSlug: string;
    variantName: string;
    sku: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    fulfillment: Fulfillment;
  }>;
  events: AdminOrderEventDTO[];
  transactions: AdminTransactionDTO[];
  allowedTransitions: OrderStatus[];
  canRefund: boolean;
}

export interface AdminProductSummaryDTO {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  categoryName: string;
  price: number;
  totalStock: number;
  variantCount: number;
  isActive: boolean;
  featured: boolean;
  source: string;
  fulfillment: Fulfillment;
  updatedAt: string;
}

export interface AdminVariantDTO {
  id: string;
  sku: string;
  name: string;
  options: Array<{ name: string; value: string }>;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  image: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface AdminProductDetailDTO {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  images: string[];
  specs: Array<{ label: string; value: string }>;
  tags: string[];
  fulfillment: Fulfillment;
  warrantyMonths: number;
  featured: boolean;
  isActive: boolean;
  source: string;
  externalId: string;
  lastSyncedAt: string | null;
  variants: AdminVariantDTO[];
}

export interface InventoryLogDTO {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  change: number;
  balanceAfter: number;
  reason: string;
  reference: string | null;
  note: string | null;
  actor: string | null;
  createdAt: string;
}

export interface AdminCustomerDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface AdminCategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  sortOrder: number;
  productCount: number;
}

export interface SystemStatusDTO {
  paystack: { configured: boolean; mode: 'live' | 'test' | 'mock' | 'missing' };
  storeCurrency: string;
  ngnPerUsd: number;
  supplierProvider: string;
  appUrl: string;
  webhookUrl: string;
  recentWebhooks: Array<{ id: string; event: string; reference: string | null; signatureValid: boolean; error: string | null; processedAt: string | null; createdAt: string }>;
  productsBySource: Array<{ source: string; count: number }>;
}

/** One row of Admin -> Transactions (a Paystack transaction and the order it belongs to). */
export interface AdminTransactionLogDTO {
  id: string;
  reference: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  /** Minor units of `currency` (kobo for NGN), exactly as sent to Paystack */
  amount: number;
  currency: string;
  status: 'INITIALIZED' | 'SUCCESS' | 'FAILED' | 'ABANDONED' | 'REVERSED' | 'REFUNDED';
  channel: string | null;
  gatewayResponse: string | null;
  paidAt: string | null;
  createdAt: string;
  isMock: boolean;
}

export interface TransactionLogDTO extends Paginated<AdminTransactionLogDTO> {
  /** Totals across ALL transactions matching the search (not just this page). NGN kobo. */
  summary: { verifiedCount: number; verifiedAmount: number; pendingCount: number; failedCount: number };
}
