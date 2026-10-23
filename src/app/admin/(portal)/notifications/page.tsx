import type { Metadata } from 'next';
import { NotificationsView } from '@/components/admin/NotificationsView';

export const metadata: Metadata = { title: 'Notifications' };

export default function AdminNotificationsPage() {
  return <NotificationsView />;
}
