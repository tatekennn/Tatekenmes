'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'title' | 'playing' | 'ended';
type RankName = '無言の圧' | '町内会の覇気' | '社内チャットの覇気' | '取締役会の覇気' | '覇王色スタンプ';

type LeaderboardEntry = {
  name: string;
  score: number;
  rank: RankName;
  perfect: number;
  maxCombo: number;
  playedAt: string;
};

type Nuisance = {
  id: number;
  text: string;
  x: number;
  y: number;
  vx: number;
  size: number;
  hit: boolean;
  wobble: number;
};

type Stamp = {
  x: number;
  y: number;
  life: number;
  text: string;
  perfect: boolean;
};

type GameState = {
  phase: Phase;
  score: number;
  best: number;
  combo: number;
  maxCombo: number;
  timeLeft: number;
  judged: number;
  perfect: number;
  misses: number;
};

const GAME_SECONDS = 15;
const STORAGE_KEY = 'haki-stamp-best-score';
const NAME_STORAGE_KEY = 'haki-stamp-nickname';
const LEADERBOARD_STORAGE_KEY = 'haki-stamp-leaderboard';
const TARGET_X = 0.5;
const ZONE_WIDTH = 0.18;
const PERFECT_WIDTH = 0.07;
const PHRASES = [
  '月曜', '既読圧', 'なるはや', '仕様変更', '眠気', '通知99+', '謎MTG', '締切', '冷めた飯', '雨の通勤',
  '再提出', '空気読み', '微妙なDM', '寝不足', '請求書', '終電', '差し戻し', '長文Slack', 'バグ', '人類',
];

const initialState: GameState = {
  phase: 'title',
  score: 0,
  best: 0,
  combo: 0,
  maxCombo: 0,
  timeLeft: GAME_SECONDS,
  judged: 0,
  perfect: 0,
  misses: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rankFor(score: number): { name: RankName; line: string } {
  if (score >= 2600) return { name: '覇王色スタンプ', line: '押印だけで会議が終わりました。稟議も少し震えています。' };
  if (score >= 1900) return { name: '取締役会の覇気', line: '「一旦持ち帰り」が持ち帰られる前に消えました。' };
  if (score >= 1200) return { name: '社内チャットの覇気', line: '通知が敬語になりました。' };
  if (score >= 500) return { name: '町内会の覇気', line: '回覧板くらいなら黙らせられます。' };
  return { name: '無言の圧', line: 'まだ覇気というより、ちょっとした圧です。' };
}

function sanitizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 12) || '名無しの覇気';
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

