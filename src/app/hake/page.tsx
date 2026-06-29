import HakiWhackGame from '@/components/HakiWhackGame';

export const metadata = {
  title: '覇気出現 | 覇気.com',
  description:
    '10秒間に現れる「覇気」を叩き尽くせ。反射神経と連打のミニマルゲーム。',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気出現 | 覇気.com',
    description: '10秒間に現れる「覇気」を叩き尽くせ。あなたのスコアは？',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気出現 | 覇気.com',
    description: '10秒間に現れる「覇気」を叩き尽くせ。あなたの覇気値は何点？',
  },
};

export default function HakePage() {
  return <HakiWhackGame />;
}
