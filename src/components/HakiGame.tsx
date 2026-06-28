'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

type StageType = 'TAP_JUMP' | 'SLASH' | 'DODGE' | 'REFLECT' | 'BREAK' | 'BREAK_FINAL' | 'MIX_DODGE_BREAK' | 'MIX_SLASH_REFLECT';
type GameScreen = 'nickname' | 'title' | 'playing' | 'stageResult' | 'gameOver' | 'result';
type StageOutcome = 'clear' | 'perfect' | 'fail' | null;
type GameSoundEvent = 'stage-clear' | 'perfect' | 'hit' | 'slash' | 'break' | 'haki-burst' | 'final-break' | 'game-over';

type StageConfig = {
  id: number;
  name: string;
  type: StageType;
  durationMs: number;
  difficulty: number;
  livesPenalty: number;
  allowTutorialFail: boolean;
  targetScore: number;
  perfectScore: number;
  layout: string;
};

type GameState = {
  nickname: string;
  currentStageIndex: number;
  score: number;
  lives: number;
  haki: number;
  combo: number;
  maxCombo: number;
  clearedStages: number;
  perfectStages: number;
  stageStartedAt: number;
  runStartedAt: number;
  attempts: number;
  isHakiBurst: boolean;
  hakiBurstUntil: number;
  lastResult: StageOutcome;
};

type RankingEntry = {
  nickname: string;
  score: number;
  maxCombo: number;
  clearedStages: number;
  title: string;
  createdAt: string;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type SlashTarget = { id: number; kind: 'crystal' | 'bomb'; x: number; y: number; r: number; cut: boolean };
type Falling = { id: number; kind: 'spike' | 'core' | 'shield'; x: number; y: number; lane: number; speed: number; hit: boolean };
type ReflectShot = { id: number; t: number; side: -1 | 1; done: boolean; hit: boolean };
type WeakPoint = { id: number; x: number; y: number; activeFrom: number; hit: boolean };

type StageRuntime = {
  startedAt: number;
  stageTime: number;
  fail: boolean;
  clear: boolean;
  perfect: boolean;
  message: string;
  playerX: number;
  playerY: number;
  playerVy: number;
  grounded: boolean;
  progress: number;
  hits: number;
  misses: number;
  collected: number;
  destroyed: number;
  required: number;
  charge: number;
  gateHp: number;
  holdStart: number | null;
  slashStart: { x: number; y: number } | null;
  slashEnd: { x: number; y: number } | null;
  targets: SlashTarget[];
  falling: Falling[];
  shots: ReflectShot[];
  weakPoints: WeakPoint[];
  finalStep: number;
  particles: Particle[];
  shake: number;
  crack: number;
  soundEvents: GameSoundEvent[];
};

const W = 360;
const H = 640;
const FLOOR = 520;
const RANKING_KEY = 'haki_twenty_trials_ranking';
const NICKNAME_KEY = 'haki_twenty_trials_nickname';
const PALETTE = {
  bg: '#0E0B0A',
  dark: '#211815',
  white: '#F4E8D0',
  gold: '#F6C65B',
  red: '#E04B38',
  purple: '#7A3E9D',
  gray: '#51443B',
  teal: '#5FD6C3',
};

const STAGES: StageConfig[] = [
  { id: 1, name: '一歩目の間', type: 'TAP_JUMP', durationMs: 8000, difficulty: 1, livesPenalty: 0, allowTutorialFail: true, targetScore: 1000, perfectScore: 1500, layout: 'single-gap' },
  { id: 2, name: '一閃の間', type: 'SLASH', durationMs: 8000, difficulty: 1, livesPenalty: 0, allowTutorialFail: true, targetScore: 1000, perfectScore: 1500, layout: 'three-crystals-line' },
  { id: 3, name: 'かわしの間', type: 'DODGE', durationMs: 10000, difficulty: 2, livesPenalty: 0, allowTutorialFail: true, targetScore: 1000, perfectScore: 1500, layout: 'slow-spikes-core' },
  { id: 4, name: '二連穴の間', type: 'TAP_JUMP', durationMs: 10000, difficulty: 3, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'double-gap' },
  { id: 5, name: '爆弾混じりの間', type: 'SLASH', durationMs: 10000, difficulty: 3, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'bomb-mix' },
  { id: 6, name: '三筋の間', type: 'DODGE', durationMs: 11000, difficulty: 4, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'three-lanes' },
  { id: 7, name: '二拍子の間', type: 'REFLECT', durationMs: 12000, difficulty: 4, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'two-beats' },
  { id: 8, name: '第一の門', type: 'BREAK', durationMs: 12000, difficulty: 5, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'timing-wide' },
  { id: 9, name: '動く足場の間', type: 'TAP_JUMP', durationMs: 12000, difficulty: 5, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'moving-platform' },
  { id: 10, name: '曲線斬りの間', type: 'SLASH', durationMs: 13000, difficulty: 5, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'arc-slash' },
  { id: 11, name: '狭道の間', type: 'DODGE', durationMs: 14000, difficulty: 6, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'narrow' },
  { id: 12, name: '逆返しの間', type: 'REFLECT', durationMs: 14000, difficulty: 6, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'alternating' },
  { id: 13, name: '第二の門', type: 'BREAK', durationMs: 14000, difficulty: 7, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'mash-weakpoint' },
  { id: 14, name: '針山の間', type: 'TAP_JUMP', durationMs: 15000, difficulty: 7, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'spike-chain' },
  { id: 15, name: '大連斬の間', type: 'SLASH', durationMs: 15000, difficulty: 8, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'mass-slash' },
  { id: 16, name: '高速回廊', type: 'DODGE', durationMs: 16000, difficulty: 8, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'fast-corridor' },
  { id: 17, name: '三連返し', type: 'REFLECT', durationMs: 16000, difficulty: 8, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'triple-fast' },
  { id: 18, name: '黒門前の間', type: 'MIX_DODGE_BREAK', durationMs: 18000, difficulty: 9, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'dodge-then-break' },
  { id: 19, name: '覇気乱流', type: 'MIX_SLASH_REFLECT', durationMs: 18000, difficulty: 9, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'slash-then-reflect' },
  { id: 20, name: '覇王門', type: 'BREAK_FINAL', durationMs: 25000, difficulty: 10, livesPenalty: 1, allowTutorialFail: false, targetScore: 1000, perfectScore: 1500, layout: 'final-gate' },
];

const initialGame = (nickname = ''): GameState => ({
  nickname,
  currentStageIndex: 0,
  score: 0,
  lives: 3,
  haki: 0,
  combo: 0,
  maxCombo: 0,
  clearedStages: 0,
  perfectStages: 0,
  stageStartedAt: 0,
  runStartedAt: 0,
  attempts: 0,
  isHakiBurst: false,
  hakiBurstUntil: 0,
  lastResult: null,
});

function sanitizeName(name: string) {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 12);
  return clean || '名無しの覇気';
}

