'use client';

import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

// クリック何回で MAX まで到達するか
const MAX_LEVEL = 50;

// クラッカーの紙吹雪の色
const CONFETTI_COLORS = ['#d7a92e', '#b31928', '#f7f1df', '#ffd700', '#ff5a5f', '#6fd0ff', '#8bff7a'];

type Confetti = {
  id: number;
  left: number;
  top: number;
  tx: number;
  ty: number;
  rot: number;
  color: string;
  delay: number;
  width: number;
  height: number;
  round: boolean;
};

type Polyline = { points: string; main: boolean };

type Strike = {
  id: number;
  flash: number; // フラッシュ強度 0〜1
  polylines: Polyline[];
};

type Props = {
  /** 中央に大きく表示する名前 */
  name: string;
  /** MAX 到達時の文言。未指定なら「<name>覇気全開」 */
  finaleText?: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// 左右のクラッカー口から吹き出す紙吹雪を生成する
function makeConfetti(): Confetti[] {
  const pieces: Confetti[] = [];
  const count = 130;
  for (let i = 0; i < count; i += 1) {
    const fromLeft = i % 2 === 0;
    const angleDeg = fromLeft ? -20 - Math.random() * 60 : -100 - Math.random() * 60;
    const angle = (angleDeg * Math.PI) / 180;
    const dist = 320 + Math.random() * 560;
    const gravity = 140 + Math.random() * 380;
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

// 枝分かれする稲妻を手続き的に生成する（viewBox 0..100 の正規化座標）。
// charge が高いほど本数が増えて派手になる。
function makeStrike(charge: number, id: number): Strike {
  const polylines: Polyline[] = [];
  const boltCount = 1 + Math.round(charge * 3); // 1〜4本

  for (let b = 0; b < boltCount; b += 1) {
    const segs = 12 + Math.floor(Math.random() * 8);
    const endY = 55 + Math.random() * 45;
    let x = 10 + Math.random() * 80;
    const main: Array<[number, number]> = [];
    for (let i = 0; i <= segs; i += 1) {
      const y = (endY * i) / segs;
      x = clamp(x + (Math.random() - 0.5) * 11, 2, 98);
      main.push([Number(x.toFixed(1)), Number(y.toFixed(1))]);
    }
    polylines.push({ points: main.map((p) => p.join(',')).join(' '), main: true });

    // 幹の途中から枝を伸ばす
    const branchCount = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < branchCount; k += 1) {
      const idx = 2 + Math.floor(Math.random() * Math.max(1, main.length - 4));
      let [bx, by] = main[idx];
      const dir = Math.random() < 0.5 ? -1 : 1;
      const bsegs = 3 + Math.floor(Math.random() * 5);
      const branch: Array<[number, number]> = [[bx, by]];
      for (let j = 0; j < bsegs; j += 1) {
        bx = clamp(bx + dir * (1.5 + Math.random() * 3) + (Math.random() - 0.5) * 4, 1, 99);
        by = clamp(by + 2 + Math.random() * 5, 0, 100);
        branch.push([Number(bx.toFixed(1)), Number(by.toFixed(1))]);
      }
      polylines.push({ points: branch.map((p) => p.join(',')).join(' '), main: false });
    }
  }

  return { id, flash: 0.4 + charge * 0.6, polylines };
}

export default function HakiCharge({ name, finaleText }: Props) {
  const [level, setLevel] = useState(0);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [shakeId, setShakeId] = useState(0);
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const strikeSeq = useRef(0);

  const charge = level / MAX_LEVEL;
  const maxed = level >= MAX_LEVEL;
  const surge = !maxed && charge >= 0.6; // 終盤の高揚状態
  const finale = finaleText ?? `${name}覇気全開`;

  const stage =
    level === 0 ? 'haki-charge--idle' : maxed ? 'haki-charge--max' : 'haki-charge--active';

  // 稲妻を1発落として一定時間後に消す
  const spawnStrike = useCallback((currentCharge: number) => {
    const id = strikeSeq.current;
    strikeSeq.current += 1;
    setStrikes((prev) => [...prev, makeStrike(currentCharge, id)]);
    window.setTimeout(() => {
      setStrikes((prev) => prev.filter((s) => s.id !== id));
    }, 480);
  }, []);

  const boost = useCallback(() => {
    // 覇気が高まるほど（charge^1.5 で終盤に急加速）演出が増える。MAX前のみ。
    if (!maxed && !prefersReducedMotion()) {
      const ramp = Math.pow(charge, 1.5);
      if (Math.random() < 0.1 + ramp * 0.6) {
        setShakeId((n) => n + 1);
      }
      if (Math.random() < 0.06 + ramp * 0.5) {
        spawnStrike(charge);
        setShakeId((n) => n + 1); // 落雷時は画面（名前）も揺らす
      }
    }

    setLevel((current) => {
      const next = Math.min(current + 1, MAX_LEVEL);
      if (next === MAX_LEVEL && current < MAX_LEVEL) {
        setConfetti(makeConfetti());
      }
      return next;
    });
  }, [charge, maxed, spawnStrike]);

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
      className={`haki-stage haki-charge ${stage}${surge ? ' haki-charge--surge' : ''}`}
      style={{ '--charge': charge } as CSSProperties}
      onClick={boost}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`クリックして ${name} の覇気をためる`}
    >
      <div className="aura-burst" aria-hidden="true" />
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <div className="haki-ring" aria-hidden="true" />

      {surge && <div className="surge-vignette" aria-hidden="true" />}

      {/* key が変わるたびに揺れアニメーションを再生する */}
      <div key={shakeId} className={`haki-shakebox${shakeId > 0 ? ' haki-shakebox--jolt' : ''}`}>
        <h1 className="haki haki--name" aria-label={name}>
          {name}
        </h1>
      </div>

      {maxed ? (
        <p className="haki-cta haki-cta--max">{finale}</p>
      ) : (
        <p className="haki-cta">クリックしろ！</p>
      )}

      <div className="haki-gauge" aria-hidden="true">
        <span style={{ transform: `scaleX(${charge})` }} />
      </div>

      {/* ダイナミックな稲妻（枝分かれ＋フラッシュ） */}
      {strikes.map((s) => (
        <div className="thunder" key={s.id} aria-hidden="true">
          <div className="thunder-flash" style={{ '--flash': s.flash } as CSSProperties} />
          <svg className="thunder-bolts" viewBox="0 0 100 100" preserveAspectRatio="none">
            {s.polylines.map((pl, i) => (
              <polyline
                key={i}
                points={pl.points}
                className={pl.main ? 'bolt bolt--main' : 'bolt bolt--branch'}
              />
            ))}
          </svg>
        </div>
      ))}

      {maxed && <div className="haki-flash" aria-hidden="true" />}

      {/* MAX: パチンコ風の大当たり電飾 */}
      {maxed && (
        <div className="jackpot" aria-hidden="true">
          <div className="jackpot-spin" />
          <div className="jackpot-flash" />
          <div className="jackpot-bulbs jackpot-bulbs--top" />
          <div className="jackpot-bulbs jackpot-bulbs--bottom" />
        </div>
      )}

      {/* MAX: クラッカー（紙吹雪） */}
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
