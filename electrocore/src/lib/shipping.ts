/**
 * Delivery fee rules (shared by the checkout page estimate and the server,
 * which is always the source of truth). All amounts are NGN kobo.
 */
import { toMinor } from './currency';

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];

interface ShippingZone {
  id: 'A' | 'B' | 'C';
  label: string;
  fee: number;
  eta: string;
  states: readonly string[];
}

export const SHIPPING_ZONES: readonly ShippingZone[] = [
  {
    id: 'A',
    label: 'Lagos & South-West hub',
    fee: toMinor(4500),
    eta: '1–2 business days',
    states: ['Lagos', 'Ogun', 'Oyo'],
  },
  {
    id: 'B',
    label: 'Major cities',
    fee: toMinor(6500),
    eta: '2–4 business days',
    states: ['FCT - Abuja', 'Osun', 'Ondo', 'Ekiti', 'Kwara', 'Edo', 'Delta', 'Rivers', 'Anambra', 'Enugu', 'Kano', 'Kaduna', 'Plateau', 'Akwa Ibom', 'Imo', 'Abia', 'Cross River'],
  },
  {
    id: 'C',
    label: 'Other states',
    fee: toMinor(8500),
    eta: '3–6 business days',
    states: [],
  },
];

export function isNigerianState(value: string): value is NigerianState {
  return (NIGERIAN_STATES as readonly string[]).includes(value);
}

export function zoneForState(state: string): ShippingZone {
  return SHIPPING_ZONES.find((zone) => zone.states.includes(state)) ?? SHIPPING_ZONES[SHIPPING_ZONES.length - 1];
}

export function freeShippingThreshold(): number {
  const naira = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_NGN ?? '500000');
  return toMinor(Number.isFinite(naira) && naira >= 0 ? naira : 500000);
}

export interface ShippingQuote {
  fee: number;
  zoneLabel: string;
  eta: string;
  isFree: boolean;
  reason: 'NO_PHYSICAL_ITEMS' | 'FREE_THRESHOLD' | 'ZONE_RATE' | 'STATE_REQUIRED';
}

/**
 * @param subtotal  cart subtotal in NGN kobo
 * @param state     delivery state (may be empty before the shopper picks one)
 * @param hasPhysicalItems  false when the cart only has software/services
 */
export function quoteShipping(subtotal: number, state: string, hasPhysicalItems: boolean): ShippingQuote {
  if (!hasPhysicalItems) {
    return { fee: 0, zoneLabel: 'No delivery needed', eta: 'Digital / service fulfilment', isFree: true, reason: 'NO_PHYSICAL_ITEMS' };
  }
  const zone = state ? zoneForState(state) : null;
  if (subtotal >= freeShippingThreshold()) {
    return { fee: 0, zoneLabel: zone?.label ?? 'Nationwide', eta: zone?.eta ?? '1–6 business days', isFree: true, reason: 'FREE_THRESHOLD' };
  }
  if (!zone) {
    return { fee: 0, zoneLabel: 'Select a state', eta: '', isFree: false, reason: 'STATE_REQUIRED' };
  }
  return { fee: zone.fee, zoneLabel: zone.label, eta: zone.eta, isFree: false, reason: 'ZONE_RATE' };
}