function loadRanking(): RankingEntry[] {
  try {
    const data = JSON.parse(window.localStorage.getItem(RANKING_KEY) ?? '[]') as RankingEntry[];
    if (!Array.isArray(data)) return [];
    return data.filter((entry) => Number.isFinite(entry.score)).sort((a, b) => b.score - a.score).slice(0, 5);
  } catch {
    return [];
  }
}

function saveRanking(entry: RankingEntry) {
  const ranking = [...loadRanking(), entry].sort((a, b) => b.score - a.score).slice(0, 5);
  window.localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
  return ranking;
}

function getTitle(score: number, clearedStages: number, perfectStages = 0) {
  if (clearedStages >= 20 && perfectStages >= 20) return '真・覇王色';
  if (clearedStages >= 20 && score >= 46000) return '弊社には強すぎる覇気';
  if (clearedStages >= 20) return '覇王門突破者';
  if (clearedStages >= 19) return '画面破壊系新卒';
  if (clearedStages >= 17) return '覇王色見習い';
  if (clearedStages >= 14) return '覇気覚醒';
  if (clearedStages >= 10) return '覇気候補生';
  if (clearedStages >= 5) return '微覇気ランナー';
  return '無風見習い';
}

function getComment(cleared: number) {
  if (cleared >= 20) return 'あなたの覇気で画面が割れました。';
  if (cleared >= 18) return 'あと一歩で覇王門でした。かなり惜しいです。';
  if (cleared >= 15) return '弊社には少し強すぎる覇気です。';
  if (cleared >= 10) return 'かなり良いです。あとは月曜に出せるかです。';
  return '覇気はあります。社会性は今後に期待です。';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createParticle(x: number, y: number, color: string): Particle {
  const a = Math.random() * Math.PI * 2;
  const s = 30 + Math.random() * 130;
  return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.45, color, size: 2 + Math.floor(Math.random() * 3) };
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function blankRuntime(now = 0): StageRuntime {
  return {
    startedAt: now,
    stageTime: 0,
    fail: false,
    clear: false,
    perfect: true,
    message: '',
    playerX: 72,
    playerY: FLOOR - 18,
    playerVy: 0,
    grounded: true,
    progress: 0,
    hits: 0,
    misses: 0,
    collected: 0,
    destroyed: 0,
    required: 1,
    charge: 0,
    gateHp: 100,
    holdStart: null,
    slashStart: null,
    slashEnd: null,
    targets: [],
    falling: [],
    shots: [],
    weakPoints: [],
    finalStep: 0,
    particles: [],
    shake: 0,
    crack: 0,
    soundEvents: [],
  };
}

function stageMechanic(stage: StageConfig, t: number): StageType {
  if (stage.type === 'MIX_DODGE_BREAK') return t < 10 ? 'DODGE' : 'BREAK';
  if (stage.type === 'MIX_SLASH_REFLECT') return t < 8 ? 'SLASH' : 'REFLECT';
  return stage.type;
}

function initRuntime(stage: StageConfig, now: number): StageRuntime {
  const rt = blankRuntime(now);
  rt.required = Math.max(1, Math.min(10, stage.difficulty));
  if (stage.type === 'SLASH' || stage.type === 'MIX_SLASH_REFLECT') {
    const count = stage.layout === 'mass-slash' ? 12 : stage.layout === 'arc-slash' ? 6 : stage.layout === 'bomb-mix' ? 5 : 3;
    rt.targets = Array.from({ length: count }, (_, i) => {
      const arc = stage.layout === 'arc-slash' || stage.layout === 'mass-slash';
      const kind = (stage.layout !== 'three-crystals-line' && (i === count - 1 || (stage.layout === 'mass-slash' && i === 8))) ? 'bomb' : 'crystal';
      const x = arc ? 72 + (i % 6) * 44 : 92 + i * 58;
      const y = arc ? 225 + Math.sin(i * 0.95) * 70 + Math.floor(i / 6) * 95 : 240 + (i % 2) * 58;
      return { id: i, kind, x, y, r: kind === 'bomb' ? 17 : 15, cut: false };
    });
    rt.required = stage.layout === 'mass-slash' ? 6 : stage.layout === 'arc-slash' ? 4 : stage.layout === 'bomb-mix' ? 3 : 2;
  }
  if (stage.type === 'REFLECT' || stage.type === 'MIX_SLASH_REFLECT') {
    const n = stage.layout === 'two-beats' ? 2 : stage.layout === 'alternating' ? 3 : stage.layout === 'triple-fast' ? 3 : 2;
    const base = stage.type === 'MIX_SLASH_REFLECT' ? 9.4 : 2.1;
    rt.shots = Array.from({ length: n }, (_, i) => ({ id: i, t: base + i * (stage.difficulty >= 8 ? 1.25 : 1.9), side: i % 2 ? -1 : 1, done: false, hit: false }));
    rt.required = n === 2 ? 1 : 2;
  }
  if (stage.type === 'BREAK' || stage.type === 'MIX_DODGE_BREAK') {
    rt.gateHp = stage.layout === 'mash-weakpoint' ? 135 : stage.type === 'MIX_DODGE_BREAK' ? 125 : 100;
  }
  if (stage.type === 'BREAK_FINAL') {
    rt.gateHp = 320;
    rt.weakPoints = [
      { id: 0, x: 145, y: 260, activeFrom: 1.6, hit: false },
      { id: 1, x: 215, y: 300, activeFrom: 3.4, hit: false },
      { id: 2, x: 180, y: 218, activeFrom: 5.2, hit: false },
    ];
    rt.playerX = 180;
  }
  return rt;
}

export default function HakiGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>(initialGame());
  const runtimeRef = useRef<StageRuntime>(blankRuntime());
  const lastTimeRef = useRef<number | null>(null);
  const pointerRef = useRef({ down: false, x: 180, y: 420 });
  const [screen, setScreen] = useState<GameScreen>('nickname');
  const [nickname, setNickname] = useState('');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [view, setView] = useState<GameState>(gameRef.current);
  const [copied, setCopied] = useState(false);

  const currentStage = STAGES[view.currentStageIndex] ?? STAGES[0];
  const title = useMemo(() => getTitle(view.score, view.clearedStages, view.perfectStages), [view.clearedStages, view.perfectStages, view.score]);

  useEffect(() => {
    const saved = window.localStorage.getItem(NICKNAME_KEY) ?? '';
    const clean = saved ? sanitizeName(saved) : '';
    setNickname(clean);
    gameRef.current = initialGame(clean);
    setView(gameRef.current);
    setRanking(loadRanking());
    setScreen(clean ? 'title' : 'nickname');
  }, []);

  const sync = useCallback(() => setView({ ...gameRef.current }), []);

  const persistResult = useCallback((game: GameState) => {
    const entry = {
      nickname: game.nickname,
      score: Math.round(game.score),
      maxCombo: game.maxCombo,
      clearedStages: game.clearedStages,
      title: getTitle(game.score, game.clearedStages, game.perfectStages),
      createdAt: new Date().toISOString(),
    };
    setRanking(saveRanking(entry));
  }, []);

  const startStage = useCallback((index: number) => {
    const now = performance.now();
    const game = gameRef.current;
    game.currentStageIndex = index;
    game.stageStartedAt = now;
    game.attempts += 1;
    game.lastResult = null;
    if (!game.runStartedAt) game.runStartedAt = now;
    runtimeRef.current = initRuntime(STAGES[index], now);
    lastTimeRef.current = now;
    setScreen('playing');
    sync();
  }, [sync]);

  const startRun = useCallback(() => {
    const clean = sanitizeName(nickname);
    window.localStorage.setItem(NICKNAME_KEY, clean);
    setNickname(clean);
    gameRef.current = initialGame(clean);
    setCopied(false);
    startStage(0);
  }, [nickname, startStage]);

  const completeStage = useCallback((outcome: Exclude<StageOutcome, null>) => {
    const game = gameRef.current;
    const stage = STAGES[game.currentStageIndex];
    const rt = runtimeRef.current;
    game.lastResult = outcome;
    if (outcome === 'fail') {
      game.score = Math.max(0, game.score - 700);
      game.combo = 0;
      rt.message = stage.allowTutorialFail ? '覇気、乱れる。もう一度。' : '覇気、乱れる';
      if (!stage.allowTutorialFail) game.lives -= stage.livesPenalty;
      if (game.lives <= 0) {
        game.lives = 0;
        persistResult(game);
        setScreen('gameOver');
      } else {
        setScreen('stageResult');
      }
      sync();
      return;
    }

    const perfect = outcome === 'perfect';
    game.clearedStages = Math.max(game.clearedStages, stage.id);
    game.score += perfect ? stage.perfectScore : stage.targetScore;
    game.combo += 1;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    if (perfect) game.perfectStages += 1;
    game.haki = clamp(game.haki + 5 + (perfect ? 8 : 0) + rt.collected * 12 + game.combo * 2, 0, 100);
    if (game.haki >= 100) {
      game.isHakiBurst = true;
      game.hakiBurstUntil = performance.now() + 3000;
    }
    rt.message = perfect ? 'PERFECT' : 'CLEAR';
    if (stage.id >= 20) {
      game.score += game.lives * 2000 + 10000;
      persistResult(game);
      runtimeRef.current.crack = 0.8;
      setScreen('result');
    } else {
      setScreen('stageResult');
    }
    sync();
  }, [persistResult, sync]);

  const failStage = useCallback(() => completeStage('fail'), [completeStage]);

  const nextStage = useCallback(() => {
    const game = gameRef.current;
    if (game.lastResult === 'fail') startStage(game.currentStageIndex);
    else startStage(game.currentStageIndex + 1);
  }, [startStage]);

  const toTitle = useCallback(() => {
    gameRef.current = initialGame(sanitizeName(nickname));
    runtimeRef.current = blankRuntime();
    setScreen('title');
    sync();
  }, [nickname, sync]);

  const inputPoint = (event: PointerEvent<HTMLElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 180, y: 320 };
    return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
  };

  const handleDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (screen !== 'playing') return;
    const p = inputPoint(event);
    const rt = runtimeRef.current;
    const stage = STAGES[gameRef.current.currentStageIndex];
    const mechanic = stageMechanic(stage, rt.stageTime);
    pointerRef.current = { down: true, x: p.x, y: p.y };

    if (mechanic === 'TAP_JUMP' && rt.grounded) {
      rt.playerVy = -360;
      rt.grounded = false;
      for (let i = 0; i < 8; i += 1) rt.particles.push(createParticle(rt.playerX, FLOOR, PALETTE.gold));
    }
    if (mechanic === 'SLASH') {
      rt.slashStart = p;
      rt.slashEnd = p;
    }
    if (mechanic === 'REFLECT') {
      const active = rt.shots.find((shot) => !shot.done && Math.abs(rt.stageTime - shot.t) < 0.32);
      if (active) {
        active.done = true;
        active.hit = true;
        rt.hits += 1;
        rt.soundEvents.push('hit');
        for (let i = 0; i < 10; i += 1) rt.particles.push(createParticle(180, 310, PALETTE.teal));
      } else {
        rt.misses += 1;
        rt.shake = 5;
      }
    }
    if (mechanic === 'BREAK' || mechanic === 'BREAK_FINAL') {
      rt.holdStart = performance.now();
      if (stage.layout === 'mash-weakpoint') rt.gateHp -= 10 + Math.random() * 8;
      if (mechanic === 'BREAK_FINAL') {
        const weak = rt.weakPoints.find((w) => !w.hit && rt.stageTime > w.activeFrom && rt.stageTime < w.activeFrom + 1.2 && Math.hypot(p.x - w.x, p.y - w.y) < 30);
        if (weak) {
          weak.hit = true;
          rt.gateHp -= 48;
          for (let i = 0; i < 12; i += 1) rt.particles.push(createParticle(weak.x, weak.y, PALETTE.gold));
        } else if (rt.stageTime < 8) {
          rt.misses += 1;
          rt.shake = 4;
        }
      }
    }
  }, [screen]);

  const handleMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (screen !== 'playing') return;
    const p = inputPoint(event);
    const rt = runtimeRef.current;
    pointerRef.current.x = p.x;
    pointerRef.current.y = p.y;
    if (pointerRef.current.down && rt.slashStart) rt.slashEnd = p;
  }, [screen]);

  const handleUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (screen !== 'playing') return;
    const p = inputPoint(event);
    const rt = runtimeRef.current;
    const stage = STAGES[gameRef.current.currentStageIndex];
    const mechanic = stageMechanic(stage, rt.stageTime);
    pointerRef.current.down = false;
    if (mechanic === 'SLASH' && rt.slashStart) {
      rt.slashEnd = p;
      let cutNow = 0;
      rt.targets.forEach((target) => {
        if (target.cut || !rt.slashStart || !rt.slashEnd) return;
        const d = distanceToSegment(target.x, target.y, rt.slashStart.x, rt.slashStart.y, rt.slashEnd.x, rt.slashEnd.y);
        if (d < target.r + 8) {
          target.cut = true;
          cutNow += 1;
          if (target.kind === 'bomb') {
            rt.fail = true;
            rt.perfect = false;
            rt.message = '紫爆弾を斬った';
            rt.shake = 6;
          } else {
            rt.destroyed += 1;
            for (let i = 0; i < 8; i += 1) rt.particles.push(createParticle(target.x, target.y, PALETTE.red));
          }
        }
      });
      if (cutNow >= 3) rt.stageTime -= 0.05;
      rt.soundEvents.push('slash');
      rt.slashStart = null;
      rt.slashEnd = null;
    }
    if ((mechanic === 'BREAK' || mechanic === 'BREAK_FINAL') && rt.holdStart) {
      const hold = performance.now() - rt.holdStart;
      const cursor = (hold % 1300) / 1300;
      const center = mechanic === 'BREAK_FINAL' ? 0.62 : 0.56;
      const diff = Math.abs(cursor - center);
      if (diff < (stage.difficulty >= 9 ? 0.075 : 0.14)) {
        rt.gateHp -= diff < 0.035 ? 62 : 38;
        rt.soundEvents.push('break');
        rt.shake = 4;
        for (let i = 0; i < 16; i += 1) rt.particles.push(createParticle(180, 260, PALETTE.gold));
      } else if (mechanic === 'BREAK_FINAL' && rt.stageTime > 18) {
        rt.fail = true;
      } else {
        rt.perfect = false;
      }
      rt.holdStart = null;
    }
  }, [screen]);

  const updateTapJump = (rt: StageRuntime, stage: StageConfig, dt: number) => {
    rt.progress = clamp(rt.stageTime / (stage.durationMs / 1000), 0, 1);
    rt.playerX = 58 + rt.progress * 230;
    rt.playerVy += 760 * dt;
    rt.playerY += rt.playerVy * dt;
    if (rt.playerY >= FLOOR - 18) {
      rt.playerY = FLOOR - 18;
      rt.playerVy = 0;
      rt.grounded = true;
    }
    const hazards = stage.layout === 'single-gap' ? [0.52] : stage.layout === 'double-gap' ? [0.38, 0.62] : stage.layout === 'moving-platform' ? [0.55] : [0.24, 0.42, 0.64, 0.8];
    hazards.forEach((x) => {
      if (Math.abs(rt.progress - x) < 0.035 && rt.grounded) {
        rt.fail = true;
        rt.message = '穴に落ちた';
      }
    });
    if (stage.layout === 'moving-platform' && Math.abs(rt.progress - 0.7) < 0.04 && rt.playerY > FLOOR - 70) rt.fail = true;
  };

  const updateDodge = (rt: StageRuntime, stage: StageConfig, dt: number) => {
    const lanes = [88, 180, 272];
    rt.playerX += (clamp(pointerRef.current.x, 48, 312) - rt.playerX) * Math.min(1, dt * 12);
    rt.playerY = 500;
    const spawnEvery = Math.max(0.42, 1.1 - stage.difficulty * 0.075);
    if (Math.floor((rt.stageTime - dt) / spawnEvery) !== Math.floor(rt.stageTime / spawnEvery)) {
      const lane = Math.floor((rt.stageTime * 997 + stage.id) % 3);
      rt.falling.push({ id: rt.falling.length, kind: Math.random() < 0.22 ? 'core' : stage.difficulty >= 8 && Math.random() < 0.14 ? 'shield' : 'spike', x: lanes[lane], y: -24, lane, speed: 110 + stage.difficulty * 24, hit: false });
    }
    rt.falling.forEach((item) => {
      item.y += item.speed * dt;
      const d = Math.hypot(item.x - rt.playerX, item.y - rt.playerY);
      if (!item.hit && d < 24) {
        item.hit = true;
        if (item.kind === 'core') {
          rt.collected += 1;
          gameRef.current.score += 300;
          gameRef.current.haki = clamp(gameRef.current.haki + 12, 0, 100);
          for (let i = 0; i < 8; i += 1) rt.particles.push(createParticle(item.x, item.y, PALETTE.gold));
        } else if (item.kind === 'shield' && gameRef.current.isHakiBurst) {
          gameRef.current.score += 400;
          for (let i = 0; i < 8; i += 1) rt.particles.push(createParticle(item.x, item.y, PALETTE.white));
        } else {
          rt.hits += 1;
          rt.perfect = false;
          rt.shake = 5;
          if (stage.difficulty < 8 || rt.hits > 1) rt.fail = true;
        }
      }
    });
    rt.falling = rt.falling.filter((item) => item.y < H + 40 && !item.hit);
  };

  const updateReflect = (rt: StageRuntime) => {
    rt.shots.forEach((shot) => {
      if (!shot.done && rt.stageTime > shot.t + 0.36) {
        shot.done = true;
        shot.hit = false;
        rt.misses += 1;
        rt.perfect = false;
        rt.shake = 4;
      }
    });
  };

  const updateBreak = (rt: StageRuntime, stage: StageConfig, dt: number) => {
    if (pointerRef.current.down && rt.holdStart && stage.layout !== 'mash-weakpoint') {
      rt.charge = ((performance.now() - rt.holdStart) % 1300) / 1300;
    } else {
      rt.charge = (rt.charge + dt * (0.55 + stage.difficulty * 0.03)) % 1;
    }
    if (stage.layout === 'mash-weakpoint' && Math.sin(rt.stageTime * 4) > 0.92) rt.gateHp -= dt * 18;
    if (rt.gateHp <= 0) rt.clear = true;
  };

  const updateFinal = (rt: StageRuntime, dt: number) => {
    rt.charge = rt.holdStart ? ((performance.now() - rt.holdStart) % 1300) / 1300 : (rt.charge + dt * 0.72) % 1;
    const wave1 = Math.abs(rt.stageTime - 9.2) < 0.28;
    const wave2 = Math.abs(rt.stageTime - 13.2) < 0.28;
    if ((wave1 || wave2) && Math.abs(rt.playerX - pointerRef.current.x) < 18) {
      rt.misses += 1;
      rt.perfect = false;
      rt.shake = 6;
      pointerRef.current.x = rt.playerX + 80;
    }
    rt.playerX += (clamp(pointerRef.current.x, 52, 308) - rt.playerX) * Math.min(1, dt * 10);
    if (rt.weakPoints.every((w) => w.hit) && rt.stageTime > 18 && rt.gateHp > 30) rt.gateHp -= dt * (gameRef.current.haki * 0.42 + 4);
    if (rt.misses >= 2) rt.fail = true;
    if (rt.gateHp <= 0) {
      rt.clear = true;
      rt.crack = 0.8;
      rt.soundEvents.push('final-break');
    }
  };

  const drawPixelText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 12, align: CanvasTextAlign = 'left') => {
    ctx.font = `bold ${size}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = PALETTE.white;
    ctx.fillText(text, x, y);
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, rt: StageRuntime, burst: boolean) => {
    const x = Math.round(rt.playerX);
    const y = Math.round(rt.playerY);
    ctx.fillStyle = PALETTE.gray;
    ctx.fillRect(x - 8, y + 8, 16, 6);
    ctx.fillStyle = burst ? PALETTE.gold : PALETTE.white;
    ctx.fillRect(x - 5, y - 14, 10, 9);
    ctx.fillRect(x - 6, y - 4, 12, 17);
    ctx.fillRect(x - 10, y + 2, 5, 12);
    ctx.fillRect(x + 5, y + 2, 5, 12);
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(x + 2, y - 11, 2, 2);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x - 3, y - 22, 6, 8);
    ctx.fillRect(x, y - 28, 4, 6);
  };

  const drawStage = (ctx: CanvasRenderingContext2D, rt: StageRuntime, stage: StageConfig) => {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.dark;
    ctx.fillRect(24, 96, 312, 430);
    ctx.strokeStyle = PALETTE.gray;
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 96, 312, 430);
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = i % 2 ? '#17110f' : '#120e0d';
      ctx.fillRect(26 + i * 18, 98, 9, 426);
    }
    ctx.fillStyle = PALETTE.gray;
    ctx.fillRect(0, FLOOR, W, 8);
    if (gameRef.current.combo >= 10 || stage.id === 20) {
      ctx.strokeStyle = gameRef.current.combo >= 15 ? PALETTE.gold : PALETTE.white;
      for (let i = 0; i < 18; i += 1) {
        const a = (Math.PI * 2 * i) / 18 + rt.stageTime;
        ctx.beginPath();
        ctx.moveTo(180 + Math.cos(a) * 80, 315 + Math.sin(a) * 80);
        ctx.lineTo(180 + Math.cos(a) * 260, 315 + Math.sin(a) * 260);
        ctx.stroke();
      }
    }

    const mechanic = stageMechanic(stage, rt.stageTime);
    if (mechanic === 'TAP_JUMP') {
      const hazards = stage.layout === 'single-gap' ? [0.52] : stage.layout === 'double-gap' ? [0.38, 0.62] : stage.layout === 'moving-platform' ? [0.55] : [0.24, 0.42, 0.64, 0.8];
      hazards.forEach((p) => {
        const x = 58 + p * 230;
        ctx.fillStyle = PALETTE.bg;
        ctx.fillRect(x - 18, FLOOR - 2, 36, 22);
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(x - 13, FLOOR - 3, 26, 3);
      });
      if (stage.layout !== 'single-gap' && stage.layout !== 'double-gap') {
        ctx.fillStyle = PALETTE.bg;
        ctx.beginPath();
        ctx.moveTo(270, FLOOR); ctx.lineTo(284, FLOOR - 34); ctx.lineTo(298, FLOOR); ctx.fill();
        ctx.fillStyle = PALETTE.red; ctx.fillRect(282, FLOOR - 34, 4, 5);
      }
    }
    if (mechanic === 'SLASH') {
      rt.targets.forEach((target) => {
        if (target.cut) return;
        if (target.kind === 'crystal') {
          ctx.fillStyle = PALETTE.red;
          ctx.beginPath();
          ctx.moveTo(target.x, target.y - 18); ctx.lineTo(target.x + 13, target.y - 2); ctx.lineTo(target.x + 5, target.y + 18); ctx.lineTo(target.x - 14, target.y + 7); ctx.lineTo(target.x - 8, target.y - 10); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = PALETTE.bg; ctx.stroke();
          ctx.fillStyle = PALETTE.white; ctx.fillRect(target.x + 2, target.y - 8, 2, 14);
        } else {
          ctx.fillStyle = PALETTE.purple;
          ctx.fillRect(target.x - 14, target.y - 12, 28, 25);
          ctx.fillStyle = PALETTE.bg; ctx.fillRect(target.x - 3, target.y - 18, 6, 7);
          if (Math.floor(rt.stageTime * 6) % 2) { ctx.fillStyle = PALETTE.red; ctx.fillRect(target.x - 8, target.y - 6, 16, 12); }
        }
      });
      if (rt.slashStart && rt.slashEnd) {
        ctx.strokeStyle = PALETTE.white;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(rt.slashStart.x, rt.slashStart.y); ctx.lineTo(rt.slashEnd.x, rt.slashEnd.y); ctx.stroke();
      }
    }
    if (mechanic === 'DODGE') {
      [88, 180, 272].forEach((x) => { ctx.strokeStyle = PALETTE.gray; ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, 512); ctx.stroke(); });
      rt.falling.forEach((item) => {
        if (item.kind === 'core') { ctx.fillStyle = PALETTE.gold; ctx.fillRect(item.x - 8, item.y - 8, 16, 16); }
        else if (item.kind === 'shield') { ctx.strokeStyle = PALETTE.gold; ctx.strokeRect(item.x - 13, item.y - 13, 26, 26); ctx.fillStyle = PALETTE.white; ctx.fillRect(item.x - 9, item.y - 9, 18, 18); }
        else { ctx.fillStyle = PALETTE.bg; ctx.beginPath(); ctx.moveTo(item.x, item.y - 18); ctx.lineTo(item.x + 16, item.y + 14); ctx.lineTo(item.x - 16, item.y + 14); ctx.fill(); ctx.fillStyle = PALETTE.red; ctx.fillRect(item.x - 3, item.y - 18, 6, 5); }
      });
    }
    if (mechanic === 'REFLECT') {
      rt.shots.forEach((shot) => {
        if (shot.done) return;
        const diff = shot.t - rt.stageTime;
        const x = 180 + shot.side * clamp(diff * 120, 0, 150);
        ctx.strokeStyle = Math.abs(diff) < 0.32 ? PALETTE.gold : PALETTE.red;
        ctx.strokeRect(x - 14, 298, 28, 28);
        ctx.strokeStyle = PALETTE.white;
        ctx.beginPath(); ctx.arc(180, 312, 28 + Math.abs(diff) * 60, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.strokeStyle = PALETTE.teal; ctx.strokeRect(154, 286, 52, 52);
    }
    if (mechanic === 'BREAK' || mechanic === 'BREAK_FINAL') {
      const hp = clamp(rt.gateHp / (mechanic === 'BREAK_FINAL' ? 320 : stage.layout === 'mash-weakpoint' ? 135 : 125), 0, 1);
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(118, 170, 124, 210);
      ctx.fillStyle = PALETTE.dark;
      ctx.fillRect(137, 205, 86, 175);
      ctx.strokeStyle = PALETTE.gold;
      ctx.strokeRect(118, 170, 124, 210);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(174, 246, 12, 90 * (1 - hp));
      if (mechanic === 'BREAK_FINAL') {
        rt.weakPoints.forEach((w) => {
          if (w.hit) return;
          if (rt.stageTime > w.activeFrom && rt.stageTime < w.activeFrom + 1.2) { ctx.fillStyle = PALETTE.gold; ctx.fillRect(w.x - 9, w.y - 9, 18, 18); }
          else { ctx.fillStyle = PALETTE.gray; ctx.fillRect(w.x - 5, w.y - 5, 10, 10); }
        });
      }
      ctx.fillStyle = PALETTE.gray; ctx.fillRect(86, 438, 188, 14);
      ctx.fillStyle = PALETTE.gold; ctx.fillRect(86 + 188 * 0.5, 438, 34, 14);
      ctx.fillStyle = PALETTE.white; ctx.fillRect(86 + 188 * rt.charge, 434, 4, 22);
    }
    if (mechanic !== 'SLASH' && mechanic !== 'BREAK') drawPlayer(ctx, rt, gameRef.current.isHakiBurst);
    rt.particles.forEach((p) => { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
    if (rt.crack > 0) {
      ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(70, 160); ctx.lineTo(130, 235); ctx.lineTo(105, 312); ctx.lineTo(175, 390); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(292, 120); ctx.lineTo(220, 260); ctx.lineTo(250, 430); ctx.stroke();
    }
  };

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rt = runtimeRef.current;
    const game = gameRef.current;
    const last = lastTimeRef.current ?? time;
    const dtBase = Math.min(0.034, (time - last) / 1000);
    const dt = game.isHakiBurst ? dtBase * 0.72 : dtBase;
    lastTimeRef.current = time;

    if (screen === 'playing') {
      const stage = STAGES[game.currentStageIndex];
      rt.stageTime += dt;
      if (game.isHakiBurst && time > game.hakiBurstUntil) { game.isHakiBurst = false; game.haki = 0; }
      const mechanic = stageMechanic(stage, rt.stageTime);
      if (mechanic === 'TAP_JUMP') updateTapJump(rt, stage, dt);
      if (mechanic === 'DODGE') updateDodge(rt, stage, dt);
      if (mechanic === 'REFLECT') updateReflect(rt);
      if (mechanic === 'BREAK') updateBreak(rt, stage, dt);
      if (mechanic === 'BREAK_FINAL') updateFinal(rt, dt);
      rt.particles = rt.particles.map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 70 * dt, life: p.life - dt })).filter((p) => p.life > 0);
      rt.shake = Math.max(0, rt.shake - dt * 16);
      rt.crack = Math.max(0, rt.crack - dt);
      if (rt.fail) failStage();
      else if (rt.clear) completeStage(rt.perfect ? 'perfect' : 'clear');
      else if (rt.stageTime >= stage.durationMs / 1000) {
        let ok = true;
        let perfect = rt.perfect;
        if (mechanic === 'SLASH' || stage.type === 'MIX_SLASH_REFLECT') { ok = rt.destroyed >= rt.required && !rt.targets.some((t) => t.kind === 'bomb' && t.cut); perfect = ok && rt.destroyed >= rt.targets.filter((t) => t.kind === 'crystal').length && rt.misses === 0; }
        if (mechanic === 'REFLECT' || stage.type === 'MIX_SLASH_REFLECT') { ok = ok && rt.hits >= rt.required; perfect = perfect && rt.shots.every((s) => s.hit); }
        if (mechanic === 'DODGE') { ok = ok && !rt.fail; perfect = perfect && rt.hits === 0 && (stage.difficulty < 4 || rt.collected > 0); }
        if (mechanic === 'BREAK') ok = rt.gateHp <= 0;
        if (mechanic === 'BREAK_FINAL') ok = rt.gateHp <= 0 && rt.misses < 2;
        completeStage(ok ? (perfect ? 'perfect' : 'clear') : 'fail');
      }
      if (Math.floor(time / 120) !== Math.floor(last / 120)) sync();
      drawStage(ctx, rt, stage);
    } else {
      drawStage(ctx, rt, STAGES[game.currentStageIndex] ?? STAGES[0]);
    }
    frameRef.current = requestAnimationFrame(draw);
  }, [completeStage, failStage, screen, sync]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.width = W;
    canvas.height = H;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowUp') {
        const target = canvas.getBoundingClientRect();
        const fake = { clientX: target.left + target.width / 2, clientY: target.top + target.height / 2 } as PointerEvent<HTMLElement>;
        handleDown(fake);
        setTimeout(() => handleUp(fake), 90);
      }
      if (event.key === 'ArrowLeft') pointerRef.current.x = clamp(pointerRef.current.x - 48, 40, 320);
      if (event.key === 'ArrowRight') pointerRef.current.x = clamp(pointerRef.current.x + 48, 40, 320);
    };
    window.addEventListener('keydown', onKey);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [draw, handleDown, handleUp]);

  const shareText = useMemo(() => {
    if (view.clearedStages >= 20) {
      return `${view.nickname} が覇王門を突破しました。\n\nSCORE: ${Math.round(view.score)}\n最大COMBO: ${view.maxCombo}\nPERFECT: ${view.perfectStages}/20\n称号: ${title}\n\ngame.覇気.com\n#覇気二十試練`;
    }
    return `${view.nickname} の覇気二十試練\n\nSCORE: ${Math.round(view.score)}\n到達: STAGE ${view.clearedStages}/20\n最大COMBO: ${view.maxCombo}\n称号: ${title}\n\n二十の試練を越え、覇王門を割れ。\n#覇気二十試練 #覇気チャレンジ`;
  }, [title, view.clearedStages, view.maxCombo, view.nickname, view.perfectStages, view.score]);

  const share = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title: '覇気二十試練', text: shareText, url: 'https://game.xn--7qwx14d.com' });
      else { await navigator.clipboard.writeText(shareText); setCopied(true); }
    } catch {
      await navigator.clipboard.writeText(shareText); setCopied(true);
    }
  }, [shareText]);

  const top5 = (
    <div className="twenty-ranking" aria-label="TOP5ランキング">
      <p>TOP5</p>
      <ol>{ranking.map((entry, i) => <li key={`${entry.createdAt}-${i}`}><span>{i + 1}. {entry.nickname}</span><strong>{entry.score}</strong></li>)}</ol>
    </div>
  );

  return (
    <main className="twenty-shell" aria-label="覇気二十試練" onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp}>
      <div className="twenty-frame">
        <canvas ref={canvasRef} className="twenty-canvas" aria-hidden="true" />
        <section className="twenty-hud" aria-live="polite">
          <span>STAGE {String(view.currentStageIndex + 1).padStart(2, '0')}/20</span>
          <strong>{Math.round(view.score)}</strong>
          <span>残機 {'◆'.repeat(view.lives) || '×'}</span>
        </section>
        <section className="twenty-bottom">
          <div className="twenty-gauge"><span style={{ width: `${view.haki}%` }} /></div>
          <b>{screen === 'playing' ? stageMechanic(currentStage, runtimeRef.current.stageTime).replace('TAP_JUMP', 'TAP').replace('BREAK_FINAL', 'FINAL').replace('MIX_', '') : 'TAP / SLASH / DODGE / REFLECT / HOLD'}</b>
        </section>

        {screen === 'nickname' && (
          <section className="twenty-panel">
            <p className="twenty-kicker">game.覇気.com</p>
            <h1>覇気二十試練</h1>
            <p>二十の試練を越え、覇王門を割れ。</p>
            <input value={nickname} maxLength={12} placeholder="あだ名" onChange={(event) => setNickname(event.target.value)} onPointerDown={(event) => event.stopPropagation()} />
            <button type="button" onClick={(event) => { event.stopPropagation(); const clean = sanitizeName(nickname); window.localStorage.setItem(NICKNAME_KEY, clean); setNickname(clean); gameRef.current.nickname = clean; setScreen('title'); }}>決定</button>
          </section>
        )}

        {screen === 'title' && (
          <section className="twenty-panel">
            <p className="twenty-kicker">HAKI TWENTY TRIALS</p>
            <h1>覇気二十試練</h1>
            <p>二十の試練を越え、覇王門を割れ。</p>
            <div className="twenty-help"><span>TAP</span><span>SLASH</span><span>DODGE</span><span>REFLECT</span><span>HOLD</span></div>
            <button type="button" onClick={(event) => { event.stopPropagation(); startRun(); }}>はじめる</button>
            <button type="button" className="sub" onClick={(event) => { event.stopPropagation(); setScreen('nickname'); }}>あだ名変更</button>
            {top5}
          </section>
        )}

        {screen === 'stageResult' && (
          <section className="twenty-panel compact">
            <p className="twenty-kicker">STAGE {String(currentStage.id).padStart(2, '0')} {currentStage.name}</p>
            <h2>{view.lastResult === 'fail' ? '覇気、乱れる' : view.lastResult === 'perfect' ? 'PERFECT' : 'CLEAR'}</h2>
            <p>{view.lastResult === 'fail' ? `残機 ${view.lives}。同じ試練を再挑戦。` : `COMBO ${view.combo} / HAKI ${view.haki}`}</p>
            <button type="button" onClick={(event) => { event.stopPropagation(); nextStage(); }}>{view.lastResult === 'fail' ? '再挑戦' : '次の試練へ'}</button>
          </section>
        )}

        {screen === 'gameOver' && (
          <section className="twenty-panel compact">
            <p className="twenty-kicker">GAME OVER</p>
            <h2>覇気、尽きる</h2>
            <p>到達 STAGE {view.clearedStages}/20 / SCORE {Math.round(view.score)}</p>
            <p>称号: {title}</p>
            {top5}
            <button type="button" onClick={(event) => { event.stopPropagation(); startRun(); }}>もう一度、最初から</button>
            <button type="button" className="sub" onClick={(event) => { event.stopPropagation(); toTitle(); }}>タイトルへ</button>
          </section>
        )}

        {screen === 'result' && (
          <section className="twenty-panel compact">
            <p className="twenty-kicker">COMPLETE</p>
            <h2>覇王門、突破</h2>
            <p>{view.nickname} / SCORE {Math.round(view.score)} / 残機 {view.lives}</p>
            <p>PERFECT {view.perfectStages}/20 / MAX COMBO {view.maxCombo}</p>
            <p>称号: {title}</p>
            <p>{getComment(view.clearedStages)}</p>
            {top5}
            <button type="button" onClick={(event) => { event.stopPropagation(); share(); }}>{copied ? 'コピー済み' : 'SNSシェア'}</button>
            <button type="button" className="sub" onClick={(event) => { event.stopPropagation(); startRun(); }}>もう一度</button>
          </section>
        )}
      </div>
    </main>
  );
}
