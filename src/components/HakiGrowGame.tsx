'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface RankDef {
  name: string;
  next: number; // threshold
  color: string;
  glow: string;
  tapMult: number;
  auto: number; // per second
}

const RANKS: RankDef[] = [
  { name: '気', next: 150, color: '#b0b0b0', glow: 'rgba(176,176,176,0.3)', tapMult: 1, auto: 0 },
  { name: '闘気', next: 800, color: '#e8d5a3', glow: 'rgba(232,213,163,0.5)', tapMult: 4, auto: 2 },
  { name: '武装色の覇気', next: 5000, color: '#d7a92e', glow: 'rgba(215,169,46,0.7)', tapMult: 15, auto: 10 },
  { name: '覇気', next: 35000, color: '#d46828', glow: 'rgba(212,104,40,0.85)', tapMult: 60, auto: 50 },
  { name: '覇王色の覇気', next: 200000, color: '#b31928', glow: 'rgba(179,25,40,0.95)', tapMult: 300, auto: 280 },
  { name: '覇王', next: 1200000, color: '#ff2a2a', glow: 'rgba(255,42,42,1)', tapMult: 1200, auto: 1200 },
  { name: '海賊王', next: Infinity, color: '#ffe0a0', glow: 'rgba(255,224,160,1)', tapMult: 6000, auto: 6000 },
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
}

interface Floater {
  x: number; y: number;
  text: string;
  color: string;
  life: number; vy: number; fontSize: number;
}

function fmt(n: number): string {
  if (n >= 1_0000_0000) return (n / 1_0000_0000).toFixed(2) + '億';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return Math.floor(n).toLocaleString();
}

