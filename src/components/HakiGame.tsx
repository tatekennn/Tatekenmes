'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'ready' | 'charging' | 'judged';
type ResultRank = '無' | '微覇気' | '覇気' | '王の覇気' | '覇王色';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  glyph?: string;
};

type Slash = {
  t: number;
  angle: number;
  power: number;
};

const SWEET_SPOT = 87;
const STORAGE_KEY = 'haki-game-best-score';
const ranks: Array<{ min: number; name: ResultRank; label: string }> = [
  { min: 98, name: '覇王色', label: '周囲の予定が全て道を譲る' },
  { min: 92, name: '王の覇気', label: '会議室の空気を一撃で変える' },
  { min: 78, name: '覇気', label: '月曜朝に効く' },
  { min: 45, name: '微覇気', label: 'コンビニの自動ドアには勝てる' },
  { min: 0, name: '無', label: '今日は寝た方が強い' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rankFor(score: number) {
  return ranks.find((rank) => score >= rank.min) ?? ranks[ranks.length - 1];
}

function createBurst(width: number, height: number, power: number): Particle[] {
  const count = Math.round(34 + power * 0.9);
  const cx = width / 2;
  const cy = height / 2;
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.32;
    const speed = 2 + Math.random() * 8 + power / 18;
    const glyphChance = Math.random();
    return {
      x: cx + Math.cos(angle) * 20,
      y: cy + Math.sin(angle) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 36 + Math.random() * 34,
      size: 2 + Math.random() * 8 + power / 35,
      hue: glyphChance > 0.7 ? 47 : glyphChance > 0.42 ? 355 : 18,
      glyph: glyphChance > 0.86 ? ['覇', '気', '喝', '圧'][Math.floor(Math.random() * 4)] : undefined,
    };
  });
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const chargeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const slashRef = useRef<Slash | null>(null);
  const pointerDownRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [charge, setCharge] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [best, setBest] = useState(0);
  const [copied, setCopied] = useState(false);
  const [combo, setCombo] = useState(0);

  const result = useMemo(() => rankFor(score ?? 0), [score]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY) ?? '0');
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const pulse = 0.5 + Math.sin(time / 520) * 0.5;
    const activeCharge = chargeRef.current;

    context.clearRect(0, 0, width, height);

    const bg = context.createRadialGradient(width / 2, height * 0.47, 40, width / 2, height / 2, Math.max(width, height) * 0.72);
    bg.addColorStop(0, `rgba(215, 169, 46, ${0.1 + activeCharge / 580})`);
    bg.addColorStop(0.34, `rgba(179, 25, 40, ${0.1 + activeCharge / 760})`);
    bg.addColorStop(1, 'rgba(3, 3, 5, 0.98)');
    context.fillStyle = bg;
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(width / 2, height / 2);
    for (let ring = 0; ring < 7; ring += 1) {
      const radius = 52 + ring * 46 + activeCharge * 2.7 + pulse * 22;
      context.beginPath();
      context.ellipse(0, 0, radius * (1.14 + ring * 0.02), radius * 0.42, time / 2600 + ring * 0.18, 0, Math.PI * 2);
      context.strokeStyle = ring % 2 === 0 ? `rgba(215,169,46,${0.08 + activeCharge / 900})` : `rgba(179,25,40,${0.06 + activeCharge / 1100})`;
      context.lineWidth = 1.2 + ring * 0.16;
      context.stroke();
    }
    context.restore();

    context.save();
    context.translate(width / 2, height / 2);
    const kanjiSize = Math.min(width, height) * (0.28 + activeCharge / 620);
    context.font = `900 ${kanjiSize}px serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = `rgba(215, 169, 46, ${0.35 + activeCharge / 180})`;
    context.shadowBlur = 30 + activeCharge * 1.1;
    context.fillStyle = `rgba(247, 241, 223, ${0.26 + activeCharge / 170})`;
    context.fillText('覇', 0, 0);
    context.restore();

    if (slashRef.current) {
      const slash = slashRef.current;
      slash.t += 1;
      const alpha = Math.max(0, 1 - slash.t / 28);
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate(slash.angle);
      const slashGradient = context.createLinearGradient(-width * 0.42, 0, width * 0.42, 0);
      slashGradient.addColorStop(0, `rgba(255,255,255,0)`);
      slashGradient.addColorStop(0.45, `rgba(255,245,197,${alpha})`);
      slashGradient.addColorStop(0.56, `rgba(255,30,61,${alpha * 0.92})`);
      slashGradient.addColorStop(1, `rgba(255,255,255,0)`);
      context.strokeStyle = slashGradient;
      context.lineWidth = 9 + slash.power / 6;
      context.shadowColor = 'rgba(255, 28, 62, 0.9)';
      context.shadowBlur = 24 + slash.power / 2;
      context.beginPath();
      context.moveTo(-width * 0.42, 0);
      context.quadraticCurveTo(0, -38 - slash.power, width * 0.42, 0);
      context.stroke();
      context.restore();
      if (slash.t > 28) slashRef.current = null;
    }

    particlesRef.current = particlesRef.current.filter((particle) => particle.life < particle.maxLife);
    particlesRef.current.forEach((particle) => {
      particle.life += 1;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.973;
      particle.vy *= 0.973;
      particle.vy += 0.025;
      const alpha = 1 - particle.life / particle.maxLife;
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.fillStyle = `hsla(${particle.hue}, 90%, 62%, ${alpha})`;
      context.shadowColor = `hsla(${particle.hue}, 90%, 62%, ${alpha})`;
      context.shadowBlur = particle.size * 3.2;
      if (particle.glyph) {
        context.font = `900 ${particle.size * 4.6}px serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(particle.glyph, particle.x, particle.y);
      } else {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });

    if (phaseRef.current === 'charging' && startRef.current !== null) {
      const elapsed = time - startRef.current;
      const nextCharge = (Math.sin(elapsed / 415 - Math.PI / 2) + 1) * 50;
      const jitter = Math.sin(elapsed / 49) * 2.2 + Math.sin(elapsed / 91) * 1.4;
      chargeRef.current = clamp(nextCharge + jitter, 0, 100);
      setCharge(chargeRef.current);
    }

    frameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
      const height = Math.max(440, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext('2d');
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [draw]);

  const startCharge = useCallback(() => {
    if (phaseRef.current === 'charging') return;
    pointerDownRef.current = true;
    startRef.current = performance.now();
    chargeRef.current = 0;
    setCharge(0);
    setCopied(false);
    setPhase('charging');
  }, []);

  const release = useCallback(() => {
    if (phaseRef.current !== 'charging' || !pointerDownRef.current) return;
    pointerDownRef.current = false;
    const current = chargeRef.current;
    const accuracy = Math.max(0, 100 - Math.abs(SWEET_SPOT - current) * 2.15);
    const spice = Math.max(0, 8 - Math.abs(SWEET_SPOT - current)) * 1.8;
    const nextScore = Math.round(clamp(accuracy + spice, 0, 100));
    const nextCombo = nextScore >= 78 ? combo + 1 : 0;
    const finalScore = clamp(nextScore + Math.min(nextCombo, 5), 0, 100);
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas ? canvas.width / dpr : window.innerWidth;
    const height = canvas ? canvas.height / dpr : window.innerHeight;

    setScore(finalScore);
    setCombo(nextCombo);
    setPhase('judged');
    chargeRef.current = 0;
    setCharge(0);
    particlesRef.current.push(...createBurst(width, height, finalScore));
    slashRef.current = { t: 0, angle: -0.46 + Math.random() * 0.18, power: finalScore };

    if (finalScore > best) {
      setBest(finalScore);
      window.localStorage.setItem(STORAGE_KEY, String(finalScore));
    }
  }, [best, combo]);

  const reset = useCallback(() => {
    pointerDownRef.current = false;
    startRef.current = null;
    chargeRef.current = 0;
    particlesRef.current = [];
    slashRef.current = null;
    setCharge(0);
    setScore(null);
    setCopied(false);
    setPhase('ready');
  }, []);

  const shareText = useMemo(() => {
    const value = score ?? best;
    const rank = rankFor(value);
    return `私の覇気は「${rank.name}」${value}点。${rank.label}\nあなたは何点？ #覇気チャレンジ https://game.xn--7qwx14d.com`;
  }, [best, score]);

  const share = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '覇気チャレンジ', text: shareText, url: 'https://game.xn--7qwx14d.com' });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
      }
    } catch {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    }
  }, [shareText]);

  return (
    <main className="game-shell" aria-label="覇気チャレンジ">
      <canvas ref={canvasRef} className="game-canvas" aria-hidden="true" />
      <section className="game-panel">
        <p className="game-kicker">game.覇気.com</p>
        <h1>覇気チャレンジ</h1>
        <p className="game-copy">長押しで覇気を溜め、赤い危険域の手前で放て。87%付近が一番バズる。</p>

        <div className="charge-card" aria-live="polite">
          <div className="charge-meta">
            <span>{phase === 'charging' ? 'CHARGING' : phase === 'judged' ? result.name : 'READY'}</span>
            <strong>{phase === 'judged' ? `${score}点` : `${Math.round(charge)}%`}</strong>
          </div>
          <div className="charge-track">
            <span className="sweet-spot" />
            <span className="charge-fill" style={{ width: `${phase === 'judged' ? score ?? 0 : charge}%` }} />
          </div>
          <div className="charge-hint">
            <span>弱</span>
            <span>覇王</span>
            <span>暴発</span>
          </div>
        </div>

        {phase === 'judged' ? (
          <div className="result-card">
            <p className="result-rank">{result.name}</p>
            <p>{result.label}</p>
            <p className="best-score">BEST {best} / COMBO {combo}</p>
            <div className="game-actions">
              <button type="button" className="primary-action" onClick={reset}>もう一度放つ</button>
              <button type="button" className="ghost-action" onClick={share}>{copied ? 'コピー済み' : '結果をシェア'}</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="haki-button"
            onPointerDown={startCharge}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={release}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') startCharge();
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') release();
            }}
          >
            <span>{phase === 'charging' ? '離して放つ' : '長押しで覇気を溜める'}</span>
          </button>
        )}
      </section>
    </main>
  );
}
