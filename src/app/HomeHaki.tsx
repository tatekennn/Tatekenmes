'use client';

import { useState } from 'react';

// トップの大きな文字を 日本語「覇気」⇔ 英語「Haki」で切り替える。
// 右上の小さな JP/EN トグルで操作する。
export default function HomeHaki() {
  const [en, setEn] = useState(false);

  return (
    <>
      <div className="lang-toggle" role="group" aria-label="言語切り替え / language">
        <button
          type="button"
          className={`lang-toggle__btn${en ? '' : ' is-active'}`}
          aria-pressed={!en}
          onClick={() => setEn(false)}
        >
          JP
        </button>
        <span className="lang-toggle__sep">|</span>
        <button
          type="button"
          className={`lang-toggle__btn${en ? ' is-active' : ''}`}
          aria-pressed={en}
          onClick={() => setEn(true)}
        >
          EN
        </button>
      </div>

      <h1 className={`haki${en ? ' haki--en' : ''}`} aria-label={en ? 'Haki' : '覇気'}>
        {en ? 'Haki' : '覇気'}
      </h1>
    </>
  );
}
