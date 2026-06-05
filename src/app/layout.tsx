import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteData } from '@/content/site-data';
import './globals.css';

export const metadata: Metadata = {
  title: siteData.metadata.title,
  description: siteData.metadata.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
