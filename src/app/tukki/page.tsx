export { default } from './TukkiDynamic';

const TITLE = 'ツッキーくんの覇気あつめ | 覇気.com';
const DESCRIPTION = 'ツッキーくんと草原を歩き回って、散らばった32個の覇気を集めよう。WASDで移動、Spaceでジャンプ。';
const URL = 'https://tukki.xn--7qwx14d.com';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: '覇気.com', locale: 'ja_JP', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};
