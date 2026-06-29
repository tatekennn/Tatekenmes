'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'start' | 'playing' | 'over';

interface Target {
  x: number;
  y: number;
  text: string;
  size: number;
  born: number; // performance.now()
  maxLife: number; // seconds
  points: number;
  color: string;
  glow: string;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
}

interface Floater {
  x: number; y: number;
  text: string; color: string;
  life: number; vy: number; fontSize: number;
}

export default function HakiWhackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>('start');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);

  const scoreRef = useRef(0);
  const targetsRef = useRef<Target[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatersRef = useRef<Floater[]>([]);
  const nextSpawnRef = useRef(0);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Load best                                                        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      const b = localStorage.getItem('hw-best');
      if (b) setBest(Number(b));
    } catch {}
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Game timer                                                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    setTimeLeft(10);
    scoreRef.current = 0;
    setScore(0);
    targetsRef.current = [];
    particlesRef.current = [];
    floatersRef.current = [];
    nextSpawnRef.current = 0;

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
              localStorage.setItem('hw-best', String(nb));
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
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */
  const spawnTarget = useCallback((now: number, elapsed: number, w: number, h: number) => {
    const margin = 80; // keep away from edges
    const x = margin + Math.random() * (w - margin * 2);
    const y = margin + Math.random() * (h - margin * 2);
    const isBig = Math.random() < 0.15;
    const points = isBig ? 5 : 1;
    const size = isBig ? 56 + Math.random() * 24 : 22 + Math.random() * 18;
    // shrink lifetime as game progresses
    const baseLife = Math.max(0.55, 1.5 - elapsed * 0.08);
    const maxLife = baseLife + Math.random() * 0.3;

    const colors = [
      { color: '#ffe0a0', glow: 'rgba(255,224,160,0.9)' },
      { color: '#d7a92e', glow: 'rgba(215,169,46,0.85)' },
      { color: '#ff6b6b', glow: 'rgba(255,107,107,0.85)' },
      { color: '#63e6be', glow: 'rgba(99,230,190,0.85)' },
      { color: '#74c0fc', glow: 'rgba(116,192,252,0.85)' },
    ];
    const style = colors[Math.floor(Math.random() * colors.length)];
    const text = isBig ? '覇気' : Math.random() < 0.5 ? '覇' : '気';

    targetsRef.current.push({
      x, y, text, size,
      born: now,
      maxLife,
      points,
      color: style.color,
      glow: style.glow,
    });
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.3 + Math.random() * 0.5,
        maxLife: 1,
        size: 2 + Math.random() * 3,
        color,
      });
    }
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

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Spawn targets during play
      if (phase === 'playing') {
        const elapsed = 10 - timeLeft;
        const spawnRate = Math.min(0.12, 0.025 + elapsed * 0.007); // per frame chance
        // try multiple spawns
        while (targetsRef.current.length < 6 && Math.random() < spawnRate) {
          spawnTarget(ts, elapsed, w, h);
        }
      }

      // Update targets life
      for (let i = targetsRef.current.length - 1; i >= 0; i--) {
        const t = targetsRef.current[i];
        const age = (ts - t.born) / 1000;
        if (age >= t.maxLife) {
          targetsRef.current.splice(i, 1);
        }
      }

      // Particles
      const pts = particlesRef.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 70 * dt;
        p.life -= dt;
        if (p.life <= 0) pts.splice(i, 1);
      }

      // Floaters
      const flts = floatersRef.current;
      for (let i = flts.length - 1; i >= 0; i--) {
        const f = flts[i];
        f.y -= f.vy * dt;
        f.vy *= 0.96;
        f.life -= dt;
        if (f.life <= 0) flts.splice(i, 1);
      }

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Draw targets
      for (const t of targetsRef.current) {
        const age = (ts - t.born) / 1000;
        const pct = age / t.maxLife;
        let alpha = 1;
        let scale = 1;
        const fadeIn = 0.12;
        const fadeOut = 0.18;
        if (age < fadeIn) {
          alpha = age / fadeIn;
          scale = 0.6 + 0.4 * alpha;
        } else if (pct > 1 - fadeOut / t.maxLife) {
          alpha = Math.max(0, (1 - pct) / (fadeOut / t.maxLife));
          const wobble = Math.sin(age * 20) * 0.08;
          scale = 1 + wobble;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(t.x, t.y);
        ctx.scale(scale, scale);

        // glow disc
        ctx.shadowColor = t.glow;
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#2a2218';
        ctx.beginPath();
        ctx.arc(0, 0, t.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // rim
        ctx.strokeStyle = t.glow;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, t.size * 1.2, 0, Math.PI * 2);
        ctx.stroke();

        // text
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${t.size}px ui-serif, 'Hiragino Mincho ProN', 'Yu Mincho', serif`;
        ctx.fillText(t.text, 0, t.size * 0.04);

        ctx.restore();
      }

      // Particles
      for (const p of pts) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floaters
      for (const f of flts) {
        const alpha = Math.max(0, f.life);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.font = `900 ${f.fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.text, f.x, f.y);
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
  }, [phase, timeLeft, spawnTarget]);

  /* ---------------------------------------------------------------- */
  /*  Input                                                            */
  /* ---------------------------------------------------------------- */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phase === 'start') {
      setPhase('playing');
      return;
    }
    if (phase === 'over') {
      setPhase('start');
      return;
    }
    if (phase !== 'playing') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check hit in reverse order (newest on top)
    const tgts = targetsRef.current;
    let hit = false;
    for (let i = tgts.length - 1; i >= 0; i--) {
      const t = tgts[i];
      const dx = x - t.x;
      const dy = y - t.y;
      const r = t.size * 1.4; // generous hit radius
      if (dx * dx + dy * dy <= r * r) {
        scoreRef.current += t.points;
        setScore(scoreRef.current);
        spawnParticles(t.x, t.y, t.color, t.points >= 5 ? 18 : 8);
        if (t.points >= 5) {
          floatersRef.current.push({
            x: t.x, y: t.y - 10,
            text: `+${t.points}`,
            color: '#ffe0a0',
            life: 0.9,
            vy: 70,
            fontSize: 20,
          });
        }
        tgts.splice(i, 1);
        hit = true;
        break;
      }
    }

    if (!hit) {
      // small miss feedback
      floatersRef.current.push({
        x, y: y - 10,
        text: 'ミス',
        color: 'rgba(255,255,255,0.35)',
        life: 0.5,
        vy: 40,
        fontSize: 12,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, spawnParticles]);

  /* ---------------------------------------------------------------- */
  /*  Rank                                                             */
  /* ---------------------------------------------------------------- */
  const currentRank = (() => {
    const s = score;
    if (s >= 80) return { title: '覇王', sub: 'この海の覇者', color: '#ff2a2a' };
    if (s >= 55) return { title: '覇王色の覇気', sub: '王の資格を持つ者', color: '#d72020' };
    if (s >= 35) return { title: '覇気', sub: '圧倒的な反応速度', color: '#d7a92e' };
    if (s >= 20) return { title: '闘気', sub: '闘争心に燃える', color: '#e8d5a3' };
    if (s >= 8) return { title: '気', sub: '普通の人の数倍', color: '#f0e8d0' };
    return { title: '雑魚', sub: 'まずは動体視力を鍛えろ', color: '#888' };
  })();

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        position: 'fixed',
        inset: 0,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'crosshair',
        background: '#0c0a08',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}
      />

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
              覇気出現
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.82rem',
                color: 'rgba(247,241,223,0.7)',
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              画面に現れる「覇気」を叩け。<br />
              10秒で何個叩ける？
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
            <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.65)' }}>{currentRank.sub}</div>
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
