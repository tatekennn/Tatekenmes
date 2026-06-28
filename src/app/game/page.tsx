import HakiActionGame from '@/components/HakiActionGame';

export const metadata = {
  title: '覇気アクション | 覇気.com',
  description: '巨大な漢字「覇気」の筆画をタップして一直線に移動する2Dアクションゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気アクション | 覇気.com',
    description: '小さな新卒キャラが巨大な「覇気」の筆画を飛び移り、移動ルート上の敵を倒すゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気アクション | 覇気.com',
    description: '巨大な漢字「覇気」の筆画をタップして一直線に移動する2Dアクションゲーム。',
  },
};

export default function GamePage() {
  return <HakiActionGame />;
}
