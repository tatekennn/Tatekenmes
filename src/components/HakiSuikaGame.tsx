'use client';

import Matter from 'matter-js';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Tier definitions                                                  */
/* ------------------------------------------------------------------ */
interface TierDef {
  label: string;
  r: number; // design resolution radius (px at w=520)
  score: number;
  color: string;
  glow: string;
}

const TIERS: TierDef[] = [
  { label: '一', r: 16, score: 10, color: '#f7f1df', glow: 'rgba(247,241,223,0.25)' },
  { label: '十', r: 22, score: 20, color: '#f0e8d0', glow: 'rgba(240,232,208,0.35)' },
  { label: '口', r: 30, score: 40, color: '#e8d5a3', glow: 'rgba(232,213,163,0.45)' },
  { label: '日', r: 40, score: 80, color: '#debe45', glow: 'rgba(222,190,69,0.55)' },
  { label: '目', r: 52, score: 160, color: '#d7a92e', glow: 'rgba(215,169,46,0.7)' },
  { label: '月', r: 66, score: 320, color: '#d99e2e', glow: 'rgba(217,158,46,0.8)' },
  { label: '覇', r: 82, score: 640, color: '#d46828', glow: 'rgba(212,104,40,0.85)' },
  { label: '気', r: 100, score: 1280, color: '#b31928', glow: 'rgba(179,25,40,0.95)' },
  { label: '覇気', r: 125, score: 5000, color: '#ffe0a0', glow: 'rgba(255,224,160,1)' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function getRandomTier(): number {
  const r = Math.random();
  if (r < 0.45) return 0;
  if (r < 0.75) return 1;
  if (r < 0.90) return 2;
  if (r < 0.97) return 3;
  return 4;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function HakiSuikaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [time, setTime] = useState(0);
  const [phase, setPhase] = useState<'start' | 'playing' | 'over'>('start');

  /* physics refs */
  const engineRef = useRef<Matter.Engine | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const wallRefs = useRef<Matter.Body[]>([]);

  /* loop refs */
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const hitstopRef = useRef(0);
  const accRef = useRef(0);

  /* game state refs */
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const startTimeRef = useRef(0);
  const highestTierRef = useRef(0);
  const canDropRef = useRef(true);
  const dropXRef = useRef(0);
  const nextTierRef = useRef(0);
  const currentTierRef = useRef(0);
  const aboveTimersRef = useRef<Map<number, number>>(new Map());
  const bodiesToRemoveRef = useRef<Set<number>>(new Set());

  /* juice refs */
  const shakeRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const floatersRef = useRef<Floater[]>([]);
  const mergeQueueRef = useRef<MergeTask[]>([]);
  const containerFlashRef = useRef(0);

  /* derived constants (updated each frame) */
  const dimRef = useRef({ w: 520, h: 832, cx: 0, cy: 0, scale: 1 });

  /* ---------------------------------------------------------------- */
  /*  Init                                                            */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      const b = localStorage.getItem('hb-best');
      if (b) setBest(Number(b));
    } catch {}
  }, []);

  const initPhysics = useCallback(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2, scale: 1 } });
    engineRef.current = engine;
    worldRef.current = engine.world;

    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA as any;
        const b = pair.bodyB as any;
        if (
          a != null && b != null &&
          typeof a.tier === 'number' &&
          typeof b.tier === 'number' &&
          a.tier === b.tier &&
          !a.isStatic && !b.isStatic &&
          !bodiesToRemoveRef.current.has(a.id) &&
          !bodiesToRemoveRef.current.has(b.id)
        ) {
          bodiesToRemoveRef.current.add(a.id);
          bodiesToRemoveRef.current.add(b.id);
          mergeQueueRef.current.push({ a, b });
        }
      }
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Walls                                                           */
  /* ---------------------------------------------------------------- */
  const rebuildWalls = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;

    wallRefs.current.forEach((w) => {
      Matter.Composite.remove(world, w);
    });
    wallRefs.current = [];

    const { w: cw, h: ch, cx, cy, scale } = dimRef.current;
    const t = 20;
    const opts = { isStatic: true, restitution: 0.05, friction: 0.5 };

    const left = Matter.Bodies.rectangle(cx - cw / 2 - t / 2, cy, t, ch + 120, opts);
    const right = Matter.Bodies.rectangle(cx + cw / 2 + t / 2, cy, t, ch + 120, opts);
    const bottom = Matter.Bodies.rectangle(cx, cy + ch / 2 + t / 2, cw + 120, t, opts);

    wallRefs.current = [left, right, bottom];
    Matter.Composite.add(world, wallRefs.current);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Resize                                                          */
  /* ---------------------------------------------------------------- */
  const updateDimensions = useCallback(() => {
    const baseW = 520;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const w = Math.min(winW * 0.92, baseW);
    const h = w * 1.6;
    const cx = winW / 2;
    const cy = winH / 2 + 12;
    dimRef.current = { w, h, cx, cy, scale: w / baseW };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Drop                                                            */
  /* ---------------------------------------------------------------- */
  const dropPiece = useCallback(() => {
    if (phase !== 'playing' || !canDropRef.current || !worldRef.current) return;

    const { cx, w, scale } = dimRef.current;
    const tier = currentTierRef.current;
    const r = TIERS[tier].r * scale;
    const clampedX = Math.max(cx - w / 2 + r, Math.min(cx + w / 2 - r, dropXRef.current));
    const startY = dimRef.current.cy - dimRef.current.h / 2 - r - 10;

    const body = Matter.Bodies.circle(clampedX, startY, r, {
      restitution: 0.3,
      friction: 0.1,
      density: 0.001 + tier * 0.0002,
    }) as any;

    body.tier = tier;
    body.plugin = { tier, renderScale: 0.8 };
    Matter.Composite.add(worldRef.current, body);

    // spawn next
    currentTierRef.current = nextTierRef.current;
    nextTierRef.current = getRandomTier();

    canDropRef.current = false;
    setTimeout(() => {
      canDropRef.current = true;
    }, 500);
  }, [phase]);

  /* ---------------------------------------------------------------- */
  /*  Juice                                                           */
  /* ---------------------------------------------------------------- */
  const triggerShake = useCallback((tierIdx: number) => {
    const intensity = tierIdx >= 8 ? 14 : tierIdx >= 6 ? 8 : tierIdx >= 4 ? 4 : 2;
    shakeRef.current.x = (Math.random() - 0.5) * intensity;
    shakeRef.current.y = (Math.random() - 0.5) * intensity;
  }, []);

  const triggerHitstop = useCallback((tierIdx: number) => {
    const ms = tierIdx >= 7 ? 150 : tierIdx >= 5 ? 100 : 60;
    hitstopRef.current = ms / 1000;
  }, []);

  const spawnParticles = useCallback((x: number, y: number, tierIdx: number) => {
    const n = 10 + tierIdx * 6;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140 + tierIdx * 20;
      const col = Math.random() > 0.3 ? '#d7a92e' : Math.random() > 0.5 ? '#b31928' : '#f7f1df';
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp - 20,
        life: 0.4 + Math.random() * 0.6,
        maxLife: 1.0,
        size: 1.5 + Math.random() * 3,
        color: col,
      });
    }
  }, []);

  const addFloater = useCallback((x: number, y: number, text: string, tierIdx: number) => {
    const color = tierIdx >= 7 ? '#ffe0a0' : '#d7a92e';
    floatersRef.current.push({ text, x, y, vy: 60, life: 1.0, color, fontSize: 14 + tierIdx * 1.5 });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Merge processing                                                */
  /* ---------------------------------------------------------------- */
  interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number; color: string;
  }
  interface Floater {
    text: string; x: number; y: number; vy: number;
    life: number; color: string; fontSize: number;
  }
  interface MergeTask { a: any; b: any }

  const processMerges = useCallback(() => {
    while (mergeQueueRef.current.length > 0) {
      const { a, b } = mergeQueueRef.current.shift()!;
      if (!worldRef.current) continue;

      if (
        !Matter.Composite.get(worldRef.current, a.id, 'body') ||
        !Matter.Composite.get(worldRef.current, b.id, 'body')
      ) continue;

      const nextTier = (a.tier ?? 0) + 1;
      if (nextTier >= TIERS.length) {
        bodiesToRemoveRef.current.delete(a.id);
        bodiesToRemoveRef.current.delete(b.id);
        Matter.Composite.remove(worldRef.current, a);
        Matter.Composite.remove(worldRef.current, b);
        continue;
      }

      const avgX = (a.position.x + b.position.x) / 2;
      const avgY = (a.position.y + b.position.y) / 2;

      Matter.Composite.remove(worldRef.current, a);
      Matter.Composite.remove(worldRef.current, b);
      bodiesToRemoveRef.current.delete(a.id);
      bodiesToRemoveRef.current.delete(b.id);

      const { scale } = dimRef.current;
      const tierData = TIERS[nextTier];
      const r = tierData.r * scale;

      const newBody = Matter.Bodies.circle(avgX, avgY, r, {
        restitution: 0.3,
        friction: 0.1,
        density: 0.001 + nextTier * 0.0002,
      }) as any;

      newBody.tier = nextTier;
      newBody.plugin = { tier: nextTier, renderScale: 0.5 };
      Matter.Composite.add(worldRef.current, newBody);

      // upward pop impulse
      Matter.Body.setVelocity(newBody, { x: (Math.random() - 0.5) * 2, y: -4.5 });

      // score
      comboRef.current += 1;
      const added = tierData.score + comboRef.current * 10;
      scoreRef.current += added;
      setScore(scoreRef.current);

      if (nextTier > highestTierRef.current) highestTierRef.current = nextTier;

      spawnParticles(avgX, avgY, nextTier);
      addFloater(avgX, avgY - r, `+${added}`, nextTier);
      triggerShake(nextTier);
      triggerHitstop(nextTier);
      containerFlashRef.current = 0.35;
    }
  }, [spawnParticles, addFloater, triggerShake, triggerHitstop]);

  /* ---------------------------------------------------------------- */
  /*  Draw helpers                                                    */
  /* ---------------------------------------------------------------- */
  const drawOrb = useCallback((ctx: CanvasRenderingContext2D, tierIdx: number, x: number, y: number, radius: number) => {
    const tier = TIERS[tierIdx];

    // base disc
    const grad = ctx.createRadialGradient(x, y - radius * 0.35, radius * 0.15, x, y, radius);
    grad.addColorStop(0, '#2a2218');
    grad.addColorStop(1, '#120e0a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // rim
    ctx.strokeStyle = tier.glow;
    ctx.lineWidth = Math.max(1.5, 2 + tierIdx * 0.3);
    ctx.shadowColor = tier.glow;
    ctx.shadowBlur = 16 + tierIdx * 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // text
    ctx.fillStyle = tier.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = radius * (tier.label.length > 1 ? 0.85 : 1.25);
    ctx.font = `900 ${fontSize}px ui-serif, 'Hiragino Mincho ProN', 'Yu Mincho', serif`;
    ctx.fillText(tier.label, x, y + fontSize * 0.04);

    // inner highlight dot
    if (tierIdx < 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Game loop                                                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!phase) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!engineRef.current) initPhysics();
    updateDimensions();
    rebuildWalls();

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      updateDimensions();
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildWalls();
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      let dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (dt > 0.1) dt = 0.1;

      // Shake decay via CSS
      shakeRef.current.x *= 0.88;
      shakeRef.current.y *= 0.88;
      if (Math.abs(shakeRef.current.x) < 0.3) shakeRef.current.x = 0;
      if (Math.abs(shakeRef.current.y) < 0.3) shakeRef.current.y = 0;
      if (shellRef.current) {
        shellRef.current.style.transform = `translate(${shakeRef.current.x}px, ${shakeRef.current.y}px)`;
      }

      // Physics
      const engine = engineRef.current;
      if (engine && phase === 'playing') {
        if (hitstopRef.current > 0) {
          hitstopRef.current -= dt;
        } else {
          Matter.Engine.update(engine, dt * 1000);
          processMerges();

          // Game over detection
          const { h, cx, cy } = dimRef.current;
          const deathLineY = cy - h / 2 + h * 0.13;
          const all = Matter.Composite.allBodies(engine.world).filter((b) => !b.isStatic);
          for (const b of all) {
            if (b.position.y < deathLineY) {
              const t = (aboveTimersRef.current.get(b.id) || 0) + dt;
              aboveTimersRef.current.set(b.id, t);
              if (t > 2.5) {
                setPhase('over');
                accRef.current = scoreRef.current;
                try {
                  localStorage.setItem('hb-best', String(Math.max(best, scoreRef.current)));
                } catch {}
                break;
              }
            } else {
              aboveTimersRef.current.delete(b.id);
            }
          }

          // Timer
          setTime(Math.floor((ts - startTimeRef.current) / 1000));
        }
      }

      // Particles
      const pts = particlesRef.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 35 * dt;
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

      // Render
      const { w: cw, h: ch, cx, cy } = dimRef.current;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      ctx.clearRect(0, 0, winW, winH);

      // container glow flash
      if (containerFlashRef.current > 0) {
        containerFlashRef.current -= dt * 1.8;
      }
      const flash = Math.max(0, containerFlashRef.current);

      // container back
      if (flash > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(215,169,46,0.5)';
        ctx.shadowBlur = flash * 80;
      }
      const cGrad = ctx.createLinearGradient(cx, cy - ch / 2, cx, cy + ch / 2);
      cGrad.addColorStop(0, `rgba(215,169,46,${0.04 + flash * 0.15})`);
      cGrad.addColorStop(1, `rgba(179,25,40,${0.04 + flash * 0.15})`);
      ctx.fillStyle = cGrad;
      roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 16);
      ctx.fill();
      ctx.strokeStyle = `rgba(215,169,46,${0.22 + flash * 0.5})`;
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 16);
      ctx.stroke();
      if (flash > 0) ctx.restore();

      // death line
      const deathY = cy - ch / 2 + ch * 0.13;
      ctx.strokeStyle = 'rgba(179,25,40,0.35)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - cw / 2 + 8, deathY);
      ctx.lineTo(cx + cw / 2 - 8, deathY);
      ctx.stroke();
      ctx.setLineDash([]);

      // bodies
      if (engine) {
        const bodies = Matter.Composite.allBodies(engine.world).filter((b) => !b.isStatic && (b as any).tier != null);
        for (const b of bodies) {
          const plugin = (b as any).plugin || {};
          const tierIdx = (b as any).tier || 0;
          let renderScale = plugin.renderScale ?? 1;
          if (renderScale < 1) {
            renderScale += (1 - renderScale) * 0.18;
            plugin.renderScale = renderScale;
          }
          const radius = b.circleRadius ? b.circleRadius * renderScale : TIERS[tierIdx].r * dimRef.current.scale;
          drawOrb(ctx, tierIdx, b.position.x, b.position.y, radius);
        }
      }

      // preview piece
      if (phase === 'playing' && canDropRef.current) {
        const tier = currentTierRef.current;
        const r = TIERS[tier].r * dimRef.current.scale;
        const px = Math.max(cx - cw / 2 + r, Math.min(cx + cw / 2 - r, dropXRef.current));
        const py = cy - ch / 2 - r - 8;
        ctx.globalAlpha = 0.35;
        drawOrb(ctx, tier, px, py, r);
        ctx.globalAlpha = 1;

        // drop guide
        ctx.strokeStyle = 'rgba(247,241,223,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(px, py + r + 4);
        ctx.lineTo(px, cy + ch / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // particles
      for (const p of pts) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // floaters
      for (const f of flts) {
        const alpha = Math.max(0, f.life);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.font = `900 ${f.fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center';
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
  }, [phase, initPhysics, rebuildWalls, updateDimensions, processMerges, drawOrb, best]);

  /* ---------------------------------------------------------------- */
  /*  Inputs                                                          */
  /* ---------------------------------------------------------------- */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    dropXRef.current = e.clientX;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (phase === 'start') {
      // initialise first pieces
      currentTierRef.current = getRandomTier();
      nextTierRef.current = getRandomTier();
      scoreRef.current = 0;
      comboRef.current = 0;
      highestTierRef.current = 0;
      aboveTimersRef.current.clear();
      bodiesToRemoveRef.current.clear();
      mergeQueueRef.current = [];
      particlesRef.current = [];
      floatersRef.current = [];
      if (worldRef.current) {
        const toRemove = Matter.Composite.allBodies(worldRef.current).filter((b) => !b.isStatic);
        for (const b of toRemove) Matter.Composite.remove(worldRef.current, b);
      }
      startTimeRef.current = performance.now();
      setPhase('playing');
      return;
    }
    if (phase === 'over') {
      setPhase('start');
      return;
    }
    if (phase === 'playing') {
      dropPiece();
    }
  }, [phase, dropPiece]);

  /* ---------------------------------------------------------------- */
  /*  UI                                                              */
  /* ---------------------------------------------------------------- */
  const formatScore = (n: number) => n.toLocaleString();

  return (
    <div
      ref={shellRef}
      className="haki-stage"
      style={{
        position: 'fixed',
        inset: 0,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}
      />

      {/* HUD */}
      {phase !== 'start' && (
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
            fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: '#f7f1df',
          }}
        >
          <div>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>SCORE</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#d7a92e', textShadow: '0 0 12px rgba(215,169,46,0.25)' }}>
              {formatScore(score)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>BEST</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, opacity: 0.75 }}>{formatScore(best)}</div>
          </div>
        </div>
      )}

      {/* NEXT indicator */}
      {phase === 'playing' && (
        <div
          style={{
            position: 'fixed',
            top: 'max(4.2rem, env(safe-area-inset-top) + 48px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        >
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(247,241,223,0.55)' }}>NEXT</span>
          {/* Draw a tiny orb for next using simple CSS */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: 'radial-gradient(circle at 35% 35%, #2a2218, #120e0a)',
              border: `1px solid ${TIERS[nextTierRef.current].glow}`,
              boxShadow: `0 0 12px ${TIERS[nextTierRef.current].glow}`,
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              fontWeight: 900,
              color: TIERS[nextTierRef.current].color,
              textShadow: '0 0 6px rgba(215,169,46,0.3)',
            }}
          >
            {TIERS[nextTierRef.current].label}
          </div>
        </div>
      )}

      {/* START overlay */}
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
              覇気合成
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
              同じ漢字がぶつかると合体。<br />
              頂点「覇気」を目指せ。
            </p>
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
                cursor: 'pointer',
              }}
            >
              TAP TO START
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER overlay */}
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
              border: '1px solid rgba(179,25,40,0.45)',
              borderRadius: 20,
              background: 'rgba(12,8,6,0.82)',
              boxShadow: '0 32px 90px rgba(179,25,40,0.25)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.8rem, 6vw, 3.2rem)',
                color: '#b31928',
                textShadow: '0 0 24px rgba(179,25,40,0.45)',
              }}
            >
              覇気散逸
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.18em' }}>SCORE</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#d7a92e' }}>{formatScore(score)}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{time}s</div>
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
                boxShadow: '0 14px 40px rgba(179,25,40,0.25)',
                cursor: 'pointer',
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
