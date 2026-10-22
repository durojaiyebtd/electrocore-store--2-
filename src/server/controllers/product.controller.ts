import type { NextRequest } from 'next/server';
import { ApiError, ok, parseQuery, type RouteContext } from '@/lib/http';
import { productQuerySchema } from '@/lib/validators';
import { getProductBySlug, getRelatedProducts, listCategories, listProducts } from '../services/catalog.service';

/** GET /api/products?q=&category=a,b&brand=x,y&minPrice=&maxPrice=&inStock=1&sort=&page=&pageSize= */
export async function list(req: NextRequest) {
  const query = parseQuery(req, productQuerySchema);
  return ok(await listProducts(query));
}

/** GET /api/products/:slug */
export async function detail(_req: NextRequest, ctx: RouteContext<{ slug: string }>) {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug);
  if (!product) {
    throw new ApiError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
  }
  const related = await getRelatedProducts(product.id, product.category.slug);
  return ok({ product, related });
}

/** GET /api/categories */
export async function categories() {
  return ok(await listCategories(), { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
