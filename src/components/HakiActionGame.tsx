'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'title' | 'playing' | 'clear' | 'over';
type Stroke = { x1: number; y1: number; x2: number; y2: number; w: number; tag?: 'safe' | 'goal' };
type Vec = { x: number; y: number };
type Enemy = { id: number; stroke: number; t: number; dir: 1 | -1; speed: number; alive: boolean; x: number; y: number };
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
  enemies: Enemy[];
  camera: Vec;
  message: string;
  falling: boolean;
  fallVy: number;
};

const WORLD = { w: 2300, h: 1280 };
const VIEW = { w: 960, h: 540 };
const PLAYER_R = 12;
const TAP_PAD = 10;
const MOVE_SPEED = 760;
const GRAVITY = 1450;
const GOAL = { x: 2070, y: 1045, w: 120, h: 92 };

// 太い筆画の集合。全体では「覇気」、カメラ内では巨大な断片に見える比率にする。
const strokes: Stroke[] = [
  // 覇 - 雨かんむり
  { x1: 120, y1: 150, x2: 930, y2: 150, w: 58, tag: 'safe' },
  { x1: 180, y1: 245, x2: 860, y2: 245, w: 42 },
  { x1: 230, y1: 90, x2: 230, y2: 330, w: 42 },
  { x1: 430, y1: 80, x2: 430, y2: 335, w: 38 },
  { x1: 655, y1: 82, x2: 655, y2: 332, w: 38 },
  { x1: 850, y1: 96, x2: 850, y2: 310, w: 38 },
  // 覇 - 本体
  { x1: 185, y1: 420, x2: 930, y2: 420, w: 54 },
  { x1: 155, y1: 575, x2: 965, y2: 575, w: 58 },
  { x1: 210, y1: 740, x2: 880, y2: 740, w: 52 },
  { x1: 150, y1: 925, x2: 930, y2: 925, w: 62 },
  { x1: 520, y1: 340, x2: 520, y2: 1075, w: 54 },
  { x1: 305, y1: 430, x2: 305, y2: 810, w: 38 },
  { x1: 760, y1: 420, x2: 760, y2: 960, w: 42 },
  { x1: 320, y1: 1090, x2: 820, y2: 1180, w: 58 },
  // 文字間の飛び移り筆画
  { x1: 895, y1: 710, x2: 1160, y2: 600, w: 54 },
  { x1: 910, y1: 1015, x2: 1240, y2: 895, w: 48 },
  // 気 - 上部
  { x1: 1280, y1: 170, x2: 2140, y2: 170, w: 64 },
  { x1: 1340, y1: 340, x2: 2060, y2: 340, w: 48 },
  { x1: 1420, y1: 505, x2: 1975, y2: 505, w: 48 },
  { x1: 1325, y1: 685, x2: 2060, y2: 685, w: 54 },
  // 気 - 払い・曲がりに相当する斜め/縦画
  { x1: 1640, y1: 520, x2: 2190, y2: 1040, w: 78 },
  { x1: 1780, y1: 720, x2: 2100, y2: 1145, w: 58 },
  { x1: 1320, y1: 1040, x2: 1990, y2: 875, w: 58 },
  { x1: 1510, y1: 825, x2: 1740, y2: 1040, w: 52 },
  // 気 - 点・小足場
  { x1: 1410, y1: 865, x2: 1410, y2: 865, w: 88 },
  { x1: 1600, y1: 965, x2: 1600, y2: 965, w: 78 },
  { x1: 1885, y1: 795, x2: 1885, y2: 795, w: 84 },
  { x1: GOAL.x, y1: GOAL.y + 72, x2: GOAL.x + GOAL.w, y2: GOAL.y + 72, w: 42, tag: 'goal' },
];

const enemySeeds: Enemy[] = [
  { id: 1, stroke: 6, t: 0.72, dir: 1, speed: 0.07, alive: true, x: 0, y: 0 },
  { id: 2, stroke: 8, t: 0.25, dir: -1, speed: 0.09, alive: true, x: 0, y: 0 },
  { id: 3, stroke: 14, t: 0.5, dir: 1, speed: 0.10, alive: true, x: 0, y: 0 },
  { id: 4, stroke: 19, t: 0.55, dir: -1, speed: 0.08, alive: true, x: 0, y: 0 },
  { id: 5, stroke: 21, t: 0.65, dir: 1, speed: 0.08, alive: true, x: 0, y: 0 },
];

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function dist(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y); }
function closestOnStroke(p: Vec, s: Stroke) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1) return { x: s.x1, y: s.y1, t: 0, d: dist(p, { x: s.x1, y: s.y1 }) };
  const t = clamp(((p.x - s.x1) * dx + (p.y - s.y1) * dy) / l2, 0, 1);
  const x = s.x1 + dx * t;
  const y = s.y1 + dy * t;
  return { x, y, t, d: Math.hypot(p.x - x, p.y - y) };
}
type TerrainHit = { stroke: Stroke; point: Vec; d: number; index: number };
function terrainAt(p: Vec, pad = 0): TerrainHit | null {
  let best: TerrainHit | null = null;
  for (let index = 0; index < strokes.length; index += 1) {
    const s = strokes[index];
    const c = closestOnStroke(p, s);
    const limit = s.w / 2 + pad;
    if (c.d <= limit && (!best || c.d < best.d)) best = { stroke: s, point: { x: c.x, y: c.y }, d: c.d, index };
  }
  return best;
}
function segmentPointDistance(p: Vec, a: Vec, b: Vec) {
  const c = closestOnStroke(p, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, w: 1 });
  return c.d;
}
function initEnemies() {
  return enemySeeds.map((e) => {
    const s = strokes[e.stroke];
    return { ...e, x: lerp(s.x1, s.x2, e.t), y: lerp(s.y1, s.y2, e.t) - s.w / 2 - 16 };
  });
}
function makeGame(phase: Phase = 'title'): Game {
  const start = { x: 185, y: 107 };
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
    enemies: initEnemies(),
    camera: { x: 0, y: 0 },
    message: '',
    falling: false,
    fallVy: 0,
  };
}

