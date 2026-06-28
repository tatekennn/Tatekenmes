'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'title' | 'playing' | 'clear' | 'over';
type Vec = { x: number; y: number };
type Ripple = { x: number; y: number; age: number };

type Game = {
  phase: Phase;
  player: Vec;
  moving: boolean;
  target: Vec;
  start: Vec;
  moveT: number;
  moveDuration: number;
  safe: Vec;
  lives: number;
  elapsed: number;
  startedAt: number;
  camera: Vec;
  message: string;
  falling: boolean;
  fallVy: number;
  ripples: Ripple[];
};

type GlyphMask = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

type TerrainHit = { point: Vec; d: number };

const WORLD = { w: 2300, h: 1280 };
const VIEW = { w: 960, h: 540 };
const PLAYER_R = 12;
const TAP_PAD = 26;
const MOVE_SPEED = 760;
const OVERVIEW_PAD = 54;
const GRAVITY = 1450;
const GOAL = { x: 2034, y: 1036, r: 54 };
const HAKI_FONT = '900 940px ui-serif, "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
const HAKI_POS = { haX: 60, kiX: 1120, baseY: 930 };

let glyphMask: GlyphMask | null = null;

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function dist(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y); }

function drawHakiGlyph(ctx: CanvasRenderingContext2D, glowing = false) {
  ctx.save();
  ctx.font = HAKI_FONT;
  ctx.lineJoin = 'round';
  if (glowing) {
    ctx.shadowBlur = 34;
    ctx.shadowColor = 'rgba(245,221,179,0.72)';
    ctx.strokeStyle = 'rgba(0,0,0,0.72)';
    ctx.lineWidth = 58;
    ctx.strokeText('覇', HAKI_POS.haX, HAKI_POS.baseY);
    ctx.strokeText('気', HAKI_POS.kiX, HAKI_POS.baseY);
  }
  ctx.strokeStyle = glowing ? 'rgba(255,246,221,0.95)' : '#ffffff';
  ctx.lineWidth = 34;
  ctx.strokeText('覇', HAKI_POS.haX, HAKI_POS.baseY);
  ctx.strokeText('気', HAKI_POS.kiX, HAKI_POS.baseY);

  if (glowing) {
    const textGrad = ctx.createLinearGradient(0, 110, WORLD.w, 1080);
    textGrad.addColorStop(0, '#fff7de');
    textGrad.addColorStop(0.46, '#d5b56f');
    textGrad.addColorStop(1, '#fff1c2');
    ctx.fillStyle = textGrad;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText('覇', HAKI_POS.haX, HAKI_POS.baseY);
  ctx.fillText('気', HAKI_POS.kiX, HAKI_POS.baseY);
  ctx.restore();
}

function ensureGlyphMask() {
  if (glyphMask || typeof document === 'undefined') return glyphMask;
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.w;
  canvas.height = WORLD.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  drawHakiGlyph(ctx, false);
  glyphMask = {
    data: ctx.getImageData(0, 0, WORLD.w, WORLD.h).data,
    width: WORLD.w,
    height: WORLD.h,
  };
  return glyphMask;
}

function alphaAt(p: Vec) {
  const mask = ensureGlyphMask();
  if (!mask) return 0;
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return 0;
  return mask.data[(y * mask.width + x) * 4 + 3];
}

function isGlyphSolid(p: Vec, pad = 0) {
  const r = Math.max(0, Math.ceil(pad));
  if (r === 0) return alphaAt(p) > 18;
  const step = r > 10 ? 4 : 2;
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      if (x * x + y * y <= r * r && alphaAt({ x: p.x + x, y: p.y + y }) > 18) return true;
    }
  }
  return false;
}

function nearestGlyphPoint(p: Vec, radius: number): TerrainHit | null {
  if (isGlyphSolid(p)) return { point: p, d: 0 };
  const maxR = Math.ceil(radius);
  for (let r = 2; r <= maxR; r += 2) {
    const samples = Math.max(16, Math.ceil(r * 1.6));
    for (let i = 0; i < samples; i += 1) {
      const a = (Math.PI * 2 * i) / samples;
      const q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
      if (isGlyphSolid(q)) return { point: q, d: r };
    }
  }
  return null;
}

function terrainAt(p: Vec, pad = 0): TerrainHit | null {
  return nearestGlyphPoint(p, pad);
}

