import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'DNS管理 | 覇気.com',
  description: '取得したサブドメインのDNS設定を管理します。',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
