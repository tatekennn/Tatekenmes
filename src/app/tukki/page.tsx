export { default } from './TukkiDynamic';

const TITLE = 'ツッキーくん | 覇気.com';
const DESCRIPTION = 'ツッキーくんが3D空間を縦横無尽に飛び回る。WASDで移動、Spaceで上昇。';
const URL = 'https://tukki.xn--7qwx14d.com';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: '覇気.com', locale: 'ja_JP', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};
