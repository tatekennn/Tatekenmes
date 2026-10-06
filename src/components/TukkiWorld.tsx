'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { HAKI_SPOTS, WORLD_RADIUS, groundHeight } from '@/lib/tukki-game';
import { createRace, stepRace, raceSnapshot, RACERS, REFILL_AMOUNT, REFILL_SECONDS, type Race } from '@/lib/tukki-race';
import * as THREE from 'three';
import TukkiLandscape from './TukkiLandscape';
import TukkiModel, { TUKKI_COLORS, type TukkiHandle } from './TukkiModel';

/* ------------------------------------------------------------------ */
/*  定数                                                               */
/* ------------------------------------------------------------------ */

const SKY_TOP = '#70c9ee';
const SKY_BOTTOM = '#dff4db';

/* ------------------------------------------------------------------ */
/*  入力（キーボード＋タッチ）を ref に集約し、描画ループから読む       */
/* ------------------------------------------------------------------ */
interface InputState {
  fwd: number; // -1..1（前後）
  side: number; // -1..1（左右）
  jump: boolean;
  yawDelta: number; // ドラッグによるカメラ回転の蓄積
  pitchDelta: number;
}

function useInput() {
  const input = useRef<InputState>({ fwd: 0, side: 0, jump: false, yawDelta: 0, pitchDelta: 0 });
  const keys = useRef<Set<string>>(new Set());
  const stick = useRef({ x: 0, y: 0 });
  const jumpButton = useRef(false);
  const recompute = useRef(() => {});

  useEffect(() => {
    recompute.current = () => {
      const k = keys.current;
      const kf = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      const ks = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      input.current.fwd = THREE.MathUtils.clamp(kf + -stick.current.y, -1, 1);
      input.current.side = THREE.MathUtils.clamp(ks + stick.current.x, -1, 1);
      input.current.jump = k.has('Space') || k.has('KeyE') || jumpButton.current;
    };
    const down = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      keys.current.add(e.code);
      recompute.current();
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      recompute.current();
    };
    const blur = () => {
      keys.current.clear();
      stick.current = { x: 0, y: 0 };
      jumpButton.current = false;
      recompute.current();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const setStick = (x: number, y: number) => {
    stick.current = { x, y };
    recompute.current();
  };
  const setButton = (pressed: boolean) => {
    jumpButton.current = pressed;
    recompute.current();
  };

  return { input, setStick, setButton };
}

/* ------------------------------------------------------------------ */
/*  プレイヤー                                                         */
/* ------------------------------------------------------------------ */
function RaceScene({ input, game, onUpdate, playerPos }: {
  input: React.MutableRefObject<InputState>; game: Race;
  onUpdate: (game: Race) => void; playerPos: React.MutableRefObject<THREE.Vector3>;
}) {
  const yaw = useRef(0), pitch = useRef(0.3);
  const camPos = useRef(new THREE.Vector3(0, 5, 12));
  const hudTime = useRef(0);
  const { camera } = useThree();
  useFrame((_, dt) => {
    if (document.hidden) return;
    const inp = input.current;
    yaw.current -= inp.yawDelta;
    pitch.current = THREE.MathUtils.clamp(pitch.current + inp.pitchDelta, 0.12, 0.85);
    inp.yawDelta = inp.pitchDelta = 0;
    stepRace(game, dt, {
      x: -Math.sin(yaw.current) * inp.fwd + Math.cos(yaw.current) * inp.side,
      z: -Math.cos(yaw.current) * inp.fwd - Math.sin(yaw.current) * inp.side,
      jump: inp.jump,
    });
    const player = game.actors[0], floor = groundHeight(player.x, player.z);
    playerPos.current.set(player.x, player.y, player.z);
    const offset = new THREE.Vector3(Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), Math.cos(yaw.current) * Math.cos(pitch.current)).multiplyScalar(12);
    const target = new THREE.Vector3(player.x, floor + 1.2, player.z).add(offset);
    target.y = Math.max(target.y, groundHeight(target.x, target.z) + 1.2);
    camPos.current.lerp(target, 1 - Math.exp(-6 * Math.min(dt, 0.1)));
    camera.position.copy(camPos.current);
    camera.lookAt(player.x, floor + 1.8 + (player.y - floor) * 0.35, player.z);
    hudTime.current += dt;
    if (hudTime.current >= 0.1) { hudTime.current = 0; onUpdate(game); }
  }, -1);
  return <>
    {RACERS.map((racer, index) => <RacerModel key={racer.color} game={game} index={index} />)}
    {HAKI_SPOTS.map((_, index) => <Haki key={index} index={index} game={game} />)}
  </>;
}

function RacerModel({ game, index }: { game: Race; index: number }) {
  const model = useRef<TukkiHandle>(null);
  const ring = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const actor = game.actors[index], m = model.current;
    if (!m) return;
    m.group.position.set(actor.x, actor.y, actor.z); m.group.rotation.y = actor.facing;
    const speed = Math.hypot(actor.vx, actor.vz);
    m.animate(actor.walk, Math.min(1, speed / 7), speed / 10 * 0.18, game.elapsed + index);
    ring.current.position.set(actor.x, groundHeight(actor.x, actor.z) + 0.08, actor.z);
    ring.current.visible = game.elapsed < actor.stoppedUntil;
  });
  return <>
    <TukkiModel ref={model} color={RACERS[index].color} scale={index === 0 ? 1 : 0.85} />
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[1.05, 1.3, 32]} /><meshBasicMaterial color="#ffb64d" transparent opacity={0.8} depthWrite={false} />
    </mesh>
  </>;
}

