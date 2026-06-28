import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気ドライブ | 覇気.com',
  description: '避けて、集めて、撃ち落とす。28秒を生き残る高難度アーケード覇気ゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気ドライブ | 覇気.com',
    description: '左右に避けて覇気核を回収。満タンで覇王バースト。後半ほど激しくなるSNS向けアーケードゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気ドライブ | 覇気.com',
    description: '避けて、集めて、撃ち落とす。28秒を生き残る高難度アーケード覇気ゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
