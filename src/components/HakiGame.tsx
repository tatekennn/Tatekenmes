'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'title' | 'playing' | 'ended';
type RankName = '無覇気' | '路地裏の覇気' | '会議室の覇気' | '街を割る覇気' | '覇王色';

type Enemy = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hp: number;
  glyph: string;
  hue: number;
  wobble: number;
};

type Orb = {
  id: number;
  x: number;
  y: number;
  glyph: string;
  size: number;
  pulse: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  glyph?: string;
};

type GameState = {
  phase: Phase;
  score: number;
  best: number;
  hp: number;
  timeLeft: number;
  combo: number;
  charge: number;
  player: { x: number; y: number; tx: number; ty: number; r: number };
};

const GAME_SECONDS = 45;
const STORAGE_KEY = 'haki-dojo-best-score';
const FIELD = { width: 960, height: 1280 };
const ENEMY_GLYPHS = ['圧', '眠', '締', '虚', '雑', '焦'];
const ORB_GLYPHS = ['覇', '気', '喝', '魂'];

const initialState: GameState = {
  phase: 'title',
  score: 0,
  best: 0,
  hp: 100,
  timeLeft: GAME_SECONDS,
  combo: 0,
  charge: 0,
  player: { x: FIELD.width / 2, y: FIELD.height * 0.72, tx: FIELD.width / 2, ty: FIELD.height * 0.72, r: 34 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function rankFor(score: number): { name: RankName; line: string } {
  if (score >= 2400) return { name: '覇王色', line: '画面外の敵まで気まずくなった。' };
  if (score >= 1600) return { name: '街を割る覇気', line: '駅前の鳩が一斉に敬語になった。' };
  if (score >= 900) return { name: '会議室の覇気', line: '議事録が自分からまとまり始めた。' };
  if (score >= 350) return { name: '路地裏の覇気', line: '自動ドアには完全勝利。' };
  return { name: '無覇気', line: '今日は水を飲んで寝るのが最強。' };
}

function randomEdgePoint() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * FIELD.width, y: -70 };
  if (side === 1) return { x: FIELD.width + 70, y: Math.random() * FIELD.height };
  if (side === 2) return { x: Math.random() * FIELD.width, y: FIELD.height + 70 };
  return { x: -70, y: Math.random() * FIELD.height };
}

