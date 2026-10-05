'use client';

import dynamic from 'next/dynamic';

const TukkiWorld = dynamic(() => import('@/components/TukkiWorld'), { ssr: false });

export default function TukkiDynamic() {
  return <TukkiWorld />;
}
