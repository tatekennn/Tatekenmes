'use client';

import dynamic from 'next/dynamic';

const HakiStarGame = dynamic(() => import('@/components/HakiStarGame'), { ssr: false });

export default function HakeDynamic() {
  return <HakiStarGame />;
}
