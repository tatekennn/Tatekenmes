import HakiGame from '@/components/HakiGame';

export const metadata = {
  title: '覇気解放 | 覇気.com',
  description: '長押しで覇気を溜め、金色の間で離す。操作ひとつの横画面ブラウザゲーム。',
  alternates: {
    canonical: 'https://game.xn--7qwx14d.com',
  },
  openGraph: {
    title: '覇気解放 | 覇気.com',
    description: '迫る相手を覇気の圧だけで止める。長押しして、金色で離す横画面ゲーム。',
    url: 'https://game.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気解放 | 覇気.com',
    description: '長押しで覇気を溜め、金色の間で離す。操作ひとつの横画面ブラウザゲーム。',
  },
};

export default function GamePage() {
  return <HakiGame />;
}