function edgeLandingPoint(p: Vec, radius = TAP_PAD): TerrainHit | null {
  const hit = terrainAt(p, radius);
  if (!hit) return null;

  // If the user taps inside a thick filled part of the glyph, bias the landing
  // to the nearest visible rim. The game then feels like walking on the real
  // outline instead of teleporting into a blob of ink.
  const origin = hit.point;
  let best: TerrainHit = hit;
  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -0.72, y: -0.72 },
    { x: 0.72, y: -0.72 },
    { x: -0.72, y: 0.72 },
    { x: 0.72, y: 0.72 },
  ];

  for (const dir of dirs) {
    let lastSolid: Vec | null = isGlyphSolid(origin) ? origin : null;
    for (let d = 2; d <= 58; d += 2) {
      const q = { x: origin.x + dir.x * d, y: origin.y + dir.y * d };
      if (isGlyphSolid(q)) {
        lastSolid = q;
      } else if (lastSolid) {
        const candidate = { point: lastSolid, d: dist(p, lastSolid) };
        if (candidate.d < best.d + 34) best = candidate;
        break;
      }
    }
  }

  return best;
}

function segmentPointDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1) return dist(p, a);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
}

function firstBlockingPoint(a: Vec, b: Vec) {
  const distance = dist(a, b);
  const steps = Math.max(12, Math.ceil(distance / 12));
  let wasInAir = false;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const fromStart = distance * t;
    const toEnd = distance * (1 - t);
    if (fromStart < 62 || toEnd < 42) continue;
    const p = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    const onGlyph = isGlyphSolid(p, 2);
    if (!onGlyph) wasInAir = true;
    if (wasInAir && onGlyph) return p;
  }
  return null;
}

function makeGame(phase: Phase = 'title'): Game {
  const start = terrainAt({ x: 188, y: 112 }, 100)?.point ?? { x: 188, y: 112 };
  return {
    phase,
    player: start,
    moving: false,
    target: start,
    start,
    moveT: 0,
    moveDuration: 0,
    safe: start,
    lives: 3,
    elapsed: 0,
    startedAt: 0,
    camera: { x: 0, y: 0 },
    message: '',
    falling: false,
    fallVy: 0,
    ripples: [],
  };
}

