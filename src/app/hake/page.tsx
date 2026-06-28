import HakiPulseGame from '@/components/HakiPulseGame';

export const metadata = {
  title: '覇気脈 | 覇気.com',
  description:
    '巨大な「覇気」の脈動に合わせてタイミングを合わせるミニマルリズムゲーム。あなたの覇気は何コンボ続く？',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気脈 | 覇気.com',
    description:
      '巨大な「覇気」の脈動に合わせてタイミングを合わせるミニマルリズムゲーム。',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気脈 | 覇気.com',
    description: 'あなたの覇気は何コンボ続く？',
  },
};

export default function HakePage() {
  return <HakiPulseGame />;
}
