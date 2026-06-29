'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Phase = 'lobby' | 'playing' | 'levelup' | 'win' | 'lose';

interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  speed: number;
  radius: number;
  color: string;
  value: number;
  hitBy: Set<number>;
  since: number;
}

interface BurstRing {
  id: number;
  maxR: number;
  life: number; maxLife: number;
  ringW: number;
}

interface FxParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
}

interface FloatText {
  x: number; y: number;
  text: string; color: string; fontSize: number;
  vy: number; life: number;
}

interface RankDef {
  name: string;
  maxHp: number;
  auraDps: number;
  auraRadius: number; // fraction of min(w,h)
  burstPower: number;
  burstR: number; // fraction
  autoBurstRate: number; // per sec (0 = none)
  color: string;
  glow: string;
  auraColor: string;
  xpNeed: number;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const RANKS: RankDef[] = [
  { name: '気', maxHp: 120, auraDps: 8, auraRadius: 0.16, burstPower: 35, burstR: 0.28, autoBurstRate: 0, color: '#e6e6e6', glow: 'rgba(230,230,230,0.35)', auraColor: 'rgba(230,230,230,0.18)', xpNeed: 140 },
  { name: '闘気', maxHp: 320, auraDps: 35, auraRadius: 0.22, burstPower: 70, burstR: 0.36, autoBurstRate: 0.5, color: '#f0dcb0', glow: 'rgba(240,220,176,0.55)', auraColor: 'rgba(240,220,176,0.28)', xpNeed: 650 },
  { name: '武装色の覇気', maxHp: 900, auraDps: 160, auraRadius: 0.30, burstPower: 150, burstR: 0.46, autoBurstRate: 1.4, color: '#d9b845', glow: 'rgba(217,184,69,0.75)', auraColor: 'rgba(217,184,69,0.35)', xpNeed: 2500 },
  { name: '覇気', maxHp: 2600, auraDps: 800, auraRadius: 0.40, burstPower: 340, burstR: 0.58, autoBurstRate: 3.5, color: '#e07020', glow: 'rgba(224,112,32,0.85)', auraColor: 'rgba(224,112,32,0.42)', xpNeed: 9000 },
  { name: '覇王色の覇気', maxHp: 9999, auraDps: 9999, auraRadius: 0.58, burstPower: 999, burstR: 0.75, autoBurstRate: 10, color: '#ff0a2a', glow: 'rgba(255,10,42,0.95)', auraColor: 'rgba(255,10,42,0.50)', xpNeed: 999999 },
];

const MAX_WAVE = 20;

const ENEMY_DATA = [
  { name: '迷い', hp: 28, radius: 6, speed: 68, color: '#4d4d4d', value: 6 },
  { name: '雑念', hp: 65, radius: 9, speed: 90, color: '#6e3c3c', value: 12 },
  { name: '敵意', hp: 150, radius: 14, speed: 58, color: '#a31f1f', value: 30 },
  { name: '怨念', hp: 420, radius: 21, speed: 42, color: '#d60000', value: 85 },
];

/* ------------------------------------------------------------------ */
/*  Audio                                                              */
/* ------------------------------------------------------------------ */
let aCtx: AudioContext | null = null;
function ac() {
  if (typeof window === 'undefined') return null;
  if (!aCtx) aCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return aCtx;
}
function sfx(freq: number, type: OscillatorType, dur: number, vol: number, when?: number) {
  const ctx = ac();
  if (!ctx) return;
  const t = when ?? ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}
function sfxBurst(wide: boolean) {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  sfx(150, 'sine', 0.28, 0.15, t);
  sfx(wide ? 80 : 220, 'triangle', 0.20, 0.08, t + 0.02);
}
function sfxHit() {
  sfx(880, 'square', 0.04, 0.04);
}
function sfxDie() {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.2);
}
function sfxLevelUp() {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  [0, 0.10, 0.22].forEach((off, i) => {
    sfx(440 + i * 220, 'sine', 0.38, 0.10, t + off);
    sfx(660 + i * 220, 'triangle', 0.32, 0.05, t + off + 0.04);
  });
}
function sfxWarning() {
  sfx(180, 'square', 0.10, 0.06);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function HakiDomainGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('lobby');
  const [uiWave, setUiWave] = useState(1);
  const [uiHpPct, setUiHpPct] = useState(1);
  const [uiRankIdx, setUiRankIdx] = useState(0);
  const [uiRankName, setUiRankName] = useState(RANKS[0].name);
  const [uiXpPct, setUiXpPct] = useState(0);
  const [overlayTitle, setOverlayTitle] = useState('');
  const [overlaySub, setOverlaySub] = useState('');

  const phaseRef = useRef<Phase>('lobby');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Core game refs
  const waveRef = useRef(1);
  const rankRef = useRef(0);
  const xpRef = useRef(0);
  const hpRef = useRef(RANKS[0].maxHp);
  const maxHpRef = useRef(RANKS[0].maxHp);
  const enemiesRef = useRef<Enemy[]>([]);
  const burstsRef = useRef<BurstRing[]>([]);
  const particlesRef = useRef<FxParticle[]>([]);
  const floatersRef = useRef<FloatText[]>([]);
  const nextIdRef = useRef(1);
  const spawnerRef = useRef({ count: 0, spawned: 0, interval: 0, last: 0, types: [0] });
  const shakeRef = useRef({ x: 0, y: 0 });
  const flashRef = useRef(0);
  const warnRef = useRef(0);
  const auraPulseRef = useRef(0); // 0..1 sinus accumulator
  const autoBurstTimer = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);

  /* ---------------------------------------------------------------- */
  const startGame = useCallback(() => {
    waveRef.current = 1;
    rankRef.current = 0;
    xpRef.current = 0;
    hpRef.current = RANKS[0].maxHp;
    maxHpRef.current = RANKS[0].maxHp;
    enemiesRef.current = [];
    burstsRef.current = [];
    particlesRef.current = [];
    floatersRef.current = [];
    shakeRef.current = { x: 0, y: 0 };
    flashRef.current = 0;
    warnRef.current = 0;
    auraPulseRef.current = 0;
    autoBurstTimer.current = 0;
    nextIdRef.current = 1;
    setUiWave(1);
    setUiRankIdx(0);
    setUiRankName(RANKS[0].name);
    setUiHpPct(1);
    setUiXpPct(0);
    setOverlayTitle('');
    setPhase('playing');
    configureWave(1);
  }, []);

  function configureWave(wave: number) {
    const types =
      wave <= 3 ? [0] :
      wave <= 6 ? [0, 0, 1] :
      wave <= 10 ? [0, 1, 1, 2] :
      wave <= 15 ? [0, 1, 2, 2, 3] :
      [1, 2, 2, 3, 3];
    const duration = Math.max(3.2, 8.4 - wave * 0.28);
    const count = Math.floor(7 + wave * 2.2);
    spawnerRef.current = {
      count,
      spawned: 0,
      interval: duration / count,
      last: performance.now(),
      types,
    };
  }

  /* ---------------------------------------------------------------- */
  const onTap = useCallback((e: React.PointerEvent) => {
    if (phaseRef.current === 'lobby' || phaseRef.current === 'lose' || phaseRef.current === 'win') {
      const ctx = ac();
      if (ctx?.state === 'suspended') ctx.resume();
      startGame();
      return;
    }
    if (phaseRef.current !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spawnBurst(x, y, false);
  }, [startGame]);

  function spawnBurst(x: number, y: number, isAuto: boolean) {
    const rank = RANKS[rankRef.current];
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    burstsRef.current.push({
      id: nextIdRef.current++,
      maxR: rank.burstR * minDim,
      life: 0.26,
      maxLife: 0.26,
      ringW: isAuto ? 4 : 6,
    });
    // apply instant burst damage + knockback to enemies near the tap center
    for (const en of enemiesRef.current) {
      const dx = en.x - x;
      const dy = en.y - y;
      const d2 = dx * dx + dy * dy;
      const radiusAtContact = rank.burstR * minDim; // hitbox simplified
      if (d2 < radiusAtContact * radiusAtContact) {
        const d = Math.sqrt(d2) || 1;
        const nd = dx / d;
        const ny = dy / d;
        en.hp -= rank.burstPower;
        en.vx += nd * 300;
        en.vy += ny * 300;
        spawnSparks(en.x, en.y, rank.color, 5);
        if (en.hp <= 0) killEnemy(en);
      }
    }
    sfxBurst(false);
  }

  function spawnSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 220;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: 0.2 + Math.random() * 0.4,
        maxLife: 1,
        size: 2 + Math.random() * 3.5,
        color,
      });
    }
  }

  function killEnemy(e: Enemy) {
    particlesRef.current.push(
      ...Array.from({ length: 10 }).map(() => {
        const a = Math.random() * Math.PI * 2;
        const s = 60 + Math.random() * 160;
        return {
          x: e.x, y: e.y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.3 + Math.random() * 0.5,
          maxLife: 1,
          size: 2 + Math.random() * 4,
          color: e.color,
        };
      })
    );
    floatersRef.current.push({
      x: e.x, y: e.y - 6,
      text: `+${e.value}`,
      color: '#fceeb5',
      fontSize: 12,
      vy: 45,
      life: 0.7,
    });
    xpRef.current += e.value;
    sfxDie();
  }

  /* ---------------------------------------------------------------- */
  /*  Spawner                                                          */
  /* ---------------------------------------------------------------- */
  function spawnEnemy(types: number[]) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2, cy = h / 2;
    const dist = Math.max(w, h) * 0.55;
    const ang = Math.random() * Math.PI * 2;
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist;
    const tIdx = types[Math.floor(Math.random() * types.length)];
    const d = ENEMY_DATA[tIdx];
    const hpScale = 1 + waveRef.current * 0.065;
    enemiesRef.current.push({
      x, y, vx: 0, vy: 0,
      hp: d.hp * hpScale,
      maxHp: d.hp,
      speed: d.speed * (0.85 + Math.random() * 0.3),
      radius: d.radius,
      color: d.color,
      value: d.value,
      hitBy: new Set(),
      since: performance.now(),
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Game Loop                                                        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const loop = (ts: number) => {
      let dt = (ts - last) / 1000;
      last = ts;
      if (dt > 0.2) dt = 0.2;
      update(dt, ts);
      render(ctx2d, ts);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  function update(dt: number, ts: number) {
    if (phaseRef.current !== 'playing') {
      updateFx(dt); // keep animating FX
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const rank = RANKS[rankRef.current];
    const minDim = Math.min(w, h);

    // Aura pulse
    auraPulseRef.current += dt * 2.8;

    // Spawner
    const sp = spawnerRef.current;
    while (sp.spawned < sp.count && ts - sp.last >= sp.interval * 1000) {
      spawnEnemy(sp.types);
      sp.spawned++;
      sp.last += sp.interval * 1000;
    }

    // Auto burst
    if (rank.autoBurstRate > 0) {
      autoBurstTimer.current += dt;
      const interval = 1 / rank.autoBurstRate;
      while (autoBurstTimer.current >= interval) {
        autoBurstTimer.current -= interval;
        // pick random enemy
        const en = enemiesRef.current.length
          ? enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)]
          : null;
        const tx = en ? en.x : cx + (Math.random() - 0.5) * minDim * 0.6;
        const ty = en ? en.y : cy + (Math.random() - 0.5) * minDim * 0.6;
        spawnBurst(tx, ty, true);
      }
    }

    // Enemy movement + aura damage
    const auraR = rank.auraRadius * minDim;
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const e = enemiesRef.current[i];
      const dx = cx - e.x;
      const dy = cy - e.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      // steering toward center with slight sine wobble
      const wobble = Math.sin((ts - e.since) / 300 + e.x) * 0.15;
      const ax = (dx / d) + wobble * (dy / d);
      const ay = (dy / d) - wobble * (dx / d);
      const al = Math.sqrt(ax * ax + ay * ay) || 1;
      e.vx += (ax / al) * e.speed * dt * 2.4;
      e.vy += (ay / al) * e.speed * dt * 2.4;
      e.vx *= 0.92;
      e.vy *= 0.92;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // aura DPS if inside aura radius + enemy radius
      const distToCore = d;
      if (distToCore < auraR + e.radius) {
        const dmg = rank.auraDps * dt;
        const before = e.hp;
        e.hp -= dmg;
        // spark if significant tick
        if (Math.floor(before / 5) !== Math.floor(e.hp / 5)) {
          spawnSparks(e.x - (dx / d) * e.radius, e.y - (dy / d) * e.radius, rank.color, 1);
          sfxHit();
        }
        if (e.hp <= 0) {
          killEnemy(e);
          enemiesRef.current.splice(i, 1);
          continue;
        }
      }

      // core collision
      if (distToCore < (e.radius + 38)) {
        hpRef.current -= 9 + waveRef.current * 1.2;
        enemiesRef.current.splice(i, 1);
        flashRef.current = 0.6;
        warnRef.current = 0.5;
        shakeRef.current = { x: (Math.random() - 0.5) * 14, y: (Math.random() - 0.5) * 14 };
        spawnSparks(cx, cy, '#ff2a2a', 14);
        sfxWarning();
        if (hpRef.current <= 0) {
          hpRef.current = 0;
          triggerLose();
          return;
        }
      }
    }

    // Burst rings expansion + hit
    for (let i = burstsRef.current.length - 1; i >= 0; i--) {
      const b = burstsRef.current[i];
      b.life -= dt;
      if (b.life <= 0) {
        burstsRef.current.splice(i, 1);
        continue;
      }
    }

    // Wave clear / level up
    if (sp.spawned >= sp.count && enemiesRef.current.length === 0) {
      if (waveRef.current >= MAX_WAVE) {
        triggerWin();
        return;
      }
      if (xpRef.current >= rank.xpNeed && rankRef.current < RANKS.length - 1) {
        performRankUp();
      } else {
        waveRef.current++;
        setUiWave(waveRef.current);
        configureWave(waveRef.current);
      }
    }

    // UI sync
    setUiHpPct(Math.max(0, hpRef.current / maxHpRef.current));
    setUiXpPct(Math.min(1, xpRef.current / rank.xpNeed));
    updateFx(dt);
  }

  function updateFx(dt: number) {
    // particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += dt * 80;
      p.life -= dt;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }
    // floaters
    for (let i = floatersRef.current.length - 1; i >= 0; i--) {
      const f = floatersRef.current[i];
      f.y -= f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) floatersRef.current.splice(i, 1);
    }
    // shake / flash / warn decay
    flashRef.current = Math.max(0, flashRef.current - dt * 2.2);
    warnRef.current = Math.max(0, warnRef.current - dt * 2.5);
    shakeRef.current.x *= 0.88;
    shakeRef.current.y *= 0.88;
    if (Math.abs(shakeRef.current.x) < 0.4) shakeRef.current.x = 0;
    if (Math.abs(shakeRef.current.y) < 0.4) shakeRef.current.y = 0;
    if (shellRef.current) {
      const s = shakeRef.current;
      shellRef.current.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
  }

  /* ---------------------------------------------------------------- */
  function performRankUp() {
    const oldIdx = rankRef.current;
    const newIdx = Math.min(oldIdx + 1, RANKS.length - 1);
    rankRef.current = newIdx;
    const r = RANKS[newIdx];
    maxHpRef.current = r.maxHp;
    hpRef.current = maxHpRef.current;
    xpRef.current = 0;

    phaseRef.current = 'levelup';
    setPhase('levelup');

    flashRef.current = 1.2;
    shakeRef.current = { x: (Math.random() - 0.5) * 24, y: (Math.random() - 0.5) * 24 };
    spawnSparks(window.innerWidth / 2, window.innerHeight / 2, r.color, 80);
    // kill all
    for (const e of enemiesRef.current) {
      killEnemy(e);
    }
    enemiesRef.current = [];

    setUiRankIdx(newIdx);
    setUiRankName(r.name);
    setUiHpPct(1);
    setUiXpPct(0);
    setOverlayTitle(r.name);
    setOverlaySub('RANK UP');
    sfxLevelUp();

    setTimeout(() => {
      setOverlayTitle('');
      setOverlaySub('');
      phaseRef.current = 'playing';
      setPhase('playing');
      // if wave already cleared, advance
      const sp = spawnerRef.current;
      if (sp.spawned >= sp.count) {
        waveRef.current++;
        setUiWave(waveRef.current);
        configureWave(waveRef.current);
      }
    }, 2200);
  }

  function triggerLose() {
    phaseRef.current = 'lose';
    setPhase('lose');
    setOverlayTitle('覇気散逸');
    setOverlaySub(`Wave ${waveRef.current} 到達`);
  }

  function triggerWin() {
    phaseRef.current = 'win';
    setPhase('win');
    setOverlayTitle('覇王の覇気');
    setOverlaySub('全てを圧倒した');
    sfxLevelUp();
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  function render(ctx2d: CanvasRenderingContext2D, ts: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(w, h);
    const rank = RANKS[uiRankIdx];

    ctx2d.clearRect(0, 0, w, h);

    // Deep background
    ctx2d.fillStyle = '#080604';
    ctx2d.fillRect(0, 0, w, h);

    // Subtle vignette
    const vig = ctx2d.createRadialGradient(cx, cy, minDim * 0.15, cx, cy, Math.max(w, h) * 0.6);
    vig.addColorStop(0, 'rgba(10,8,6,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx2d.fillStyle = vig;
    ctx2d.fillRect(0, 0, w, h);

    // Permanent aura disk (pulsing)
    const pulse = 1 + Math.sin(auraPulseRef.current) * 0.04;
    const baseAuraR = rank.auraRadius * minDim * pulse;

    // Outer soft aura
    const ag = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, baseAuraR * 1.2);
    ag.addColorStop(0, rank.auraColor.replace(/[\d\.]+\)$/g, '0)'));
    ag.addColorStop(0.4, rank.auraColor);
    ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx2d.fillStyle = ag;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, baseAuraR * 1.2, 0, Math.PI * 2);
    ctx2d.fill();

    // Inner stronger aura ring
    ctx2d.strokeStyle = rank.color;
    ctx2d.lineWidth = 1.5;
    ctx2d.globalAlpha = 0.25 + Math.sin(auraPulseRef.current * 1.5) * 0.08;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, baseAuraR, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.globalAlpha = 1;

    // Burst rings render
    for (const b of burstsRef.current) {
      const t = 1 - b.life / b.maxLife; // 0..1
      const r = b.maxR * Math.sin(t * Math.PI * 0.8); // expand then contract-ish
      const alpha = Math.sin((1 - b.life / b.maxLife) * Math.PI) * 0.75;
      if (r > 0) {
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2d.strokeStyle = `rgba(255, 245, 220, ${alpha})`;
        ctx2d.lineWidth = b.ringW;
        ctx2d.shadowColor = rank.glow;
        ctx2d.shadowBlur = 28;
        ctx2d.stroke();
        ctx2d.shadowBlur = 0;
      }
    }

    // Warning vignette when enemy near core
    if (warnRef.current > 0) {
      ctx2d.fillStyle = `rgba(255, 30, 30, ${warnRef.current * 0.15})`;
      ctx2d.fillRect(0, 0, w, h);
    }

    // Flash
    if (flashRef.current > 0) {
      ctx2d.fillStyle = `rgba(255, 240, 220, ${flashRef.current * 0.35})`;
      ctx2d.fillRect(0, 0, w, h);
    }

    // XP orbs (tiny) drawn as sparkles
    // (XP is instant in this design after enemy death, so no persistent orbs)

    // Enemies
    for (const e of enemiesRef.current) {
      ctx2d.save();
      ctx2d.translate(e.x, e.y);
      const ang = Math.atan2(cy - e.y, cx - e.x);
      ctx2d.rotate(ang);

      // Body
      ctx2d.fillStyle = e.color;
      ctx2d.shadowColor = e.color;
      ctx2d.shadowBlur = 14;
      ctx2d.beginPath();
      const spikes = 6;
      for (let i = 0; i < spikes * 2; i++) {
        const r = (i % 2 === 0) ? e.radius : e.radius * 0.45;
        const a = (Math.PI * i) / spikes;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx2d.moveTo(px, py);
        else ctx2d.lineTo(px, py);
      }
      ctx2d.closePath();
      ctx2d.fill();
      ctx2d.shadowBlur = 0;

      // HP bar when damaged
      if (e.hp < e.maxHp) {
        const bw = e.radius * 2.8;
        const bh = 3;
        const pct = e.hp / e.maxHp;
        ctx2d.fillStyle = 'rgba(0,0,0,0.45)';
        ctx2d.fillRect(-bw / 2, -e.radius - 9, bw, bh);
        ctx2d.fillStyle = pct < 0.3 ? '#ff3333' : '#ffd36e';
        ctx2d.fillRect(-bw / 2, -e.radius - 9, bw * pct, bh);
      }
      ctx2d.restore();
    }

    // Particles
    for (const p of particlesRef.current) {
      const alpha = Math.max(0, p.life / (p.maxLife || 1));
      ctx2d.globalAlpha = alpha;
      ctx2d.fillStyle = p.color;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.size * (0.3 + 0.7 * alpha), 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;

    // Floaters
    for (const f of floatersRef.current) {
      const alpha = Math.max(0, f.life);
      ctx2d.globalAlpha = alpha;
      ctx2d.fillStyle = f.color;
      ctx2d.font = `900 ${f.fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText(f.text, f.x, f.y);
    }
    ctx2d.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- */
  const rank = RANKS[uiRankIdx];

  return (
    <div
      ref={shellRef}
      onPointerDown={onTap}
      style={{
        position: 'fixed',
        inset: 0,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'crosshair',
        background: '#080604',
        overflow: 'hidden',
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />

      {/* Central Haki glyph ─ massive, pulsing, dominant */}
      <div
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
          color: rank.color,
          textShadow: `0 0 ${18 + uiRankIdx * 12}px ${rank.glow}`,
          lineHeight: 1,
          transform: 'scale(1)',
          transition: 'color 0.6s ease, text-shadow 0.6s ease',
          willChange: 'transform',
        }}
      >
        覇気
      </div>

      {/* Aura label under glyph */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '55%',
          transform: 'translateX(-50%)',
          zIndex: 6,
          pointerEvents: 'none',
          fontSize: '0.72rem',
          color: 'rgba(247,241,223,0.45)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase' as any,
          mixBlendMode: 'screen',
        }}
      >
        {rank.name}
      </div>

      {/* HUD top */}
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
          color: '#f7f1df',
        }}
      >
        <div>
          <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em' }}>WAVE</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fceeb5' }}>{uiWave}/{MAX_WAVE}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em' }}>RANK</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: rank.color }}>{uiRankName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em' }}>HP</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: uiHpPct < 0.3 ? '#ff4444' : '#f7f1df' }}>{Math.ceil(uiHpPct * 100)}%</div>
        </div>
      </div>

      {/* HP ring around center */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        <svg width={120} height={120} style={{ transform: 'scale(2.6)' }}>
          <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
          <circle
            cx="60"
            cy="60"
            r="56"
            fill="none"
            stroke={uiHpPct < 0.3 ? '#ff4444' : uiHpPct < 0.6 ? '#ffd36e' : '#63e6be'}
            strokeWidth={4}
            strokeDasharray={`${Math.max(0, uiHpPct) * 352} 352`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 200ms ease-out', filter: 'drop-shadow(0 0 4px currentColor)' }}
          />
        </svg>
      </div>

      {/* Bottom XP bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '0 1.2rem max(1.2rem, env(safe-area-inset-bottom))',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            margin: '0 auto',
            height: 5,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${uiXpPct * 100}%`,
              height: '100%',
              borderRadius: 999,
              background: uiRankIdx >= 4 ? 'linear-gradient(90deg, #ff0a2a, #ff4d6e)' : rank.color,
              boxShadow: `0 0 14px ${rank.glow}`,
              transition: 'width 150ms linear',
            }}
          />
        </div>
      </div>

      {/* Overlay */}
      {(phase === 'lobby' || phase === 'lose' || phase === 'win' || phase === 'levelup') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            background: 'rgba(5,5,5,0.72)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: '0.8rem',
              textAlign: 'center',
              padding: '2.2rem 2.6rem',
              border: `1px solid ${phase === 'win' ? 'rgba(215,169,46,0.55)' : phase === 'lose' ? 'rgba(179,25,40,0.45)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 20,
              background: 'rgba(8,6,4,0.84)',
              boxShadow: `0 40px 120px ${phase === 'win' ? 'rgba(215,169,46,0.22)' : 'rgba(0,0,0,0.55)'}`,
              animation: 'popIn 0.35s cubic-bezier(0.22,1,0.36,1)',
              minWidth: 260,
            }}
          >
            {overlaySub && (
              <div style={{ fontSize: '0.68rem', color: 'rgba(247,241,223,0.5)', letterSpacing: '0.22em' }}>{overlaySub}</div>
            )}
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(2.4rem, 7.5vw, 4.2rem)',
                lineHeight: 0.9,
                fontWeight: 900,
                color: phase === 'win' ? '#ffe0a0' : phase === 'lose' ? '#ff2a3a' : phase === 'levelup' ? rank.color : '#fff1c7',
                textShadow: `0 0 36px ${phase === 'win' ? 'rgba(255,224,160,0.45)' : phase === 'lose' ? 'rgba(255,42,58,0.35)' : 'rgba(247,209,91,0.4)'}`,
              }}
            >
              {phase === 'lobby' ? '覇気の領域' : overlayTitle}
            </h2>

            {phase === 'lobby' && (
              <>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(247,241,223,0.7)', lineHeight: 1.6, maxWidth: 290 }}>
                  覇気は自らの「圧」で敵を祓う。<br />
                  タップで衝撃を放ち、中央を守れ。<br />
                  20ウェーブ、覇気を高めろ。
                </p>
                <div
                  style={{
                    marginTop: 4,
                    padding: '0.9rem 1.8rem',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #d7a92e, #b31928)',
                    color: '#0c0a08',
                    fontWeight: 950,
                    fontSize: '0.9rem',
                    letterSpacing: '0.08em',
                    boxShadow: '0 16px 50px rgba(179,25,40,0.25)',
                  }}
                >
                  TAP TO START
                </div>
              </>
            )}

            {phase === 'lose' && (
              <>
                <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.55)' }}>覇気は散った...</div>
                <div
                  style={{
                    marginTop: 4,
                    padding: '0.9rem 1.8rem',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #444, #b31928)',
                    color: '#0c0a08',
                    fontWeight: 950,
                    fontSize: '0.9rem',
                    letterSpacing: '0.08em',
                    boxShadow: '0 16px 50px rgba(179,25,40,0.25)',
                  }}
                >
                  TRY AGAIN
                </div>
              </>
            )}

            {phase === 'win' && (
              <>
                <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.55)' }}>覇気は全てを圧倒した。</div>
                <div
                  style={{
                    marginTop: 4,
                    padding: '0.9rem 1.8rem',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #d7a92e, #b31928)',
                    color: '#0c0a08',
                    fontWeight: 950,
                    fontSize: '0.9rem',
                    letterSpacing: '0.08em',
                    boxShadow: '0 16px 50px rgba(179,25,40,0.25)',
                  }}
                >
                  PLAY AGAIN
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