export default function HakiActionGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const gameRef = useRef<Game>(makeGame());
  const [view, setView] = useState(gameRef.current);

  const worldToScreen = useCallback((p: Vec, cam = gameRef.current.camera) => ({ x: p.x - cam.x, y: p.y - cam.y }), []);
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
    const hit = terrainAt(p, TAP_PAD);
    if (!hit) {
      g.message = 'そこは空白';
      setView({ ...g });
      return;
    }
    const destination = hit.point;
    const d = dist(g.player, destination);
    if (d < 18) return;
    g.start = { ...g.player };
    g.target = destination;
    g.moveT = 0;
    g.moveDuration = clamp(d / MOVE_SPEED, 0.14, 1.2);
    g.moving = true;
    g.message = '';
    setView({ ...g });
  }, [screenToWorld]);

  const update = useCallback((dt: number, now: number) => {
    const g = gameRef.current;
    if (g.phase !== 'playing') return;
    g.elapsed = (now - g.startedAt) / 1000;

    g.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const s = strokes[enemy.stroke];
      enemy.t += enemy.dir * enemy.speed * dt;
      if (enemy.t > 0.96) { enemy.t = 0.96; enemy.dir = -1; }
      if (enemy.t < 0.04) { enemy.t = 0.04; enemy.dir = 1; }
      enemy.x = lerp(s.x1, s.x2, enemy.t);
      enemy.y = lerp(s.y1, s.y2, enemy.t) - s.w / 2 - 17;
    });

    if (g.moving) {
      const prev = { ...g.player };
      g.moveT = Math.min(1, g.moveT + dt / g.moveDuration);
      const ease = 1 - Math.pow(1 - g.moveT, 2);
      g.player = { x: lerp(g.start.x, g.target.x, ease), y: lerp(g.start.y, g.target.y, ease) };
      g.enemies.forEach((enemy) => {
        if (enemy.alive && segmentPointDistance({ x: enemy.x, y: enemy.y }, prev, g.player) < 34) {
          enemy.alive = false;
          g.message = '撃破';
        }
      });
      if (g.moveT >= 1) {
        g.moving = false;
        const ground = terrainAt({ x: g.player.x, y: g.player.y + PLAYER_R + 6 }, 8) || terrainAt(g.player, 4);
        if (ground) {
          g.safe = { ...g.player };
        } else {
          g.falling = true;
          g.fallVy = 0;
        }
      }
    } else if (g.falling) {
      g.fallVy += GRAVITY * dt;
      g.player.y += g.fallVy * dt;
      if (g.player.y > WORLD.h + 120) damage();
    } else {
      const under = terrainAt({ x: g.player.x, y: g.player.y + PLAYER_R + 10 }, 8) || terrainAt(g.player, 2);
      if (under) {
        g.safe = { ...g.player };
      } else {
        g.falling = true;
        g.fallVy = 0;
      }
      g.enemies.forEach((enemy) => {
        if (enemy.alive && dist(g.player, enemy) < 30) damage();
      });
    }

    if (g.player.x > GOAL.x - 10 && g.player.x < GOAL.x + GOAL.w + 20 && g.player.y > GOAL.y - 40 && g.player.y < GOAL.y + GOAL.h + 30) {
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

  const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    if (!e.alive) return;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = '#1a1110';
    ctx.strokeStyle = '#f0523f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-18, -18, 36, 36, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0523f';
    ctx.font = '900 22px ui-serif, "Yu Mincho", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('圧', 0, 1);
    ctx.restore();
  };

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const last = lastRef.current ?? time;
    const dt = Math.min(0.033, (time - last) / 1000);
    lastRef.current = time;
    update(dt, time);
    const g = gameRef.current;

    ctx.clearRect(0, 0, VIEW.w, VIEW.h);
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.save();
    ctx.translate(-g.camera.x, -g.camera.y);

    // 背景に薄い全体文字。筆画は別途太線で物理地形として描く。
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#f5ddb3';
    ctx.font = '900 820px ui-serif, "Hiragino Mincho ProN", "Yu Mincho", serif';
    ctx.fillText('覇', 80, 845);
    ctx.fillText('気', 1245, 845);
    ctx.restore();

    strokes.forEach((s) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(245,221,179,0.75)';
      const grad = ctx.createLinearGradient(s.x1, s.y1, s.x2, s.y2);
      grad.addColorStop(0, '#fff2cf');
      grad.addColorStop(0.5, '#d9bc82');
      grad.addColorStop(1, '#fff6dd');
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(42,25,11,0.22)';
      ctx.lineWidth = Math.max(2, s.w * 0.08);
      ctx.stroke();
      // 墨/石のひび割れ風ノイズを固定パターンで少量
      ctx.strokeStyle = 'rgba(60,37,20,0.20)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i += 1) {
        const t = ((i + 1) * 0.23 + (s.x1 % 13) * 0.01) % 1;
        const x = lerp(s.x1, s.x2, t);
        const y = lerp(s.y1, s.y2, t);
        ctx.beginPath(); ctx.moveTo(x - 16, y - 7); ctx.lineTo(x + 10, y + 8); ctx.stroke();
      }
      ctx.restore();
    });

    g.enemies.forEach((enemy) => drawEnemy(ctx, enemy));
    if (g.moving) {
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(g.start.x, g.start.y); ctx.lineTo(g.target.x, g.target.y); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = 'rgba(247,209,91,0.14)';
    ctx.strokeStyle = '#f7d15b';
    ctx.lineWidth = 4;
    ctx.fillRect(GOAL.x, GOAL.y, GOAL.w, GOAL.h);
    ctx.strokeRect(GOAL.x, GOAL.y, GOAL.w, GOAL.h);
    ctx.fillStyle = '#fff4c8';
    ctx.font = '900 28px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ゴール', GOAL.x + GOAL.w / 2, GOAL.y + 57);
    ctx.restore();
    drawPlayer(ctx, g.player, g.moving);
    ctx.restore();

    // HUD
    ctx.fillStyle = '#f7f1df';
    ctx.font = '800 20px ui-sans-serif, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`LIFE ${'♥'.repeat(Math.max(0, g.lives))}`, 22, 32);
    ctx.fillText(`TIME ${g.elapsed.toFixed(1)}`, 22, 62);
    ctx.fillStyle = 'rgba(247,241,223,0.72)';
    ctx.font = '700 14px ui-sans-serif, system-ui';
    ctx.fillText(`X ${Math.round(g.player.x)} / Y ${Math.round(g.player.y)}`, 22, 88);
    if (g.message) {
      ctx.fillStyle = g.message === '撃破' ? '#f7d15b' : '#f7f1df';
      ctx.font = '900 22px ui-sans-serif, system-ui';
      ctx.fillText(g.message, 22, 122);
    }

    // Mini map
    const mx = VIEW.w - 194; const my = 22; const mw = 168; const mh = 94;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(mx - 10, my - 10, mw + 20, mh + 38);
    ctx.strokeStyle = 'rgba(247,209,91,0.52)'; ctx.strokeRect(mx - 10, my - 10, mw + 20, mh + 38);
    ctx.fillStyle = '#f7f1df'; ctx.font = '800 13px ui-sans-serif, system-ui'; ctx.fillText('STAGE 覇気', mx, my + mh + 24);
    const sx = mw / WORLD.w; const sy = mh / WORLD.h;
    strokes.forEach((s) => {
      ctx.strokeStyle = 'rgba(245,221,179,0.82)';
      ctx.lineWidth = Math.max(1, s.w * sx * 0.55);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx + s.x1 * sx, my + s.y1 * sy); ctx.lineTo(mx + s.x2 * sx, my + s.y2 * sy); ctx.stroke();
    });
    ctx.strokeStyle = '#f7d15b'; ctx.lineWidth = 2;
    ctx.strokeRect(mx + g.camera.x * sx, my + g.camera.y * sy, VIEW.w * sx, VIEW.h * sy);
    ctx.fillStyle = '#ff3145'; ctx.beginPath(); ctx.arc(mx + g.player.x * sx, my + g.player.y * sy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    rafRef.current = requestAnimationFrame(draw);
  }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.width = VIEW.w;
    canvas.height = VIEW.h;
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  const timeText = useMemo(() => view.elapsed.toFixed(2), [view.elapsed]);

  return (
    <main className="haki-action-shell" aria-label="覇気アクション">
      <canvas ref={canvasRef} className="haki-action-canvas" onPointerDown={onTap} aria-label="巨大な覇気の筆画をタップ移動する2Dアクションゲーム" />
      {view.phase === 'title' && (
        <section className="haki-action-panel">
          <p>巨大な一文字が、ステージになる。</p>
          <h1>覇気アクション</h1>
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
