import HakiActionGame from '@/components/HakiActionGame';

export const metadata = {
  title: '覇気アクション | 覇気.com',
  description: '巨大な実文字「覇気」そのものを足場にしてタップ移動する2Dアクションゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気アクション | 覇気.com',
    description: '小さな新卒キャラが、Canvasで描画された実文字「覇気」の形状マスク上を移動するゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気アクション | 覇気.com',
    description: '巨大な実文字「覇気」そのものを足場にしてタップ移動する2Dアクションゲーム。',
  },
};

export default function GamePage() {
  return <HakiActionGame />;
}
