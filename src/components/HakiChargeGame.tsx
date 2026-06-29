'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'wait' | 'charge' | 'result' | 'explode';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
}

export default function HakiChargeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const centerTextRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('wait');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [resultTitle, setResultTitle] = useState('');
  const [resultColor, setResultColor] = useState('#fff');
  const [totalPlays, setTotalPlays] = useState(0);

  // Refs for smooth RAF updates
  const phaseRef = useRef<Phase>('wait');
  const gaugeRef = useRef(0); // 0 .. 1.08
  const chargeStartRef = useRef(0);
  const isHoldingRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const flashRef = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* ---------------------------------------------------------------- */
  /*  Persistent stats                                                 */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      const b = localStorage.getItem('hc-best');
      const p = localStorage.getItem('hc-plays');
      if (b) setBest(Number(b));
      if (p) setTotalPlays(Number(p));
    } catch {}
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */
  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.3 + Math.random() * 0.7,
        maxLife: 1,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  const evaluate = useCallback((g: number) => {
    const peak = 0.78;
    const dist = Math.abs(g - peak);
    if (dist < 0.04) {
      return { title: '覇王色の覇気', color: '#ff2a2a', points: 100 };
    }
    if (dist < 0.10) {
      return { title: '覇気', color: '#d7a92e', points: 80 };
    }
    if (g > 0.55) {
      return { title: '武装色の覇気', color: '#e8d5a3', points: 50 };
    }
    if (g > 0.35) {
      return { title: '闘気', color: '#f0e8d0', points: 25 };
    }
    if (g > 0.15) {
      return { title: '気', color: '#aaa', points: 10 };
    }
    return { title: '雑魚', color: '#666', points: 0 };
  }, []);

  const releaseCharge = useCallback((forcedExplode = false) => {
    if (!isHoldingRef.current && !forcedExplode) return;
    isHoldingRef.current = false;

    if (forcedExplode || gaugeRef.current >= 1.0) {
      setPhase('explode');
      setResultTitle('暴発');
      setResultColor('#ff2a2a');
      setScore(0);
      flashRef.current = 0.9;
      shakeRef.current = { x: (Math.random() - 0.5) * 24, y: (Math.random() - 0.5) * 24 };
      spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#444', 40);
      setTimeout(() => { setPhase('wait'); setResultTitle(''); }, 1000);
      return;
    }

    const g = Math.min(gaugeRef.current, 1.0);
    const ev = evaluate(g);
    setScore(ev.points);
    setResultTitle(ev.title);
    setResultColor(ev.color);
    setPhase('result');

    // particles
    const intensity = Math.min(ev.points / 5, 30);
    spawnParticles(window.innerWidth / 2, window.innerHeight / 2, ev.color, intensity);

    // juice
    flashRef.current = Math.min(1.0, ev.points / 80);
    shakeRef.current = { x: (Math.random() - 0.5) * (ev.points / 8), y: (Math.random() - 0.5) * (ev.points / 8) };

    // persist
    try {
      const prevBest = Number(localStorage.getItem('hc-best') || '0');
      const prevPlays = Number(localStorage.getItem('hc-plays') || '0');
      const nb = Math.max(prevBest, ev.points);
      localStorage.setItem('hc-best', String(nb));
      localStorage.setItem('hc-plays', String(prevPlays + 1));
      setBest(nb);
      setTotalPlays(prevPlays + 1);
    } catch {}

    setTimeout(() => { setPhase('wait'); setResultTitle(''); }, 1400);
  }, [evaluate]);

  const releaseRef = useRef(releaseCharge);
  useEffect(() => { releaseRef.current = releaseCharge; }, [releaseCharge]);

  /* ---------------------------------------------------------------- */
  /*  RAF Loop                                                         */
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

      // Charge logic
      if (phaseRef.current === 'charge' && isHoldingRef.current) {
        const elapsed = (ts - chargeStartRef.current) / 1000;
        gaugeRef.current = elapsed / 1.45; // 1.45s to hit 1.0
        if (gaugeRef.current >= 1.08) {
          gaugeRef.current = 1.08;
          releaseRef.current(true);
        }
      }

      // Decay
      flashRef.current = Math.max(0, flashRef.current - dt * 2.2);
      shakeRef.current.x *= 0.82;
      shakeRef.current.y *= 0.82;
      if (Math.abs(shakeRef.current.x) < 0.5) shakeRef.current.x = 0;
      if (Math.abs(shakeRef.current.y) < 0.5) shakeRef.current.y = 0;

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

      // Center text update (direct DOM for perf)
      if (centerTextRef.current) {
        const g = Math.min(gaugeRef.current, 1.0);
        const scale = 1 + g * 0.25;
        const sh = shakeRef.current;
        centerTextRef.current.style.transform = `translate(${sh.x}px, ${sh.y}px) scale(${scale})`;

        let color = '#f7f1df';
        let shadow = '0 0 12px rgba(247,241,223,0.25)';
        if (g > 0.88) { color = '#ff3b3b'; shadow = '0 0 70px rgba(255,59,59,0.9)'; }
        else if (g > 0.72) { color = '#d7a92e'; shadow = '0 0 50px rgba(215,169,46,0.8)'; }
        else if (g > 0.45) { color = '#fff'; shadow = '0 0 30px rgba(255,255,255,0.5)'; }
        centerTextRef.current.style.color = color;
        centerTextRef.current.style.textShadow = shadow;
      }
      if (shellRef.current) {
        shellRef.current.style.transform = `translate(${shakeRef.current.x}px, ${shakeRef.current.y}px)`;
      }

      // Draw
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Flash background
      if (flashRef.current > 0) {
        const f = flashRef.current;
        ctx.fillStyle = `rgba(255, ${240 - f * 100}, ${200 - f * 120}, ${f * 0.35})`;
        ctx.fillRect(0, 0, w, h);
      }

      const cx = w / 2;
      const cy = h / 2;
      const gaugeR = Math.min(w, h) * 0.32;

      // Gauge track
      if (phaseRef.current === 'charge' || phaseRef.current === 'result' || phaseRef.current === 'explode') {
        ctx.beginPath();
        ctx.arc(cx, cy, gaugeR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 10;
        ctx.stroke();
      }

      // Gauge fill
      if (phaseRef.current === 'charge') {
        const g = Math.min(gaugeRef.current, 1.0);
        const endAngle = -Math.PI / 2 + Math.PI * 2 * g;

        // gradient via conic (supported in modern browsers)
        try {
          const grad = (ctx as any).createConicGradient(-Math.PI / 2, cx, cy);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.35, '#d7a92e');
          grad.addColorStop(0.65, '#b31928');
          grad.addColorStop(1, '#ff0000');
          ctx.beginPath();
          ctx.arc(cx, cy, gaugeR, -Math.PI / 2, endAngle);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.stroke();
        } catch {
          // Fallback if conicGradient unavailable
          ctx.beginPath();
          ctx.arc(cx, cy, gaugeR, -Math.PI / 2, endAngle);
          ctx.strokeStyle = g > 0.85 ? '#ff2a2a' : g > 0.6 ? '#d7a92e' : '#ffffff';
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Danger ticks
        const dangerStart = -Math.PI / 2 + Math.PI * 2 * 0.85;
        const dangerEnd = -Math.PI / 2 + Math.PI * 2 * 1.0;
        ctx.beginPath();
        ctx.arc(cx, cy, gaugeR + 5, dangerStart, dangerEnd);
        ctx.strokeStyle = `rgba(255, 40, 40, ${0.3 + Math.abs(Math.sin(ts / 120)) * 0.4})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Danger glow behind text when high
        if (gaugeRef.current > 0.88) {
          const pulse = 0.6 + Math.abs(Math.sin(ts / 100)) * 0.4;
          ctx.shadowColor = 'rgba(255,50,50,0.6)';
          ctx.shadowBlur = 40 * pulse;
          ctx.fillStyle = 'rgba(255,50,50,0.08)';
          ctx.beginPath();
          ctx.arc(cx, cy, gaugeR * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
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
  const handlePointerDown = useCallback(() => {
    if (phaseRef.current !== 'wait' && phaseRef.current !== 'result') return;
    isHoldingRef.current = true;
    chargeStartRef.current = performance.now();
    gaugeRef.current = 0;
    setPhase('charge');
  }, []);

  const handlePointerUp = useCallback(() => {
    if (phaseRef.current !== 'charge') return;
    releaseCharge(false);
  }, [releaseCharge]);

  return (
    <div
      ref={shellRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
          fontFamily: "ui-serif, 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
          fontSize: 'clamp(5rem, 26vw, 18rem)',
          fontWeight: 900,
          color: '#f7f1df',
          textShadow: '0 0 12px rgba(247,241,223,0.25)',
          lineHeight: 1,
          willChange: 'transform',
          zIndex: 5,
        }}
      >
        覇気
      </div>

      {/* HUD - Best */}
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
          <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>BEST</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#d7a92e' }}>{best}</div>
        </div>
        {totalPlays > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>ATTEMPTS</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, opacity: 0.75 }}>{totalPlays}</div>
          </div>
        )}
      </div>

      {/* Instruction */}
      {phase === 'wait' && (
        <div
          style={{
            position: 'fixed',
            bottom: 'max(2.5rem, env(safe-area-inset-bottom) + 24px)',
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 10,
            pointerEvents: 'none',
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: '0.75rem',
            color: 'rgba(247,241,223,0.45)',
            letterSpacing: '0.12em',
          }}
        >
          HOLD & RELEASE AT PEAK
        </div>
      )}

      {/* Result Overlay */}
      {(phase === 'result' || phase === 'explode') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: "ui-serif, 'Hiragino Mincho ProN', serif",
              fontSize: 'clamp(1.8rem, 7vw, 4rem)',
              fontWeight: 900,
              color: resultColor,
              textShadow: `0 0 30px ${resultColor}88`,
              lineHeight: 1.1,
              textAlign: 'center',
              animation: 'popIn 0.25s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {resultTitle}
          </div>
          {phase === 'result' && (
            <div
              style={{
                marginTop: '0.4rem',
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                fontSize: '1.6rem',
                fontWeight: 900,
                color: '#d7a92e',
                textShadow: '0 0 16px rgba(215,169,46,0.35)',
              }}
            >
              {score}
            </div>
          )}
        </div>
      )}

      {/* Keyframes injection */}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
