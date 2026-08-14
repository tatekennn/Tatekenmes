import type { Metadata } from 'next';
import EvilClient from './EvilClient';

export const metadata: Metadata = { title: 'evil.覇気.com — デモ' };

export default function EvilPage() {
  return <EvilClient />;
}
