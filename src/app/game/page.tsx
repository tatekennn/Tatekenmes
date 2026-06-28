import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気仕分け | 覇気.com',
  description: '流れてくる現実を中央で覇気承認する、15秒ワンタップ仕分けゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気仕分け | 覇気.com',
    description: '月曜、なるはや、通知99+。現実が中央に来た瞬間、覇気で承認するSNS向けミニゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気仕分け | 覇気.com',
    description: '現実が中央に来た瞬間、覇気で承認する15秒ワンタップゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
