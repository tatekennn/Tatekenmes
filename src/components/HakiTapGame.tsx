'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'start' | 'playing' | 'over';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'circle' | 'text';
  text?: string;
}

export default function HakiTapGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>('start');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [displayCombo, setDisplayCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const [tapScale, setTapScale] = useState(1);
  const [tick, setTick] = useState(0); // force hud re-render for particles from RAF

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const lastTapRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboDecayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Load best                                                        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      const b = localStorage.getItem('ht-best');
      if (b) setBest(Number(b));
    } catch {}
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Game timer                                                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setTimeLeft(10);
    scoreRef.current = 0;
    comboRef.current = 0;
    lastTapRef.current = 0;
    particlesRef.current = [];
    setScore(0);
    setDisplayCombo(0);
    setTapScale(1);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = +(prev - 0.05).toFixed(2);
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setPhase('over');
          try {
            const final = scoreRef.current;
            setBest((prevBest) => {
              const nb = Math.max(prevBest, final);
              localStorage.setItem('ht-best', String(nb));
              return nb;
            });
          } catch {}
          return 0;
        }
        return next;
      });
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---------------------------------------------------------------- */
  /*  Combo decay                                                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    comboDecayRef.current = setInterval(() => {
      const now = performance.now();
      if (now - lastTapRef.current > 350 && comboRef.current > 0) {
        comboRef.current = 0;
        setDisplayCombo(0);
      }
    }, 50);
    return () => {
      if (comboDecayRef.current) clearInterval(comboDecayRef.current);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Canvas loop                                                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let lastTs = performance.now();

    const loop = (ts: number) => {
      let dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (dt > 0.1) dt = 0.1;

      // Particles
      const pts = particlesRef.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 60 * dt;
        p.life -= dt;
        if (p.life <= 0) pts.splice(i, 1);
      }

      // Shake decay (read via CSS transition, but also decay here if needed)
      setShake((s) => {
        const nx = s.x * 0.82;
        const ny = s.y * 0.82;
        if (Math.abs(nx) < 0.5 && Math.abs(ny) < 0.5) return { x: 0, y: 0 };
        return { x: nx, y: ny };
      });

      // Clear
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Aura background based on combo
      const aura = comboRef.current;
      if (aura >= 20) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, window.innerWidth * 0.55);
        const a = Math.min(0.35, (aura - 20) / 180);
        if (aura >= 80) {
          grad.addColorStop(0, `rgba(255, 50, 50, ${a})`);
          grad.addColorStop(1, 'rgba(40,0,0,0)');
        } else {
          grad.addColorStop(0, `rgba(215, 169, 46, ${a})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      }

      // Draw particles
      for (const p of pts) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        if (p.type === 'circle') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.font = `900 ${p.size}px ui-serif, 'Hiragino Mincho ProN', serif`;
          ctx.fillStyle = p.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text || '', p.x, p.y);
        }
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Juice helpers                                                    */
  /* ---------------------------------------------------------------- */
  const triggerShake = useCallback((intensity: number) => {
    setShake({
      x: (Math.random() - 0.5) * intensity,
      y: (Math.random() - 0.5) * intensity,
    });
  }, []);

  const spawnParticles = useCallback((x: number, y: number, combo: number) => {
    const count = Math.min(4 + Math.floor(combo / 8), 24);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 160 + combo * 2;
      const size = 1.5 + Math.random() * 4 + combo * 0.06;
      let color = '#f7f1df';
      if (combo >= 80) color = Math.random() > 0.5 ? '#ff4040' : '#ffd700';
      else if (combo >= 40) color = '#d7a92e';
      else if (combo >= 20) color = '#e8d5a3';

      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.3 + Math.random() * 0.5,
        maxLife: 1,
        size,
        color,
        type: 'circle',
      });
    }

    if (combo > 0 && combo % 10 === 0) {
      particlesRef.current.push({
        x,
        y: y - 60,
        vx: 0,
        vy: -70,
        life: 0.9,
        maxLife: 1,
        size: 18 + combo * 0.12,
        color: combo >= 80 ? '#ff3b3b' : '#d7a92e',
        type: 'text',
        text: `${combo}連打!`,
      });
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Input                                                            */
  /* ---------------------------------------------------------------- */
  const handleTap = useCallback(
    (e?: React.PointerEvent) => {
      if (phase === 'start') {
        setPhase('playing');
        return;
      }
      if (phase === 'over') {
        setPhase('start');
        return;
      }
      if (phase !== 'playing') return;

      const now = performance.now();
      if (now - lastTapRef.current < 25) return; // 25ms macro guard
      lastTapRef.current = now;

      // Score: base 1 + bonus every 20 combo
      const add = 1 + Math.floor(comboRef.current / 20);
      scoreRef.current += add;
      setScore(scoreRef.current);

      comboRef.current += 1;
      setDisplayCombo(comboRef.current);

      // Tap visual pop
      setTapScale(1.12);
      setTimeout(() => setTapScale(1), 60);

      // Shake
      const intensity = Math.min(comboRef.current * 0.35 + 1.5, 14);
      triggerShake(intensity);

      // Particles
      const cx = window.innerWidth / 2 + (Math.random() - 0.5) * 80;
      const cy = window.innerHeight / 2 + (Math.random() - 0.5) * 80;
      spawnParticles(cx, cy, comboRef.current);
    },
    [phase, triggerShake, spawnParticles]
  );

  /* ---------------------------------------------------------------- */
  /*  Rank                                                             */
  /* ---------------------------------------------------------------- */
  const currentRank = (() => {
    const s = score;
    if (s >= 300) return { title: '覇王', sub: '海賊王に必要な覇気', color: '#ff2a2a' };
    if (s >= 200) return { title: '覇王色の覇気', sub: '王の資格を持つ者', color: '#d72020' };
    if (s >= 150) return { title: '覇気', sub: '圧倒的な存在感', color: '#d7a92e' };
    if (s >= 100) return { title: '闘気', sub: '闘争心に燃える', color: '#e8d5a3' };
    if (s >= 60) return { title: '気', sub: '普通の人の数倍', color: '#f0e8d0' };
    return { title: '雑魚', sub: 'まずは気配を感じろ', color: '#888' };
  })();

  /* ---------------------------------------------------------------- */
  /*  Dynamic text color                                               */
  /* ---------------------------------------------------------------- */
  const hakiColor =
    displayCombo >= 80 ? '#ff3b3b' :
    displayCombo >= 40 ? '#d7a92e' :
    displayCombo >= 20 ? '#e8d5a3' :
    '#f7f1df';

  const hakiShadow =
    displayCombo >= 80
      ? '0 0 60px rgba(255,59,59,0.85), 0 0 140px rgba(179,25,40,0.5)'
      : displayCombo >= 40
      ? '0 0 40px rgba(215,169,46,0.75)'
      : '0 0 20px rgba(247,241,223,0.25)';

  return (
    <div
      onPointerDown={handleTap}
      style={{
        position: 'fixed',
        inset: 0,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'pointer',
        background: '#0c0a08',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Central Haki Character */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translate(${shake.x}px, ${shake.y}px) scale(${tapScale})`,
          transition: 'transform 60ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          style={{
            fontFamily: "ui-serif, 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
            fontSize: 'clamp(4.5rem, 24vw, 16rem)',
            fontWeight: 900,
            color: hakiColor,
            textShadow: hakiShadow,
            lineHeight: 1,
            letterSpacing: '0.05em',
            willChange: 'transform',
          }}
        >
          覇気
        </div>
      </div>

      {/* HUD */}
      {phase === 'playing' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: 'max(1.2rem, env(safe-area-inset-top)) max(1.2rem, env(safe-area-inset-right)) 0 max(1.2rem, env(safe-area-inset-left))',
            pointerEvents: 'none',
            fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
            color: '#f7f1df',
          }}
        >
          <div>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>SCORE</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#d7a92e' }}>
              {score}
            </div>
            {displayCombo > 1 && (
              <div style={{ fontSize: '0.78rem', color: '#ff6b6b', fontWeight: 800 }}>
                {displayCombo}連打
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>TIME</div>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                color: timeLeft <= 3 ? '#ff4444' : '#f7f1df',
                textShadow: timeLeft <= 3 ? '0 0 10px rgba(255,68,68,0.4)' : 'none',
              }}
            >
              {Math.max(0, timeLeft).toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* START OVERLAY */}
      {phase === 'start' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            background: 'rgba(5,5,5,0.55)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: '0.8rem',
              textAlign: 'center',
              padding: '2rem 2.4rem',
              border: '1px solid rgba(215,169,46,0.35)',
              borderRadius: 20,
              background: 'rgba(8,6,4,0.78)',
              boxShadow: '0 32px 90px rgba(0,0,0,0.55)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(2.2rem, 7vw, 4rem)',
                lineHeight: 0.9,
                fontWeight: 900,
                color: '#fff1c7',
                textShadow: '0 0 32px rgba(247,209,91,0.45)',
              }}
            >
              覇気連打
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.82rem',
                color: 'rgba(247,241,223,0.7)',
                lineHeight: 1.6,
                maxWidth: 260,
              }}
            >
              10秒間、画面を連打しろ。<br />
              覇気を解放せよ。
            </p>
            {best > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(215,169,46,0.8)' }}>BEST: {best}</div>
            )}
            <div
              style={{
                marginTop: 6,
                padding: '0.9rem 1.6rem',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #d7a92e, #b31928)',
                color: '#0c0a08',
                fontWeight: 950,
                fontSize: '0.9rem',
                letterSpacing: '0.08em',
                boxShadow: '0 14px 40px rgba(179,25,40,0.25)',
              }}
            >
              TAP TO START
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {phase === 'over' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            background: 'rgba(5,5,5,0.65)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              textAlign: 'center',
              padding: '2rem 2.4rem',
              border: `1px solid ${currentRank.color}88`,
              borderRadius: 20,
              background: 'rgba(12,8,6,0.82)',
              boxShadow: `0 32px 90px ${currentRank.color}40`,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(2rem, 6.5vw, 3.5rem)',
                color: currentRank.color,
                textShadow: `0 0 24px ${currentRank.color}66`,
              }}
            >
              {currentRank.title}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.65)' }}>
              {currentRank.sub}
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.18em' }}>SCORE</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#d7a92e' }}>{score}</div>
            </div>
            <div
              style={{
                marginTop: 4,
                padding: '0.85rem 1.5rem',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #d7a92e, #b31928)',
                color: '#0c0a08',
                fontWeight: 950,
                fontSize: '0.88rem',
                letterSpacing: '0.08em',
              }}
            >
              TRY AGAIN
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
