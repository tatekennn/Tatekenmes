'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'title' | 'playing' | 'ended';
type RankName = '見習い覇気使い' | '覇気航行士' | '武装色ドライバー' | '見聞色エース' | '覇王色パイロット';
type EntityKind = 'threat' | 'core';

type Entity = {
  id: number;
  kind: EntityKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  wobble: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

type LeaderboardEntry = {
  name: string;
  score: number;
  rank: RankName;
  cores: number;
  survived: number;
  playedAt: string;
};

type GameState = {
  phase: Phase;
  score: number;
  best: number;
  timeLeft: number;
  lives: number;
  energy: number;
  combo: number;
  maxCombo: number;
  cores: number;
  dodges: number;
  burstReadyFlash: number;
};

const GAME_SECONDS = 28;
const STORAGE_KEY = 'haki-drive-best-score';
const NAME_STORAGE_KEY = 'haki-stamp-nickname';
const LEADERBOARD_STORAGE_KEY = 'haki-drive-leaderboard';
const PLAYER_RADIUS = 22;
const BURST_COST = 100;
const BURST_RADIUS = 128;

const initialState: GameState = {
  phase: 'title',
  score: 0,
  best: 0,
  timeLeft: GAME_SECONDS,
  lives: 3,
  energy: 42,
  combo: 0,
  maxCombo: 0,
  cores: 0,
  dodges: 0,
  burstReadyFlash: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 12) || '名無しの覇気';
}

function rankFor(score: number): { name: RankName; line: string } {
  if (score >= 9000) return { name: '覇王色パイロット', line: '避けたのではありません。障害物が道を譲りました。' };
  if (score >= 6500) return { name: '見聞色エース', line: '当たる前に嫌な予感だけを撃墜しています。' };
  if (score >= 4300) return { name: '武装色ドライバー', line: '衝突判定と和解できる程度には鍛えられています。' };
  if (score >= 2200) return { name: '覇気航行士', line: 'まだ荒いですが、航路は見えています。' };
  return { name: '見習い覇気使い', line: '覇気より先にブレーキが必要です。' };
}