export default function HakiActionGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const gameRef = useRef<Game>(makeGame());
  const [view, setView] = useState(gameRef.current);

  const screenToWorld = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: gameRef.current.camera.x + ((x - rect.left) / rect.width) * VIEW.w,
      y: gameRef.current.camera.y + ((y - rect.top) / rect.height) * VIEW.h,
    };
  }, []);

  const startGame = useCallback(() => {
    ensureGlyphMask();
    const g = makeGame('playing');
    g.startedAt = performance.now();
    gameRef.current = g;
    lastRef.current = null;
    setView({ ...g });
  }, []);

  const damage = useCallback(() => {
    const g = gameRef.current;
    if (g.phase !== 'playing') return;
    g.lives -= 1;
    g.moving = false;
    g.falling = false;
    g.fallVy = 0;
    if (g.lives <= 0) {
      g.phase = 'over';
      g.message = 'GAME OVER';
      setView({ ...g });
      return;
    }
    g.player = { ...g.safe };
    g.message = '落下 - LIFE -1';
    setView({ ...g });
  }, []);

  const onTap = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (g.phase !== 'playing' || g.moving || g.falling) return;
    const p = screenToWorld(e.clientX, e.clientY);
    const hit = edgeLandingPoint(p, TAP_PAD);
    if (!hit) {
      g.message = 'そこは文字ではない';
      setView({ ...g });
      return;
    }
    g.ripples.push({ x: hit.point.x, y: hit.point.y, age: 0 });
    const blocked = firstBlockingPoint(g.player, hit.point);
    const destination = blocked ? (edgeLandingPoint(blocked, 34)?.point ?? blocked) : hit.point;
    const d = dist(g.player, destination);
    if (d < 18) return;
    g.start = { ...g.player };
    g.target = destination;
    g.moveT = 0;
    g.moveDuration = clamp(d / MOVE_SPEED, 0.14, 1.2);
    g.moving = true;
    g.message = blocked ? '文字に着地' : '';
    setView({ ...g });
  }, [screenToWorld]);

  const update = useCallback((dt: number, now: number) => {
    const g = gameRef.current;
    if (g.phase !== 'playing') return;
    g.elapsed = (now - g.startedAt) / 1000;

    g.ripples = g.ripples.map((r) => ({ ...r, age: r.age + dt })).filter((r) => r.age < 0.56);

    if (g.moving) {
      g.moveT = Math.min(1, g.moveT + dt / g.moveDuration);
      const ease = 1 - Math.pow(1 - g.moveT, 2);
      g.player = { x: lerp(g.start.x, g.target.x, ease), y: lerp(g.start.y, g.target.y, ease) };
      if (g.moveT >= 1) {
        g.moving = false;
        const ground = terrainAt(g.player, PLAYER_R + 6);
        if (ground) {
          g.player = ground.point;
          g.safe = { ...ground.point };
        } else {
          g.falling = true;
          g.fallVy = 0;
        }
      }
    } else if (g.falling) {
      g.fallVy += GRAVITY * dt;
      g.player.y += g.fallVy * dt;
      const landed = terrainAt(g.player, PLAYER_R);
      if (landed && g.fallVy > 120) {
        g.player = landed.point;
        g.safe = { ...landed.point };
        g.falling = false;
        g.fallVy = 0;
      }
      if (g.player.y > WORLD.h + 120) damage();
    } else {
      const under = terrainAt(g.player, PLAYER_R + 4);
      if (under) {
        g.player = under.point;
        g.safe = { ...under.point };
      } else {
        g.falling = true;
        g.fallVy = 0;
      }
    }

    if (dist(g.player, GOAL) < GOAL.r) {
      g.phase = 'clear';
      g.message = 'CLEAR';
      setView({ ...g });
    }

    g.camera.x = clamp(g.player.x - VIEW.w * 0.45, 0, WORLD.w - VIEW.w);
    g.camera.y = clamp(g.player.y - VIEW.h * 0.55, 0, WORLD.h - VIEW.h);
  }, [damage]);

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Vec, moving: boolean) => {
    ctx.save();
    const bob = moving ? 2 : Math.sin(performance.now() / 180) * 1.5;
    ctx.translate(p.x, p.y + bob);
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff3145';
    ctx.fillStyle = 'rgba(255,49,69,0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.92)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -18, 7, 0, Math.PI * 2);
    ctx.moveTo(0, -10); ctx.lineTo(0, 8);
    ctx.moveTo(-10, -3); ctx.lineTo(10, -3);
    ctx.moveTo(0, 8); ctx.lineTo(-7, 21);
    ctx.moveTo(0, 8); ctx.lineTo(8, 20);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f3d2b5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -18, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#d9e0e6';
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 8); ctx.stroke();
    ctx.strokeStyle = '#ff3145';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 10); ctx.stroke();
    ctx.strokeStyle = '#d9e0e6';
    ctx.beginPath();
    ctx.moveTo(-10, -3); ctx.lineTo(10, -3);
    ctx.moveTo(0, 8); ctx.lineTo(-7, 21);
    ctx.moveTo(0, 8); ctx.lineTo(8, 20);
    ctx.stroke();
    ctx.restore();
  };

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ensureGlyphMask();
    const last = lastRef.current ?? time;
    const dt = Math.min(0.033, (time - last) / 1000);
    lastRef.current = time;
    update(dt, time);
    const g = gameRef.current;

    ctx.clearRect(0, 0, VIEW.w, VIEW.h);
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    const overview = g.phase === 'title';
    ctx.save();
    if (overview) {
      const scale = Math.min((VIEW.w - OVERVIEW_PAD * 2) / WORLD.w, (VIEW.h - OVERVIEW_PAD * 2) / WORLD.h);
      ctx.translate((VIEW.w - WORLD.w * scale) / 2, (VIEW.h - WORLD.h * scale) / 2);
      ctx.scale(scale, scale);
    } else {
      ctx.translate(-g.camera.x, -g.camera.y);
    }

    drawHakiGlyph(ctx, true);

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.20;
    ctx.strokeStyle = '#3a250f';
    ctx.lineWidth = 2;
    for (let i = 0; i < 26; i += 1) {
      const x = 120 + i * 82;
      const y = 210 + ((i * 137) % 760);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 44, y + 18);
      ctx.stroke();
    }
    ctx.restore();

    for (const ripple of g.ripples) {
      ctx.save();
      const t = ripple.age / 0.56;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = '#fff4c8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 18 + t * 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (g.moving) {
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(g.start.x, g.start.y); ctx.lineTo(g.target.x, g.target.y); ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(247,209,91,0.20)';
    ctx.strokeStyle = '#f7d15b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(GOAL.x, GOAL.y, GOAL.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff4c8';
    ctx.font = '900 26px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ゴール', GOAL.x, GOAL.y);
    ctx.restore();

    drawPlayer(ctx, g.player, g.moving);
    ctx.restore();

    if (overview) {
      ctx.fillStyle = 'rgba(247,241,223,0.76)';
      ctx.font = '900 15px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('巨大な実文字「覇気」の上をタップで渡る', VIEW.w / 2, VIEW.h - 28);
    }

    ctx.fillStyle = '#f7f1df';
    ctx.font = '800 20px ui-sans-serif, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`LIFE ${'♥'.repeat(Math.max(0, g.lives))}`, 22, 32);
    ctx.fillText(`ELAPSED ${g.elapsed.toFixed(1)}`, 22, 62);
    ctx.fillStyle = 'rgba(247,241,223,0.72)';
    ctx.font = '700 14px ui-sans-serif, system-ui';
    ctx.fillText(`GLYPH X ${Math.round(g.player.x)} / Y ${Math.round(g.player.y)}`, 22, 88);
    const goalDx = GOAL.x - g.player.x;
    const goalDy = GOAL.y - g.player.y;
    const goalDistance = Math.hypot(goalDx, goalDy);
    ctx.fillStyle = '#f7d15b';
    ctx.font = '900 16px ui-sans-serif, system-ui';
    ctx.fillText(`GOAL ${Math.round(goalDistance)}`, 22, 112);
    if (g.message) {
      ctx.fillStyle = g.message === 'CLEAR' ? '#f7d15b' : '#f7f1df';
      ctx.font = '900 22px ui-sans-serif, system-ui';
      ctx.fillText(g.message, 22, 146);
    }

    if (goalDistance > 420) {
      const angle = Math.atan2(goalDy, goalDx);
      const ax = VIEW.w - 86;
      const ay = VIEW.h - 76;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.strokeStyle = 'rgba(247,209,91,0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-48, -24, 96, 48, 24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f7d15b';
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(-10, -14);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(247,241,223,0.76)';
      ctx.font = '800 12px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('GOAL', ax, ay + 42);
      ctx.textAlign = 'left';
    }

    if (!overview) {
    const mx = VIEW.w - 194; const my = 22; const mw = 168; const mh = 94;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(mx - 10, my - 10, mw + 20, mh + 38);
    ctx.strokeStyle = 'rgba(247,209,91,0.52)'; ctx.strokeRect(mx - 10, my - 10, mw + 20, mh + 38);
    ctx.fillStyle = '#f7f1df'; ctx.font = '800 13px ui-sans-serif, system-ui'; ctx.fillText('MASK 覇気', mx, my + mh + 24);
    const sx = mw / WORLD.w; const sy = mh / WORLD.h;
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(sx, sy);
    ctx.font = HAKI_FONT;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(245,221,179,0.9)';
    ctx.lineWidth = 34;
    ctx.strokeText('覇', HAKI_POS.haX, HAKI_POS.baseY);
    ctx.strokeText('気', HAKI_POS.kiX, HAKI_POS.baseY);
    ctx.fillStyle = 'rgba(245,221,179,0.52)';
    ctx.fillText('覇', HAKI_POS.haX, HAKI_POS.baseY);
    ctx.fillText('気', HAKI_POS.kiX, HAKI_POS.baseY);
    ctx.restore();
    ctx.strokeStyle = '#f7d15b'; ctx.lineWidth = 2;
    ctx.strokeRect(mx + g.camera.x * sx, my + g.camera.y * sy, VIEW.w * sx, VIEW.h * sy);
    ctx.fillStyle = '#f7d15b'; ctx.beginPath(); ctx.arc(mx + GOAL.x * sx, my + GOAL.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3145'; ctx.beginPath(); ctx.arc(mx + g.player.x * sx, my + g.player.y * sy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.width = VIEW.w;
    canvas.height = VIEW.h;
    ensureGlyphMask();
    const g = makeGame(gameRef.current.phase);
    gameRef.current = { ...gameRef.current, player: g.player, safe: g.safe, start: g.start, target: g.target };
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  const timeText = useMemo(() => view.elapsed.toFixed(2), [view.elapsed]);

  return (
    <main className="haki-action-shell" aria-label="覇気アクション">
      <canvas ref={canvasRef} className="haki-action-canvas" onPointerDown={onTap} aria-label="巨大な覇気の実文字マスクをタップ移動する2Dアクションゲーム" />
      {view.phase === 'title' && (
        <section className="haki-action-panel">
          <p>本物の文字だけが、足場になる。</p>
          <h1>覇気アクション</h1>
          <p className="haki-action-note">タップした文字の輪郭へ移動。空白は通れない。</p>
          <button type="button" onClick={startGame}>開始</button>
        </section>
      )}
      {view.phase === 'clear' && (
        <section className="haki-action-panel compact">
          <h1>クリア!</h1>
          <p>TIME {timeText}</p>
          <button type="button" onClick={startGame}>もう一度</button>
        </section>
      )}
      {view.phase === 'over' && (
        <section className="haki-action-panel compact">
          <h1>GAME OVER</h1>
          <button type="button" onClick={startGame}>リトライ</button>
        </section>
      )}
    </main>
  );
}
