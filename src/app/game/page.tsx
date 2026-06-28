import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気一閃 | 覇気.com',
  description: '金色の間に入った瞬間タップ。余裕があればスワイプで一閃。横画面の覇気ゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気一閃 | 覇気.com',
    description: '迫る相手をタップで止める。余裕があればスワイプでまとめて一閃。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気一閃 | 覇気.com',
    description: '金色の間に入った瞬間タップ。余裕があればスワイプで一閃。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