/* ------------------------------------------------------------------ */
/*  草原：地面・木々・雲・集める覇気                              */
/* ------------------------------------------------------------------ */
function Cloud({ position, scale, seed }: { position: [number, number, number]; scale: number; seed: number }) {
  const g = useRef<THREE.Group>(null!);
  const puffs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        p: [((i * 37 + seed * 11) % 7) - 3, (((i * 13 + seed) % 3) - 1) * 0.5, ((i * 23 + seed * 5) % 5) - 2] as [
          number,
          number,
          number,
        ],
        r: 1.2 + ((i * 7 + seed) % 4) * 0.4,
      })),
    [seed],
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    g.current.position.x = position[0] + Math.sin(t * 0.05 + seed) * 4;
    g.current.position.y = position[1] + Math.sin(t * 0.3 + seed) * 0.4;
  });
  return (
    <group ref={g} position={position} scale={scale}>
      {puffs.map((c, i) => (
        <mesh key={i} position={c.p}>
          <sphereGeometry args={[c.r, 20, 14]} />
          <meshStandardMaterial color="#f3ecff" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function HakiLabel() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.font = 'bold 40px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.lineWidth = 7; context.strokeStyle = '#fff6ce'; context.strokeText('覇気', 64, 32);
    context.fillStyle = '#725123'; context.fillText('覇気', 64, 32);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[0, 1.1, 0]} scale={[1.3, 0.65, 1]}><spriteMaterial map={texture} transparent depthWrite={false} /></sprite>;
}

function Haki({ index, game }: { index: number; game: Race }) {
  const group = useRef<THREE.Group>(null!);
  const spot = HAKI_SPOTS[index];
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.position.y = groundHeight(spot.x, spot.z) + 1.5 + Math.sin(t * 2.5 + index) * 0.16;
    group.current.rotation.y = t * 0.8;
    group.current.visible = game.active[index];
  });
  return (
    <group ref={group} position={[spot.x, 1.5, spot.z]} visible={game.active[index]}>
      <mesh>
        <octahedronGeometry args={[0.55]} />
        <meshStandardMaterial color="#ffd65a" emissive="#ffb52e" emissiveIntensity={0.65} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.045, 8, 32]} />
        <meshBasicMaterial color="#ffe7a0" />
      </mesh>
      <HakiLabel />
    </group>
  );
}

function World() {
  return <>
    <TukkiLandscape />
    {Array.from({ length: 8 }, (_, i) => <Cloud key={i} position={[(i - 4) * 24, 32 + (i % 3) * 4, -65]} scale={1.8} seed={i} />)}
  </>;
}

/** 上下グラデーションの空 */
function Sky() {
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, SKY_TOP);
    g.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh>
      <sphereGeometry args={[300, 32, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} toneMapped={false} />
    </mesh>
  );
}

