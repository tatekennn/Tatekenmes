import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050505',
};

const TITLE = '覇気.com — 覇気のあるサイト';
const DESCRIPTION = '覇気.com は、覇気のあるサイトです。大画面いっぱいに「覇気」の文字を覇気たっぷりに表示します。';

export const metadata: Metadata = {
  metadataBase: new URL('https://xn--7qwx14d.com'),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: '覇気.com',
  keywords: ['覇気', '覇気.com', 'Haki', '日本語ドメイン'],
  alternates: {
    // 日本語 URL と punycode URL の重複を避けるため正規URLを明示
    canonical: 'https://xn--7qwx14d.com/',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://xn--7qwx14d.com/',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

// 検索エンジンにサイトの素性を伝える構造化データ（schema.org WebSite）
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '覇気.com',
  alternateName: 'Haki.com',
  url: 'https://xn--7qwx14d.com/',
  inLanguage: 'ja',
  description: DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
