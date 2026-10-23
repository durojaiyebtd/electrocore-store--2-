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
  revenue: { today: number; last7Days: number; last30Days: number; previous30Days: number };
  orders: { last30Days: number; awaitingFulfilment: number; needsReview: number; byStatus: Record<OrderStatus, number> };
  averageOrderValue30Days: number;
  customers: { total: number; newLast30Days: number };
  salesByDay: Array<{ date: string; revenue: number; orders: number }>;
  recentOrders: AdminOrderSummaryDTO[];
  lowStock: LowStockDTO[];
  /** Number of active physical variants with zero stock */
  outOfStockCount: number;
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

/** One row of the Paystack transaction log (/admin/transactions). Amount is NGN kobo. */
export interface AdminTransactionLogDTO extends AdminTransactionDTO {
  id: string;
  orderNumber: string;
  customerEmail: string;
}

export interface AdminOrderDetailDTO extends AdminOrderSummaryDTO {
  phone: string;
  notes: string | null;
  reviewReason: string | null;
  restockedAt: string | null;
  courier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
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
  homeRank: number;
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
  homeRank: number;
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

export interface ReportDTO {
  from: string;
  to: string;
  /** All money values are NGN kobo */
  gross: number;
  discounts: number;
  shipping: number;
  refunds: number;
  net: number;
  orders: number;
  refundedOrders: number;
  unitsSold: number;
  averageOrderValue: number;
  failedPayments: number;
  byDay: Array<{ date: string; revenue: number; orders: number }>;
  byStatus: Array<{ status: string; orders: number; total: number }>;
  byChannel: Array<{ channel: string; payments: number; total: number }>;
  topProducts: Array<{ productName: string; sku: string; quantity: number; revenue: number }>;
}

export interface AdminNotificationDTO {
  id: string;
  kind: 'new_order' | 'review' | 'low_stock' | 'out_of_stock' | 'failed_payment' | 'refund';
  title: string;
  detail: string;
  href: string;
  at: string;
}
