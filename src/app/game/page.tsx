import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気ドーム3D | 覇気.com',
  description: '奥から迫る雑念をかわし、空間覇気で吹き飛ばす3D風アーケードミニゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気ドーム3D | 覇気.com',
    description: '45秒の立体サバイバル。雑念をかわして奥行きごと覇気を解放するSNS向け3Dゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気ドーム3D | 覇気.com',
    description: '45秒の立体サバイバル。雑念をかわして奥行きごと覇気を解放するSNS向け3Dゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
