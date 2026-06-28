'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'name' | 'title' | 'playing' | 'result';
type RankName = '無覇気' | '微覇気' | '武装色' | '見聞色' | '覇王色';
type EnemyKind = 'runner' | 'tank' | 'orb' | 'boss';

type Enemy = {
  id: number;
  kind: EnemyKind;
  lane: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  hp: number;
  maxHp: number;
  flash: number;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type TextPop = { x: number; y: number; text: string; life: number; color: string };
type SlashTrail = { x1: number; y1: number; x2: number; y2: number; life: number };

type GameState = {
  phase: Phase;
  score: number;
  best: number;
  timeLeft: number;
  lives: number;
  combo: number;
  maxCombo: number;
  aura: number;
  taps: number;
  slashes: number;
  perfect: number;
  misses: number;
  burst: number;
  bossKills: number;
};

type LeaderboardEntry = {
  name: string;
  score: number;
  rank: RankName;
  maxCombo: number;
  perfect: number;
  playedAt: string;
};

const GAME_SECONDS = 45;
const STORAGE_BEST = 'haki-rush-best-score';
const STORAGE_NAME = 'haki-rush-nickname';
const STORAGE_BOARD = 'haki-rush-leaderboard';
const W = 960;
const H = 540;
const PLAYER_X = 126;
const PLAYER_Y = 270;
const HIT_X = 348;
const ZONE = 78;
const LANES = [190, 276, 362];

const initialState: GameState = {
  phase: 'name', score: 0, best: 0, timeLeft: GAME_SECONDS, lives: 5, combo: 0, maxCombo: 0,
  aura: 0, taps: 0, slashes: 0, perfect: 0, misses: 0, burst: 0, bossKills: 0,
};

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function sanitizeName(name: string) { return name.trim().replace(/\s+/g, ' ').slice(0, 12) || '名無しの覇気'; }
function rankFor(score: number): { name: RankName; line: string } {
  if (score >= 30000) return { name: '覇王色', line: '画面の向こうまで圧が届いています。' };
  if (score >= 21000) return { name: '見聞色', line: '踏み込みの気配を読めています。' };
  if (score >= 13000) return { name: '武装色', line: 'タップに芯があります。実用域です。' };
  if (score >= 6000) return { name: '微覇気', line: 'たまに場が静かになります。' };
  return { name: '無覇気', line: 'まだ指先が遠慮しています。' };
}
function readBoard(): LeaderboardEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_BOARD) ?? '[]') as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e.name === 'string' && Number.isFinite(e.score)).sort((a, b) => b.score - a.score).slice(0, 10) : [];
  } catch { return []; }
}
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax; const dy = by - ay; const len = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function particle(x: number, y: number, color: string): Particle {
  const a = Math.random() * Math.PI * 2; const s = 90 + Math.random() * 340;
  return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.36 + Math.random() * 0.55, color, size: 2 + Math.random() * 5 };
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>({ ...initialState });
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popsRef = useRef<TextPop[]>([]);
  const trailsRef = useRef<SlashTrail[]>([]);
  const spawnRef = useRef({ next: 0.45, id: 1, bossAt: 15 });
  const pointerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const savedRef = useRef(false);
  const nameRef = useRef('');
  const boardRef = useRef<LeaderboardEntry[]>([]);
  const [view, setView] = useState<GameState>(gameRef.current);
  const [nickname, setNickname] = useState('');
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const pop = (x: number, y: number, text: string, color = '#f6d15d') => popsRef.current.push({ x, y, text, life: 0.7, color });
  const emit = (x: number, y: number, color: string, count = 12) => { for (let i = 0; i < count; i += 1) particlesRef.current.push(particle(x, y, color)); };

  useEffect(() => {
    const best = Number(window.localStorage.getItem(STORAGE_BEST) ?? '0');
    if (Number.isFinite(best)) gameRef.current.best = best;
    const savedName = window.localStorage.getItem(STORAGE_NAME) ?? '';
    const clean = savedName ? sanitizeName(savedName) : '';
    nameRef.current = clean; setNickname(clean);
    if (clean) gameRef.current.phase = 'title';
    const loaded = readBoard(); boardRef.current = loaded; setBoard(loaded);
    setView({ ...gameRef.current });
  }, []);

  const saveBoard = useCallback((entry: LeaderboardEntry) => {
    const next = [...boardRef.current, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    boardRef.current = next; window.localStorage.setItem(STORAGE_BOARD, JSON.stringify(next)); setBoard(next);
  }, []);

  const finish = useCallback(() => {
    const g = gameRef.current;
    if (g.phase === 'result') return;
    g.phase = 'result';
    g.score = Math.round(g.score + g.lives * 900 + g.maxCombo * 120 + g.perfect * 150 + g.bossKills * 1800);
    if (g.score > g.best) { g.best = g.score; window.localStorage.setItem(STORAGE_BEST, String(g.score)); }
    if (!savedRef.current) {
      savedRef.current = true;
      saveBoard({ name: sanitizeName(nameRef.current), score: g.score, rank: rankFor(g.score).name, maxCombo: g.maxCombo, perfect: g.perfect, playedAt: new Date().toISOString() });
    }
    setView({ ...g });
  }, [saveBoard]);

  const startGame = useCallback(() => {
    const clean = sanitizeName(nameRef.current || nickname);
    nameRef.current = clean; setNickname(clean); window.localStorage.setItem(STORAGE_NAME, clean);
    gameRef.current = { ...initialState, best: gameRef.current.best, phase: 'playing' };
    enemiesRef.current = []; particlesRef.current = []; popsRef.current = []; trailsRef.current = [];
    spawnRef.current = { next: 1.1, id: 1, bossAt: 15 };
    pointerRef.current = null; savedRef.current = false; lastRef.current = null; setCopied(false); setView({ ...gameRef.current });
  }, [nickname]);

  const submitName = useCallback(() => {
    const clean = sanitizeName(nameRef.current || nickname);
    nameRef.current = clean; setNickname(clean); window.localStorage.setItem(STORAGE_NAME, clean);
    gameRef.current.phase = 'title'; setView({ ...gameRef.current });
  }, [nickname]);

  const damageEnemy = (enemy: Enemy, amount: number, perfect: boolean) => {
    const g = gameRef.current;
    enemy.hp -= amount; enemy.flash = 0.12;
    emit(enemy.x, enemy.y, perfect ? '#f6d15d' : '#f4e8d0', perfect ? 18 : 10);
    if (enemy.kind === 'orb') {
      enemy.hp = 0; g.aura = clamp(g.aura + 34, 0, 100); g.score += 850 + g.combo * 40; pop(enemy.x, enemy.y, '+覇気'); return true;
    }
    if (enemy.hp <= 0) {
      g.combo += enemy.kind === 'tank' ? 2 : enemy.kind === 'boss' ? 5 : 1;
      g.maxCombo = Math.max(g.maxCombo, g.combo);
      if (perfect) g.perfect += 1;
      if (enemy.kind === 'boss') g.bossKills += 1;
      g.aura = clamp(g.aura + (perfect ? 18 : 10) + (enemy.kind === 'boss' ? 35 : 0), 0, 100);
      g.score += (enemy.kind === 'boss' ? 3600 : enemy.kind === 'tank' ? 950 : 560) + g.combo * (perfect ? 85 : 42);
      pop(enemy.x, enemy.y, enemy.kind === 'boss' ? 'BOSS BREAK' : perfect ? 'PERFECT' : 'HIT', perfect ? '#f6d15d' : '#f4e8d0');
      return true;
    }
    g.score += 220 + g.combo * 12;
    pop(enemy.x, enemy.y, `HP ${enemy.hp}`);
    return false;
  };

  const burst = useCallback(() => {
    const g = gameRef.current;
    if (g.aura < 100) return false;
    const count = enemiesRef.current.length;
    enemiesRef.current.forEach((e) => emit(e.x, e.y, '#f6d15d', 12));
    enemiesRef.current = [];
    g.burst += 1; g.combo += Math.max(1, count); g.maxCombo = Math.max(g.maxCombo, g.combo);
    g.score += 1200 + count * 640 + g.combo * 70; g.aura = 0;
    pop(PLAYER_X + 250, PLAYER_Y - 80, '覇王色', '#f6d15d');
    return true;
  }, []);

  const tap = useCallback(() => {
    const g = gameRef.current;
    if (g.phase !== 'playing') return;
    g.taps += 1;
    if (burst()) { setView({ ...g }); return; }
    const candidates = enemiesRef.current.filter((e) => Math.abs(e.x - HIT_X) < ZONE + (e.kind === 'boss' ? 60 : 0));
    const target = candidates.sort((a, b) => Math.abs(a.x - HIT_X) - Math.abs(b.x - HIT_X))[0];
    if (!target) {
      g.combo = 0; g.misses += 1; g.score = Math.max(0, g.score - 100); g.aura = Math.max(0, g.aura - 8);
      emit(HIT_X, PLAYER_Y, '#b94b3e', 8); pop(HIT_X, PLAYER_Y - 80, 'MISS', '#b94b3e'); setView({ ...g }); return;
    }
    const accuracy = 1 - clamp(Math.abs(target.x - HIT_X) / (ZONE + (target.kind === 'boss' ? 60 : 0)), 0, 1);
    const perfect = accuracy > 0.72;
    const removed = damageEnemy(target, perfect ? 2 : 1, perfect);
    if (removed) enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
    if (perfect && g.combo > 0 && g.combo % 7 === 0) {
      let swept = 0;
      enemiesRef.current.forEach((e) => { if (e.x < HIT_X + 210 && e.kind !== 'boss') { e.hp = 0; swept += 1; emit(e.x, e.y, '#f6d15d', 8); } });
      enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
      if (swept) { g.score += swept * 700; pop(HIT_X + 110, PLAYER_Y - 120, '連鎖覇気'); }
    }
    setView({ ...g });
  }, [burst]);

  const slash = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const g = gameRef.current;
    if (g.phase !== 'playing') return;
    g.slashes += 1; trailsRef.current.push({ x1, y1, x2, y2, life: 0.22 });
    let hits = 0;
    enemiesRef.current.forEach((e) => {
      if (distSeg(e.x, e.y, x1, y1, x2, y2) < e.size * 1.35 && e.x > HIT_X - 140) {
        const killed = damageEnemy(e, e.kind === 'boss' ? 1 : 2, true);
        hits += killed ? 1 : 0;
      }
    });
    enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
    if (!hits) { g.combo = 0; g.misses += 1; g.score = Math.max(0, g.score - 130); pop((x1 + x2) / 2, (y1 + y2) / 2, '空振り', '#b94b3e'); }
    else { g.score += hits * 420; g.aura = clamp(g.aura + hits * 8, 0, 100); }
    setView({ ...g });
  }, []);

  const point = (cx: number, cy: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H } : { x: HIT_X, y: PLAYER_Y };
  };
  const down = useCallback((e: React.PointerEvent<HTMLElement>) => { if (gameRef.current.phase === 'playing') { const p = point(e.clientX, e.clientY); pointerRef.current = { ...p, t: performance.now() }; } }, []);
  const up = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (gameRef.current.phase !== 'playing') return;
    const s = pointerRef.current; const p = point(e.clientX, e.clientY); pointerRef.current = null;
    if (s && Math.hypot(p.x - s.x, p.y - s.y) > 82) slash(s.x, s.y, p.x, p.y); else tap();
  }, [slash, tap]);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    const g = gameRef.current; const last = lastRef.current ?? time; const dt = Math.min(0.034, (time - last) / 1000); lastRef.current = time;
    if (g.phase === 'playing') {
      g.timeLeft = Math.max(0, g.timeLeft - dt);
      const elapsed = GAME_SECONDS - g.timeLeft; const diff = clamp(elapsed / GAME_SECONDS, 0, 1);
      spawnRef.current.next -= dt;
      if (elapsed > spawnRef.current.bossAt) {
        const lane = Math.floor(Math.random() * LANES.length);
        enemiesRef.current.push({ id: spawnRef.current.id++, kind: 'boss', lane, x: W + 110, y: LANES[lane], speed: 72 + diff * 26, size: 56, hp: 6 + Math.floor(diff * 3), maxHp: 6 + Math.floor(diff * 3), flash: 0 });
        spawnRef.current.bossAt += 15;
      }
      if (spawnRef.current.next <= 0) {
        const lane = Math.floor(Math.random() * LANES.length); const roll = Math.random();
        const kind: EnemyKind = roll < 0.13 ? 'orb' : roll < 0.27 + diff * 0.08 ? 'tank' : 'runner';
        const size = kind === 'tank' ? 38 : kind === 'orb' ? 24 : 28;
        enemiesRef.current.push({ id: spawnRef.current.id++, kind, lane, x: W + 55, y: LANES[lane], speed: (kind === 'tank' ? 82 : kind === 'orb' ? 155 : 116) + diff * 104 + Math.random() * 22,size, hp: kind === 'tank' ? 2 : 1, maxHp: kind === 'tank' ? 2 : 1, flash: 0 });
        spawnRef.current.next = Math.max(0.58, 1.08 - diff * 0.42);
      }
      enemiesRef.current.forEach((e) => { e.x -= e.speed * dt; e.flash = Math.max(0, e.flash - dt); e.y += Math.sin(time / 190 + e.id) * (e.kind === 'orb' ? 0.8 : 0.32); });
      enemiesRef.current = enemiesRef.current.filter((e) => {
        if (e.x < PLAYER_X + 45) { g.lives -= e.kind === 'boss' ? 2 : 1; g.combo = 0; g.misses += 1; g.aura = Math.max(0, g.aura - 22); emit(PLAYER_X + 40, e.y, '#b94b3e', 14); pop(PLAYER_X + 70, e.y - 35, '被弾', '#b94b3e'); return false; }
        return e.x > -140;
      });
      particlesRef.current = particlesRef.current.map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 90 * dt, life: p.life - dt })).filter((p) => p.life > 0);
      popsRef.current = popsRef.current.map((p) => ({ ...p, y: p.y - 44 * dt, life: p.life - dt })).filter((p) => p.life > 0);
      trailsRef.current = trailsRef.current.map((t) => ({ ...t, life: t.life - dt })).filter((t) => t.life > 0);
      g.score += dt * (18 + g.combo * 5);
      if (g.timeLeft <= 0 || g.lives <= 0) finish();
      if (Math.floor(time / 80) !== Math.floor(last / 80)) setView({ ...g });
    }

    ctx.fillStyle = '#130f0c'; ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#18100d'); grad.addColorStop(0.55, '#2a1b13'); grad.addColorStop(1, '#0d0a09'); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1f1813'; ctx.fillRect(0, 384, W, 156);
    ctx.strokeStyle = 'rgba(244,232,208,0.11)'; ctx.lineWidth = 2;
    LANES.forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y + 45); ctx.lineTo(W, y + 45); ctx.stroke(); });
    ctx.fillStyle = 'rgba(246,209,93,0.14)'; ctx.fillRect(HIT_X - ZONE, 122, ZONE * 2, 286);
    ctx.strokeStyle = '#f6d15d'; ctx.lineWidth = 5; ctx.strokeRect(HIT_X - ZONE, 122, ZONE * 2, 286);
    ctx.fillStyle = 'rgba(185,75,62,0.78)'; ctx.fillRect(HIT_X - 3, 108, 6, 314);

    ctx.fillStyle = 'rgba(246,209,93,0.10)'; ctx.beginPath(); ctx.arc(PLAYER_X, PLAYER_Y, 108 + g.aura * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.aura >= 100 ? '#f6d15d' : 'rgba(244,232,208,0.44)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(PLAYER_X, PLAYER_Y, 82 + Math.sin(time / 100) * 5, -0.95, 0.95); ctx.stroke();
    ctx.fillStyle = '#f4e8d0'; ctx.fillRect(PLAYER_X - 18, PLAYER_Y - 58, 36, 48); ctx.fillRect(PLAYER_X - 28, PLAYER_Y - 10, 56, 82);
    ctx.fillStyle = '#130f0c'; ctx.fillRect(PLAYER_X + 6, PLAYER_Y - 43, 5, 5); ctx.fillStyle = '#f6d15d'; ctx.fillRect(PLAYER_X - 8, PLAYER_Y - 80, 16, 22); ctx.fillRect(PLAYER_X - 3, PLAYER_Y - 99, 8, 22);

    enemiesRef.current.forEach((e) => {
      ctx.globalAlpha = e.kind === 'orb' ? 0.95 : 1;
      if (e.kind === 'orb') { ctx.fillStyle = '#f6d15d'; ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f4e8d0'; ctx.fillRect(e.x - 5, e.y - 5, 10, 10); }
      else {
        ctx.fillStyle = e.flash > 0 ? '#f6d15d' : e.kind === 'boss' ? '#3b261d' : e.kind === 'tank' ? '#34251d' : '#2b211a';
        ctx.fillRect(e.x - e.size, e.y - e.size * 1.2, e.size * 2, e.size * 2.45);
        ctx.fillStyle = e.kind === 'boss' ? '#f6d15d' : '#b94b3e'; ctx.fillRect(e.x - e.size * 0.6, e.y - e.size * 1.65, e.size * 1.2, e.size * 0.55);
        ctx.fillStyle = '#f4e8d0'; ctx.fillRect(e.x - e.size * 0.24, e.y - e.size * 0.42, e.size * 0.48, e.size * 0.16);
        if (e.maxHp > 1) { ctx.fillStyle = '#0b0908'; ctx.fillRect(e.x - e.size, e.y + e.size * 1.45, e.size * 2, 7); ctx.fillStyle = '#f6d15d'; ctx.fillRect(e.x - e.size, e.y + e.size * 1.45, e.size * 2 * (e.hp / e.maxHp), 7); }
      }
      ctx.globalAlpha = 1;
    });
    trailsRef.current.forEach((t) => { ctx.globalAlpha = clamp(t.life / 0.22, 0, 1); ctx.strokeStyle = '#f6d15d'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke(); ctx.globalAlpha = 1; });
    particlesRef.current.forEach((p) => { ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1; });
    popsRef.current.forEach((p) => { ctx.globalAlpha = clamp(p.life / 0.7, 0, 1); ctx.fillStyle = p.color; ctx.font = '900 24px ui-sans-serif, system-ui'; ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1; });

    ctx.fillStyle = '#f4e8d0'; ctx.font = '800 24px ui-monospace, Menlo, monospace'; ctx.fillText(`SCORE ${Math.round(g.score)}`, 26, 34); ctx.fillText(`TIME ${Math.ceil(g.timeLeft)}`, 405, 34); ctx.fillText(`LIFE ${'◆'.repeat(Math.max(0, g.lives))}`, 724, 34);
    ctx.fillStyle = '#0b0908'; ctx.fillRect(26, 64, 280, 20); ctx.fillStyle = g.aura >= 100 ? '#f6d15d' : '#f4e8d0'; ctx.fillRect(30, 68, 2.72 * g.aura, 12);
    ctx.fillStyle = '#d7c8a8'; ctx.font = '800 18px ui-monospace, Menlo, monospace'; ctx.fillText(g.aura >= 100 ? 'TAP ANYWHERE: 覇王色' : 'TAP IN GOLD ZONE / SWIPE TO SLASH', 26, 112); ctx.fillText(`COMBO ${g.combo}`, 724, 70);
    rafRef.current = requestAnimationFrame(draw);
  }, [finish]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    canvas.width = W; canvas.height = H; rafRef.current = requestAnimationFrame(draw);
    const key = (e: KeyboardEvent) => { if ((e.key === ' ' || e.key === 'Enter') && gameRef.current.phase === 'playing') tap(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [draw, tap]);

  const rank = useMemo(() => rankFor(view.score), [view.score]);
  const shareText = useMemo(() => `${sanitizeName(nickname)}の覇気は「${rank.name}」${Math.round(view.score)}点。${rank.line}\n#覇気チャレンジ https://game.xn--7qwx14d.com`, [nickname, rank.line, rank.name, view.score]);
  const share = useCallback(async () => {
    try { if (navigator.share) await navigator.share({ title: '覇気ラッシュ', text: shareText, url: 'https://game.xn--7qwx14d.com' }); else { await navigator.clipboard.writeText(shareText); setCopied(true); } }
    catch { await navigator.clipboard.writeText(shareText); setCopied(true); }
  }, [shareText]);

  const leaderboard = board.length > 0 && <ol className="pressure-board">{board.slice(0, 5).map((e, i) => <li className={e.score === Math.round(view.score) && e.name === sanitizeName(nickname) ? 'current' : ''} key={`${e.playedAt}-${i}`}><span>{i + 1}. {e.name}</span><strong>{e.score}</strong></li>)}</ol>;

  return (
    <main className="pressure-shell" aria-label="覇気ラッシュ" onPointerDown={down} onPointerUp={up} onPointerCancel={up}>
      <div className="pressure-frame">
        <canvas ref={canvasRef} className="pressure-canvas" aria-hidden="true" />
        {view.phase === 'name' && <section className="pressure-panel" onPointerDown={(e) => e.stopPropagation()}><p className="pressure-kicker">game.覇気.com</p><h1>覇気ラッシュ</h1><p>金色ゾーンでタップ。覇気100で画面を黙らせる。</p><input value={nickname} maxLength={12} placeholder="あだ名" onChange={(e) => { setNickname(e.target.value); nameRef.current = e.target.value; }} /><button type="button" onClick={submitName}>登録</button></section>}
        {view.phase === 'title' && <section className="pressure-panel" onPointerDown={(e) => e.stopPropagation()}><p className="pressure-kicker">TAP TIMING / OPTIONAL SLASH</p><h1>覇気ラッシュ</h1><p>人気Webゲームの型に寄せた、短時間・即リトライの覇気アクション。</p><p className="pressure-rule">基本はタップだけ。金色ゾーンで止め、覇気100で全消し。余裕があればスワイプ。</p><button type="button" onClick={startGame}>開始</button><button type="button" className="sub" onClick={() => { gameRef.current.phase = 'name'; setView({ ...gameRef.current }); }}>あだ名変更</button>{leaderboard}</section>}
        {view.phase === 'result' && <section className="pressure-panel pressure-result" onPointerDown={(e) => e.stopPropagation()}><p className="pressure-kicker">RESULT</p><h1>{rank.name}</h1><p>{rank.line}</p><p className="pressure-score">{Math.round(view.score)}点 / BEST {Math.round(view.best)} / MAX {view.maxCombo} COMBO</p><p className="pressure-rule">TAP {view.taps} / SLASH {view.slashes} / BURST {view.burst} / BOSS {view.bossKills}</p>{leaderboard}<div className="pressure-actions"><button type="button" onClick={startGame}>もう一度</button><button type="button" className="sub" onClick={share}>{copied ? 'コピー済み' : 'シェア'}</button></div></section>}
      </div>
    </main>
  );
}
