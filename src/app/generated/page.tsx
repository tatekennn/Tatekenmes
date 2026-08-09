import type { Metadata } from 'next';
import HakiCharge from '../../components/HakiCharge';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// 入力名を表示用に整える（長すぎる値・空白を弾く）
function cleanName(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return '';
  return value.trim().slice(0, 30);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const name = cleanName((await searchParams).name) || '覇気';
  const title = `${name} | 覇気.com`;
  const description = `${name}覇気全開。クリックするほど覇気があふれる。`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: '覇気.com', locale: 'ja_JP', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function GeneratedPage({ searchParams }: { searchParams: SearchParams }) {
  const name = cleanName((await searchParams).name) || '覇気';
  return <HakiCharge name={name} />;
}
