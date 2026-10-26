/** Shared (client + server safe) repair-service constants. No secrets, no server imports. */

export const REPAIR_STATUSES = [
  'SUBMITTED', 'REVIEWING', 'QUOTED', 'NEGOTIATING', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED',
] as const;
export type RepairStatusValue = (typeof REPAIR_STATUSES)[number];

export const REPAIR_STATUS_LABEL: Record<RepairStatusValue, string> = {
  SUBMITTED: 'Request received',
  REVIEWING: 'Being reviewed',
  QUOTED: 'Quotation sent',
  NEGOTIATING: 'Negotiating price',
  ACCEPTED: 'Price agreed',
  SCHEDULED: 'Appointment booked',
  IN_PROGRESS: 'Repair in progress',
  READY: 'Ready for collection',
  COMPLETED: 'Completed',
  REJECTED: 'Declined',
  CANCELLED: 'Cancelled',
};

/** Statuses after which the customer can no longer change the request. */
export const REPAIR_CLOSED: readonly RepairStatusValue[] = ['COMPLETED', 'REJECTED', 'CANCELLED'];

export const BOOKING_STATUS_LABEL = { PENDING: 'Awaiting confirmation', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled', COMPLETED: 'Completed' } as const;

export const SERVICE_MODES = ['WORKSHOP', 'ONSITE'] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];
export const SERVICE_MODE_LABEL: Record<ServiceMode, string> = { WORKSHOP: 'I will bring the device to your workshop', ONSITE: 'Repairer comes to my location (where offered)' };

export const DEVICE_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Desktop / PC', 'Printer', 'Other electronic device'] as const;

/** Service pages a request can be filed under (slugs match src/lib/services-content.ts). */
export const REPAIR_SERVICE_SLUGS = ['device-diagnosis-repair', 'smartphone-tablet-repair', 'laptop-repair', 'desktop-repair', 'data-recovery', 'custom-pc-assembly', 'other'] as const;

export const MAX_REPAIR_PHOTOS = 6;
export const MAX_REPAIR_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_MESSAGE_PHOTOS = 4;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}
