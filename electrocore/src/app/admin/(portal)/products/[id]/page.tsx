import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductFormLoader } from '@/components/admin/ProductForm';

export const metadata: Metadata = { title: 'Edit product' };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

export default async function AdminEditProductPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  return <ProductFormLoader productId={id} justCreated={created === '1'} />;
}
