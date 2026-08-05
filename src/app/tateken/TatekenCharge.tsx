'use client';

import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

// クリック何回で MAX まで到達するか（連打感を出すため多め）
const MAX_LEVEL = 100;

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

type Bolt = {
  id: number;
  left: number; // % 落雷の水平位置
  mirror: boolean; // 形の左右反転でバリエーション
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

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
  const [shakeId, setShakeId] = useState(0);
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const boltSeq = useRef(0);

  const charge = level / MAX_LEVEL;
  const maxed = level >= MAX_LEVEL;

  const stage =
    level === 0 ? 'haki-charge--idle' : maxed ? 'haki-charge--max' : 'haki-charge--active';

  // 落雷を1発落として一定時間後に消す
  const spawnBolt = useCallback(() => {
    const id = boltSeq.current;
    boltSeq.current += 1;
    setBolts((prev) => [...prev, { id, left: 8 + Math.random() * 84, mirror: Math.random() < 0.5 }]);
    window.setTimeout(() => {
      setBolts((prev) => prev.filter((b) => b.id !== id));
    }, 650);
  }, []);

  const boost = useCallback(() => {
    // 覇気が高まるほど「ぐらつき」「落雷」が起きやすくなる（MAX前のみ）
    if (!maxed && !prefersReducedMotion()) {
      if (Math.random() < 0.15 + charge * 0.25) {
        setShakeId((n) => n + 1);
      }
      if (Math.random() < 0.08 + charge * 0.2) {
        spawnBolt();
      }
    }

    setLevel((current) => {
      const next = Math.min(current + 1, MAX_LEVEL);
      // MAX に到達した瞬間だけクラッカーを打ち上げる
      if (next === MAX_LEVEL && current < MAX_LEVEL) {
        setConfetti(makeConfetti());
      }
      return next;
    });
  }, [charge, maxed, spawnBolt]);

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

      {/* key が変わるたびに揺れアニメーションを再生する */}
      <div
        key={shakeId}
        className={`haki-shakebox${shakeId > 0 ? ' haki-shakebox--jolt' : ''}`}
      >
        <h1 className="haki haki--name" aria-label="たてけん">
          たてけん
        </h1>
      </div>

      {maxed ? (
        <p className="haki-cta haki-cta--max">覇 気 全 開</p>
      ) : (
        <p className="haki-cta">クリックしろ！</p>
      )}

      <div className="haki-gauge" aria-hidden="true">
        <span style={{ transform: `scaleX(${charge})` }} />
      </div>

      {maxed && <div className="haki-flash" aria-hidden="true" />}

      {/* たまに降る落雷 */}
      {bolts.map((b) => (
        <div className="thunder" key={b.id} aria-hidden="true">
          <div className="thunder-flash" style={{ '--x': `${b.left}%` } as CSSProperties} />
          <svg
            className="thunder-bolt"
            style={{
              left: `${b.left}%`,
              transform: `translateX(-50%)${b.mirror ? ' scaleX(-1)' : ''}`,
            }}
            viewBox="0 0 100 300"
            preserveAspectRatio="none"
          >
            <polyline points="52,0 38,92 64,104 30,196 58,206 26,300" />
          </svg>
        </div>
      ))}

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
