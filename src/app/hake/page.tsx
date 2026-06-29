import HakiTapGame from '@/components/HakiTapGame';

export const metadata = {
  title: '覇気連打 | 覇気.com',
  description:
    '10秒間で何回叩ける？漢字「覇気」を連打してスコアを競うミニマル連打ゲーム。',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気連打 | 覇気.com',
    description: '10秒間で何回叩ける？覇気を解放せよ。',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気連打 | 覇気.com',
    description: '10秒間で何回叩ける？あなたの覇気値は何点？',
  },
};

export default function HakePage() {
  return <HakiTapGame />;
}
