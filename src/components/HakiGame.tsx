'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'name' | 'title' | 'playing' | 'result';
type RankName = '無覇気' | '微覇気' | '武装色' | '見聞色' | '覇王色';
type EnemyKind = 'normal' | 'heavy' | 'ghost';

type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  speed: number;
  size: number;
  hit: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

type SlashTrail = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
};

type GameState = {
  phase: Phase;
  score: number;
  best: number;
  timeLeft: number;
  combo: number;
  maxCombo: number;
  aura: number;
  taps: number;
  slashes: number;
  perfect: number;
  misses: number;
};

type LeaderboardEntry = {
  name: string;
  score: number;
  rank: RankName;
  maxCombo: number;
  perfect: number;
  playedAt: string;
};

const GAME_SECONDS = 30;
const STORAGE_BEST = 'haki-tap-best-score';
const STORAGE_NAME = 'haki-tap-nickname';
const STORAGE_BOARD = 'haki-tap-leaderboard';
const CANVAS_W = 960;
const CANVAS_H = 540;
const PLAYER_X = 136;
const PLAYER_Y = 274;
const STRIKE_X = 344;
const ZONE_WIDTH = 92;

const initialState: GameState = {
  phase: 'name',
  score: 0,
  best: 0,
  timeLeft: GAME_SECONDS,
  combo: 0,
  maxCombo: 0,
  aura: 0,
  taps: 0,
  slashes: 0,
  perfect: 0,
  misses: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 12) || '名無しの覇気';
}

function rankFor(score: number): { name: RankName; line: string } {
  if (score >= 12000) return { name: '覇王色', line: 'タップ一つで場の空気が変わりました。' };
  if (score >= 8500) return { name: '見聞色', line: '相手が踏み込む瞬間をほぼ読めています。' };
  if (score >= 5600) return { name: '武装色', line: '覇気として十分に実用域です。' };
  if (score >= 2400) return { name: '微覇気', line: 'たまに圧が出ています。会議室なら効きます。' };
  return { name: '無覇気', line: '今はまだ、ただのタップです。' };
}