function readLeaderboard(): LeaderboardEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEADERBOARD_STORAGE_KEY) ?? '[]') as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => typeof entry.name === 'string' && Number.isFinite(entry.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function createSpark(x: number, y: number, color: string): Spark {
  const angle = Math.random() * Math.PI * 2;
  const speed = 80 + Math.random() * 260;
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.55 + Math.random() * 0.45, color };
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>({ ...initialState });
  const entitiesRef = useRef<Entity[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const spawnRef = useRef({ next: 0, id: 1 });
  const playerRef = useRef({ x: 0, y: 0, targetX: 0, invuln: 0, burst: 0 });
  const keysRef = useRef({ left: false, right: false });
  const uiTimeRef = useRef(0);
  const nicknameRef = useRef('');
  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  const resultSavedRef = useRef(false);
  const [view, setView] = useState<GameState>(gameRef.current);
  const [nickname, setNickname] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY) ?? '0');
    if (Number.isFinite(stored)) gameRef.current.best = stored;
    const storedName = sanitizeName(window.localStorage.getItem(NAME_STORAGE_KEY) ?? '');
    nicknameRef.current = storedName;
    setNickname(storedName);
    const storedLeaderboard = readLeaderboard();
    leaderboardRef.current = storedLeaderboard;
    setLeaderboard(storedLeaderboard);
    setView({ ...gameRef.current });
  }, []);

  const persistLeaderboard = useCallback((entries: LeaderboardEntry[]) => {
    const ranked = entries.sort((a, b) => b.score - a.score).slice(0, 10);
    leaderboardRef.current = ranked;
    window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(ranked));
    setLeaderboard(ranked);
  }, []);

  const endGame = useCallback(() => {
    const game = gameRef.current;
    if (game.phase === 'ended') return;
    game.phase = 'ended';
    game.score = Math.round(game.score + game.lives * 420 + game.energy * 8);
    if (game.score > game.best) {
      game.best = game.score;
      window.localStorage.setItem(STORAGE_KEY, String(game.score));
    }
    if (!resultSavedRef.current) {
      resultSavedRef.current = true;
      const entry: LeaderboardEntry = {
        name: sanitizeName(nicknameRef.current),
        score: Math.round(game.score),
        rank: rankFor(game.score).name,
        cores: game.cores,
        survived: GAME_SECONDS - Math.ceil(game.timeLeft),
        playedAt: new Date().toISOString(),
      };
      persistLeaderboard([...leaderboardRef.current, entry]);
    }
    setView({ ...game });
  }, [persistLeaderboard]);

  const restart = useCallback(() => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const width = rect?.width ?? 360;
    const height = rect?.height ?? 640;
    const cleanName = sanitizeName(nicknameRef.current);
    nicknameRef.current = cleanName;
    setNickname(cleanName);
    window.localStorage.setItem(NAME_STORAGE_KEY, cleanName);
    gameRef.current = { ...initialState, best: gameRef.current.best, phase: 'playing' };
    entitiesRef.current = [];
    sparksRef.current = [];
    spawnRef.current = { next: 0.15, id: 1 };
    playerRef.current = { x: width * 0.5, y: height * 0.78, targetX: width * 0.5, invuln: 1.1, burst: 0 };
    lastTimeRef.current = null;
    resultSavedRef.current = false;
    setCopied(false);
    setView({ ...gameRef.current });
  }, []);

  const setTargetFromEvent = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    playerRef.current.targetX = clamp(event.clientX - rect.left, 34, rect.width - 34);
  }, []);

  const burst = useCallback(() => {
    const game = gameRef.current;
    const player = playerRef.current;
    if (game.phase !== 'playing' || game.energy < BURST_COST) return;
    game.energy = 0;
    player.burst = 0.32;
    let destroyed = 0;
    entitiesRef.current = entitiesRef.current.filter((entity) => {
      if (entity.kind !== 'threat') return true;
      const distance = Math.hypot(entity.x - player.x, entity.y - player.y);
      if (distance > BURST_RADIUS) return true;
      destroyed += 1;
      for (let i = 0; i < 9; i += 1) sparksRef.current.push(createSpark(entity.x, entity.y, '#fff1a8'));
      return false;
    });
    if (destroyed > 0) {
      game.combo += destroyed;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
      game.score += destroyed * (360 + game.combo * 32);
      game.burstReadyFlash = 0;
    }
    setView({ ...game });
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (gameRef.current.phase !== 'playing') return;
    setTargetFromEvent(event);
    burst();
  }, [burst, setTargetFromEvent]);

  const spawnEntity = useCallback((width: number, height: number) => {
    const game = gameRef.current;
    const elapsed = GAME_SECONDS - game.timeLeft;
    const difficulty = clamp(elapsed / GAME_SECONDS, 0, 1);
    const kind: EntityKind = Math.random() < 0.22 ? 'core' : 'threat';
    const laneBias = Math.random() < 0.52 ? playerRef.current.x + (Math.random() - 0.5) * width * 0.5 : Math.random() * width;
    const size = kind === 'core' ? 14 + Math.random() * 5 : 18 + Math.random() * 16;
    entitiesRef.current.push({
      id: spawnRef.current.id++,
      kind,
      x: clamp(laneBias, 28, width - 28),
      y: -48,
      vx: (Math.random() - 0.5) * (50 + difficulty * 130),
      vy: (kind === 'core' ? 170 : 210) + difficulty * 255 + Math.random() * 90,
      size,
      spin: (Math.random() - 0.5) * 3.8,
      wobble: Math.random() * Math.PI * 2,
    });
  }, []);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const game = gameRef.current;
    const player = playerRef.current;
    const last = lastTimeRef.current ?? time;
    const dt = Math.min(0.034, (time - last) / 1000);
    lastTimeRef.current = time;

    if (!player.x || !player.y) {
      player.x = width * 0.5;
      player.y = height * 0.78;
      player.targetX = width * 0.5;
    }

    if (game.phase === 'playing') {
      const elapsed = GAME_SECONDS - game.timeLeft;
      const difficulty = clamp(elapsed / GAME_SECONDS, 0, 1);
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      game.score += dt * (42 + difficulty * 96 + game.combo * 4);
      game.energy = clamp(game.energy + dt * (11 + difficulty * 4), 0, 100);
      if (game.energy >= 100) game.burstReadyFlash = Math.min(1, game.burstReadyFlash + dt * 4);

      if (keysRef.current.left) player.targetX -= (520 + difficulty * 160) * dt;
      if (keysRef.current.right) player.targetX += (520 + difficulty * 160) * dt;
      player.targetX = clamp(player.targetX, 30, width - 30);
      player.x += (player.targetX - player.x) * Math.min(1, dt * 12);
      player.y = height * 0.78 + Math.sin(time / 230) * 5;
      player.invuln = Math.max(0, player.invuln - dt);
      player.burst = Math.max(0, player.burst - dt);

      spawnRef.current.next -= dt;
      if (spawnRef.current.next <= 0) {
        spawnEntity(width, height);
        if (difficulty > 0.34 && Math.random() < difficulty * 0.42) spawnEntity(width, height);
        spawnRef.current.next = Math.max(0.18, 0.62 - difficulty * 0.36);
      }

      entitiesRef.current.forEach((entity) => {
        entity.x += (entity.vx + Math.sin(time / 260 + entity.wobble) * 32) * dt;
        entity.y += entity.vy * dt;
        entity.spin += dt * (entity.kind === 'core' ? 3.2 : 5.4);
        if (entity.x < 18 || entity.x > width - 18) entity.vx *= -1;
      });

      entitiesRef.current = entitiesRef.current.filter((entity) => {
        if (entity.y > height + 70) {
          if (entity.kind === 'threat') {
            game.dodges += 1;
            game.score += 85 + Math.min(game.combo, 20) * 8;
          }
          return false;
        }
        const distance = Math.hypot(entity.x - player.x, entity.y - player.y);
        if (entity.kind === 'core' && distance < PLAYER_RADIUS + entity.size) {
          game.cores += 1;
          game.combo += 1;
          game.maxCombo = Math.max(game.maxCombo, game.combo);
          game.energy = clamp(game.energy + 24, 0, 100);
          game.score += 320 + game.combo * 38;
          for (let i = 0; i < 8; i += 1) sparksRef.current.push(createSpark(entity.x, entity.y, '#78ffe0'));
          return false;
        }
        if (entity.kind === 'threat' && player.invuln <= 0 && distance < PLAYER_RADIUS + entity.size * 0.72) {
          game.lives -= 1;
          game.combo = 0;
          game.score = Math.max(0, game.score - 540);
          player.invuln = 1.05;
          for (let i = 0; i < 16; i += 1) sparksRef.current.push(createSpark(player.x, player.y, '#ff3158'));
          if (game.lives <= 0) endGame();
          return false;
        }
        return true;
      });

      sparksRef.current = sparksRef.current
        .map((spark) => ({ ...spark, x: spark.x + spark.vx * dt, y: spark.y + spark.vy * dt, vy: spark.vy + 160 * dt, life: spark.life - dt }))
        .filter((spark) => spark.life > 0);

      if (game.timeLeft <= 0) endGame();
    }

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#020713');
    bg.addColorStop(0.45, '#07101f');
    bg.addColorStop(1, '#120307');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const pulse = 0.5 + Math.sin(time / 520) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#58f6ff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 11; i += 1) {
      const t = i / 10;
      const y = height * (0.17 + t * 0.76);
      const spread = t * width * 0.55;
      ctx.beginPath();
      ctx.moveTo(width * 0.5 - spread, y);
      ctx.lineTo(width * 0.5 + spread, y);
      ctx.stroke();
    }
    for (let i = -6; i <= 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.12);
      ctx.lineTo(width * 0.5 + i * width * 0.09, height * 0.96);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.28 + pulse * 0.12;
    const aura = ctx.createRadialGradient(width * 0.5, height * 0.62, 20, width * 0.5, height * 0.62, width * 0.72);
    aura.addColorStop(0, 'rgba(255,241,168,0.22)');
    aura.addColorStop(0.34, 'rgba(88,246,255,0.1)');
    aura.addColorStop(1, 'rgba(255,49,88,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    entitiesRef.current.forEach((entity) => {
      ctx.save();
      ctx.translate(entity.x, entity.y);
      ctx.rotate(entity.spin);
      if (entity.kind === 'core') {
        ctx.shadowColor = '#78ffe0';
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#78ffe0';
        ctx.beginPath();
        ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff5ca';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.shadowColor = '#ff3158';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#2b0610';
        ctx.strokeStyle = '#ff3158';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -entity.size * 1.35);
        ctx.lineTo(entity.size, 0);
        ctx.lineTo(0, entity.size * 1.35);
        ctx.lineTo(-entity.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,245,202,0.55)';
        ctx.beginPath();
        ctx.moveTo(-entity.size * 0.45, 0);
        ctx.lineTo(entity.size * 0.45, 0);
        ctx.stroke();
      }
      ctx.restore();
    });

    sparksRef.current.forEach((spark) => {
      ctx.save();
      ctx.globalAlpha = clamp(spark.life, 0, 1);
      ctx.fillStyle = spark.color;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (game.phase !== 'title') {
      ctx.save();
      ctx.translate(player.x, player.y);
      const invulnFlash = player.invuln > 0 ? Math.sin(time / 55) > 0 : false;
      ctx.globalAlpha = invulnFlash ? 0.52 : 1;
      ctx.strokeStyle = game.energy >= 100 ? '#fff1a8' : '#58f6ff';
      ctx.fillStyle = '#05070f';
      ctx.shadowColor = game.energy >= 100 ? '#fff1a8' : '#58f6ff';
      ctx.shadowBlur = 26 + game.burstReadyFlash * 24;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(24, 24);
      ctx.lineTo(0, 14);
      ctx.lineTo(-24, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_RADIUS + 8 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,241,168,0.45)';
      ctx.stroke();
      if (player.burst > 0) {
        ctx.globalAlpha = player.burst / 0.32;
        ctx.strokeStyle = '#fff1a8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, BURST_RADIUS * (1 - player.burst / 0.5), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (game.phase === 'title') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `900 ${Math.min(width, height) * 0.2}px ui-serif, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#58f6ff';
      ctx.shadowBlur = 34;
      ctx.fillStyle = 'rgba(255,245,202,0.13)';
      ctx.fillText('覇', width * 0.5, height * 0.38);
      ctx.restore();
    }

    if (time - uiTimeRef.current > 80 || game.phase !== view.phase) {
      uiTimeRef.current = time;
      setView({ ...game });
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [endGame, spawnEntity, view.phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
      const height = Math.max(540, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      playerRef.current.targetX = playerRef.current.targetX || width * 0.5;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a') keysRef.current.left = true;
      if (event.key === 'ArrowRight' || event.key === 'd') keysRef.current.right = true;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        burst();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a') keysRef.current.left = false;
      if (event.key === 'ArrowRight' || event.key === 'd') keysRef.current.right = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [burst, draw]);

  const rank = useMemo(() => rankFor(view.score), [view.score]);
  const shareText = useMemo(
    () => `${sanitizeName(nickname)}は覇気ドライブで${Math.round(view.score)}点「${rank.name}」。${rank.line}\nコア${view.cores}個 / 最大${view.maxCombo}コンボ #覇気チャレンジ https://game.xn--7qwx14d.com`,
    [nickname, rank.line, rank.name, view.cores, view.maxCombo, view.score],
  );

  const share = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '覇気ドライブ', text: shareText, url: 'https://game.xn--7qwx14d.com' });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
      }
    } catch {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    }
  }, [shareText]);

  return (
    <main
      className="game-shell game-shell--drive"
      aria-label="覇気ドライブ"
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (gameRef.current.phase === 'playing') setTargetFromEvent(event);
      }}
    >
      <canvas ref={canvasRef} className="game-canvas game-canvas--drive" aria-hidden="true" />

      <section className="arcade-hud drive-hud" aria-live="polite">
        <div><span>SCORE</span><strong>{Math.round(view.score)}</strong></div>
        <div><span>TIME</span><strong>{Math.ceil(view.timeLeft)}</strong></div>
        <div><span>LIFE</span><strong>{'◆'.repeat(view.lives) || '×'}</strong></div>
      </section>

      <section className={`arcade-panel drive-panel ${view.phase === 'playing' ? 'arcade-panel--compact' : ''}`}>
        {view.phase !== 'playing' && (
          <>
            <p className="game-kicker">game.覇気.com</p>
            <h1>覇気ドライブ</h1>
            <p className="game-copy">
              左右に避けて青い覇気核を回収。金色ゲージが満タンならタップで覇王バースト。赤い障害物は後半ほど増えます。
            </p>
          </>
        )}

        {view.phase === 'title' && (
          <form className="result-card arcade-card player-card" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); restart(); }} onPointerDown={(event) => event.stopPropagation()}>
            <label className="nickname-label" htmlFor="nickname">最初にあだ名を登録</label>
            <input
              id="nickname"
              className="nickname-input"
              value={nickname}
              maxLength={12}
              placeholder="例：たてけん"
              onChange={(event) => {
                setNickname(event.target.value);
                nicknameRef.current = event.target.value;
              }}
            />
            <p className="result-rank">避けて、集めて、撃ち落とせ。</p>
            <p>ドラッグで移動 / Spaceでもバースト。28秒生き残ればボーナス。前作より少し容赦がありません。</p>
            <button type="submit" className="primary-action">出撃する</button>
            {leaderboard.length > 0 && (
              <div className="leaderboard" aria-label="ローカルランキング">
                <p className="leaderboard-title">LOCAL RANKING</p>
                <ol>
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <li key={`${entry.playedAt}-${index}`}>
                      <span>{index + 1}. {entry.name}</span>
                      <strong>{entry.score}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </form>
        )}

        {view.phase === 'playing' && (
          <div className="arcade-controls drive-controls">
            <div className="charge-card arcade-charge">
              <div className="charge-meta"><span>BURST</span><strong>{view.energy >= 100 ? 'READY' : `${Math.round(view.energy)}%`}</strong></div>
              <div className="charge-track"><span className="charge-fill drive-energy" style={{ width: `${clamp(view.energy, 0, 100)}%` }} /></div>
              <p className="control-hint">ドラッグで移動。満タン時にタップで周囲を一掃。</p>
            </div>
            <button type="button" className="haki-button release-button" onClick={(event) => { event.stopPropagation(); burst(); }}>覇王バースト</button>
          </div>
        )}

        {view.phase === 'ended' && (
          <div className="result-card arcade-card">
            <p className="result-rank">{rank.name}</p>
            <p>{rank.line}</p>
            <p className="best-score">{sanitizeName(nickname)} / SCORE {Math.round(view.score)} / BEST {Math.round(view.best)} / CORE {view.cores} / MAX {view.maxCombo} COMBO</p>
            {leaderboard.length > 0 && (
              <div className="leaderboard leaderboard--result" aria-label="ローカルランキング">
                <p className="leaderboard-title">LOCAL RANKING</p>
                <ol>
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <li className={entry.score === Math.round(view.score) && entry.name === sanitizeName(nickname) ? 'is-current' : ''} key={`${entry.playedAt}-${index}`}>
                      <span>{index + 1}. {entry.name}</span>
                      <strong>{entry.score}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="game-actions">
              <button type="button" className="primary-action" onClick={(event) => { event.stopPropagation(); restart(); }}>再出撃</button>
              <button type="button" className="ghost-action" onClick={(event) => { event.stopPropagation(); share(); }}>{copied ? 'コピー済み' : '結果をシェア'}</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
