import type { Metadata } from 'next';
import { InventoryView } from '@/components/admin/InventoryView';

export const metadata: Metadata = { title: 'Inventory' };

export default function AdminInventoryPage() {
  return <InventoryView />;
}
