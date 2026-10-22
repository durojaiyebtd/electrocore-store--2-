/**
 * Centralised currency utility.
 *
 * - Catalog and order amounts are stored as integers in the minor unit of the
 *   BASE currency (NGN kobo). Integers avoid floating-point rounding errors.
 * - The storefront display/charge currency is NGN by default and can be switched
 *   to USD with NEXT_PUBLIC_STORE_CURRENCY="USD"; amounts are converted using
 *   NEXT_PUBLIC_NGN_PER_USD.
 * - This file has no server-only imports, so it is safe in client components.
 */

export type CurrencyCode = 'NGN' | 'USD';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  /** How many minor units make one major unit (100 kobo = ₦1, 100 cents = $1) */
  minorPerMajor: number;
  minorUnitName: string;
  /** Decimal places shown to shoppers */
  displayDecimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    locale: 'en-NG',
    minorPerMajor: 100,
    minorUnitName: 'kobo',
    displayDecimals: 0,
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    minorPerMajor: 100,
    minorUnitName: 'cents',
    displayDecimals: 2,
  },
};

/** The currency all prices are stored in. */
export const BASE_CURRENCY: CurrencyCode = 'NGN';

function parseCurrency(value: string | undefined): CurrencyCode {
  const upper = (value ?? '').trim().toUpperCase();
  return upper === 'USD' ? 'USD' : 'NGN';
}

/** The currency shown to shoppers and charged through Paystack. */
export function getStoreCurrency(): CurrencyCode {
  return parseCurrency(process.env.NEXT_PUBLIC_STORE_CURRENCY);
}

/** Naira per 1 US Dollar. */
export function getNgnPerUsd(): number {
  const rate = Number(process.env.NEXT_PUBLIC_NGN_PER_USD ?? '1550');
  return Number.isFinite(rate) && rate > 0 ? rate : 1550;
}

/** Major units -> minor units (₦1,500 -> 150000 kobo). */
export function toMinor(major: number, currency: CurrencyCode = BASE_CURRENCY): number {
  return Math.round(major * CURRENCIES[currency].minorPerMajor);
}

/** Minor units -> major units (150000 kobo -> ₦1,500). */
export function fromMinor(minor: number, currency: CurrencyCode = BASE_CURRENCY): number {
  return minor / CURRENCIES[currency].minorPerMajor;
}

/** Convert an amount in minor units between currencies. */
export function convertMinor(amountMinor: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return Math.round(amountMinor);
  const major = fromMinor(amountMinor, from);
  const rate = getNgnPerUsd();
  const convertedMajor = from === 'NGN' && to === 'USD' ? major / rate : major * rate;
  return toMinor(convertedMajor, to);
}

export interface FormatMoneyOptions {
  /** Currency to display in. Defaults to the store currency. */
  currency?: CurrencyCode;
  /** Currency the input amount is in. Defaults to the base currency (NGN kobo). */
  sourceCurrency?: CurrencyCode;
  /** Force decimals on/off. */
  decimals?: number;
}

/**
 * Format an amount stored in minor units for display.
 * formatMoney(125000000) -> "₦1,250,000"
 */
export function formatMoney(amountMinor: number, options: FormatMoneyOptions = {}): string {
  const target = options.currency ?? getStoreCurrency();
  const source = options.sourceCurrency ?? BASE_CURRENCY;
  const meta = CURRENCIES[target];
  const converted = convertMinor(amountMinor, source, target);
  const decimals = options.decimals ?? meta.displayDecimals;
  const major = fromMinor(converted, target);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
  } catch {
    // Fallback for runtimes without full ICU data
    const fixed = major.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${meta.symbol}${fixed}`;
  }
}

/** Percentage saved between a compare-at price and a selling price. */
export function discountPercent(price: number, compareAtPrice?: number | null): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Convert a shopper-entered major amount in the store currency back to base minor units (for filters). */
export function storeMajorToBaseMinor(major: number): number {
  const store = getStoreCurrency();
  return convertMinor(toMinor(major, store), store, BASE_CURRENCY);
}

/** Convert base minor units to a whole-number major amount in the store currency (for filter inputs). */
export function baseMinorToStoreMajor(minor: number): number {
  const store = getStoreCurrency();
  return Math.round(fromMinor(convertMinor(minor, BASE_CURRENCY, store), store));
}
