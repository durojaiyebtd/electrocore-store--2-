/**
 * "technocrat" supplier adapter — reads the Technocrat catalog saved in
 * src/data/products.json and turns it into normalised SupplierProduct records.
 *
 * Prices: `sellingPriceNGN` is used as-is (your 6% markup is already applied).
 * `costPriceNGN` (older files: `originalPriceNGN`) is your cost price and is never shown to customers.
 *
 * Stock: the feed only says in stock / out of stock, so in-stock items get
 * TECHNOCRAT_DEFAULT_STOCK units (default 10). Adjust real counts in the admin
 * portal under Inventory.
 *
 * Refresh everything from Technocrat's website with `npm run catalog:import`, then load it into the
 * store with `npm run catalog:technocrat`. (Or edit src/data/products.json by hand and run the second.)
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import rawCatalog from '@/data/products.json';
import { toMinor } from '../currency';
import { slugify } from '../utils';
import { MOCK_CATEGORIES } from './mock-catalog';
import type { SupplierAdapter, SupplierCategory, SupplierProduct } from './types';

const technocratItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value).trim()),
  title: z.string().trim().min(3),
  category: z.string().trim().min(2),
  /** Your cost price. Older files call this originalPriceNGN; both are accepted. It is never shown to customers. */
  costPriceNGN: z.number().nonnegative().optional(),
  originalPriceNGN: z.number().nonnegative().optional(),
  sellingPriceNGN: z.number().positive(),
  formattedPrice: z.string().optional(),
  imageUrl: z.string().trim().optional().default(''),
  /** Page on the supplier's website this product was imported from (written by the importer). */
  sourceUrl: z.string().optional(),
  inStock: z.boolean().default(true),
  /** Optional. Set true to pin a product to the homepage "Featured products" row. */
  featured: z.boolean().optional(),
  /** Optional marketing copy. When missing, a neutral sentence is generated. */
  description: z.string().trim().min(10).optional(),
  /** Optional URL slug. When missing it is made from the title. */
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase letters, numbers and hyphens').optional(),
  /** Accepted so the file validates, but never shown: sample ratings are not real customer reviews. */
  rating: z.number().min(0).max(5).optional(),
});

export type TechnocratItem = z.infer<typeof technocratItemSchema>;

/** Feed category -> store category slug. Unknown categories get their own slug. */
const CATEGORY_MAP: Record<string, string> = {
  laptops: 'laptops-computers',
  laptop: 'laptops-computers',
  computers: 'laptops-computers',
  desktops: 'laptops-computers',
  tablets: 'smartphones-tablets',
  tablet: 'smartphones-tablets',
  phones: 'smartphones-tablets',
  smartphones: 'smartphones-tablets',
  accessories: 'accessories-peripherals',
  'spare parts': 'spare-parts',
  parts: 'spare-parts',
};

const EXTRA_CATEGORIES: SupplierCategory[] = [
  {
    slug: 'spare-parts',
    name: 'Spare Parts',
    description: 'Replacement screens, display modules and repair components.',
    icon: 'wrench',
    sortOrder: 4,
  },
];

/** Brand from the product title: "HP EliteBook…" -> HP, "iPad Pro…" -> Apple. */
const BRAND_ALIASES: Record<string, string> = {
  ipad: 'Apple',
  iphone: 'Apple',
  macbook: 'Apple',
  imac: 'Apple',
  airpods: 'Apple',
  apple: 'Apple',
  hp: 'HP',
  dell: 'Dell',
  alienware: 'Alienware',
  lenovo: 'Lenovo',
  samsung: 'Samsung',
  asus: 'ASUS',
  acer: 'Acer',
  microsoft: 'Microsoft',
  thinkpad: 'Lenovo',
  sony: 'Sony',
  playstation: 'Sony',
  xbox: 'Microsoft',
  logitech: 'Logitech',
  anker: 'Anker',
  jbl: 'JBL',
  canon: 'Canon',
  epson: 'Epson',
  'tp-link': 'TP-Link',
  tplink: 'TP-Link',
  tecno: 'Tecno',
  infinix: 'Infinix',
  itel: 'itel',
  xiaomi: 'Xiaomi',
  huawei: 'Huawei',
  oppo: 'Oppo',
  google: 'Google',
  pixel: 'Google',
  kingston: 'Kingston',
  sandisk: 'SanDisk',
  seagate: 'Seagate',
  'western': 'Western Digital',
  lg: 'LG',
  oraimo: 'Oraimo',
  baseus: 'Baseus',
  ugreen: 'Ugreen',
  mikrotik: 'MikroTik',
  ubiquiti: 'Ubiquiti',
  hikvision: 'Hikvision',
  dahua: 'Dahua',
};

export function brandFromTitle(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  // A known brand in the first words wins ("HP EliteBook…", "Genuine Samsung Galaxy…")
  for (const word of words.slice(0, 4)) {
    const known = BRAND_ALIASES[word.toLowerCase().replace(/[^a-z0-9-]/g, '')];
    if (known) return known;
  }
  const first = words[0]?.replace(/[^A-Za-z0-9-]/g, '') ?? '';
  // Titles that start with a generic word ("Tempered Glass…") get a clean catch-all, not a fake brand
  if (first.length < 2 || /^(new|original|genuine|replacement|tempered|screen|usb|type|wireless|bluetooth|laptop|portable|mini|smart|universal|fast|power|hdmi|lan|wifi|cable|case|cover|charger|adapter|adaptor|keyboard|mouse)$/i.test(first)) {
    return 'Other';
  }
  return first;
}

