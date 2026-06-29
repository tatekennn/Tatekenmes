'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type GamePhase = 'start' | 'wave' | 'levelup' | 'win' | 'gameover';

interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  speed: number;
  radius: number;
  color: string;
  value: number;
  spawnT: number; // timestamp
  hitBy: Set<number>; // shockwave ids already dealt damage
}

interface Shockwave {
  id: number;
  x: number; y: number;
  r: number; maxR: number;
  power: number;
  life: number; maxLife: number;
}

interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  power: number;
  color: string;
}

interface XpOrb {
  x: number; y: number;
  amount: number;
  life: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
}

interface FloatText {
  x: number; y: number;
  text: string;
  color: string;
  life: number; vy: number; fontSize: number;
}

interface LevelDef {
  name: string;
  maxHp: number;
  tapPower: number;
  tapRadius: number;
  autoFireRate: number; // shots per sec
  autoShots: number;
  color: string;
  glow: string;
  auraSize: number;
  xpNeed: number;
}

const MAX_WAVE = 20;

const LEVELS: LevelDef[] = [
  { name: '気', maxHp: 100, tapPower: 30, tapRadius: 75, autoFireRate: 0, autoShots: 0, color: '#b0b0b0', glow: 'rgba(176,176,176,0.5)', auraSize: 0.18, xpNeed: 120 },
  { name: '闘気', maxHp: 280, tapPower: 55, tapRadius: 95, autoFireRate: 1.5, autoShots: 2, color: '#e8d5a3', glow: 'rgba(232,213,163,0.7)', auraSize: 0.26, xpNeed: 500 },
  { name: '武装色の覇気', maxHp: 700, tapPower: 110, tapRadius: 125, autoFireRate: 3.2, autoShots: 4, color: '#d7a92e', glow: 'rgba(215,169,46,0.85)', auraSize: 0.34, xpNeed: 1800 },
  { name: '覇気', maxHp: 1800, tapPower: 220, tapRadius: 170, autoFireRate: 6, autoShots: 8, color: '#d46828', glow: 'rgba(212,104,40,0.95)', auraSize: 0.44, xpNeed: 7000 },
  { name: '覇王色の覇気', maxHp: 6000, tapPower: 500, tapRadius: 240, autoFireRate: 12, autoShots: 16, color: '#b31928', glow: 'rgba(179,25,40,1)', auraSize: 0.55, xpNeed: 999999 },
];

const ENEMY_TEMPLATES = [
  { name: '迷い', maxHp: 22, radius: 7, speed: 65, color: '#555', value: 6 },
  { name: '雑念', maxHp: 50, radius: 10, speed: 85, color: '#744', value: 12 },
  { name: '敵意', maxHp: 120, radius: 15, speed: 55, color: '#922', value: 30 },
  { name: '怨念', maxHp: 320, radius: 22, speed: 38, color: '#b00', value: 90 },
];

/* ------------------------------------------------------------------ */
/*  Audio helper                                                       */
/* ------------------------------------------------------------------ */
let audioCtx: AudioContext | null = null;
function getAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}
function playTone(freq: number, type: OscillatorType, dur: number, vol: number, when?: number) {
  const ctx = getAudio();
  if (!ctx) return;
  const t = when ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}
