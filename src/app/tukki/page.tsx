export { default } from './TukkiDynamic';

const TITLE = 'ツッキーくんののんびり生活 | 覇気.com';
const DESCRIPTION = 'ツッキーくんと仲間たちの、のんびりした草原暮らし。お散歩、あいさつ、ベンチでひと休み。時間も順位も気にせず過ごそう。';
const URL = 'https://tukki.xn--7qwx14d.com';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: '覇気.com', locale: 'ja_JP', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};