function spawnNuisance(id: number, width: number, height: number, speedBoost: number): Nuisance {
  return {
    id,
    text: PHRASES[id % PHRASES.length],
    x: width + 120 + Math.random() * 120,
    y: height * (0.28 + Math.random() * 0.48),
    vx: -(210 + Math.random() * 130 + speedBoost),
    size: 20 + Math.random() * 18,
    hit: false,
    wobble: Math.random() * Math.PI * 2,
  };
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>({ ...initialState });
  const itemsRef = useRef<Nuisance[]>([]);
  const stampsRef = useRef<Stamp[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const spawnRef = useRef({ next: 0, id: 1 });
  const uiTimeRef = useRef(0);
  const nicknameRef = useRef('');
  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  const resultSavedRef = useRef(false);
  const [view, setView] = useState<GameState>(gameRef.current);
  const [copied, setCopied] = useState(false);
  const [nickname, setNickname] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY) ?? '0');
    if (Number.isFinite(stored)) {
      gameRef.current.best = stored;
    }
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

  const restart = useCallback(() => {
    const best = gameRef.current.best;
    const cleanName = sanitizeName(nicknameRef.current);
    nicknameRef.current = cleanName;
    setNickname(cleanName);
    window.localStorage.setItem(NAME_STORAGE_KEY, cleanName);
    gameRef.current = { ...initialState, best, phase: 'playing' };
    resultSavedRef.current = false;
    itemsRef.current = [];
    stampsRef.current = [];
    spawnRef.current = { next: 0, id: 1 };
    lastTimeRef.current = null;
    setCopied(false);
    setView({ ...gameRef.current });
  }, []);

  const judge = useCallback(() => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || game.phase !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const targetX = rect.width * TARGET_X;
    let bestIndex = -1;
    let bestDistance = Infinity;

    itemsRef.current.forEach((item, index) => {
      if (item.hit) return;
      const distance = Math.abs(item.x - targetX);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });

    const hitLimit = rect.width * ZONE_WIDTH;
    const perfectLimit = rect.width * PERFECT_WIDTH;
    const best = bestIndex >= 0 ? itemsRef.current[bestIndex] : undefined;
    if (best && bestDistance < hitLimit) {
      const perfect = bestDistance < perfectLimit;
      best.hit = true;
      game.combo += 1;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
      game.judged += 1;
      if (perfect) game.perfect += 1;
      const gain = perfect ? 180 : 95;
      game.score += gain + game.combo * (perfect ? 22 : 12);
      stampsRef.current.push({ x: best.x, y: best.y, life: 1, text: perfect ? '覇王承認' : '覇気承認', perfect });
    } else {
      game.combo = 0;
      game.misses += 1;
      game.score = Math.max(0, game.score - 45);
      stampsRef.current.push({ x: targetX, y: rect.height * 0.52, life: 1, text: '空振り', perfect: false });
    }

    setView({ ...game });
  }, []);

  const draw = useCallback((time: number) => {
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
      spawnRef.current.next -= dt;
      if (spawnRef.current.next <= 0) {
        itemsRef.current.push(spawnNuisance(spawnRef.current.id++, width, height, elapsed * 9));
        spawnRef.current.next = Math.max(0.42, 0.92 - elapsed * 0.025);
      }

      itemsRef.current.forEach((item) => {
        item.x += item.vx * dt;
        item.y += Math.sin(time / 180 + item.wobble) * 0.35;
      });

      itemsRef.current = itemsRef.current.filter((item) => {
        if (item.hit) return false;
        if (item.x < -160) {
          game.combo = 0;
          game.misses += 1;
          return false;
        }
        return true;
      });

      if (game.timeLeft <= 0) {
        game.phase = 'ended';
        if (game.score > game.best) {
          game.best = game.score;
          window.localStorage.setItem(STORAGE_KEY, String(game.score));
        }
        if (!resultSavedRef.current) {
          resultSavedRef.current = true;
          const cleanName = sanitizeName(nicknameRef.current);
          const entry: LeaderboardEntry = {
            name: cleanName,
            score: Math.round(game.score),
            rank: rankFor(game.score).name,
            perfect: game.perfect,
            maxCombo: game.maxCombo,
            playedAt: new Date().toISOString(),
          };
          persistLeaderboard([...leaderboardRef.current, entry]);
        }
      }
    }

    stampsRef.current = stampsRef.current.filter((stamp) => stamp.life > 0);
    stampsRef.current.forEach((stamp) => {
      stamp.life -= dt * 1.75;
    });

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#070304');
    bg.addColorStop(0.52, '#180508');
    bg.addColorStop(1, '#030303');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#fff1a8';
    for (let i = 0; i < 18; i += 1) {
      const y = height * 0.18 + i * 42 + Math.sin(time / 700 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.28, y - 28, width * 0.68, y + 36, width, y - 10);
      ctx.stroke();
    }
    ctx.restore();

    const targetX = width * TARGET_X;
    const zone = width * ZONE_WIDTH;
    const perfect = width * PERFECT_WIDTH;
    ctx.save();
    ctx.fillStyle = 'rgba(215,169,46,0.08)';
    ctx.fillRect(targetX - zone, 0, zone * 2, height);
    ctx.fillStyle = 'rgba(255,245,202,0.12)';
    ctx.fillRect(targetX - perfect, 0, perfect * 2, height);
    ctx.strokeStyle = 'rgba(255,245,202,0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(targetX, height * 0.15);
    ctx.lineTo(targetX, height * 0.86);
    ctx.stroke();
    ctx.font = `900 ${Math.min(width, height) * 0.18}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#d7a92e';
    ctx.shadowBlur = 34;
    ctx.fillStyle = 'rgba(255,245,202,0.22)';
    ctx.fillText('覇', targetX, height * 0.52);
    ctx.restore();

    itemsRef.current.forEach((item) => {
      const danger = clamp(1 - Math.abs(item.x - targetX) / (width * 0.5), 0, 1);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.sin(time / 260 + item.wobble) * 0.08);
      ctx.fillStyle = `rgba(12, 4, 5, ${0.72 + danger * 0.22})`;
      ctx.strokeStyle = danger > 0.75 ? '#fff1a8' : '#b31928';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = danger > 0.75 ? '#fff1a8' : '#b31928';
      ctx.shadowBlur = 12 + danger * 24;
      const w = item.text.length * item.size + 42;
      const h = item.size * 2.25;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 16);
      ctx.fill();
      ctx.stroke();
      ctx.font = `900 ${item.size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff1df';
      ctx.fillText(item.text, 0, 1);
      ctx.restore();
    });

    stampsRef.current.forEach((stamp) => {
      const alpha = clamp(stamp.life, 0, 1);
      const scale = 1.2 + (1 - alpha) * 1.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(stamp.x, stamp.y);
      ctx.rotate(-0.18);
      ctx.scale(scale, scale);
      ctx.strokeStyle = stamp.perfect ? '#fff1a8' : '#d7a92e';
      ctx.fillStyle = stamp.perfect ? 'rgba(255,241,168,0.16)' : 'rgba(179,25,40,0.16)';
      ctx.lineWidth = 5;
      ctx.shadowColor = stamp.perfect ? '#fff1a8' : '#b31928';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.roundRect(-72, -34, 144, 68, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = '900 24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff5ca';
      ctx.fillText(stamp.text, 0, 2);
      ctx.restore();
    });

    if (game.phase === 'title') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (time - uiTimeRef.current > 80 || game.phase !== view.phase) {
      uiTimeRef.current = time;
      setView({ ...game });
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [persistLeaderboard, view.phase]);

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
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [draw]);

  const rank = useMemo(() => rankFor(view.score), [view.score]);
  const shareText = useMemo(
    () => `${sanitizeName(nickname)}の覇気仕分け ${view.score}点「${rank.name}」。${rank.line}\n${view.perfect}件を完璧に承認しました。 #覇気チャレンジ https://game.xn--7qwx14d.com`,
    [nickname, rank.line, rank.name, view.perfect, view.score],
  );

  const share = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '覇気仕分け', text: shareText, url: 'https://game.xn--7qwx14d.com' });
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
      className="game-shell game-shell--stamp"
      aria-label="覇気仕分け"
      onPointerDown={judge}
    >
      <canvas ref={canvasRef} className="game-canvas game-canvas--stamp" aria-hidden="true" />

      <section className="arcade-hud" aria-live="polite">
        <div><span>SCORE</span><strong>{Math.round(view.score)}</strong></div>
        <div><span>TIME</span><strong>{Math.ceil(view.timeLeft)}</strong></div>
        <div><span>COMBO</span><strong>{Math.round(view.combo)}</strong></div>
      </section>

      <section className={`arcade-panel ${view.phase === 'playing' ? 'arcade-panel--compact' : ''}`}>
        {view.phase !== 'playing' && (
          <>
            <p className="game-kicker">game.覇気.com</p>
            <h1>覇気仕分け</h1>
            <p className="game-copy">
              流れてくる現実を、中央の判定線でタップして覇気承認。15秒でどれだけ世の中を黙らせられるか。
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
            <p className="result-rank">現実を、押印で黙らせろ。</p>
            <p>「月曜」「なるはや」「通知99+」が中央に来た瞬間にタップ。近いほど高得点です。</p>
            <button type="submit" className="primary-action">仕分け開始</button>
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
          <div className="arcade-controls stamp-controls">
            <div className="charge-card arcade-charge">
              <div className="charge-meta"><span>PERFECT</span><strong>{view.perfect}</strong></div>
              <div className="charge-track"><span className="charge-fill" style={{ width: `${clamp((view.timeLeft / GAME_SECONDS) * 100, 0, 100)}%` }} /></div>
            </div>
            <button type="button" className="haki-button release-button" onClick={judge}>覇気承認</button>
          </div>
        )}

        {view.phase === 'ended' && (
          <div className="result-card arcade-card">
            <p className="result-rank">{rank.name}</p>
            <p>{rank.line}</p>
            <p className="best-score">{sanitizeName(nickname)} / SCORE {Math.round(view.score)} / BEST {Math.round(view.best)} / MAX {view.maxCombo} COMBO</p>
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
              <button type="button" className="primary-action" onClick={(event) => { event.stopPropagation(); restart(); }}>もう一度仕分ける</button>
              <button type="button" className="ghost-action" onClick={(event) => { event.stopPropagation(); share(); }}>{copied ? 'コピー済み' : '結果をシェア'}</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