function playTap(xRatio: number) {
  const ctx = getAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  // stereo-ish pan via frequency
  const f = 500 + xRatio * 600;
  playTone(f, 'sine', 0.12, 0.12, t);
  playTone(f * 1.5, 'triangle', 0.08, 0.06, t);
}
function playExplode() {
  const ctx = getAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.22);
}
function playLevelUp() {
  const ctx = getAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  [0, 0.12, 0.24].forEach((offset, i) => {
    playTone(440 + i * 220, 'sine', 0.35, 0.1, t + offset);
    playTone(660 + i * 220, 'triangle', 0.3, 0.06, t + offset);
  });
}
function playDamage() {
  const ctx = getAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(150, 'square', 0.1, 0.08, t);
  playTone(100, 'sawtooth', 0.12, 0.04, t + 0.04);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function HakiGuardianGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<GamePhase>('start');
  const [uiWave, setUiWave] = useState(0);
  const [uiHpPct, setUiHpPct] = useState(1);
  const [uiLevelName, setUiLevelName] = useState(LEVELS[0].name);
  const [uiLevelIdx, setUiLevelIdx] = useState(0);
  const [uiXpPct, setUiXpPct] = useState(0);
  const [overlayTitle, setOverlayTitle] = useState('');
  const [overlaySub, setOverlaySub] = useState('');

  const phaseRef = useRef<GamePhase>('start');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Game state refs
  const waveRef = useRef(1);
  const levelIdxRef = useRef(0);
  const xpRef = useRef(0);
  const hpRef = useRef(100);
  const maxHpRef = useRef(100);

  const enemiesRef = useRef<Enemy[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const xpOrbsRef = useRef<XpOrb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatersRef = useRef<FloatText[]>([]);

  const spawnerRef = useRef({ count: 0, spawned: 0, interval: 0, lastSpawn: 0, types: [0] });
  const shakeRef = useRef({ x: 0, y: 0 });
  const flashRef = useRef(0);
  const autoFireTimerRef = useRef(0);
  const nextIdRef = useRef(1);

  const rafRef = useRef<number>(0);
  const lastTsRef = useRef(0);

  /* ---------------------------------------------------------------- */
  /*  Init / Reset                                                     */
  /* ---------------------------------------------------------------- */
  const startGame = useCallback(() => {
    waveRef.current = 1;
    levelIdxRef.current = 0;
    xpRef.current = 0;
    hpRef.current = LEVELS[0].maxHp;
    maxHpRef.current = LEVELS[0].maxHp;
    enemiesRef.current = [];
    shockwavesRef.current = [];
    projectilesRef.current = [];
    xpOrbsRef.current = [];
    particlesRef.current = [];
    floatersRef.current = [];
    shakeRef.current = { x: 0, y: 0 };
    flashRef.current = 0;
    autoFireTimerRef.current = 0;
    nextIdRef.current = 1;

    setUiWave(1);
    setUiLevelName(LEVELS[0].name);
    setUiLevelIdx(0);
    setUiHpPct(1);
    setUiXpPct(0);
    setOverlayTitle('');

    setPhase('wave');
    configureWave(1);
  }, []);

  function configureWave(wave: number) {
    const types = wave <= 3 ? [0] :
                  wave <= 6 ? [0, 0, 1] :
                  wave <= 10 ? [0, 1, 1, 2] :
                  wave <= 15 ? [0, 1, 2, 2, 3] :
                  [1, 2, 2, 3, 3];
    const count = Math.floor(6 + wave * 2.2);
    const duration = Math.max(3, 8 - wave * 0.25);
    spawnerRef.current = {
      count,
      spawned: 0,
      interval: duration / count,
      lastSpawn: performance.now(),
      types,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Spawners                                                         */
  /* ---------------------------------------------------------------- */
  function spawnEnemy(types: number[]) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const spawnDist = Math.max(w, h) * 0.55;
    const angle = Math.random() * Math.PI * 2;
    const x = cx + Math.cos(angle) * spawnDist;
    const y = cy + Math.sin(angle) * spawnDist;

    const tIdx = types[Math.floor(Math.random() * types.length)];
    const tpl = ENEMY_TEMPLATES[tIdx];
    const spdVar = 0.8 + Math.random() * 0.4;

    enemiesRef.current.push({
      x, y,
      vx: 0, vy: 0,
      hp: tpl.maxHp + tpl.maxHp * (waveRef.current * 0.06),
      maxHp: tpl.maxHp,
      speed: tpl.speed * spdVar,
      radius: tpl.radius,
      color: tpl.color,
      value: tpl.value,
      spawnT: performance.now(),
      hitBy: new Set(),
    });
  }

  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.2 + Math.random() * 0.5,
        maxLife: 1,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Input                                                            */
  /* ---------------------------------------------------------------- */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phaseRef.current === 'start' || phaseRef.current === 'gameover' || phaseRef.current === 'win') {
      // Resume / restart audio context on user gesture
      const ctx = getAudio();
      if (ctx?.state === 'suspended') ctx.resume();
      startGame();
      return;
    }
    if (phaseRef.current !== 'wave') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lvl = LEVELS[levelIdxRef.current];
    const sw: Shockwave = {
      id: nextIdRef.current++,
      x, y,
      r: 0, maxR: lvl.tapRadius,
      power: lvl.tapPower,
      life: 0.22, maxLife: 0.22,
    };
    shockwavesRef.current.push(sw);
    playTap(x / window.innerWidth);
  }, [startGame]);

  /* ---------------------------------------------------------------- */
  /*  Loop                                                             */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      if (dt > 0.15) dt = 0.15;

      if (phaseRef.current === 'wave') {
        runWave(dt, ts);
      }

      // Global updates (particles, floats, shake, render)
      updateGlobal(dt);
      renderAll(ctx, ts);

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
  function runWave(dt: number, ts: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const lvl = LEVELS[levelIdxRef.current];

    // Spawn
    const sp = spawnerRef.current;
    while (sp.spawned < sp.count && ts - sp.lastSpawn >= sp.interval * 1000) {
      spawnEnemy(sp.types);
      sp.spawned++;
      sp.lastSpawn += sp.interval * 1000;
    }

    // Auto fire
    if (lvl.autoFireRate > 0 && enemiesRef.current.length > 0) {
      autoFireTimerRef.current += dt;
      const interval = 1 / lvl.autoFireRate;
      while (autoFireTimerRef.current >= interval) {
        autoFireTimerRef.current -= interval;
        for (let s = 0; s < lvl.autoShots; s++) {
          const target = pickNearestEnemy(cx, cy);
          if (!target) break;
          const angle = Math.atan2(target.y - cy, target.x - cx) + (Math.random() - 0.5) * 0.15;
          const speed = 420;
          projectilesRef.current.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 2.5,
            power: lvl.tapPower * 0.35,
            color: lvl.color,
          });
        }
      }
    }

    // Move enemies
    for (const e of enemiesRef.current) {
      const dx = cx - e.x;
      const dy = cy - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // forward
      e.vx += (dx / dist) * e.speed * dt * 2;
      e.vy += (dy / dist) * e.speed * dt * 2;
      // friction
      e.vx *= 0.92;
      e.vy *= 0.92;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }

    // Shockwaves expand + damage
    for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
      const sw = shockwavesRef.current[i];
      sw.r += (sw.maxR / sw.maxLife) * dt;
      sw.life -= dt;
      if (sw.life <= 0) {
        shockwavesRef.current.splice(i, 1);
        continue;
      }
      for (const e of enemiesRef.current) {
        const dx = e.x - sw.x;
        const dy = e.y - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < sw.r + e.radius && !e.hitBy.has(sw.id)) {
          e.hp -= sw.power;
          e.hitBy.add(sw.id);
          // knockback
          const nd = dist || 1;
          e.vx += (dx / nd) * 180;
          e.vy += (dy / nd) * 180;
          if (e.hp <= 0) {
            killEnemy(e, cx, cy);
          }
        }
      }
    }

    // Projectiles
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
      const p = projectilesRef.current[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) p.life = 0;
      if (p.life <= 0) {
        projectilesRef.current.splice(i, 1);
        continue;
      }
      for (const e of enemiesRef.current) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy < (e.radius + 5) * (e.radius + 5)) {
          e.hp -= p.power;
          p.life = 0;
          spawnParticles(p.x, p.y, p.color, 6);
          if (e.hp <= 0) killEnemy(e, cx, cy);
          break;
        }
      }
    }

    // XP orbs magnetism and absorption
    for (let i = xpOrbsRef.current.length - 1; i >= 0; i--) {
      const o = xpOrbsRef.current[i];
      const dx = cx - o.x;
      const dy = cy - o.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const s = 180;
      o.x += (dx / d) * s * dt;
      o.y += (dy / d) * s * dt;
      if (d < 24) {
        xpRef.current += o.amount;
        xpOrbsRef.current.splice(i, 1);
        // soft level-up check
        checkLevelUp();
      }
    }

    // Enemy vs Haki (damage)
    const hakiR = lvl.tapRadius * 0.35; // hitbox radius around center
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const e = enemiesRef.current[i];
      const dx = e.x - cx;
      const dy = e.y - cy;
      if (dx * dx + dy * dy < (e.radius + hakiR) * (e.radius + hakiR)) {
        hpRef.current -= 8 + waveRef.current;
        enemiesRef.current.splice(i, 1);
        flashRef.current = 0.5;
        shakeRef.current = { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 };
        spawnParticles(cx, cy, '#ff4444', 12);
        playDamage();
        if (hpRef.current <= 0) {
          hpRef.current = 0;
          triggerGameOver();
          return;
        }
      }
    }

    // Wave clear check
    if (sp.spawned >= sp.count && enemiesRef.current.length === 0) {
      if (waveRef.current >= MAX_WAVE) {
        triggerWin();
        return;
      }
      // level up if pending
      if (xpRef.current >= lvl.xpNeed && levelIdxRef.current < LEVELS.length - 1) {
        performLevelUp();
      } else {
        waveRef.current++;
        setUiWave(waveRef.current);
        configureWave(waveRef.current);
      }
    }

    // UI sync (throttle visually by React batching is fine)
    setUiHpPct(hpRef.current / maxHpRef.current);
    setUiXpPct(Math.min(1, xpRef.current / lvl.xpNeed));
  }

  function pickNearestEnemy(cx: number, cy: number) {
    let best: Enemy | null = null;
    let bd = Infinity;
    for (const e of enemiesRef.current) {
      const dx = e.x - cx;
      const dy = e.y - cy;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  function killEnemy(e: Enemy, cx: number, cy: number) {
    spawnParticles(e.x, e.y, e.color, 14);
    floatersRef.current.push({
      x: e.x, y: e.y - 10,
      text: `+${e.value}`,
      color: '#d7a92e',
      life: 0.7,
      vy: 50,
      fontSize: 13,
    });
    xpOrbsRef.current.push({
      x: e.x, y: e.y,
      amount: e.value,
      life: 4,
    });
    playExplode();
  }

  function checkLevelUp() {
    const lvl = LEVELS[levelIdxRef.current];
    if (xpRef.current >= lvl.xpNeed && levelIdxRef.current < LEVELS.length - 1) {
      performLevelUp();
    }
  }

  let isLeveling = false;
  function performLevelUp() {
    if (isLeveling) return;
    isLeveling = true;
    phaseRef.current = 'levelup';
    setPhase('levelup');

    const oldIdx = levelIdxRef.current;
    const newIdx = Math.min(oldIdx + 1, LEVELS.length - 1);
    levelIdxRef.current = newIdx;
    const nd = LEVELS[newIdx];

    maxHpRef.current = nd.maxHp;
    hpRef.current = maxHpRef.current;
    xpRef.current = 0;

    // clear screen effect
    flashRef.current = 1.0;
    shakeRef.current = { x: (Math.random() - 0.5) * 18, y: (Math.random() - 0.5) * 18 };
    spawnParticles(window.innerWidth / 2, window.innerHeight / 2, nd.color, 60);

    // kill all enemies
    for (const e of enemiesRef.current) {
      killEnemy(e, window.innerWidth / 2, window.innerHeight / 2);
    }
    enemiesRef.current = [];

    setUiLevelName(nd.name);
    setUiLevelIdx(newIdx);
    setUiHpPct(1);
    setUiXpPct(0);
    setOverlayTitle(nd.name);
    setOverlaySub('RANK UP');
    playLevelUp();

    setTimeout(() => {
      setOverlayTitle('');
      setOverlaySub('');
      phaseRef.current = 'wave';
      setPhase('wave');
      // keep current wave running or advance? Continue current wave if not cleared, else advance.
      const sp = spawnerRef.current;
      if (sp.spawned >= sp.count && enemiesRef.current.length === 0) {
        waveRef.current++;
        setUiWave(waveRef.current);
        configureWave(waveRef.current);
      }
      isLeveling = false;
    }, 2000);
  }

  function triggerGameOver() {
    phaseRef.current = 'gameover';
    setPhase('gameover');
    setOverlayTitle('覇気散逸');
    setOverlaySub(`Wave ${waveRef.current} 到達`);
  }

  function triggerWin() {
    phaseRef.current = 'win';
    setPhase('win');
    setOverlayTitle('覇王の覇気');
    setOverlaySub('全ての敵意を払拭した');
    playLevelUp();
  }

  /* ---------------------------------------------------------------- */
  function updateGlobal(dt: number) {
    // particles
    const pts = particlesRef.current;
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 70 * dt;
      p.life -= dt;
      if (p.life <= 0) pts.splice(i, 1);
    }
    // floaters
    const flts = floatersRef.current;
    for (let i = flts.length - 1; i >= 0; i--) {
      const f = flts[i];
      f.y -= f.vy * dt;
      f.vy *= 0.96;
      f.life -= dt;
      if (f.life <= 0) flts.splice(i, 1);
    }
    // effects decay
    flashRef.current = Math.max(0, flashRef.current - dt * 2);
    shakeRef.current.x *= 0.85;
    shakeRef.current.y *= 0.85;
    if (Math.abs(shakeRef.current.x) < 0.5) shakeRef.current.x = 0;
    if (Math.abs(shakeRef.current.y) < 0.5) shakeRef.current.y = 0;

    if (shellRef.current) {
      const sh = shakeRef.current;
      shellRef.current.style.transform = `translate(${sh.x}px, ${sh.y}px)`;
    }
  }

  /* ---------------------------------------------------------------- */
  function renderAll(ctx: CanvasRenderingContext2D, ts: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Background vignette
    const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    vig.addColorStop(0, 'rgba(12,10,8,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    const lvl = LEVELS[uiLevelIdx];

    // Aura glow
    const auraR = Math.min(w, h) * lvl.auraSize;
    const aGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
    aGrad.addColorStop(0, lvl.glow.replace(/[^,]+\)/, '0.22)'));
    aGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aGrad;
    ctx.fillRect(0, 0, w, h);

    // Flash
    if (flashRef.current > 0) {
      const f = flashRef.current;
      ctx.fillStyle = `rgba(255, ${240 - f * 80}, ${210 - f * 100}, ${f * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }

    // XP orbs
    for (const o of xpOrbsRef.current) {
      const pulse = 1 + Math.sin(ts / 200 + o.x) * 0.2;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#d7a92e';
      ctx.shadowColor = 'rgba(215,169,46,0.8)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // Enemies (drawn as spiky shapes)
    for (const e of enemiesRef.current) {
      ctx.save();
      ctx.translate(e.x, e.y);
      const angle = Math.atan2(cy - e.y, cx - e.x);
      ctx.rotate(angle);

      // body
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const spikes = 5;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? e.radius : e.radius * 0.5;
        const a = (Math.PI * i) / spikes;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // hp bar small
      if (e.hp < e.maxHp) {
        const bw = e.radius * 2.4;
        const bh = 3;
        const pct = e.hp / e.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-bw / 2, -e.radius - 8, bw, bh);
        ctx.fillStyle = pct < 0.3 ? '#ff4444' : '#d7a92e';
        ctx.fillRect(-bw / 2, -e.radius - 8, bw * pct, bh);
      }
      ctx.restore();
    }

    // Projectiles
    for (const p of projectilesRef.current) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // Shockwaves
    for (const sw of shockwavesRef.current) {
      const alpha = sw.life / sw.maxLife;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 240, 200, ${alpha * 0.6})`;
      ctx.lineWidth = 3 + alpha * 2;
      ctx.shadowColor = lvl.color;
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Particles
    for (const p of particlesRef.current) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floaters
    for (const f of floatersRef.current) {
      const alpha = Math.max(0, f.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.font = `900 ${f.fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- */
  return (
    <div
      ref={shellRef}
      onPointerDown={handlePointerDown}
      style={{
        position: 'fixed',
        inset: 0,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'crosshair',
        background: '#0a0806',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />

      {/* Center Haki text */}
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
          fontSize: 'clamp(4rem, 22vw, 16rem)',
          fontWeight: 900,
          color: LEVELS[uiLevelIdx].color,
          textShadow: `0 0 ${20 + uiLevelIdx * 10}px ${LEVELS[uiLevelIdx].glow}`,
          lineHeight: 1,
          willChange: 'transform',
          transition: 'color 0.4s ease, text-shadow 0.4s ease',
        }}
      >
        覇気
      </div>

      {/* HUD */}
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
          <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>WAVE</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#d7a92e' }}>{uiWave}/{MAX_WAVE}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>RANK</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: LEVELS[uiLevelIdx].color }}>{uiLevelName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.18em' }}>HP</div>
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
        <svg width={120} height={120} style={{ transform: 'scale(2.2)' }}>
          <circle cx="60" cy="60" r="56" fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth={4} />
          <circle
            cx="60"
            cy="60"
            r="56"
            fill='none'
            stroke={uiHpPct < 0.3 ? '#ff4444' : uiHpPct < 0.6 ? '#d7a92e' : '#63e6be'}
            strokeWidth={4}
            strokeDasharray={`${Math.max(0, uiHpPct) * 352} 352`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 200ms ease-out', filter: 'drop-shadow(0 0 4px currentColor)' }}
          />
        </svg>
      </div>

      {/* XP bar at bottom */}
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
            maxWidth: 420,
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
              background: LEVELS[uiLevelIdx].color,
              boxShadow: `0 0 10px ${LEVELS[uiLevelIdx].glow}`,
              transition: 'width 150ms linear',
            }}
          />
        </div>
      </div>

      {/* Overlay messages */}
      {(phase === 'start' || phase === 'gameover' || phase === 'win' || phase === 'levelup') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            background: 'rgba(5,5,5,0.65)',
            backdropFilter: 'blur(5px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: '0.8rem',
              textAlign: 'center',
              padding: '2.2rem 2.6rem',
              border: `1px solid ${phase === 'win' ? 'rgba(215,169,46,0.5)' : phase === 'gameover' ? 'rgba(179,25,40,0.45)' : 'rgba(215,169,46,0.35)'}`,
              borderRadius: 20,
              background: 'rgba(8,6,4,0.82)',
              boxShadow: `0 32px 100px ${phase === 'win' ? 'rgba(215,169,46,0.25)' : 'rgba(0,0,0,0.55)'}`,
              animation: 'popIn 0.3s cubic-bezier(0.22,1,0.36,1)',
              minWidth: 260,
            }}
          >
            {overlaySub && (
              <div style={{ fontSize: '0.7rem', color: 'rgba(247,241,223,0.5)', letterSpacing: '0.2em' }}>{overlaySub}</div>
            )}
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(2.2rem, 7vw, 4rem)',
                lineHeight: 0.9,
                fontWeight: 900,
                color: phase === 'win' ? '#ffe0a0' : phase === 'gameover' ? '#b31928' : phase === 'levelup' ? LEVELS[uiLevelIdx].color : '#fff1c7',
                textShadow: `0 0 32px ${phase === 'win' ? 'rgba(255,224,160,0.5)' : phase === 'gameover' ? 'rgba(179,25,40,0.45)' : 'rgba(247,209,91,0.45)'}`,
              }}
            >
              {phase === 'start' ? '覇気守護' : overlayTitle}
            </h2>

            {phase === 'start' && (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(247,241,223,0.7)', lineHeight: 1.6, maxWidth: 280 }}>
                中央の「覇気」を守れ。<br />
                タップで衝撃波を放ち、闇を祓え。<br />
                20ウェーブを生き延びろ。
              </p>
            )}

            {phase === 'gameover' && (
              <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.6)' }}>覇気は散った...</div>
            )}
            {phase === 'win' && (
              <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.6)' }}>覇気は全てを圧倒した。</div>
            )}

            <div
              style={{
                marginTop: 8,
                padding: '0.9rem 1.6rem',
                borderRadius: 999,
                background: phase === 'win' ? 'linear-gradient(135deg, #d7a92e, #b31928)' :
                            phase === 'gameover' ? 'linear-gradient(135deg, #444, #b31928)' :
                            'linear-gradient(135deg, #d7a92e, #b31928)',
                color: '#0c0a08',
                fontWeight: 950,
                fontSize: '0.9rem',
                letterSpacing: '0.08em',
                boxShadow: '0 14px 40px rgba(179,25,40,0.25)',
              }}
            >
              {phase === 'start' ? 'TAP TO START' :
               phase === 'levelup' ? 'CONTINUING...' :
               'TRY AGAIN'}
            </div>
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
