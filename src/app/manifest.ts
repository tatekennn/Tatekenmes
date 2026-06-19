import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '自分OS',
    short_name: '自分OS',
    description: '打刻、有料列車、ランチ、趣味をまとめて管理する自分用OS。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7fffd',
    theme_color: '#f7fffd',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
