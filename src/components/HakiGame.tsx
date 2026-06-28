'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'title' | 'playing' | 'ended';
type RankName = '無覇気' | '3D酔いの覇気' | '路地裏立体覇気' | '空間を歪める覇気' | '覇王色3D';

type WorldPoint = { x: number; y: number; z: number };
type Enemy = WorldPoint & { id: number; size: number; glyph: string; spin: number; hue: number };
type Orb = WorldPoint & { id: number; glyph: string; pulse: number };
type Particle = WorldPoint & { vx: number; vy: number; vz: number; life: number; maxLife: number; size: number; color: string; glyph?: string };

type GameState = {
  phase: Phase;
  score: number;
  best: number;
  hp: number;
  timeLeft: number;
  combo: number;
  charge: number;
  player: { x: number; z: number; tx: number; tz: number; r: number };
};

const GAME_SECONDS = 45;
const STORAGE_KEY = 'haki-3d-best-score';
const WORLD = { halfWidth: 430, near: 80, far: 1450 };
const ENEMY_GLYPHS = ['圧', '眠', '虚', '焦', '雑', '沼'];
const ORB_GLYPHS = ['覇', '気', '喝', '魂'];

const initialState: GameState = {
  phase: 'title',
  score: 0,
  best: 0,
  hp: 100,
  timeLeft: GAME_SECONDS,
  combo: 0,
  charge: 0,
  player: { x: 0, z: 260, tx: 0, tz: 260, r: 44 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceXZ(a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function rankFor(score: number): { name: RankName; line: string } {
  if (score >= 3000) return { name: '覇王色3D', line: '奥行きまで従わせました。ブラウザが少し緊張しています。' };
  if (score >= 2100) return { name: '空間を歪める覇気', line: '遠近法があなた側に寝返りました。' };
  if (score >= 1200) return { name: '路地裏立体覇気', line: '雑念を立体的に黙らせています。' };
  if (score >= 450) return { name: '3D酔いの覇気', line: '強いですが、三半規管に少し嫌われています。' };
  return { name: '無覇気', line: 'まだ2D平面に帰る余地があります。' };
}

function burst(x: number, y: number, z: number, count: number, color: string, glyph?: string): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.72;
    const speed = 8 + Math.random() * 22;
    return {
      x,
      y,
      z,
      vx: Math.cos(angle) * speed,
      vy: 6 + Math.random() * 26,
      vz: Math.sin(angle) * speed,
      life: 0,
      maxLife: 26 + Math.random() * 32,
      size: 3 + Math.random() * 10,
      color,
      glyph: glyph && Math.random() > 0.72 ? glyph : undefined,
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

  const project = useCallback((point: WorldPoint, width: number, height: number) => {
    const scale = 760 / (point.z + 310);
    return {
      x: width / 2 + point.x * scale,
      y: height * 0.73 - point.y * scale - point.z * scale * 0.34,
      scale,
    };
  }, []);

  const spawnEnemy = useCallback(() => {
    const id = spawnRef.current.id++;
    enemiesRef.current.push({
      id,
      x: (Math.random() - 0.5) * WORLD.halfWidth * 1.86,
      y: 18,
      z: WORLD.far + Math.random() * 280,
      size: 36 + Math.random() * 26,
      glyph: ENEMY_GLYPHS[id % ENEMY_GLYPHS.length],
      spin: Math.random() * Math.PI * 2,
      hue: id % 2 ? 353 : 18,
    });
  }, []);

  const spawnOrb = useCallback(() => {
    const id = spawnRef.current.id++;
    orbsRef.current.push({
      id,
      x: (Math.random() - 0.5) * WORLD.halfWidth * 1.72,
      y: 62 + Math.random() * 70,
      z: 520 + Math.random() * 860,
      glyph: ORB_GLYPHS[id % ORB_GLYPHS.length],
      pulse: Math.random() * Math.PI * 2,
    });
  }, []);

  const restart = useCallback(() => {
    const best = gameRef.current.best;
    gameRef.current = { ...initialState, best, phase: 'playing', player: { ...initialState.player } };
    enemiesRef.current = [];
    orbsRef.current = [];
    particlesRef.current = burst(0, 40, 260, 70, '#d7a92e', '覇');
    spawnRef.current = { enemy: 0, orb: 0, id: 1 };
    lastTimeRef.current = null;
    setCopied(false);
    setView({ ...gameRef.current, player: { ...gameRef.current.player } });
  }, []);

  const releaseHaki = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'playing' || game.charge < 30) return;
    const radius = 130 + game.charge * 4.2;
    let hit = 0;

    enemiesRef.current = enemiesRef.current.filter((enemy) => {
      if (distanceXZ(game.player, enemy) < radius + enemy.size) {
        hit += 1;
        particlesRef.current.push(...burst(enemy.x, enemy.y, enemy.z, 26, '#fff1a8', enemy.glyph));
        return false;
      }
      return true;
    });

    if (hit > 0) {
      game.combo += hit;
      game.score += hit * 120 + game.combo * 22 + Math.round(game.charge * 2.5);
      particlesRef.current.push(...burst(game.player.x, 36, game.player.z, 96 + hit * 10, '#d7a92e', '喝'));
    } else {
      game.combo = 0;
      particlesRef.current.push(...burst(game.player.x, 36, game.player.z, 30, '#b31928'));
    }

    game.charge = 0;
    setView({ ...game, player: { ...game.player } });
  }, []);

  const setTargetFromPointer = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    gameRef.current.player.tx = clamp((nx - 0.5) * WORLD.halfWidth * 2.1, -WORLD.halfWidth, WORLD.halfWidth);
    gameRef.current.player.tz = clamp(170 + (1 - ny) * 360, 130, 540);
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#08030a');
    sky.addColorStop(0.46, '#18070b');
    sky.addColorStop(1, '#030304');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const horizon = height * 0.44 + Math.sin(time / 1200) * 8;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 241, 168, 0.16)';
    ctx.lineWidth = 1;
    for (let x = -WORLD.halfWidth; x <= WORLD.halfWidth; x += 70) {
      const near = project({ x, y: 0, z: WORLD.near }, width, height);
      const far = project({ x, y: 0, z: WORLD.far }, width, height);
      ctx.beginPath();
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }
    for (let z = 120; z <= WORLD.far; z += 95) {
      const left = project({ x: -WORLD.halfWidth, y: 0, z }, width, height);
      const right = project({ x: WORLD.halfWidth, y: 0, z }, width, height);
      ctx.globalAlpha = clamp(1 - z / 1800, 0.14, 0.7);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    const portal = ctx.createRadialGradient(width / 2, horizon, 10, width / 2, horizon, Math.min(width, height) * 0.34);
    portal.addColorStop(0, 'rgba(255, 241, 168, 0.34)');
    portal.addColorStop(0.35, 'rgba(179, 25, 40, 0.2)');
    portal.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = portal;
    ctx.beginPath();
    ctx.arc(width / 2, horizon, Math.min(width, height) * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [project]);

  const drawTextObject = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, point: WorldPoint, glyph: string, size: number, color: string, shadow: string, angle = 0) => {
    const p = project(point, width, height);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale * 1.12);
    ctx.rotate(angle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px serif`;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = size * 0.48;
    ctx.fillStyle = color;
    ctx.fillText(glyph, 0, 0);
    ctx.restore();
  }, [project]);

  const tick = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const game = gameRef.current;
    const last = lastTimeRef.current ?? time;
    const dt = Math.min(0.034, (time - last) / 1000);
    lastTimeRef.current = time;

    if (game.phase === 'playing') {
      const elapsed = GAME_SECONDS - game.timeLeft;
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      game.charge = clamp(game.charge + dt * (17 + game.combo * 0.75), 0, 100);
      game.player.x += (game.player.tx - game.player.x) * Math.min(1, dt * 7.5);
      game.player.z += (game.player.tz - game.player.z) * Math.min(1, dt * 7.5);

      spawnRef.current.enemy -= dt;
      spawnRef.current.orb -= dt;
      if (spawnRef.current.enemy <= 0) {
        const count = Math.min(4, 1 + Math.floor(elapsed / 12));
        for (let i = 0; i < count; i += 1) spawnEnemy();
        spawnRef.current.enemy = Math.max(0.42, 1.15 - elapsed * 0.018);
      }
      if (spawnRef.current.orb <= 0) {
        spawnOrb();
        spawnRef.current.orb = 2.1 + Math.random() * 2.1;
      }

      enemiesRef.current.forEach((enemy) => {
        const wobble = Math.sin(time / 360 + enemy.spin) * 28;
        const targetX = game.player.x + wobble;
        enemy.x += (targetX - enemy.x) * dt * 0.85;
        enemy.z -= (190 + elapsed * 7.5) * dt;
        enemy.spin += dt * 2.6;
      });

      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        if (distanceXZ(game.player, enemy) < game.player.r + enemy.size * 0.82) {
          game.hp = clamp(game.hp - 15, 0, 100);
          game.combo = 0;
          particlesRef.current.push(...burst(enemy.x, enemy.y, enemy.z, 22, '#ff2f55', enemy.glyph));
          return false;
        }
        return enemy.z > 30;
      });

      orbsRef.current.forEach((orb) => {
        orb.z -= 120 * dt;
        orb.y = 86 + Math.sin(time / 300 + orb.pulse) * 22;
      });
      orbsRef.current = orbsRef.current.filter((orb) => {
        if (distanceXZ(game.player, orb) < game.player.r + 34) {
          game.score += 85 + game.combo * 10;
          game.combo += 1;
          game.charge = clamp(game.charge + 18, 0, 100);
          particlesRef.current.push(...burst(orb.x, orb.y, orb.z, 24, '#fff1a8', orb.glyph));
          return false;
        }
        return orb.z > 40;
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
      p.x += p.vx * dt * 4.8;
      p.y += p.vy * dt * 7.4;
      p.z += p.vz * dt * 4.8;
      p.vx *= 0.96;
      p.vy = p.vy * 0.95 - 0.8;
      p.vz *= 0.96;
    });

    drawBackground(ctx, width, height, time);

    const renderables = [
      ...orbsRef.current.map((orb) => ({ kind: 'orb' as const, z: orb.z, item: orb })),
      ...enemiesRef.current.map((enemy) => ({ kind: 'enemy' as const, z: enemy.z, item: enemy })),
      ...particlesRef.current.map((particle) => ({ kind: 'particle' as const, z: particle.z, item: particle })),
      { kind: 'player' as const, z: game.player.z, item: game.player },
    ].sort((a, b) => b.z - a.z);

    renderables.forEach((entry) => {
      if (entry.kind === 'orb') {
        const orb = entry.item;
        drawTextObject(ctx, width, height, orb, orb.glyph, 76, '#fff1a8', '#fff1a8', Math.sin(time / 420 + orb.pulse) * 0.25);
      } else if (entry.kind === 'enemy') {
        const enemy = entry.item;
        const p = project(enemy, width, height);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale * 1.14);
        ctx.rotate(Math.sin(enemy.spin) * 0.24);
        ctx.fillStyle = `hsla(${enemy.hue}, 82%, 38%, 0.36)`;
        ctx.strokeStyle = `hsla(${enemy.hue}, 100%, 66%, 0.9)`;
        ctx.lineWidth = 5;
        ctx.shadowColor = `hsla(${enemy.hue}, 100%, 58%, 0.9)`;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.moveTo(0, -enemy.size * 1.2);
        ctx.lineTo(enemy.size, -enemy.size * 0.2);
        ctx.lineTo(enemy.size * 0.5, enemy.size * 1.05);
        ctx.lineTo(-enemy.size * 0.8, enemy.size * 0.76);
        ctx.lineTo(-enemy.size * 1.06, -enemy.size * 0.32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffe9dc';
        ctx.font = `900 ${enemy.size * 1.3}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.glyph, 0, 2);
        ctx.restore();
      } else if (entry.kind === 'particle') {
        const particle = entry.item;
        const p = project(particle, width, height);
        const alpha = 1 - particle.life / particle.maxLife;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particle.size * 3;
        ctx.fillStyle = particle.color;
        if (particle.glyph) {
          ctx.font = `900 ${particle.size * 5}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(particle.glyph, 0, 0);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        const p = project({ x: game.player.x, y: 48, z: game.player.z }, width, height);
        const aura = 92 + game.charge * 2.4;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale * 1.12);
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, aura);
        glow.addColorStop(0, 'rgba(255,245,202,0.78)');
        glow.addColorStop(0.35, 'rgba(215,169,46,0.26)');
        glow.addColorStop(1, 'rgba(179,25,40,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, aura, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '900 112px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#fff1a8';
        ctx.shadowBlur = 42;
        ctx.fillStyle = '#fff5ca';
        ctx.fillText('覇', 0, 0);
        ctx.restore();
      }
    });

    if (game.phase === 'title') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (time - uiTimeRef.current > 90 || game.phase !== view.phase) {
      uiTimeRef.current = time;
      setView({ ...game, player: { ...game.player } });
    }

    frameRef.current = requestAnimationFrame(tick);
  }, [drawBackground, drawTextObject, project, releaseHaki, spawnEnemy, spawnOrb, view.phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
      const height = Math.max(520, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext('2d');
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    () => `覇気ドーム3D ${view.score}点「${rank.name}」。${rank.line}\n奥行きごと雑念を黙らせた。 #覇気チャレンジ https://game.xn--7qwx14d.com`,
    [rank.line, rank.name, view.score],
  );

  const share = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '覇気ドーム3D', text: shareText, url: 'https://game.xn--7qwx14d.com' });
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
      className="game-shell game-shell--arena3d"
      aria-label="覇気ドーム3D"
      onPointerDown={(event) => setTargetFromPointer(event.clientX, event.clientY)}
      onPointerMove={(event) => {
        if (event.buttons > 0 || event.pointerType === 'touch') setTargetFromPointer(event.clientX, event.clientY);
      }}
    >
      <canvas ref={canvasRef} className="game-canvas game-canvas--arena3d" aria-hidden="true" />

      <section className="arcade-hud" aria-live="polite">
        <div><span>SCORE</span><strong>{Math.round(view.score)}</strong></div>
        <div><span>TIME</span><strong>{Math.ceil(view.timeLeft)}</strong></div>
        <div><span>HP</span><strong>{Math.round(view.hp)}</strong></div>
      </section>

      <section className={`arcade-panel ${view.phase === 'playing' ? 'arcade-panel--compact' : ''}`}>
        {view.phase !== 'playing' && (
          <>
            <p className="game-kicker">game.覇気.com</p>
            <h1>覇気ドーム3D</h1>
            <p className="game-copy">
              奥から迫る雑念をかわし、浮遊する「気」を拾い、溜めた覇気で空間ごと吹き飛ばす。45秒の立体サバイバル。
            </p>
          </>
        )}

        {view.phase === 'title' && (
          <div className="result-card arcade-card">
            <p className="result-rank">奥行き、襲来。</p>
            <p>ドラッグで左右・奥行き移動 / ゲージが溜まったら覇気解放。遠近感に負けたら終了です。</p>
            <button type="button" className="primary-action" onClick={restart}>3Dで開始</button>
          </div>
        )}

        {view.phase === 'playing' && (
          <div className="arcade-controls">
            <div className="charge-card arcade-charge">
              <div className="charge-meta"><span>3D HAKI</span><strong>{Math.round(view.charge)}%</strong></div>
              <div className="charge-track"><span className="charge-fill" style={{ width: `${view.charge}%` }} /></div>
            </div>
            <button type="button" className="haki-button release-button" onClick={releaseHaki}>空間覇気</button>
          </div>
        )}

        {view.phase === 'ended' && (
          <div className="result-card arcade-card">
            <p className="result-rank">{rank.name}</p>
            <p>{rank.line}</p>
            <p className="best-score">SCORE {Math.round(view.score)} / BEST {Math.round(view.best)}</p>
            <div className="game-actions">
              <button type="button" className="primary-action" onClick={restart}>もう一度3D</button>
              <button type="button" className="ghost-action" onClick={share}>{copied ? 'コピー済み' : '結果をシェア'}</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
