import type { Metadata } from 'next';
import { SettingsView } from '@/components/admin/SettingsView';

export const metadata: Metadata = { title: 'Settings' };

export default function AdminSettingsPage() {
  return <SettingsView />;
}
