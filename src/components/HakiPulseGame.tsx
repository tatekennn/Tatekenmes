'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export default function HakiPulseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const missRef = useRef<HTMLDivElement>(null);
  const textWrapRef = useRef<HTMLDivElement>(null);

  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [idle, setIdle] = useState(true);

  const startedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const timeRef = useRef(0);
  const speedRef = useRef(2.2);
  const comboLocalRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const missOpacityRef = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0 });
  const pulseValRef = useRef(0);

  // Read localStorage best
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hp-best');
      if (saved) setBest(Number(saved));
    } catch {
      // ignore
    }
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      timeRef.current += dt;
      const pulse = Math.sin(timeRef.current * speedRef.current);
      pulseValRef.current = pulse;

      // Particles
      const pts = particlesRef.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt; // light gravity
        p.life -= dt;
        if (p.life <= 0) pts.splice(i, 1);
      }

      // Miss blackout fade
      if (missOpacityRef.current > 0) {
        missOpacityRef.current -= dt * 3.5;
        if (missOpacityRef.current < 0) missOpacityRef.current = 0;
      }

      // Shake decay
      shakeRef.current.x *= 0.88;
      shakeRef.current.y *= 0.88;
      if (Math.abs(shakeRef.current.x) < 0.3) shakeRef.current.x = 0;
      if (Math.abs(shakeRef.current.y) < 0.3) shakeRef.current.y = 0;

      // Draw particles
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Pulse + shake on text wrapper
      const wrap = textWrapRef.current;
      if (wrap) {
        const scale = 1 + Math.max(0, pulse) * 0.045;
        const bright = 1 + Math.max(0, pulse) * 0.15;
        const s = shakeRef.current;
        wrap.style.transform = `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px)) scale(${scale})`;
        wrap.style.filter = `brightness(${bright})`;
      }

      // Miss overlay opacity
      const overlay = missRef.current;
      if (overlay) {
        overlay.style.opacity = String(Math.min(1, missOpacityRef.current));
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleTap = (e: React.PointerEvent) => {
    e.preventDefault();

    if (!startedRef.current) {
      startedRef.current = true;
      setIdle(false);
    }

    const pulse = pulseValRef.current;

    if (pulse > 0.92) {
      // Perfect
      comboLocalRef.current += 1;
      setCombo(comboLocalRef.current);
      speedRef.current = Math.min(5.5, 2.2 + comboLocalRef.current * 0.08);

      if (comboLocalRef.current > best) {
        setBest(comboLocalRef.current);
        try {
          localStorage.setItem('hp-best', String(comboLocalRef.current));
        } catch {
          // ignore
        }
      }

      // Spawn particles
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const n = 12 + comboLocalRef.current * 2;
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sp = 90 + Math.random() * 130 + comboLocalRef.current * 6;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * sp,
          vy: Math.sin(angle) * sp - 30,
          life: 0.5 + Math.random() * 0.7,
          maxLife: 1.2,
          size: 2 + Math.random() * 5,
          color:
            Math.random() > 0.35
              ? 'rgba(215,169,46,1)'
              : 'rgba(179,25,40,1)',
        });
      }

      // Subtle shake
      shakeRef.current.x = (Math.random() - 0.5) * 5;
      shakeRef.current.y = (Math.random() - 0.5) * 5;
    } else {
      // Miss
      comboLocalRef.current = 0;
      setCombo(0);
      speedRef.current = 2.2;
      missOpacityRef.current = 0.9;
      shakeRef.current.x = (Math.random() - 0.5) * 14;
      shakeRef.current.y = (Math.random() - 0.5) * 14;
    }
  };

  return (
    <div
      className="haki-stage"
      onPointerDown={handleTap}
      style={{
        position: 'fixed',
        inset: 0,
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Miss blackout */}
      <div
        ref={missRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#020202',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: 20,
        }}
      />

      {/* HUD */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: 'rgba(247,241,223,0.85)',
          letterSpacing: '0.18em',
        }}
      >
        {idle ? (
          <div
            style={{
              fontSize: 'clamp(0.75rem, 1.2vw, 0.95rem)',
              color: 'rgba(247,241,223,0.55)',
            }}
          >
            TAP TO START
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 900,
                lineHeight: 1,
                color: '#d7a92e',
                textShadow: '0 0 24px rgba(215,169,46,0.45)',
              }}
            >
              {combo}
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                marginTop: 2,
                opacity: 0.8,
              }}
            >
              COMBO
            </div>
            {best > 0 && (
              <div
                style={{
                  fontSize: '0.6rem',
                  marginTop: 4,
                  opacity: 0.45,
                }}
              >
                BEST {best}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center text */}
      <div
        ref={textWrapRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, filter',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(7.5rem, 27vw, 28rem)',
            lineHeight: 0.88,
            letterSpacing: '-0.08em',
            fontWeight: 900,
            color: '#f7f1df',
            textShadow:
              '0 0 1px #fff, 0 0 28px rgba(215,169,46,0.72), 0 0 92px rgba(179,25,40,0.52), 0 24px 70px rgba(0,0,0,0.9)',
            fontFamily:
              "ui-serif, 'Hiragino Mincho ProN', 'Yu Mincho', 'YuMincho', 'Noto Serif JP', Georgia, serif",
            wordBreak: 'keep-all',
          }}
        >
          覇気
        </h1>
      </div>

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />

      {/* Terse instruction footer */}
      {idle && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
            textAlign: 'center',
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: 'rgba(247,241,223,0.45)',
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          脈の頂点でタップ
        </div>
      )}
    </div>
  );
}
