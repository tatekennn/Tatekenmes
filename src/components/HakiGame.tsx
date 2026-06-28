'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'name' | 'title' | 'playing' | 'result';
type RankName = '無覇気' | '微覇気' | '武装色' | '見聞色' | '覇王色';

type Opponent = {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  hp: number;
  stunned: boolean;
  stunLife: number;
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

type GameState = {
  phase: Phase;
  score: number;
  best: number;
  timeLeft: number;
  combo: number;
  maxCombo: number;
  aura: number;
  releases: number;
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
const STORAGE_BEST = 'haki-pressure-best-score';
const STORAGE_NAME = 'haki-pressure-nickname';
const STORAGE_BOARD = 'haki-pressure-leaderboard';
const PLAYER_X = 128;
const PLAYER_Y = 258;
const DANGER_X = 178;
const PERFECT_MIN = 68;
const PERFECT_MAX = 84;
const CANVAS_W = 960;
const CANVAS_H = 540;

const initialState: GameState = {
  phase: 'name',
  score: 0,
  best: 0,
  timeLeft: GAME_SECONDS,
  combo: 0,
  maxCombo: 0,
  aura: 0,
  releases: 0,
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
  if (score >= 9000) return { name: '覇王色', line: '近づく前に全員が進路を譲りました。' };
  if (score >= 6500) return { name: '見聞色', line: '相手が踏み込む前に、空気が少し曲がっています。' };
  if (score >= 4200) return { name: '武装色', line: '覇気として成立しています。乱用には向きません。' };
  if (score >= 1800) return { name: '微覇気', line: 'まだ圧ですが、会議室なら効きます。' };
  return { name: '無覇気', line: '今のところ、ただ静かな人です。' };
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

function particle(x: number, y: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 80 + Math.random() * 260;
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.4 + Math.random() * 0.5, color, size: 2 + Math.random() * 4 };
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>({ ...initialState });
  const opponentsRef = useRef<Opponent[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const spawnRef = useRef({ next: 0.8, id: 1 });
  const holdRef = useRef(false);
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
    game.score = Math.round(game.score + game.combo * 90 + game.perfect * 140);
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
    opponentsRef.current = [];
    particlesRef.current = [];
    spawnRef.current = { next: 0.55, id: 1 };
    holdRef.current = false;
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

  const releaseHaki = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'playing' || !holdRef.current) return;
    holdRef.current = false;
    game.releases += 1;
    const aura = game.aura;
    const range = 96 + aura * 4.8;
    const perfectPower = aura >= PERFECT_MIN && aura <= PERFECT_MAX;
    const tooWeak = aura < 34;
    const over = aura > 94;
    let hit = 0;
    let closest = Infinity;

    opponentsRef.current = opponentsRef.current.filter((opponent) => {
      const distance = opponent.x - PLAYER_X;
      closest = Math.min(closest, distance);
      if (distance > 0 && distance < range) {
        hit += 1;
        for (let i = 0; i < (perfectPower ? 16 : 9); i += 1) particlesRef.current.push(particle(opponent.x, opponent.y, perfectPower ? '#f6d15d' : '#f4e8d0'));
        return false;
      }
      return true;
    });

    if (hit > 0 && !tooWeak) {
      game.combo += hit;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
      if (perfectPower) game.perfect += 1;
      game.score += hit * (perfectPower ? 720 : 420) + game.combo * (perfectPower ? 90 : 45);
      if (over) game.score = Math.max(0, game.score - 180);
    } else {
      game.combo = 0;
      game.misses += 1;
      game.score = Math.max(0, game.score - (closest < 120 ? 160 : 80));
      for (let i = 0; i < 8; i += 1) particlesRef.current.push(particle(PLAYER_X + 58, PLAYER_Y, '#b94b3e'));
    }
    game.aura = over ? 10 : 0;
    setView({ ...game });
  }, []);

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
      if (holdRef.current) game.aura = clamp(game.aura + dt * (46 + game.combo * 0.9), 0, 100);
      else game.aura = clamp(game.aura - dt * 24, 0, 100);

      const elapsed = GAME_SECONDS - game.timeLeft;
      const difficulty = clamp(elapsed / GAME_SECONDS, 0, 1);
      spawnRef.current.next -= dt;
      if (spawnRef.current.next <= 0) {
        opponentsRef.current.push({
          id: spawnRef.current.id++,
          x: CANVAS_W + 60,
          y: PLAYER_Y + 40 + Math.sin(spawnRef.current.id * 1.8) * 28,
          speed: 118 + difficulty * 142 + Math.random() * 42,
          size: 28 + Math.random() * 12,
          hp: 1,
          stunned: false,
          stunLife: 0,
        });
        spawnRef.current.next = Math.max(0.42, 1.15 - difficulty * 0.58);
      }

      opponentsRef.current.forEach((opponent) => {
        opponent.x -= opponent.speed * dt;
        opponent.y += Math.sin(time / 220 + opponent.id) * 0.35;
      });

      opponentsRef.current = opponentsRef.current.filter((opponent) => {
        if (opponent.x < DANGER_X) {
          game.combo = 0;
          game.misses += 1;
          game.score = Math.max(0, game.score - 260);
          for (let i = 0; i < 10; i += 1) particlesRef.current.push(particle(DANGER_X, opponent.y, '#b94b3e'));
          return false;
        }
        return true;
      });

      particlesRef.current = particlesRef.current
        .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 80 * dt, life: p.life - dt }))
        .filter((p) => p.life > 0);

      game.score += dt * (18 + game.combo * 5);
      if (game.timeLeft <= 0) finish();
      if (Math.floor(time / 80) !== Math.floor(last / 80)) setView({ ...game });
    }

    ctx.fillStyle = '#130f0c';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#1f1813';
    ctx.fillRect(0, 350, CANVAS_W, 190);
    ctx.strokeStyle = '#5a4636';
    ctx.lineWidth = 3;
    for (let x = 0; x < CANVAS_W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 366);
      ctx.lineTo(x - 120, CANVAS_H);
      ctx.stroke();
    }
    ctx.fillStyle = '#0b0908';
    ctx.fillRect(0, 384, CANVAS_W, 12);

    ctx.fillStyle = 'rgba(246, 209, 93, 0.08)';
    ctx.beginPath();
    ctx.arc(PLAYER_X, PLAYER_Y, 96 + game.aura * 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = game.aura >= PERFECT_MIN && game.aura <= PERFECT_MAX ? '#f6d15d' : 'rgba(244,232,208,0.38)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(PLAYER_X, PLAYER_Y, 64 + game.aura * 2.15, -0.7, 0.7);
    ctx.stroke();

    ctx.fillStyle = '#f4e8d0';
    ctx.fillRect(PLAYER_X - 18, PLAYER_Y - 58, 36, 48);
    ctx.fillRect(PLAYER_X - 26, PLAYER_Y - 10, 52, 78);
    ctx.fillStyle = '#130f0c';
    ctx.fillRect(PLAYER_X + 6, PLAYER_Y - 43, 5, 5);
    ctx.fillStyle = '#f6d15d';
    ctx.fillRect(PLAYER_X - 8, PLAYER_Y - 78, 16, 20);
    ctx.fillRect(PLAYER_X - 3, PLAYER_Y - 96, 8, 20);

    ctx.strokeStyle = 'rgba(185,75,62,0.68)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(DANGER_X, 156);
    ctx.lineTo(DANGER_X, 430);
    ctx.stroke();

    opponentsRef.current.forEach((opponent) => {
      ctx.fillStyle = '#2b211a';
      ctx.fillRect(opponent.x - opponent.size, opponent.y - opponent.size * 1.4, opponent.size * 2, opponent.size * 2.8);
      ctx.fillStyle = '#b94b3e';
      ctx.fillRect(opponent.x - opponent.size * 0.55, opponent.y - opponent.size * 1.85, opponent.size * 1.1, opponent.size * 0.7);
      ctx.fillStyle = '#f4e8d0';
      ctx.fillRect(opponent.x - opponent.size * 0.2, opponent.y - opponent.size * 0.6, opponent.size * 0.4, opponent.size * 0.18);
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
    ctx.fillText(`TIME ${Math.ceil(game.timeLeft)}`, 410, 34);
    ctx.fillText(`COMBO ${game.combo}`, 748, 34);
    ctx.fillStyle = '#0b0908';
    ctx.fillRect(26, 64, 280, 20);
    ctx.fillStyle = game.aura >= PERFECT_MIN && game.aura <= PERFECT_MAX ? '#f6d15d' : '#f4e8d0';
    ctx.fillRect(30, 68, 2.72 * game.aura, 12);
    ctx.strokeStyle = '#f6d15d';
    ctx.strokeRect(30 + PERFECT_MIN * 2.72, 64, (PERFECT_MAX - PERFECT_MIN) * 2.72, 20);
    ctx.fillStyle = '#d7c8a8';
    ctx.font = '700 18px ui-monospace, Menlo, monospace';
    ctx.fillText(holdRef.current ? 'RELEASE IN GOLD ZONE' : 'HOLD TO RAISE HAKI', 26, 112);

    frameRef.current = requestAnimationFrame(draw);
  }, [finish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [draw]);

  const pointerDown = useCallback(() => {
    if (gameRef.current.phase === 'playing') holdRef.current = true;
  }, []);

  const pointerUp = useCallback(() => {
    releaseHaki();
  }, [releaseHaki]);

  const rank = useMemo(() => rankFor(view.score), [view.score]);
  const shareText = useMemo(() => `${sanitizeName(nickname)}の覇気は「${rank.name}」${Math.round(view.score)}点。${rank.line}\n#覇気チャレンジ https://game.xn--7qwx14d.com`, [nickname, rank.line, rank.name, view.score]);

  const share = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title: '覇気解放', text: shareText, url: 'https://game.xn--7qwx14d.com' });
      else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
      }
    } catch {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    }
  }, [shareText]);

  return (
    <main className="pressure-shell" aria-label="覇気解放" onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <div className="pressure-frame">
        <canvas ref={canvasRef} className="pressure-canvas" aria-hidden="true" />

        {view.phase === 'name' && (
          <section className="pressure-panel" onPointerDown={(event) => event.stopPropagation()}>
            <p className="pressure-kicker">game.覇気.com</p>
            <h1>覇気解放</h1>
            <p>長押しで覇気を溜め、金色の間で離す。それだけです。</p>
            <input value={nickname} maxLength={12} placeholder="あだ名" onChange={(event) => { setNickname(event.target.value); nameRef.current = event.target.value; }} />
            <button type="button" onClick={submitName}>登録</button>
          </section>
        )}

        {view.phase === 'title' && (
          <section className="pressure-panel" onPointerDown={(event) => event.stopPropagation()}>
            <p className="pressure-kicker">HOLD / RELEASE</p>
            <h1>覇気解放</h1>
            <p>迫る相手を、覇気の圧だけで止める横画面ゲーム。</p>
            <p className="pressure-rule">操作は一つ。長押しして、金色で離す。</p>
            <button type="button" onClick={startGame}>開始</button>
            <button type="button" className="sub" onClick={() => { gameRef.current.phase = 'name'; setView({ ...gameRef.current }); }}>あだ名変更</button>
            {board.length > 0 && (
              <ol className="pressure-board">
                {board.slice(0, 5).map((entry, index) => <li key={`${entry.playedAt}-${index}`}><span>{index + 1}. {entry.name}</span><strong>{entry.score}</strong></li>)}
              </ol>
            )}
          </section>
        )}

        {view.phase === 'result' && (
          <section className="pressure-panel pressure-result" onPointerDown={(event) => event.stopPropagation()}>
            <p className="pressure-kicker">RESULT</p>
            <h1>{rank.name}</h1>
            <p>{rank.line}</p>
            <p className="pressure-score">{Math.round(view.score)}点 / BEST {Math.round(view.best)} / MAX {view.maxCombo} COMBO</p>
            {board.length > 0 && (
              <ol className="pressure-board">
                {board.slice(0, 5).map((entry, index) => <li className={entry.score === Math.round(view.score) && entry.name === sanitizeName(nickname) ? 'current' : ''} key={`${entry.playedAt}-${index}`}><span>{index + 1}. {entry.name}</span><strong>{entry.score}</strong></li>)}
              </ol>
            )}
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