function readBoard(): LeaderboardEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_BOARD) ?? '[]') as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry.name === 'string' && Number.isFinite(entry.score)).sort((a, b) => b.score - a.score).slice(0, 10);
  } catch {
    return [];
  }
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function makeParticle(x: number, y: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 80 + Math.random() * 300;
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.55, color, size: 2 + Math.random() * 4 };
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>({ ...initialState });
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<SlashTrail[]>([]);
  const spawnRef = useRef({ next: 0.6, id: 1 });
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const savedRef = useRef(false);
  const nameRef = useRef('');
  const boardRef = useRef<LeaderboardEntry[]>([]);
  const [view, setView] = useState<GameState>(gameRef.current);
  const [nickname, setNickname] = useState('');
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const best = Number(window.localStorage.getItem(STORAGE_BEST) ?? '0');
    if (Number.isFinite(best)) gameRef.current.best = best;
    const storedName = window.localStorage.getItem(STORAGE_NAME) ?? '';
    const cleanName = storedName ? sanitizeName(storedName) : '';
    nameRef.current = cleanName;
    setNickname(cleanName);
    if (cleanName) gameRef.current.phase = 'title';
    const loaded = readBoard();
    boardRef.current = loaded;
    setBoard(loaded);
    setView({ ...gameRef.current });
  }, []);

  const saveBoard = useCallback((entry: LeaderboardEntry) => {
    const next = [...boardRef.current, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    boardRef.current = next;
    window.localStorage.setItem(STORAGE_BOARD, JSON.stringify(next));
    setBoard(next);
  }, []);

  const finish = useCallback(() => {
    const game = gameRef.current;
    if (game.phase === 'result') return;
    game.phase = 'result';
    game.score = Math.round(game.score + game.combo * 80 + game.perfect * 140 + game.slashes * 90);
    if (game.score > game.best) {
      game.best = game.score;
      window.localStorage.setItem(STORAGE_BEST, String(game.score));
    }
    if (!savedRef.current) {
      savedRef.current = true;
      saveBoard({
        name: sanitizeName(nameRef.current),
        score: game.score,
        rank: rankFor(game.score).name,
        maxCombo: game.maxCombo,
        perfect: game.perfect,
        playedAt: new Date().toISOString(),
      });
    }
    setView({ ...game });
  }, [saveBoard]);

  const startGame = useCallback(() => {
    const clean = sanitizeName(nameRef.current || nickname);
    nameRef.current = clean;
    setNickname(clean);
    window.localStorage.setItem(STORAGE_NAME, clean);
    gameRef.current = { ...initialState, best: gameRef.current.best, phase: 'playing' };
    enemiesRef.current = [];
    particlesRef.current = [];
    trailsRef.current = [];
    spawnRef.current = { next: 0.35, id: 1 };
    pointerStartRef.current = null;
    savedRef.current = false;
    lastTimeRef.current = null;
    setCopied(false);
    setView({ ...gameRef.current });
  }, [nickname]);

  const submitName = useCallback(() => {
    const clean = sanitizeName(nameRef.current || nickname);
    nameRef.current = clean;
    setNickname(clean);
    window.localStorage.setItem(STORAGE_NAME, clean);
    gameRef.current.phase = 'title';
    setView({ ...gameRef.current });
  }, [nickname]);

  const emit = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i += 1) particlesRef.current.push(makeParticle(x, y, color));
  };

  const strikeTap = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'playing') return;
    game.taps += 1;
    const candidates = enemiesRef.current.filter((enemy) => !enemy.hit && Math.abs(enemy.x - STRIKE_X) < ZONE_WIDTH);
    const target = candidates.sort((a, b) => Math.abs(a.x - STRIKE_X) - Math.abs(b.x - STRIKE_X))[0];

    if (!target) {
      game.combo = 0;
      game.misses += 1;
      game.aura = Math.max(0, game.aura - 10);
      game.score = Math.max(0, game.score - 90);
      emit(STRIKE_X, PLAYER_Y, '#b94b3e', 8);
      setView({ ...game });
      return;
    }

    const accuracy = 1 - clamp(Math.abs(target.x - STRIKE_X) / ZONE_WIDTH, 0, 1);
    const perfect = accuracy > 0.72;
    target.hit = true;
    game.combo += 1;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    if (perfect) game.perfect += 1;
    game.aura = clamp(game.aura + (perfect ? 16 : 9), 0, 100);
    game.score += Math.round((perfect ? 620 : 380) + game.combo * (perfect ? 72 : 38) + accuracy * 260);
    emit(target.x, target.y, perfect ? '#f6d15d' : '#f4e8d0', perfect ? 18 : 11);
    setView({ ...game });
  }, []);

  const strikeSlash = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const game = gameRef.current;
    if (game.phase !== 'playing') return;
    game.slashes += 1;
    trailsRef.current.push({ x1, y1, x2, y2, life: 0.22 });
    let hits = 0;
    enemiesRef.current.forEach((enemy) => {
      if (enemy.hit) return;
      const d = distanceToSegment(enemy.x, enemy.y, x1, y1, x2, y2);
      if (d < enemy.size * 1.35 && enemy.x > STRIKE_X - 80 && enemy.x < CANVAS_W - 60) {
        enemy.hit = true;
        hits += enemy.kind === 'heavy' ? 2 : 1;
        emit(enemy.x, enemy.y, '#f6d15d', 12);
      }
    });
    if (hits > 0) {
      game.combo += hits;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
      game.aura = clamp(game.aura + 6 + hits * 4, 0, 100);
      game.score += hits * 330 + game.combo * 28;
    } else {
      game.combo = 0;
      game.misses += 1;
      game.score = Math.max(0, game.score - 120);
    }
    setView({ ...game });
  }, []);

  const pointFromEvent = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: STRIKE_X, y: PLAYER_Y };
    return { x: ((clientX - rect.left) / rect.width) * CANVAS_W, y: ((clientY - rect.top) / rect.height) * CANVAS_H };
  };

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (gameRef.current.phase !== 'playing') return;
    const p = pointFromEvent(event.clientX, event.clientY);
    pointerStartRef.current = { ...p, time: performance.now() };
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (gameRef.current.phase !== 'playing') return;
    const start = pointerStartRef.current;
    const end = pointFromEvent(event.clientX, event.clientY);
    pointerStartRef.current = null;
    if (start && Math.hypot(end.x - start.x, end.y - start.y) > 70) strikeSlash(start.x, start.y, end.x, end.y);
    else strikeTap();
  }, [strikeSlash, strikeTap]);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const game = gameRef.current;
    const last = lastTimeRef.current ?? time;
    const dt = Math.min(0.034, (time - last) / 1000);
    lastTimeRef.current = time;

    if (game.phase === 'playing') {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      game.aura = clamp(game.aura - dt * 5, 0, 100);
      const elapsed = GAME_SECONDS - game.timeLeft;
      const difficulty = clamp(elapsed / GAME_SECONDS, 0, 1);
      spawnRef.current.next -= dt;
      if (spawnRef.current.next <= 0) {
        const roll = Math.random();
        const kind: EnemyKind = difficulty > 0.62 && roll < 0.18 ? 'heavy' : difficulty > 0.35 && roll < 0.28 ? 'ghost' : 'normal';
        enemiesRef.current.push({
          id: spawnRef.current.id++,
          kind,
          x: CANVAS_W + 70,
          y: PLAYER_Y + 42 + Math.sin(spawnRef.current.id * 1.7) * 58,
          speed: 145 + difficulty * 175 + Math.random() * 35 + (kind === 'ghost' ? 40 : 0),
          size: kind === 'heavy' ? 38 : 28,
          hit: false,
        });
        spawnRef.current.next = Math.max(0.42, 0.92 - difficulty * 0.38);
      }

      enemiesRef.current.forEach((enemy) => {
        enemy.x -= enemy.speed * dt;
        enemy.y += Math.sin(time / 190 + enemy.id) * (enemy.kind === 'ghost' ? 0.8 : 0.35);
      });
      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        if (enemy.hit) return false;
        if (enemy.x < PLAYER_X + 52) {
          game.combo = 0;
          game.misses += 1;
          game.aura = Math.max(0, game.aura - 18);
          game.score = Math.max(0, game.score - 240);
          emit(PLAYER_X + 42, enemy.y, '#b94b3e', 12);
          return false;
        }
        return enemy.x > -80;
      });
      particlesRef.current = particlesRef.current.map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 80 * dt, life: p.life - dt })).filter((p) => p.life > 0);
      trailsRef.current = trailsRef.current.map((t) => ({ ...t, life: t.life - dt })).filter((t) => t.life > 0);
      game.score += dt * (16 + game.combo * 4);
      if (game.timeLeft <= 0) finish();
      if (Math.floor(time / 80) !== Math.floor(last / 80)) setView({ ...game });
    }

    ctx.fillStyle = '#130f0c';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#1f1813';
    ctx.fillRect(0, 350, CANVAS_W, 190);
    ctx.strokeStyle = '#5a4636';
    ctx.lineWidth = 3;
    for (let x = 0; x < CANVAS_W; x += 52) {
      ctx.beginPath();
      ctx.moveTo(x, 368);
      ctx.lineTo(x - 150, CANVAS_H);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(246, 209, 93, 0.09)';
    ctx.beginPath();
    ctx.arc(PLAYER_X, PLAYER_Y, 96 + game.aura * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = game.aura > 70 ? '#f6d15d' : 'rgba(244,232,208,0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(PLAYER_X, PLAYER_Y, 78 + Math.sin(time / 120) * 6 + game.aura * 0.7, -0.95, 0.95);
    ctx.stroke();

    ctx.fillStyle = 'rgba(246,209,93,0.14)';
    ctx.fillRect(STRIKE_X - ZONE_WIDTH, 126, ZONE_WIDTH * 2, 308);
    ctx.strokeStyle = '#f6d15d';
    ctx.lineWidth = 4;
    ctx.strokeRect(STRIKE_X - ZONE_WIDTH, 126, ZONE_WIDTH * 2, 308);
    ctx.fillStyle = 'rgba(185,75,62,0.72)';
    ctx.fillRect(STRIKE_X - 3, 112, 6, 336);

    ctx.fillStyle = '#f4e8d0';
    ctx.fillRect(PLAYER_X - 18, PLAYER_Y - 58, 36, 48);
    ctx.fillRect(PLAYER_X - 27, PLAYER_Y - 10, 54, 80);
    ctx.fillStyle = '#130f0c';
    ctx.fillRect(PLAYER_X + 6, PLAYER_Y - 43, 5, 5);
    ctx.fillStyle = '#f6d15d';
    ctx.fillRect(PLAYER_X - 8, PLAYER_Y - 78, 16, 20);
    ctx.fillRect(PLAYER_X - 3, PLAYER_Y - 96, 8, 20);

    enemiesRef.current.forEach((enemy) => {
      ctx.globalAlpha = enemy.kind === 'ghost' ? 0.72 : 1;
      ctx.fillStyle = enemy.kind === 'heavy' ? '#3a2a20' : '#2b211a';
      ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size * 1.35, enemy.size * 2, enemy.size * 2.7);
      ctx.fillStyle = enemy.kind === 'ghost' ? '#d7c8a8' : '#b94b3e';
      ctx.fillRect(enemy.x - enemy.size * 0.55, enemy.y - enemy.size * 1.78, enemy.size * 1.1, enemy.size * 0.68);
      ctx.fillStyle = '#f4e8d0';
      ctx.fillRect(enemy.x - enemy.size * 0.22, enemy.y - enemy.size * 0.56, enemy.size * 0.44, enemy.size * 0.16);
      ctx.globalAlpha = 1;
    });

    trailsRef.current.forEach((trail) => {
      ctx.globalAlpha = clamp(trail.life / 0.22, 0, 1);
      ctx.strokeStyle = '#f6d15d';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(trail.x1, trail.y1);
      ctx.lineTo(trail.x2, trail.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    particlesRef.current.forEach((p) => {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = '#f4e8d0';
    ctx.font = '700 24px ui-monospace, Menlo, monospace';
    ctx.fillText(`SCORE ${Math.round(game.score)}`, 26, 34);
    ctx.fillText(`TIME ${Math.ceil(game.timeLeft)}`, 420, 34);
    ctx.fillText(`COMBO ${game.combo}`, 748, 34);
    ctx.fillStyle = '#0b0908';
    ctx.fillRect(26, 64, 280, 20);
    ctx.fillStyle = game.aura > 70 ? '#f6d15d' : '#f4e8d0';
    ctx.fillRect(30, 68, 2.72 * game.aura, 12);
    ctx.fillStyle = '#d7c8a8';
    ctx.font = '700 18px ui-monospace, Menlo, monospace';
    ctx.fillText('TAP IN GOLD ZONE / SWIPE TO SLASH', 26, 112);

    frameRef.current = requestAnimationFrame(draw);
  }, [finish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    frameRef.current = requestAnimationFrame(draw);
    const key = (event: KeyboardEvent) => {
      if ((event.key === ' ' || event.key === 'Enter') && gameRef.current.phase === 'playing') strikeTap();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [draw, strikeTap]);

  const rank = useMemo(() => rankFor(view.score), [view.score]);
  const shareText = useMemo(() => `${sanitizeName(nickname)}の覇気は「${rank.name}」${Math.round(view.score)}点。${rank.line}\n#覇気チャレンジ https://game.xn--7qwx14d.com`, [nickname, rank.line, rank.name, view.score]);

  const share = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title: '覇気一閃', text: shareText, url: 'https://game.xn--7qwx14d.com' });
      else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
      }
    } catch {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    }
  }, [shareText]);

  const leaderboard = board.length > 0 && (
    <ol className="pressure-board">
      {board.slice(0, 5).map((entry, index) => (
        <li className={entry.score === Math.round(view.score) && entry.name === sanitizeName(nickname) ? 'current' : ''} key={`${entry.playedAt}-${index}`}>
          <span>{index + 1}. {entry.name}</span><strong>{entry.score}</strong>
        </li>
      ))}
    </ol>
  );

  return (
    <main className="pressure-shell" aria-label="覇気一閃" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      <div className="pressure-frame">
        <canvas ref={canvasRef} className="pressure-canvas" aria-hidden="true" />

        {view.phase === 'name' && (
          <section className="pressure-panel" onPointerDown={(event) => event.stopPropagation()}>
            <p className="pressure-kicker">game.覇気.com</p>
            <h1>覇気一閃</h1>
            <p>金色の間に入った瞬間、タップで覇気を放つ。</p>
            <input value={nickname} maxLength={12} placeholder="あだ名" onChange={(event) => { setNickname(event.target.value); nameRef.current = event.target.value; }} />
            <button type="button" onClick={submitName}>登録</button>
          </section>
        )}

        {view.phase === 'title' && (
          <section className="pressure-panel" onPointerDown={(event) => event.stopPropagation()}>
            <p className="pressure-kicker">TAP MAIN / SLASH OPTIONAL</p>
            <h1>覇気一閃</h1>
            <p>迫る相手が金色の間に入ったらタップ。それだけです。</p>
            <p className="pressure-rule">余裕があれば、横スワイプでまとめて一閃。</p>
            <button type="button" onClick={startGame}>開始</button>
            <button type="button" className="sub" onClick={() => { gameRef.current.phase = 'name'; setView({ ...gameRef.current }); }}>あだ名変更</button>
            {leaderboard}
          </section>
        )}

        {view.phase === 'result' && (
          <section className="pressure-panel pressure-result" onPointerDown={(event) => event.stopPropagation()}>
            <p className="pressure-kicker">RESULT</p>
            <h1>{rank.name}</h1>
            <p>{rank.line}</p>
            <p className="pressure-score">{Math.round(view.score)}点 / BEST {Math.round(view.best)} / MAX {view.maxCombo} COMBO</p>
            <p className="pressure-rule">TAP {view.taps} / SLASH {view.slashes} / PERFECT {view.perfect}</p>
            {leaderboard}
            <div className="pressure-actions">
              <button type="button" onClick={startGame}>もう一度</button>
              <button type="button" className="sub" onClick={share}>{copied ? 'コピー済み' : 'シェア'}</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
