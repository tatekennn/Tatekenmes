import type { Metadata } from 'next';
import ShopClient from './ShopClient';

export const metadata: Metadata = { title: 'shop.覇気.com — デモ' };

export default function ShopPage() {
  return <ShopClient />;
}
