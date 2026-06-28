import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気ラッシュ | 覇気.com',
  description: '金色ゾーンでタップ、覇気100で全消し。短時間で遊べる横画面Webゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気ラッシュ | 覇気.com',
    description: 'タップ主体、即リトライ、コンボ、ボス、覇王色バースト。人気Webゲームの型に寄せた覇気アクション。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気ラッシュ | 覇気.com',
    description: '金色ゾーンでタップ、覇気100で全消し。短時間で遊べる横画面Webゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
