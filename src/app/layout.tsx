import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteData } from '@/content/site-data';
import './globals.css';

const metadataBase = (() => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return new URL('http://localhost:3000');
  }

  try {
    return new URL(siteUrl);
  } catch {
    return new URL('http://localhost:3000');
  }
})();

export const metadata: Metadata = {
  title: {
    default: siteData.metadata.title,
    template: '%s | 天霧 澪',
  },
  metadataBase,
  description: siteData.metadata.description,
  keywords: ['天霧 澪', 'VTuber', 'オフィシャルサイト', '日記', 'キャラクターサイト', '観測'],
  openGraph: {
    title: siteData.metadata.title,
    description: siteData.metadata.description,
    locale: siteData.metadata.locale,
    type: 'website',
    images: [
      {
        url: siteData.generatedAssets.heroMain.src,
        alt: siteData.generatedAssets.heroMain.alt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteData.metadata.title,
    description: siteData.metadata.description,
    images: [siteData.generatedAssets.heroMain.src],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