/** 影を落とすライトをプレイヤー付近に追従させる */
function FollowLight({ target }: { target: React.MutableRefObject<THREE.Vector3> }) {
  const light = useRef<THREE.DirectionalLight>(null!);
  useFrame(() => {
    const p = target.current;
    light.current.position.set(p.x + 12, p.y + 30, p.z + 10);
    light.current.target.position.copy(p);
    light.current.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      intensity={1.6}
      color="#fff4e0"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-near={1}
      shadow-camera-far={120}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
      shadow-bias={-0.0005}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  画面                                                               */
/* ------------------------------------------------------------------ */
export default function TukkiWorld() {
  const { input, setStick, setButton } = useInput();
  const [game, setGame] = useState(createRace);
  const [round, setRound] = useState(0);
  const [hud, setHud] = useState(() => raceSnapshot(game));
  const [showHelp, setShowHelp] = useState(true);
  const [rankingOpen, setRankingOpen] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const update = () => setRankingOpen(!media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const playerPos = useRef(new THREE.Vector3());
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const stickRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [stickUi, setStickUi] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const onUpdate = (race: Race) => {
    setHud(raceSnapshot(race));
    if (Math.hypot(race.actors[0].vx, race.actors[0].vz) > 2) setShowHelp(false);
  };
  const ranking = RACERS.map((racer, i) => ({ ...racer, score: hud.actors[i].score, index: i })).sort((a, b) => b.score - a.score || a.index - b.index);
  const rank = 1 + hud.actors.filter((actor) => actor.score > hud.actors[0].score).length;
  const reset = () => {
    setStick(0, 0); setButton(false); input.current.yawDelta = input.current.pitchDelta = 0;
    stickRef.current = null; setStickUi(null); drag.current = null;
    const next = createRace(); setGame(next); setHud(raceSnapshot(next)); setShowHelp(true); setRound((value) => value + 1);
  };

  // 右側ドラッグ＝カメラ回転、左側ドラッグ（タッチ）＝仮想スティック
  const onPointerDown = (e: React.PointerEvent) => {
    const w = window.innerWidth;
    if (e.pointerType === 'touch' && e.clientX < w / 2) {
      stickRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
      setStickUi({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    } else {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (stickRef.current && stickRef.current.id === e.pointerId) {
      const R = 60;
      let dx = e.clientX - stickRef.current.ox;
      let dy = e.clientY - stickRef.current.oy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx *= R / len;
        dy *= R / len;
      }
      setStick(dx / R, dy / R);
      setStickUi({ x: stickRef.current.ox, y: stickRef.current.oy, dx, dy });
      return;
    }
    if (drag.current && drag.current.id === e.pointerId) {
      input.current.yawDelta += (e.clientX - drag.current.x) * 0.005;
      input.current.pitchDelta += (e.clientY - drag.current.y) * 0.004;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (stickRef.current && stickRef.current.id === e.pointerId) {
      stickRef.current = null;
      setStick(0, 0);
      setStickUi(null);
    }
    if (drag.current && drag.current.id === e.pointerId) drag.current = null;
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: SKY_BOTTOM, touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <style>{`@media (max-width: 600px) { .tukki-ranking { top: 184px !important; padding: 8px 10px !important; min-width: 114px !important; } .tukki-help { bottom: 132px !important; font-size: 12px !important; } }`}</style>
      <Canvas shadows camera={{ position: [0, 5, 12], fov: 55, near: 0.1, far: 500 }} dpr={[1, 2]}>
        <fog attach="fog" args={[SKY_BOTTOM, 65, 150]} />
        <Sky />
        <hemisphereLight args={['#fff8e4', '#6c9552', 1.2]} />
        <ambientLight intensity={0.35} />
        <FollowLight target={playerPos} />
        <World />
        <RaceScene key={round} input={input} game={game} onUpdate={onUpdate} playerPos={playerPos} />
      </Canvas>

      <div style={hudStyle}>
        <div style={{ fontSize: 13, letterSpacing: 1 }}>ツッキーくんの覇気レース</div>
        <div style={{ fontSize: 27, fontWeight: 800, marginTop: 4 }}>あなたの覇気 {hud.actors[0].score}</div>
        <div style={{ fontSize: 13, marginTop: 5 }}>{rank}位 / 9人 · 地面に {hud.active.filter(Boolean).length}個</div>
        <div style={{ fontSize: 12, marginTop: 5 }}>あと{hud.refillIn}秒で覇気を補充（最大{REFILL_AMOUNT}個）</div>
        <div role="status" style={{ fontSize: 12, marginTop: 6, color: hud.playerStopped ? '#b86622' : '#59733d' }}>
          {hud.playerStopped ? 'ぶつかった！ ちょっとひと休み' : '早い者勝ち！ 仲間より先に集めよう'}
        </div>
      </div>

      <details className="tukki-ranking" open={rankingOpen} onToggle={(e) => setRankingOpen(e.currentTarget.open)} onPointerDown={(e) => e.stopPropagation()}
        style={{ ...hudStyle, pointerEvents: 'auto', left: 'auto', right: 16, minWidth: 140, padding: '12px 15px' }}>
        <summary style={{ fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>みんなの覇気</summary>
        <ol aria-label="覇気ランキング" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {ranking.map((racer) => <li key={racer.color} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, marginTop: 4, fontWeight: racer.index === 0 ? 800 : 400 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: TUKKI_COLORS[racer.color].body, border: '1px solid #76532955' }} />
            <span style={{ flex: 1 }}>{racer.name}</span><span>{racer.score}</span>
          </li>)}
        </ol>
      </details>

      {showHelp && <div className="tukki-help" style={helpStyle}>
        <div style={{ fontWeight: 700, marginBottom: 5 }}>仲間8人と覇気の早取りレース！</div>
        <div>覇気は{REFILL_SECONDS}秒ごとに補充。ぶつかると両方が一瞬止まるよ</div>
        <div style={{ fontSize: 12, marginTop: 5 }}>WASD / 矢印で歩く · Space / Eでジャンプ · ドラッグで見回す</div>
        <div style={{ fontSize: 12 }}>スマホ：左半分で歩く・右半分で見回す</div>
      </div>}

      <button onPointerDown={(e) => e.stopPropagation()} onClick={reset} style={{ position: 'absolute', right: 20, bottom: 120, padding: '8px 13px', borderRadius: 20, background: '#fffbea', border: '1px solid #bdd0a0', color: '#43532e', fontSize: 12, cursor: 'pointer' }}>やり直す</button>

      <button style={{ ...btnStyle, position: 'absolute', right: 20, bottom: 24 }}
        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setButton(true); }}
        onPointerUp={(e) => { e.stopPropagation(); setButton(false); }}
        onPointerCancel={() => setButton(false)} onLostPointerCapture={() => setButton(false)} aria-label="ジャンプ">ジャンプ</button>

      <div style={{ position: 'absolute', bottom: 20, left: 16, pointerEvents: 'none', width: 'clamp(100px, 15vw, 150px)' }}>
        <svg viewBox="-64 -64 128 128" role="img" aria-label="覇気の地図。金色の点が残りの覇気、色の点が9人のキャラ" style={{ width: '100%', display: 'block', background: 'rgba(255,253,239,.88)', borderRadius: '50%', boxShadow: '0 3px 14px #48653522' }}>
          <circle r={WORLD_RADIUS} fill="#d6e5bd" stroke="#91aa70" strokeWidth="1" />
          <path d="M0 -58V58M-50 -29L50 29M-50 29L50 -29" stroke="#f5e5b9" strokeWidth="4" />
          {HAKI_SPOTS.map((spot, i) => hud.active[i] && <circle key={i} cx={spot.x} cy={spot.z} r="2.3" fill="#eab029" stroke="#9d741c" strokeWidth="0.5" />)}
          {hud.actors.map((actor, i) => <circle key={i} cx={actor.x} cy={actor.z} r={i === 0 ? 3.5 : 2.8} fill={TUKKI_COLORS[RACERS[i].color].body} stroke={i === 0 ? 'white' : '#765329'} strokeWidth={i === 0 ? 1.5 : 0.6} />)}
        </svg>
      </div>

      {/* 仮想スティック表示 */}
      {stickUi && (
        <>
          <div style={{ ...stickBase, left: stickUi.x - 60, top: stickUi.y - 60 }} />
          <div style={{ ...stickKnob, left: stickUi.x + stickUi.dx - 24, top: stickUi.y + stickUi.dy - 24 }} />
        </>
      )}
    </div>
  );
}

const hudStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  color: '#43532e',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  background: 'rgba(255, 253, 239, .93)',
  padding: '16px 20px', borderRadius: 20, minWidth: 210,
  boxShadow: '0 4px 20px rgba(57,80,35,.12)',
  pointerEvents: 'none',
};

const helpStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 32,
  transform: 'translateX(-50%)',
  background: 'rgba(255, 253, 239, .94)',
  border: '1px solid rgba(130, 157, 93, .3)',
  borderRadius: 12,
  padding: '12px 18px',
  color: '#43532e',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  pointerEvents: 'none',
  textAlign: 'center',
  width: 'min(88vw, 560px)',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: 82,
  height: 82,
  borderRadius: '50%',
  border: '1px solid rgba(124, 92, 255, .6)',
  background: '#ffe09a',
  color: '#43532e',
  fontSize: 14,
  fontWeight: 700,
  touchAction: 'none',
  cursor: 'pointer',
};

const stickBase: React.CSSProperties = {
  position: 'absolute',
  width: 120,
  height: 120,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,.35)',
  pointerEvents: 'none',
};

const stickKnob: React.CSSProperties = {
  position: 'absolute',
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'rgba(124, 92, 255, .7)',
  pointerEvents: 'none',
};
