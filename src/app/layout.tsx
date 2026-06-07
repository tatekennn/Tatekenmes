import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Noto_Serif_JP } from 'next/font/google';
import { siteData } from '@/content/site-data';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export const metadata: Metadata = {
  title: siteData.metadata.title,
  description: siteData.metadata.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${notoSerifJp.variable}`}>{children}</body>
    </html>
  );
}