function burst(x: number, y: number, count: number, color: string, glyph?: string): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.6;
    const speed = 2.2 + Math.random() * 10;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 26 + Math.random() * 34,
      size: 2 + Math.random() * 10,
      color,
      glyph: glyph && Math.random() > 0.76 ? glyph : undefined,
    };
  });
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>({ ...initialState, player: { ...initialState.player } });
  const enemiesRef = useRef<Enemy[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const uiTimeRef = useRef(0);
  const spawnRef = useRef({ enemy: 0, orb: 0, id: 1 });
  const [view, setView] = useState<GameState>(gameRef.current);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY) ?? '0');
    if (Number.isFinite(stored)) {
      gameRef.current.best = stored;
      setView({ ...gameRef.current, player: { ...gameRef.current.player } });
    }
  }, []);

  const spawnEnemy = useCallback(() => {
    const point = randomEdgePoint();
    const id = spawnRef.current.id++;
    const wave = Math.floor((GAME_SECONDS - gameRef.current.timeLeft) / 8);
    enemiesRef.current.push({
      id,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      size: 26 + Math.random() * 16 + wave * 1.5,
      hp: 1 + Math.floor(wave / 2),
      glyph: ENEMY_GLYPHS[id % ENEMY_GLYPHS.length],
      hue: id % 2 ? 353 : 17,
      wobble: Math.random() * Math.PI * 2,
    });
  }, []);

  const spawnOrb = useCallback(() => {
    const id = spawnRef.current.id++;
    orbsRef.current.push({
      id,
      x: 80 + Math.random() * (FIELD.width - 160),
      y: 160 + Math.random() * (FIELD.height - 300),
      glyph: ORB_GLYPHS[id % ORB_GLYPHS.length],
      size: 24 + Math.random() * 10,
      pulse: Math.random() * Math.PI * 2,
    });
  }, []);

  const restart = useCallback(() => {
    const best = gameRef.current.best;
    gameRef.current = {
      ...initialState,
      best,
      phase: 'playing',
      player: { ...initialState.player },
    };
    enemiesRef.current = [];
    orbsRef.current = [];
    particlesRef.current = burst(FIELD.width / 2, FIELD.height * 0.72, 56, '#d7a92e', '覇');
    spawnRef.current = { enemy: 0, orb: 0, id: 1 };
    lastTimeRef.current = null;
    setCopied(false);
    setView({ ...gameRef.current, player: { ...gameRef.current.player } });
  }, []);

  const releaseHaki = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'playing' || game.charge < 28) return;

    const radius = 92 + game.charge * 3.7;
    let hit = 0;
    enemiesRef.current = enemiesRef.current.filter((enemy) => {
      const d = distance(game.player, enemy);
      if (d < radius + enemy.size) {
        hit += 1;
        particlesRef.current.push(...burst(enemy.x, enemy.y, 22, '#fff1a8', enemy.glyph));
        return false;
      }
      return true;
    });

    if (hit > 0) {
      game.combo += hit;
      game.score += hit * 90 + game.combo * 18 + Math.round(game.charge * 2.2);
      particlesRef.current.push(...burst(game.player.x, game.player.y, 70 + hit * 8, '#d7a92e', '喝'));
    } else {
      game.combo = 0;
      particlesRef.current.push(...burst(game.player.x, game.player.y, 24, '#b31928'));
    }

    game.charge = 0;
    setView({ ...game, player: { ...game.player } });
  }, []);

  const setTargetFromPointer = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((clientY - rect.top) / rect.height) * FIELD.height;
    gameRef.current.player.tx = clamp(x, 36, FIELD.width - 36);
    gameRef.current.player.ty = clamp(y, 96, FIELD.height - 48);
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const gradient = ctx.createRadialGradient(FIELD.width / 2, FIELD.height * 0.48, 40, FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.72);
    gradient.addColorStop(0, 'rgba(118, 30, 18, 0.84)');
    gradient.addColorStop(0.42, 'rgba(28, 7, 9, 0.96)');
    gradient.addColorStop(1, 'rgba(3, 3, 5, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#f7f1df';
    ctx.lineWidth = 1;
    for (let x = -80; x < FIELD.width + 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(t / 1100 + x) * 8, 0);
      ctx.lineTo(x - 120, FIELD.height);
      ctx.stroke();
    }
    for (let y = 80; y < FIELD.height; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.cos(t / 900 + y) * 5);
      ctx.lineTo(FIELD.width, y - 26);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(FIELD.width / 2, FIELD.height / 2);
    ctx.rotate(t / 10000);
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 90 + i * 58, 36 + i * 24, i * 0.31, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 ? 'rgba(215,169,46,0.09)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const tick = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const game = gameRef.current;
    const last = lastTimeRef.current ?? time;
    const dt = Math.min(0.034, (time - last) / 1000);
    lastTimeRef.current = time;

    if (game.phase === 'playing') {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      game.charge = clamp(game.charge + dt * (18 + game.combo * 0.9), 0, 100);
      game.player.x += (game.player.tx - game.player.x) * Math.min(1, dt * 8.5);
      game.player.y += (game.player.ty - game.player.y) * Math.min(1, dt * 8.5);

      spawnRef.current.enemy -= dt;
      spawnRef.current.orb -= dt;
      if (spawnRef.current.enemy <= 0) {
        const enemyCount = Math.min(3, 1 + Math.floor((GAME_SECONDS - game.timeLeft) / 13));
        for (let i = 0; i < enemyCount; i += 1) {
          spawnEnemy();
        }
        spawnRef.current.enemy = Math.max(0.46, 1.25 - (GAME_SECONDS - game.timeLeft) * 0.018);
      }
      if (spawnRef.current.orb <= 0) {
        spawnOrb();
        spawnRef.current.orb = 2.6 + Math.random() * 2.2;
      }

      enemiesRef.current.forEach((enemy) => {
        const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x) + Math.sin(time / 420 + enemy.wobble) * 0.42;
        const speed = (78 + (GAME_SECONDS - game.timeLeft) * 2.4) * dt;
        enemy.vx = Math.cos(angle) * speed;
        enemy.vy = Math.sin(angle) * speed;
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
      });

      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        if (distance(game.player, enemy) < game.player.r + enemy.size * 0.58) {
          game.hp = clamp(game.hp - 13, 0, 100);
          game.combo = 0;
          particlesRef.current.push(...burst(enemy.x, enemy.y, 18, '#ff2f55', enemy.glyph));
          return false;
        }
        return true;
      });

      orbsRef.current = orbsRef.current.filter((orb) => {
        if (distance(game.player, orb) < game.player.r + orb.size) {
          game.score += 70 + game.combo * 8;
          game.charge = clamp(game.charge + 22, 0, 100);
          game.combo += 1;
          particlesRef.current.push(...burst(orb.x, orb.y, 20, '#fff1a8', orb.glyph));
          return false;
        }
        return true;
      });

      if (game.charge >= 100) releaseHaki();
      if (game.timeLeft <= 0 || game.hp <= 0) {
        game.phase = 'ended';
        if (game.score > game.best) {
          game.best = game.score;
          window.localStorage.setItem(STORAGE_KEY, String(game.score));
        }
      }
    }

    particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
    particlesRef.current.forEach((p) => {
      p.life += 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.965;
      p.vy *= 0.965;
    });

    drawBackground(ctx, time);

    ctx.save();
    orbsRef.current.forEach((orb) => {
      const pulse = 1 + Math.sin(time / 240 + orb.pulse) * 0.14;
      ctx.font = `900 ${orb.size * pulse * 2.2}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#fff1a8';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#fff1a8';
      ctx.fillText(orb.glyph, orb.x, orb.y);
    });
    ctx.restore();

    enemiesRef.current.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(time / 360 + enemy.wobble) * 0.2);
      ctx.fillStyle = `hsla(${enemy.hue}, 78%, 44%, 0.2)`;
      ctx.strokeStyle = `hsla(${enemy.hue}, 92%, 62%, 0.9)`;
      ctx.lineWidth = 3;
      ctx.shadowColor = `hsla(${enemy.hue}, 92%, 50%, 0.9)`;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.size);
      ctx.lineTo(enemy.size * 0.9, -enemy.size * 0.1);
      ctx.lineTo(enemy.size * 0.36, enemy.size * 0.95);
      ctx.lineTo(-enemy.size * 0.68, enemy.size * 0.72);
      ctx.lineTo(-enemy.size, -enemy.size * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.font = `900 ${enemy.size * 1.25}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffe6dc';
      ctx.fillText(enemy.glyph, 0, 2);
      ctx.restore();
    });

    particlesRef.current.forEach((particle) => {
      const alpha = 1 - particle.life / particle.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 3;
      ctx.fillStyle = particle.color;
      if (particle.glyph) {
        ctx.font = `900 ${particle.size * 4.2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.glyph, particle.x, particle.y);
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    const aura = 54 + game.charge * 1.65 + Math.sin(time / 180) * 6;
    ctx.save();
    ctx.translate(game.player.x, game.player.y);
    ctx.globalCompositeOperation = 'lighter';
    const auraGradient = ctx.createRadialGradient(0, 0, 8, 0, 0, aura);
    auraGradient.addColorStop(0, 'rgba(255,245,202,0.72)');
    auraGradient.addColorStop(0.38, 'rgba(215,169,46,0.22)');
    auraGradient.addColorStop(1, 'rgba(179,25,40,0)');
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(0, 0, aura, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '900 72px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#fff1a8';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fff5ca';
    ctx.fillText('覇', 0, 4);
    ctx.restore();

    if (game.phase === 'title') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.restore();
    }

    if (time - uiTimeRef.current > 90 || game.phase !== view.phase) {
      uiTimeRef.current = time;
      setView({ ...game, player: { ...game.player } });
    }

    frameRef.current = requestAnimationFrame(tick);
  }, [drawBackground, releaseHaki, spawnEnemy, spawnOrb, view.phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
      const height = Math.max(520, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext('2d');
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);
      context?.scale(width / FIELD.width, height / FIELD.height);
    };

    resize();
    window.addEventListener('resize', resize);
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [tick]);

  const rank = useMemo(() => rankFor(view.score), [view.score]);
  const shareText = useMemo(
    () => `覇気ラン ${view.score}点「${rank.name}」。${rank.line}\n雑念を${view.combo}連で黙らせた。 #覇気チャレンジ https://game.xn--7qwx14d.com`,
    [rank.line, rank.name, view.combo, view.score],
  );

  const share = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '覇気ラン', text: shareText, url: 'https://game.xn--7qwx14d.com' });
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
      className="game-shell game-shell--arcade"
      aria-label="覇気ラン"
      onPointerDown={(event) => setTargetFromPointer(event.clientX, event.clientY)}
      onPointerMove={(event) => {
        if (event.buttons > 0 || event.pointerType === 'touch') setTargetFromPointer(event.clientX, event.clientY);
      }}
    >
      <canvas ref={canvasRef} className="game-canvas game-canvas--arcade" aria-hidden="true" />

      <section className="arcade-hud" aria-live="polite">
        <div><span>SCORE</span><strong>{Math.round(view.score)}</strong></div>
        <div><span>TIME</span><strong>{Math.ceil(view.timeLeft)}</strong></div>
        <div><span>HP</span><strong>{Math.round(view.hp)}</strong></div>
      </section>

      <section className={`arcade-panel ${view.phase === 'playing' ? 'arcade-panel--compact' : ''}`}>
        {view.phase !== 'playing' && (
          <>
            <p className="game-kicker">game.覇気.com</p>
            <h1>覇気ラン</h1>
            <p className="game-copy">
              指で「覇」を動かし、湧いてくる雑念をかわす。覇気ゲージが溜まったら一撃解放。45秒、生き残れ。
            </p>
          </>
        )}

        {view.phase === 'title' && (
          <div className="result-card arcade-card">
            <p className="result-rank">雑念、襲来。</p>
            <p>ドラッグで移動 / ボタンで覇気解放。敵に触れるとHP減少、光る文字を拾うと加点。</p>
            <button type="button" className="primary-action" onClick={restart}>開始する</button>
          </div>
        )}

        {view.phase === 'playing' && (
          <div className="arcade-controls">
            <div className="charge-card arcade-charge">
              <div className="charge-meta"><span>HAKI</span><strong>{Math.round(view.charge)}%</strong></div>
              <div className="charge-track"><span className="charge-fill" style={{ width: `${view.charge}%` }} /></div>
            </div>
            <button type="button" className="haki-button release-button" onClick={releaseHaki}>覇気解放</button>
          </div>
        )}

        {view.phase === 'ended' && (
          <div className="result-card arcade-card">
            <p className="result-rank">{rank.name}</p>
            <p>{rank.line}</p>
            <p className="best-score">SCORE {Math.round(view.score)} / BEST {Math.round(view.best)}</p>
            <div className="game-actions">
              <button type="button" className="primary-action" onClick={restart}>もう一走</button>
              <button type="button" className="ghost-action" onClick={share}>{copied ? 'コピー済み' : '結果をシェア'}</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
