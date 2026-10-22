/**
 * Data-transfer types shared by the API (server) and the storefront (client).
 * All money values are integers in NGN kobo.
 */

export type Fulfillment = 'PHYSICAL' | 'DIGITAL' | 'SERVICE';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { message: string; code: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  productCount: number;
}

export interface ProductSummaryDTO {
  id: string;
  slug: string;
  name: string;
  brand: string;
  shortDescription: string;
  image: string;
  hoverImage: string | null;
  price: number;
  compareAtPrice: number | null;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  totalStock: number;
  fulfillment: Fulfillment;
  featured: boolean;
  category: { name: string; slug: string };
  defaultVariantId: string | null;
  variantCount: number;
}

export interface VariantDTO {
  id: string;
  sku: string;
  name: string;
  options: Array<{ name: string; value: string }>;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  image: string | null;
  isDefault: boolean;
}

export interface OptionGroupDTO {
  name: string;
  values: string[];
}

export interface ProductDetailDTO extends ProductSummaryDTO {
  description: string;
  images: string[];
  specs: Array<{ label: string; value: string }>;
  tags: string[];
  warrantyMonths: number;
  variants: VariantDTO[];
  optionGroups: OptionGroupDTO[];
}

export interface ProductListDTO {
  items: ProductSummaryDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    brands: Array<{ name: string; count: number }>;
    priceRange: { min: number; max: number };
  };
}

export interface CartItemDTO {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string;
  image: string;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  fulfillment: Fulfillment;
  available: boolean;
}

export interface CartDTO {
  id: string | null;
  items: CartItemDTO[];
  itemCount: number;
  subtotal: number;
  hasPhysicalItems: boolean;
}

export interface OrderItemDTO {
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  fulfillment: Fulfillment;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'FAILED' | 'REFUNDED';

export interface OrderDTO {
  orderNumber: string;
  status: OrderStatus;
  email: string;
  customerName: string;
  phone: string;
  shippingAddress: { line1: string; line2: string | null; city: string; state: string; country: string };
  items: OrderItemDTO[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paidAt: string | null;
  createdAt: string;
  payment: { reference: string; channel: string | null; status: string } | null;
}

export interface CheckoutInitDTO {
  orderNumber: string;
  reference: string;
  authorizationUrl: string;
  accessCode: string | null;
  mock: boolean;
}

export interface VerifyResultDTO {
  status: 'success' | 'pending' | 'failed';
  message: string;
  order: OrderDTO | null;
}

export interface SessionUserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
}
