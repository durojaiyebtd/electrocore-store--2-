import type { Metadata } from 'next';
import { AdminRepairDetailView } from '@/components/admin/AdminRepairDetailView';

export const metadata: Metadata = { title: 'Repair request' };

export default async function AdminRepairPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminRepairDetailView id={id} />;
}
