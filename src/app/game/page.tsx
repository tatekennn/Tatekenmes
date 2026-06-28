import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気ラン | 覇気.com',
  description: '指で「覇」を動かし、雑念をかわして覇気を解放する2Dアーケードミニゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気ラン | 覇気.com',
    description: '45秒、生き残れ。雑念をかわして覇気を解放するSNS向け2Dミニゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気ラン | 覇気.com',
    description: '45秒、生き残れ。雑念をかわして覇気を解放するSNS向け2Dミニゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
