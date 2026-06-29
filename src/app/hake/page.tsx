import HakiDomainGame from '@/components/HakiDomainGame';

export const metadata = {
  title: '覇気の領域 | 覇気.com',
  description:
    '覇気の圧で敵を祓う防衛ゲーム。中央の「覇気」を闇から守り、育て、最後は覇気が全てを圧倒する。',
  alternates: {
    canonical: 'https://xn--7qwx14d.com/hake',
  },
  openGraph: {
    title: '覇気の領域 | 覇気.com',
    description: '覇気の圧で敵を祓う防衛ゲーム。20ウェーブ、覇気を高めろ。',
    url: 'https://xn--7qwx14d.com/hake',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気の領域 | 覇気.com',
    description: '覇気の圧で敵を祓う防衛ゲーム。あなたはどこまで覇気を高められる？',
  },
};

export default function HakePage() {
  return <HakiDomainGame />;
}
