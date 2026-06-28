import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気スイング | 覇気.com',
  description: 'ネクタイで巨大な「覇気」にぶら下がる、スマホ向け物理アクションゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気スイング | 覇気.com',
    description: '長押しで赤いネクタイワイヤーを伸ばし、巨大な「覇気」の線に引っかけて飛ぶ新卒スイングゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気スイング | 覇気.com',
    description: 'ネクタイで巨大な「覇気」にぶら下がる、スマホ向け物理アクションゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
