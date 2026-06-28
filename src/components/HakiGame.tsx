'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'title' | 'playing' | 'clear';
type SegmentKind = 'normal' | 'slippery' | 'bounce';
type Segment = { x1: number; y1: number; x2: number; y2: number; width: number; kind: SegmentKind };
type Vec = { x: number; y: number };
type Orb = { x: number; y: number; collected: boolean; pulse: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string };
type Player = { x: number; y: number; vx: number; vy: number; r: number; grounded: boolean };
type Rope = { active: boolean; point: Vec; length: number; segmentIndex: number };
type Game = {
  phase: Phase;
  player: Player;
  rope: Rope;
  orbs: Orb[];
  particles: Particle[];
  startedAt: number;
  elapsed: number;
  title: string;
  hasMoved: boolean;
  cleared: boolean;
};

const W = 960;
const H = 540;
const GRAVITY = 1180;
const MAX_FALL = 760;
const GRAPPLE_RANGE = 190;
const MIN_ROPE = 52;
const PLAYER_START = { x: 124, y: 92 };
const GOAL = { x: 838, y: 440, w: 88, h: 70 };
const STORAGE_BEST = 'haki-swing-best-time';
const TITLES = ['ネクタイ覇王色', '覇気だけ副社長級', '空中朝会マスター', 'Slackより速い男', '新卒スパイダー', '着地できるタイプの覇気', '全社LTの亡霊'];

const segments: Segment[] = [
  // 覇: 雨かんむり and upper hooks
  { x1: 78, y1: 88, x2: 410, y2: 88, width: 20, kind: 'normal' },
  { x1: 118, y1: 122, x2: 360, y2: 122, width: 16, kind: 'normal' },
  { x1: 106, y1: 68, x2: 106, y2: 158, width: 18, kind: 'normal' },
  { x1: 210, y1: 62, x2: 210, y2: 160, width: 15, kind: 'normal' },
  { x1: 328, y1: 66, x2: 328, y2: 158, width: 15, kind: 'normal' },
  // 覇: body, horizontal platforms
  { x1: 104, y1: 190, x2: 406, y2: 190, width: 24, kind: 'normal' },
  { x1: 138, y1: 248, x2: 382, y2: 248, width: 22, kind: 'normal' },
  { x1: 86, y1: 314, x2: 420, y2: 314, width: 24, kind: 'normal' },
  { x1: 126, y1: 386, x2: 360, y2: 386, width: 24, kind: 'normal' },
  { x1: 250, y1: 158, x2: 250, y2: 432, width: 22, kind: 'normal' },
  { x1: 146, y1: 182, x2: 146, y2: 338, width: 16, kind: 'normal' },
  { x1: 360, y1: 188, x2: 360, y2: 396, width: 17, kind: 'normal' },
  { x1: 180, y1: 452, x2: 350, y2: 500, width: 24, kind: 'bounce' },
  // bridge between characters
  { x1: 392, y1: 292, x2: 514, y2: 264, width: 22, kind: 'normal' },
  // 気: upper strokes
  { x1: 548, y1: 96, x2: 854, y2: 96, width: 22, kind: 'normal' },
  { x1: 572, y1: 154, x2: 832, y2: 154, width: 18, kind: 'normal' },
  { x1: 612, y1: 212, x2: 800, y2: 212, width: 18, kind: 'normal' },
  { x1: 562, y1: 278, x2: 828, y2: 278, width: 20, kind: 'normal' },
  // 気: sweeping slippery strokes
  { x1: 620, y1: 330, x2: 852, y2: 450, width: 26, kind: 'slippery' },
  { x1: 726, y1: 280, x2: 890, y2: 382, width: 20, kind: 'slippery' },
  { x1: 558, y1: 430, x2: 742, y2: 356, width: 18, kind: 'slippery' },
  // 気: dots as bouncy small platforms
  { x1: 608, y1: 360, x2: 608, y2: 360, width: 34, kind: 'bounce' },
  { x1: 690, y1: 398, x2: 690, y2: 398, width: 30, kind: 'bounce' },
  { x1: 790, y1: 338, x2: 790, y2: 338, width: 30, kind: 'bounce' },
  // safety floor fragments that still look like brush tails
  { x1: 56, y1: 510, x2: 270, y2: 510, width: 18, kind: 'normal' },
  { x1: 692, y1: 508, x2: 926, y2: 508, width: 18, kind: 'normal' },
];

