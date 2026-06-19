import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteData } from '@/content/site-data';
import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#f7fffd',
};

export const metadata: Metadata = {
  title: siteData.metadata.title,
  description: siteData.metadata.description,
  applicationName: '自分OS',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '自分OS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: '/icon', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
