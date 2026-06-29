import HakiChargeGame from '@/components/HakiChargeGame';

export const metadata = {
  title: '覇気解放 | 覇気.com',
  description:
    '覇気をチャージしてピークで解放。溜めすぎると暴発。あなたの覇気は何色？',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気解放 | 覇気.com',
    description: '覇気をチャージしてピークで解放。溜めすぎると暴発。あなたの覇気は何色？',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気解放 | 覇気.com',
    description: '覇気をチャージしてピークで解放。あなたの覇気値は何点？',
  },
};

export default function HakePage() {
  return <HakiChargeGame />;
}