const initialOrbs: Orb[] = [
  { x: 186, y: 166, collected: false, pulse: 0 },
  { x: 314, y: 222, collected: false, pulse: 0.7 },
  { x: 230, y: 348, collected: false, pulse: 1.4 },
  { x: 468, y: 228, collected: false, pulse: 2.1 },
  { x: 594, y: 128, collected: false, pulse: 2.8 },
  { x: 744, y: 178, collected: false, pulse: 3.5 },
  { x: 646, y: 316, collected: false, pulse: 4.2 },
  { x: 802, y: 406, collected: false, pulse: 4.9 },
];

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function len(v: Vec) { return Math.hypot(v.x, v.y); }
function normalize(v: Vec) { const l = len(v) || 1; return { x: v.x / l, y: v.y / l }; }
function dot(a: Vec, b: Vec) { return a.x * b.x + a.y * b.y; }
function closestPoint(px: number, py: number, s: Segment) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 0.001) return { x: s.x1, y: s.y1, t: 0, dist: Math.hypot(px - s.x1, py - s.y1) };
  const t = clamp(((px - s.x1) * dx + (py - s.y1) * dy) / l2, 0, 1);
  const x = s.x1 + dx * t;
  const y = s.y1 + dy * t;
  return { x, y, t, dist: Math.hypot(px - x, py - y) };
}
function makeInitialGame(phase: Phase = 'title'): Game {
  return {
    phase,
    player: { x: PLAYER_START.x, y: PLAYER_START.y, vx: 165, vy: 0, r: 13, grounded: false },
    rope: { active: false, point: { x: 0, y: 0 }, length: 0, segmentIndex: -1 },
    orbs: initialOrbs.map((o) => ({ ...o })),
    particles: [],
    startedAt: 0,
    elapsed: 0,
    title: '新卒スパイダー',
    hasMoved: false,
    cleared: false,
  };
}
function titleFor(time: number, got: number, total: number) {
  if (got === total && time < 45) return 'ネクタイ覇王色';
  if (time < 35) return 'Slackより速い男';
  if (got >= total - 1) return '覇気だけ副社長級';
  if (time > 85) return '全社LTの亡霊';
  return TITLES[Math.floor((time + got * 3) % TITLES.length)];
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const gameRef = useRef<Game>(makeInitialGame());
  const pressingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const [view, setView] = useState(() => gameRef.current);
  const [best, setBest] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(STORAGE_BEST));
    setBest(Number.isFinite(saved) && saved > 0 ? saved : null);
  }, []);

  const emit = useCallback((x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 260;
      gameRef.current.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.45, size: 2 + Math.random() * 4, color });
    }
  }, []);

  const start = useCallback(() => {
    gameRef.current = makeInitialGame('playing');
    gameRef.current.startedAt = performance.now();
    lastRef.current = null;
    pressingRef.current = false;
    setCopied(false);
    setView({ ...gameRef.current });
  }, []);

  const finish = useCallback(() => {
    const g = gameRef.current;
    if (g.phase !== 'playing') return;
    g.phase = 'clear';
    g.cleared = true;
    const got = g.orbs.filter((o) => o.collected).length;
    g.title = titleFor(g.elapsed, got, g.orbs.length);
    const prev = Number(window.localStorage.getItem(STORAGE_BEST));
    if (!Number.isFinite(prev) || prev <= 0 || g.elapsed < prev) {
      window.localStorage.setItem(STORAGE_BEST, String(g.elapsed));
      setBest(g.elapsed);
    }
    emit(GOAL.x + GOAL.w / 2, GOAL.y + GOAL.h / 2, '#f6d15d', 36);
    setView({ ...g });
  }, [emit]);

  const findGrapplePoint = (player: Player): { point: Vec; dist: number; index: number } | null => {
    let bestCandidate: { point: Vec; dist: number; index: number } | null = null;
    for (let index = 0; index < segments.length; index += 1) {
      const s = segments[index];
      const c = closestPoint(player.x, player.y, s);
      const d = Math.max(0, c.dist - s.width * 0.5);
      if (d <= GRAPPLE_RANGE && (!bestCandidate || d < bestCandidate.dist)) {
        bestCandidate = { point: { x: c.x, y: c.y }, dist: d, index };
      }
    }
    return bestCandidate;
  };

  const connectRope = useCallback(() => {
    const g = gameRef.current;
    if (g.phase !== 'playing' || g.rope.active) return;
    const candidate = findGrapplePoint(g.player);
    if (!candidate) return;
    const actual = Math.max(MIN_ROPE, Math.hypot(g.player.x - candidate.point.x, g.player.y - candidate.point.y));
    g.rope = { active: true, point: candidate.point, length: actual, segmentIndex: candidate.index };
    g.hasMoved = true;
    emit(candidate.point.x, candidate.point.y, '#ff3348', 8);
  }, [emit]);

  const releaseRope = useCallback(() => {
    const g = gameRef.current;
    if (!g.rope.active) return;
    g.rope.active = false;
    g.player.vx *= 1.04;
    g.player.vy *= 1.03;
  }, []);

  const handleDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (gameRef.current.phase !== 'playing') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerIdRef.current = e.pointerId;
    pressingRef.current = true;
    connectRope();
  }, [connectRope]);

  const handleUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    pressingRef.current = false;
    pointerIdRef.current = null;
    releaseRope();
  }, [releaseRope]);

  const retry = useCallback(() => start(), [start]);

  const updatePhysics = useCallback((dt: number, now: number) => {
    const g = gameRef.current;
    if (g.phase !== 'playing') return;
    if (g.startedAt > 0) g.elapsed = (now - g.startedAt) / 1000;
    if (pressingRef.current && !g.rope.active) connectRope();

    const p = g.player;
    p.grounded = false;
    p.vy = clamp(p.vy + GRAVITY * dt, -900, MAX_FALL);
    p.vx = clamp(p.vx, -620, 720);

    if (g.rope.active) {
      const toPlayer = { x: p.x - g.rope.point.x, y: p.y - g.rope.point.y };
      const d = Math.max(1, len(toPlayer));
      const n = { x: toPlayer.x / d, y: toPlayer.y / d };
      if (d > g.rope.length) {
        p.x = g.rope.point.x + n.x * g.rope.length;
        p.y = g.rope.point.y + n.y * g.rope.length;
        const outward = dot({ x: p.vx, y: p.vy }, n);
        if (outward > 0) {
          p.vx -= n.x * outward;
          p.vy -= n.y * outward;
        }
      }
      // Tiny tangential assist: this is a toy, not a physics dissertation.
      const tangent = { x: -n.y, y: n.x };
      const swingDirection = p.x < g.rope.point.x ? -1 : 1;
      p.vx += tangent.x * swingDirection * 32 * dt;
      p.vy += tangent.y * swingDirection * 32 * dt;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    segments.forEach((s) => {
      const c = closestPoint(p.x, p.y, s);
      const minDist = p.r + s.width * 0.5;
      if (c.dist > 0.001 && c.dist < minDist) {
        const n = normalize({ x: p.x - c.x, y: p.y - c.y });
        p.x = c.x + n.x * minDist;
        p.y = c.y + n.y * minDist;
        const vn = dot({ x: p.vx, y: p.vy }, n);
        if (vn < 0) {
          const bounce = s.kind === 'bounce' ? 1.28 : 0.08;
          p.vx -= n.x * vn * (1 + bounce);
          p.vy -= n.y * vn * (1 + bounce);
          if (n.y < -0.35) p.grounded = true;
          if (s.kind === 'slippery') p.vx += 42 * dt * Math.sign(s.x2 - s.x1 || 1);
          if (s.kind === 'bounce') emit(c.x, c.y, '#f6d15d', 8);
        }
      }
    });

    if (p.x < 20) { p.x = 20; p.vx = Math.abs(p.vx) * 0.45; }
    if (p.x > W - 20) { p.x = W - 20; p.vx = -Math.abs(p.vx) * 0.45; }
    if (p.y < 18) { p.y = 18; p.vy = Math.abs(p.vy) * 0.22; }
    if (p.y > H + 72) {
      p.x = PLAYER_START.x; p.y = PLAYER_START.y; p.vx = 190; p.vy = 0; g.rope.active = false;
      emit(p.x, p.y, '#b94b3e', 14);
    }

    g.orbs.forEach((o) => {
      o.pulse += dt;
      if (!o.collected && Math.hypot(p.x - o.x, p.y - o.y) < p.r + 18) {
        o.collected = true;
        emit(o.x, o.y, '#f6d15d', 20);
      }
    });

    g.particles = g.particles.map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * dt,
      y: particle.y + particle.vy * dt,
      vy: particle.vy + 180 * dt,
      life: particle.life - dt,
    })).filter((particle) => particle.life > 0);

    const hitGoal = p.x > GOAL.x - p.r && p.x < GOAL.x + GOAL.w + p.r && p.y > GOAL.y - p.r && p.y < GOAL.y + GOAL.h + p.r;
    if (hitGoal) finish();
  }, [connectRope, emit, finish]);

  const drawSegment = (ctx: CanvasRenderingContext2D, s: Segment) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = s.kind === 'bounce' ? 22 : 14;
    ctx.shadowColor = s.kind === 'bounce' ? '#f6d15d' : '#ffffff';
    ctx.strokeStyle = s.kind === 'slippery' ? '#e8e6db' : '#fffaf0';
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = s.kind === 'slippery' ? 'rgba(246,209,93,0.30)' : 'rgba(10,8,7,0.10)';
    ctx.lineWidth = Math.max(2, s.width * 0.18);
    ctx.stroke();
    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, rope: Rope) => {
    ctx.save();
    if (rope.active) {
      ctx.strokeStyle = '#ff263b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ff263b';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 2);
      ctx.lineTo(rope.point.x, rope.point.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff263b';
      ctx.beginPath();
      ctx.arc(rope.point.x, rope.point.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const angle = clamp(p.vx / 600, -0.65, 0.65);
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    // legs
    ctx.strokeStyle = '#061018';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, 18); ctx.lineTo(-12, 32);
    ctx.moveTo(6, 18); ctx.lineTo(15, 30);
    ctx.stroke();
    // suit body
    ctx.fillStyle = '#07111d';
    ctx.fillRect(-11, -2, 22, 24);
    ctx.fillStyle = '#f7f1df';
    ctx.beginPath();
    ctx.moveTo(-6, 1); ctx.lineTo(0, 12); ctx.lineTo(6, 1); ctx.closePath();
    ctx.fill();
    // red tie
    ctx.fillStyle = '#ff263b';
    ctx.beginPath();
    ctx.moveTo(-3, 6); ctx.lineTo(3, 6); ctx.lineTo(5, 24); ctx.lineTo(0, 32); ctx.lineTo(-5, 24); ctx.closePath();
    ctx.fill();
    // arms
    ctx.strokeStyle = '#07111d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-10, 4); ctx.lineTo(-23, 15);
    ctx.moveTo(10, 4); ctx.lineTo(23, 12);
    ctx.stroke();
    // head
    ctx.fillStyle = '#f3c3a7';
    ctx.beginPath();
    ctx.arc(0, -15, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#17100d';
    ctx.fillRect(-9, -24, 18, 7);
    ctx.restore();
  };

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const last = lastRef.current ?? time;
    const dt = Math.min(0.033, (time - last) / 1000);
    lastRef.current = time;
    updatePhysics(dt, time);
    const g = gameRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#030303';
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W * 0.52, H * 0.52, 40, W * 0.52, H * 0.52, 520);
    bg.addColorStop(0, '#17100f');
    bg.addColorStop(0.45, '#080707');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.11;
    ctx.fillStyle = '#f6d15d';
    ctx.font = '900 312px ui-serif, "Hiragino Mincho ProN", "Yu Mincho", serif';
    ctx.fillText('覇', 58, 344);
    ctx.fillText('気', 524, 344);
    ctx.restore();

    segments.forEach((s) => drawSegment(ctx, s));

    g.orbs.forEach((o) => {
      if (o.collected) return;
      const r = 11 + Math.sin(time / 240 + o.pulse) * 2.5;
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#f6d15d';
      ctx.fillStyle = '#f6d15d';
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fffaf0';
      ctx.font = '900 13px ui-serif, "Yu Mincho", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('覇', o.x, o.y + 1);
      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = 'rgba(246,209,93,0.18)';
    ctx.fillRect(GOAL.x, GOAL.y, GOAL.w, GOAL.h);
    ctx.strokeStyle = '#f6d15d';
    ctx.lineWidth = 4;
    ctx.strokeRect(GOAL.x, GOAL.y, GOAL.w, GOAL.h);
    ctx.fillStyle = '#f7f1df';
    ctx.font = '900 22px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('全社LT', GOAL.x + GOAL.w / 2, GOAL.y + 42);
    ctx.restore();

    drawPlayer(ctx, g.player, g.rope);

    g.particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    });

    const got = g.orbs.filter((o) => o.collected).length;
    ctx.fillStyle = '#f7f1df';
    ctx.font = '900 22px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TIME ${g.elapsed.toFixed(1)}`, 24, 34);
    ctx.fillText(`覇気玉 ${got}/${g.orbs.length}`, 24, 66);
    ctx.textAlign = 'right';
    ctx.fillText('長押し: ネクタイ / 離す: 飛ぶ', W - 24, 34);
    if (g.rope.active) {
      ctx.fillStyle = '#ff263b';
      ctx.fillText('GRAPPLING', W - 24, 66);
    }
    if (!g.hasMoved && g.phase === 'playing') {
      ctx.fillStyle = 'rgba(247,241,223,0.9)';
      ctx.font = '900 28px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('長押しでネクタイを伸ばす', W / 2, H - 48);
    }

    if (Math.floor(time / 120) !== Math.floor(last / 120)) setView({ ...g });
    rafRef.current = requestAnimationFrame(draw);
  }, [updatePhysics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.width = W;
    canvas.height = H;
    rafRef.current = requestAnimationFrame(draw);
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (e.type === 'keydown' && !pressingRef.current) { pressingRef.current = true; connectRope(); }
      }
    };
    const keyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { pressingRef.current = false; releaseRope(); } };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', keyUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [connectRope, draw, releaseRope]);

  const got = view.orbs.filter((o) => o.collected).length;
  const shareText = useMemo(() => `私は「${view.title}」でした。\nタイム: ${view.elapsed.toFixed(1)}秒\n覇気玉: ${got}/${view.orbs.length}\n\nネクタイで覇気にぶら下がるゲーム\n#覇気スイング`, [got, view.elapsed, view.orbs.length, view.title]);
  const share = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title: '覇気スイング', text: shareText, url: 'https://game.xn--7qwx14d.com' });
      else { await navigator.clipboard.writeText(`${shareText}\nhttps://game.xn--7qwx14d.com`); setCopied(true); }
    } catch {
      await navigator.clipboard.writeText(`${shareText}\nhttps://game.xn--7qwx14d.com`);
      setCopied(true);
    }
  }, [shareText]);

  return (
    <main className="pressure-shell" aria-label="覇気スイング" onPointerDown={handleDown} onPointerUp={handleUp} onPointerCancel={handleUp}>
      <div className="pressure-frame">
        <canvas ref={canvasRef} className="pressure-canvas" aria-label="ネクタイで覇気にぶら下がるCanvasゲーム" />
        {view.phase === 'title' && (
          <section className="pressure-panel" onPointerDown={(e) => e.stopPropagation()}>
            <p className="pressure-kicker">NECKTIE GRAPPLE</p>
            <h1>覇気スイング</h1>
            <p className="pressure-rule">ネクタイで「覇気」にぶら下がる新卒のゲーム。</p>
            <p>長押し: ネクタイを伸ばす / 離す: 飛ぶ</p>
            {best && <p className="pressure-score">BEST {best.toFixed(1)}秒</p>}
            <button type="button" onClick={start}>はじめる</button>
          </section>
        )}
        {view.phase === 'clear' && (
          <section className="pressure-panel pressure-result" onPointerDown={(e) => e.stopPropagation()}>
            <p className="pressure-kicker">CLEAR</p>
            <h1>{view.title}</h1>
            <p className="pressure-score">TIME {view.elapsed.toFixed(1)}秒 / 覇気玉 {got}/{view.orbs.length}</p>
            <p className="pressure-rule">{shareText}</p>
            <div className="pressure-actions">
              <button type="button" onClick={retry}>もう一度</button>
              <button type="button" className="sub" onClick={share}>{copied ? 'コピー済み' : 'シェア'}</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