export default function HakiGrowGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const centerTextRef = useRef<HTMLDivElement>(null);

  const [rankIdx, setRankIdx] = useState(0);
  const [ki, setKi] = useState(0);
  const [tapPower, setTapPower] = useState(1);
  const [autoRate, setAutoRate] = useState(0);
  const [totalKi, setTotalKi] = useState(0);
  const [rankUpText, setRankUpText] = useState('');
  const [showHint, setShowHint] = useState(true);

  // juice
  const flashRef = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const floatersRef = useRef<Floater[]>([]);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef(0);

  const stateRef = useRef({ ki: 0, rankIdx: 0, tapPower: 1, autoRate: 0, totalKi: 0 });
  useEffect(() => {
    stateRef.current = { ki, rankIdx, tapPower, autoRate, totalKi };
  }, [ki, rankIdx, tapPower, autoRate, totalKi]);

  /* ---------------------------------------------------------------- */
  /*  Save / Load                                                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hg-save');
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.ki === 'number') setKi(s.ki);
        if (typeof s.rankIdx === 'number') setRankIdx(s.rankIdx);
        if (typeof s.tapPower === 'number') setTapPower(s.tapPower);
        if (typeof s.autoRate === 'number') setAutoRate(s.autoRate);
        if (typeof s.totalKi === 'number') setTotalKi(s.totalKi);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hg-save', JSON.stringify({ ki, rankIdx, tapPower, autoRate, totalKi }));
    } catch {}
  }, [ki, rankIdx, tapPower, autoRate, totalKi]);

  /* ---------------------------------------------------------------- */
  /*  Auto generation                                                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const id = setInterval(() => {
      const rate = stateRef.current.autoRate;
      if (rate <= 0) return;
      const gain = rate / 10;
      setKi((p) => p + gain);
      setTotalKi((p) => p + gain);
    }, 100);
    return () => clearInterval(id);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Rank up check                                                    */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let newRank = rankIdx;
    let newTap = tapPower;
    let newAuto = autoRate;
    let changed = false;
    while (newRank < RANKS.length - 1 && ki >= RANKS[newRank].next) {
      newRank++;
      newTap = RANKS[newRank].tapMult;
      newAuto = RANKS[newRank].auto;
      changed = true;
    }
    if (changed) {
      setRankIdx(newRank);
      setTapPower(newTap);
      setAutoRate(newAuto);
      flashRef.current = 1;
      shakeRef.current = { x: (Math.random() - 0.5) * 16, y: (Math.random() - 0.5) * 16 };
      setRankUpText(RANKS[newRank].name);
      setTimeout(() => setRankUpText(''), 1800);
      setTimeout(() => (flashRef.current = 0), 900);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ki]);

  /* ---------------------------------------------------------------- */
  /*  Juice helpers                                                    */
  /* ---------------------------------------------------------------- */
  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 180;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.3 + Math.random() * 0.6,
        maxLife: 1,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Canvas loop                                                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

      // Decay effects
      flashRef.current = Math.max(0, flashRef.current - dt * 2);
      shakeRef.current.x *= 0.88;
      shakeRef.current.y *= 0.88;
      if (Math.abs(shakeRef.current.x) < 0.5) shakeRef.current.x = 0;
      if (Math.abs(shakeRef.current.y) < 0.5) shakeRef.current.y = 0;

      // Center text animation via ref (bypass React render)
      if (centerTextRef.current) {
        const pulse = 1 + Math.sin(ts / 700) * 0.015 * (rankIdx + 1);
        const sh = shakeRef.current;
        centerTextRef.current.style.transform = `translate(${sh.x}px, ${sh.y}px) scale(${pulse})`;
        const r = RANKS[rankIdx];
        centerTextRef.current.style.color = r.color;
        centerTextRef.current.style.textShadow = `0 0 ${20 + rankIdx * 8}px ${r.glow}`;
      }
      if (shellRef.current) {
        shellRef.current.style.transform = `translate(${shakeRef.current.x * 0.5}px, ${shakeRef.current.y * 0.5}px)`;
      }

      // Draw
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Rank aura (background radial)
      const cx = w / 2;
      const cy = h / 2;
      const auraSize = Math.min(w, h) * (0.35 + rankIdx * 0.04);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraSize);
      const r = RANKS[rankIdx];
      g.addColorStop(0, r.glow.replace(/[^,]+\)/, '0.18)'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Flash
      if (flashRef.current > 0) {
        const f = flashRef.current;
        ctx.fillStyle = `rgba(255, ${240 - f * 80}, ${200 - f * 100}, ${f * 0.35})`;
        ctx.fillRect(0, 0, w, h);
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
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Input                                                            */
  /* ---------------------------------------------------------------- */
  const handleTap = useCallback(() => {
    setShowHint(false);
    const st = stateRef.current;
    const power = st.tapPower;
    setKi((p) => p + power);
    setTotalKi((p) => p + power);

    // particles
    const cx = window.innerWidth / 2 + (Math.random() - 0.5) * 40;
    const cy = window.innerHeight / 2 + (Math.random() - 0.5) * 40;
    spawnParticles(cx, cy, RANKS[st.rankIdx].color, 5 + st.rankIdx * 2);

    // floater
    floatersRef.current.push({
      x: cx, y: cy - 20,
      text: `+${fmt(power)}`,
      color: RANKS[st.rankIdx].color,
      life: 0.8,
      vy: 60,
      fontSize: 14 + st.rankIdx * 2,
    });

    // bump
    if (centerTextRef.current) {
      centerTextRef.current.style.transform = 'scale(1.12)';
      setTimeout(() => {
        if (centerTextRef.current) centerTextRef.current.style.transform = 'scale(1)';
      }, 70);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (!confirm('育成データをリセットしますか？')) return;
    setKi(0);
    setRankIdx(0);
    setTapPower(1);
    setAutoRate(0);
    setTotalKi(0);
    setRankUpText('');
    flashRef.current = 0;
    try { localStorage.removeItem('hg-save'); } catch {}
  }, []);

  const current = RANKS[rankIdx];
  const next = current.next === Infinity ? null : current.next;
  const progress = next ? Math.min(1, ki / next) : 1;

  return (
    <div
      ref={shellRef}
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
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />

      {/* Center Text */}
      <div
        ref={centerTextRef}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
          fontFamily: "ui-serif, 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
          fontSize: 'clamp(5rem, 28vw, 20rem)',
          fontWeight: 900,
          color: current.color,
          textShadow: `0 0 ${20 + rankIdx * 8}px ${current.glow}`,
          lineHeight: 1,
          willChange: 'transform',
          transition: 'transform 70ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        覇気
      </div>

      {/* HUD Top */}
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
          <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>RANK</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: current.color, textShadow: `0 0 10px ${current.glow}` }}>
            {current.name}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>TOTAL KI</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, opacity: 0.85 }}>{fmt(totalKi)}</div>
        </div>
      </div>

      {/* Bottom Info */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '0 1.2rem max(1.2rem, env(safe-area-inset-bottom))',
          pointerEvents: 'none',
          display: 'grid',
          gap: '0.6rem',
        }}
      >
        {/* Progress bar */}
        {next && (
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              margin: '0 auto',
              height: 6,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                borderRadius: 999,
                background: current.color,
                boxShadow: `0 0 12px ${current.glow}`,
                transition: 'width 150ms linear',
              }}
            />
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: '0.8rem',
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            color: 'rgba(247,241,223,0.75)',
            fontSize: '0.85rem',
          }}
        >
          <span>
            {fmt(ki)}
            {next && ` / ${fmt(next)}`}
          </span>
          <span style={{ opacity: 0.35, fontSize: '0.7rem' }}>|</span>
          <span style={{ color: current.color }}>+{fmt(tapPower)}/tap</span>
          {autoRate > 0 && (
            <>
              <span style={{ opacity: 0.35, fontSize: '0.7rem' }}>|</span>
              <span style={{ color: '#63e6be' }}>+{fmt(autoRate)}/s</span>
            </>
          )}
        </div>

        {showHint && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.72rem',
              color: 'rgba(247,241,223,0.35)',
              letterSpacing: '0.1em',
            }}
          >
            TAP THE CHARACTER TO GROW
          </div>
        )}
      </div>

      {/* Rank Up Overlay */}
      {rankUpText && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            pointerEvents: 'none',
            animation: 'popIn 0.35s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div
            style={{
              fontFamily: "ui-serif, 'Hiragino Mincho ProN', serif",
              fontSize: 'clamp(2rem, 7vw, 4rem)',
              fontWeight: 900,
              color: current.color,
              textShadow: `0 0 40px ${current.glow}`,
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'rgba(247,241,223,0.6)', fontFamily: 'ui-sans-serif,sans-serif', marginBottom: 6 }}>RANK UP</div>
            {rankUpText}
          </div>
        </div>
      )}

      {/* Reset button (small) */}
      <div
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={handleReset}
        style={{
          position: 'fixed',
          top: 'max(1.2rem, env(safe-area-inset-top))',
          right: 'max(1.2rem, env(safe-area-inset-right))',
          zIndex: 30,
          fontSize: '0.6rem',
          color: 'rgba(247,241,223,0.25)',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '4px 8px',
        }}
      >
        リセット
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
