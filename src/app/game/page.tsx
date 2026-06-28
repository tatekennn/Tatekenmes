import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気チャレンジ | 覇気.com',
  description: '長押しで覇気を溜めて、最高の一撃をSNSに叩き込むミニゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気チャレンジ | 覇気.com',
    description: 'あなたの覇気は何点？長押し一発、SNS向けミニゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気チャレンジ | 覇気.com',
    description: 'あなたの覇気は何点？長押し一発、SNS向けミニゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
