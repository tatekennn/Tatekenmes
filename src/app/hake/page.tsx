import HakiGrowGame from '@/components/HakiGrowGame';

export const metadata = {
  title: '覇気育成 | 覇気.com',
  description:
    '漢字「覇気」を叩いて気を溜め、闘気→武装色→覇王色へと進化させるミニマル育成ゲーム。',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気育成 | 覇気.com',
    description: '覇気を叩いて育てろ。あなたはどの覇気に到達できる？',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気育成 | 覇気.com',
    description: '覇気を叩いて育てろ。あなたの覇気は何色？',
  },
};

export default function HakePage() {
  return <HakiGrowGame />;
}
