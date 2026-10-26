import type { Metadata } from 'next';
import { AdminRepairersView } from '@/components/admin/AdminRepairersView';

export const metadata: Metadata = { title: 'Repairers' };

export default function AdminRepairersPage() {
  return <AdminRepairersView />;
}
