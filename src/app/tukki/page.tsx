export { default } from './TukkiDynamic';

const TITLE = 'ツッキーくんの覇気レース | 覇気.com';
const DESCRIPTION = 'ツッキーくんと8人の仲間で覇気の早取りレース。定期的に増える覇気を集めよう。ぶつかると一瞬ストップ！';
const URL = 'https://tukki.xn--7qwx14d.com';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: '覇気.com', locale: 'ja_JP', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};
