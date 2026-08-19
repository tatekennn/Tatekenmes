import type { MetadataRoute } from 'next';

const BASE = 'https://xn--7qwx14d.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 内部用・デモ用の生成ページは検索対象から外す
      disallow: ['/generated', '/demo/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
