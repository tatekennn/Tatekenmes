import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050505',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://xn--7qwx14d.com'),
  title: '覇気.com',
  description: '覇気を、大画面で。',
  applicationName: '覇気.com',
  openGraph: {
    title: '覇気.com',
    description: '覇気を、大画面で。',
    url: 'https://xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '覇気.com',
    description: '覇気を、大画面で。',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
