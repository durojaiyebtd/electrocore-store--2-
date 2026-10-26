/** Data shapes shared by the repair-service API, customer pages and admin pages. */
import type { RepairStatusValue } from '@/lib/repair-constants';

export interface RepairImageDTO { id: string; url: string; fileName: string | null }

export interface RepairMessageDTO {
  id: string;
  sender: 'CUSTOMER' | 'ADMIN';
  authorName: string;
  body: string;
  images: RepairImageDTO[];
  createdAt: string;
}

export interface RepairOfferDTO {
  id: string;
  by: 'ADMIN' | 'CUSTOMER';
  amount: number;
  note: string | null;
  turnaround: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';
  createdAt: string;
  respondedAt: string | null;
}

export interface RepairEventDTO { id: string; kind: string; note: string; actor: string; createdAt: string }

export interface RepairBookingDTO {
  id: string;
  reference: string;
  repairerId: string;
  repairerName: string;
  startsAt: string;
  endsAt: string;
  mode: 'WORKSHOP' | 'ONSITE';
  address: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  cancelReason: string | null;
}

export interface RepairPaymentOptionsDTO {
  paystack: boolean;
  bank: { bankName: string; accountName: string; accountNumber: string } | null;
  office: { address: string | null; hours: string };
}

export interface RepairRequestDTO {
  workshopAddress: string | null;
  id: string;
  reference: string;
  accessCode?: string;
  name: string;
  email: string;
  phone: string;
  serviceSlug: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  faultSummary: string;
  faultDetails: string;
  serviceMode: 'WORKSHOP' | 'ONSITE';
  address: string | null;
  status: RepairStatusValue;
  repairerId: string | null;
  repairerName: string | null;
  agreedAmount: number | null;
  paidAmount: number;
  paymentMethod: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  images: RepairImageDTO[];
  messages: RepairMessageDTO[];
  offers: RepairOfferDTO[];
  events: RepairEventDTO[];
  bookings: RepairBookingDTO[];
}

export interface RepairListItemDTO {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  deviceLabel: string;
  faultSummary: string;
  status: RepairStatusValue;
  agreedAmount: number | null;
  paidAmount: number;
  repairerName: string | null;
  photoCount: number;
  needsReply: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Where customers bring devices (from the business address settings); null when not configured yet. */
export interface OfficeDTO { address: string | null; hours: string }

export interface RepairerDTO {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  phone: string | null;
  specialities: string[];
  serviceAreas: string[];
  offersOnsite: boolean;
  workDays: number[];
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  active: boolean;
}

export interface SlotDTO { time: string; label: string; available: boolean }
