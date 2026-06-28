import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気二十試練 | 覇気.com',
  description: '二十の試練を突破し、覇王門を割れ。残機3で挑むインディー風ブラウザゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気二十試練 | 覇気.com',
    description: '二十の試練を突破し、覇王門を割れ。残機3で挑むインディー風ブラウザゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気二十試練 | 覇気.com',
    description: '二十の試練を突破し、覇王門を割れ。残機3で挑むインディー風ブラウザゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
