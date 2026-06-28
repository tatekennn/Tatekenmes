import HakiSuikaGame from '@/components/HakiSuikaGame';

export const metadata = {
  title: '覇気合成 | 覇気.com',
  description:
    '漢字を合体させて頂点「覇気」を目指すミニマル物理合成ゲーム。あなたの覇気は何点？',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気合成 | 覇気.com',
    description: '漢字を合体させて頂点「覇気」を目指すミニマル物理合成ゲーム。',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気合成 | 覇気.com',
    description: '漢字を合体させて頂点「覇気」を目指す。あなたの覇気は何点？',
  },
};

export default function HakePage() {
  return <HakiSuikaGame />;
}
