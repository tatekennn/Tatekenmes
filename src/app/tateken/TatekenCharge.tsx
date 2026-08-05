'use client';

import { useCallback, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

// クリック何回で MAX まで到達するか
const MAX_LEVEL = 12;

export default function TatekenCharge() {
  const [level, setLevel] = useState(0);

  const charge = level / MAX_LEVEL;
  const maxed = level >= MAX_LEVEL;

  const stage =
    level === 0 ? 'haki-charge--idle' : maxed ? 'haki-charge--max' : 'haki-charge--active';

  const boost = useCallback(() => {
    setLevel((current) => Math.min(current + 1, MAX_LEVEL));
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        boost();
      }
    },
    [boost],
  );

  return (
    <main
      className={`haki-stage haki-charge ${stage}`}
      style={{ '--charge': charge } as CSSProperties}
      onClick={boost}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label="クリックして たてけん の覇気をためる"
    >
      <div className="aura-burst" aria-hidden="true" />
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <div className="haki-ring" aria-hidden="true" />

      <h1 className="haki haki--name" aria-label="たてけん">
        たてけん
      </h1>

      {maxed ? (
        <p className="haki-cta haki-cta--max">覇 気 全 開</p>
      ) : (
        <p className="haki-cta">クリックしろ！</p>
      )}

      <div className="haki-gauge" aria-hidden="true">
        <span style={{ transform: `scaleX(${charge})` }} />
      </div>

      {/* MAX に到達した瞬間だけフラッシュを一度だけ再生する（key で毎回作り直す必要はない） */}
      {maxed && <div className="haki-flash" aria-hidden="true" />}
    </main>
  );
}
