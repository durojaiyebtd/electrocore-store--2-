import type { Metadata } from 'next';
import { ContentView } from '@/components/admin/ContentView';

export const metadata: Metadata = { title: 'Website content' };

export default function AdminContentPage() {
  return <ContentView />;
}
