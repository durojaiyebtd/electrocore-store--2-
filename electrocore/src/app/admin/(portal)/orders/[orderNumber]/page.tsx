import type { Metadata } from 'next';
import { OrderDetailView } from '@/components/admin/OrderDetailView';

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

export default async function AdminOrderPage({ params }: PageProps) {
  const { orderNumber } = await params;
  return <OrderDetailView orderNumber={decodeURIComponent(orderNumber)} />;
}
