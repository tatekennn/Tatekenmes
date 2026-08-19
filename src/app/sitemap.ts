import type { MetadataRoute } from 'next';

const BASE = 'https://xn--7qwx14d.com';

// 公開している主要ページのみを列挙する（demo/generated 等の内部用は含めない）。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE}/`,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
