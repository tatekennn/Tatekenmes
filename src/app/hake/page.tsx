import HakiGuardianGame from '@/components/HakiGuardianGame';

export const metadata = {
  title: '覇気守護 | 覇気.com',
  description:
    '中央の覇気を闇から守る防衛ゲーム。育って強くなり、最後は覇気があなたを守る。',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気守護 | 覇気.com',
    description: '中央の覇気を闇から守る防衛ゲーム。育って強くなり、最後は覇気があなたを守る。',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気守護 | 覇気.com',
    description: '中央の覇気を闇から守る防衛ゲーム。あなたはどこまで守り抜ける？',
  },
};

export default function HakePage() {
  return <HakiGuardianGame />;
}
