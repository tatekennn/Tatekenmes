'use client';

import { useCallback, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

// クリック何回で MAX まで到達するか（連打感を出すため多め）
const MAX_LEVEL = 40;

// クラッカーの紙吹雪の色
const CONFETTI_COLORS = ['#d7a92e', '#b31928', '#f7f1df', '#ffd700', '#ff5a5f', '#6fd0ff', '#8bff7a'];

type Confetti = {
  id: number;
  left: number; // % 起点（左下 or 右下のクラッカー口）
  top: number; // %
  tx: number; // px 飛ぶ距離X
  ty: number; // px 飛ぶ距離Y（負で上）
  rot: number; // deg 回転
  color: string;
  delay: number; // s
  width: number;
  height: number;
  round: boolean;
};

// 左右のクラッカー口から内側・上向きに吹き出す紙吹雪を生成する
function makeConfetti(): Confetti[] {
  const pieces: Confetti[] = [];
  const count = 110;
  for (let i = 0; i < count; i += 1) {
    const fromLeft = i % 2 === 0;
    // 画面座標(yは下向き)。左口は上右方向 [-80°,-20°]、右口は上左方向 [-160°,-100°]
    const angleDeg = fromLeft ? -20 - Math.random() * 60 : -100 - Math.random() * 60;
    const angle = (angleDeg * Math.PI) / 180;
    const dist = 320 + Math.random() * 520;
    const gravity = 140 + Math.random() * 360; // 放物線っぽく最後は落ちる
    pieces.push({
      id: i,
      left: fromLeft ? 8 : 92,
      top: 88,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist + gravity,
      rot: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.25,
      width: 7 + Math.random() * 6,
      height: 10 + Math.random() * 8,
      round: Math.random() < 0.3,
    });
  }
  return pieces;
}

export default function TatekenCharge() {
  const [level, setLevel] = useState(0);
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  const charge = level / MAX_LEVEL;
  const maxed = level >= MAX_LEVEL;

  const stage =
    level === 0 ? 'haki-charge--idle' : maxed ? 'haki-charge--max' : 'haki-charge--active';

  const boost = useCallback(() => {
    setLevel((current) => {
      const next = Math.min(current + 1, MAX_LEVEL);
      // MAX に到達した瞬間だけクラッカーを打ち上げる
      if (next === MAX_LEVEL && current < MAX_LEVEL) {
        setConfetti(makeConfetti());
      }
      return next;
    });
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

      {maxed && <div className="haki-flash" aria-hidden="true" />}

      {/* MAX 到達時のクラッカー（紙吹雪） */}
      {confetti.length > 0 && (
        <div className="cracker" aria-hidden="true">
          {confetti.map((p) => (
            <span
              key={p.id}
              className={`cracker-piece${p.round ? ' cracker-piece--round' : ''}`}
              style={
                {
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: `${p.width}px`,
                  height: `${p.height}px`,
                  background: p.color,
                  animationDelay: `${p.delay}s`,
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  '--rot': `${p.rot}deg`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
