'use client';

import { useEffect, useState } from 'react';

// トップで覇気を楽しみ始めた人の邪魔をしないよう、
// クリックのたびに薄くなり HIDE_AFTER 回で消える控えめな誘導。
const HIDE_AFTER = 3;

export default function HomeCta() {
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    const onClick = () => setClicks((c) => c + 1);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (clicks >= HIDE_AFTER) return null;

  return (
    <a href="/apply" className={`home-cta${clicks > 0 ? ' home-cta--dim' : ''}`}>
      ⚡ あなたの「〇〇の.覇気.com」をつくる
    </a>
  );
}