export function categorySlugFor(category: string): string {
  return CATEGORY_MAP[category.trim().toLowerCase()] ?? slugify(category);
}

/**
 * Specs taken only from what the title states — nothing is invented.
 * "HP ProBook 440 G11 - Intel Core Ultra 5 125U (16GB, 512GB SSD)"
 *   -> Model: HP ProBook 440 G11 · Processor: Intel Core Ultra 5 125U · Configuration: 16GB, 512GB SSD
 */
export function specsFromTitle(title: string): Array<{ label: string; value: string }> {
  const parenMatch = title.match(/\(([^)]+)\)\s*$/);
  const configuration = parenMatch ? parenMatch[1].trim() : null;
  const withoutParen = parenMatch ? title.slice(0, parenMatch.index).trim() : title.trim();
  const [model, processor] = withoutParen.split(/\s+-\s+/, 2).map((part) => part.trim());

  const specs: Array<{ label: string; value: string }> = [{ label: 'Model', value: model }];
  if (processor) specs.push({ label: 'Processor', value: processor });
  if (configuration) specs.push({ label: 'Configuration', value: configuration });
  return specs;
}

/** A one-line summary from the title's own details, e.g. "Intel Core Ultra 5 125U · 16GB, 512GB SSD". */
export function shortDescriptionFor(item: TechnocratItem): string {
  const specs = specsFromTitle(item.title).filter((spec) => spec.label !== 'Model');
  return specs.length > 0 ? specs.map((spec) => spec.value).join(' · ') : `${item.category} from ${brandFromTitle(item.title)}`;
}

function defaultStock(): number {
  const value = Number(process.env.TECHNOCRAT_DEFAULT_STOCK ?? '10');
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 10;
}

/** How many in-stock products (in file order) are featured on the homepage when none are pinned. */
const AUTO_FEATURED_COUNT = 8;

/** True when a /images/... or /products/... path points at a real file in the project's public/ folder. */
function localImageExists(url: string): boolean {
  if (!/^\/(images|products)\/[\w\-./]+$/.test(url) || url.includes('..')) return false;
  return existsSync(path.join(process.cwd(), 'public', url));
}

export function mapTechnocratItem(item: TechnocratItem, position = Number.MAX_SAFE_INTEGER, anyPinned = false): SupplierProduct {
  const brand = brandFromTitle(item.title);
  const categorySlug = categorySlugFor(item.category);
  const sku = `TC-${item.id.padStart(4, '0')}`.toUpperCase();
  // Full https links are used as given. A /images/... or /products/... path is used only when that file really exists in
  // public/ (so add the pictures, then run `npm run catalog:technocrat` again). Otherwise the card shows its name tile.
  const image = /^https:\/\//.test(item.imageUrl) || localImageExists(item.imageUrl) ? item.imageUrl : '';

  return {
    externalId: `TC-${item.id}`,
    slug: item.slug ?? slugify(item.title),
    name: item.title,
    brand,
    categorySlug,
    shortDescription: shortDescriptionFor(item),
    description: item.description ?? `${item.title}. Contact our team before ordering if you need to confirm the exact condition, warranty terms or specification of this item.`,
    images: image ? [image] : [],
    specs: specsFromTitle(item.title),
    tags: [item.category.toLowerCase(), brand.toLowerCase()],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 0,
    rating: 0,
    reviewCount: 0,
    featured: item.featured ?? (!anyPinned && item.inStock && position < AUTO_FEATURED_COUNT),
    currency: 'NGN',
    variants: [
      {
        externalId: `TC-${item.id}-STD`,
        sku,
        name: 'Standard',
        options: [],
        price: toMinor(item.sellingPriceNGN),
        compareAtPrice: null,
        stock: item.inStock ? defaultStock() : 0,
        image: null,
        isDefault: true,
      },
    ],
  };
}

/** Validates the JSON file so a typo produces a clear error instead of a broken page. */
export function loadTechnocratCatalog(): TechnocratItem[] {
  const parsed = z.array(technocratItemSchema).safeParse(rawCatalog);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`src/data/products.json is invalid at item ${issue.path.join('.')}: ${issue.message}`);
  }
  const ids = new Set<string>();
  for (const item of parsed.data) {
    if (ids.has(item.id)) throw new Error(`src/data/products.json has the id "${item.id}" twice. Every product needs a unique id.`);
    ids.add(item.id);
  }
  return parsed.data;
}

export const technocratSupplier: SupplierAdapter = {
  key: 'technocrat',
  displayName: 'Technocrat catalog (src/data/products.json)',
  async fetchCategories() {
    const used = new Set(loadTechnocratCatalog().map((item) => categorySlugFor(item.category)));
    const known = [...MOCK_CATEGORIES, ...EXTRA_CATEGORIES];
    const categories = known.filter((category) => used.has(category.slug));
    // Feed categories we have no mapping for become new store categories
    for (const item of loadTechnocratCatalog()) {
      const slug = categorySlugFor(item.category);
      if (!categories.some((c) => c.slug === slug)) {
        categories.push({ slug, name: item.category, description: `${item.category} from our supplier catalog.`, icon: 'chip', sortOrder: 50 });
      }
    }
    return categories;
  },
  async fetchProducts() {
    const items = loadTechnocratCatalog();
    const anyPinned = items.some((item) => item.featured === true);
    return items.map((item, index) => mapTechnocratItem(item, index, anyPinned));
  },
};
