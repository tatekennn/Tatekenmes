'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { WORLD_RADIUS, groundHeight } from '@/lib/tukki-game';
import { createLife, stepLife, lifeSnapshot, interact, RESIDENTS, BENCHES, HOMES, type Life } from '@/lib/tukki-life';
import TukkiVillage from './TukkiVillage';
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

function useInput(enabled: boolean) {
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
      input.current.jump = k.has('Space') || jumpButton.current;
    };
    const down = (e: KeyboardEvent) => {
      if (!enabled) return;
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
    blur();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      blur();
    };
  }, [enabled]);

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
function LifeScene({ input, game, onUpdate, playerPos, running }: {
  input: React.MutableRefObject<InputState>; game: Life; running: boolean;
  onUpdate: (game: Life) => void; playerPos: React.MutableRefObject<THREE.Vector3>;
}) {
  const yaw = useRef(0), pitch = useRef(0.3);
  const camPos = useRef(new THREE.Vector3(0, 5, 12));
  const hudTime = useRef(0);
  const { camera, size } = useThree();
  const portrait = size.width / size.height < 0.85;
  const compactView = size.width <= 600 || size.height <= 500;
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = portrait ? 68 : compactView ? 60 : 55;
      camera.updateProjectionMatrix();
    }
  }, [camera, portrait, compactView]);
  useFrame((_, dt) => {
    if (document.hidden) return;
    const inp = input.current;
    yaw.current -= inp.yawDelta;
    pitch.current = THREE.MathUtils.clamp(pitch.current + inp.pitchDelta, 0.12, 0.85);
    inp.yawDelta = inp.pitchDelta = 0;
    if (running) stepLife(game, dt, {
      x: -Math.sin(yaw.current) * inp.fwd + Math.cos(yaw.current) * inp.side,
      z: -Math.cos(yaw.current) * inp.fwd - Math.sin(yaw.current) * inp.side,
      jump: inp.jump,
    });
    const player = game.actors[0], floor = groundHeight(player.x, player.z);
    playerPos.current.set(player.x, player.y, player.z);
    const offset = new THREE.Vector3(Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), Math.cos(yaw.current) * Math.cos(pitch.current)).multiplyScalar(portrait ? 18 : compactView ? 14 : 12);
    const target = new THREE.Vector3(player.x, floor + 1.2, player.z).add(offset);
    target.y = Math.max(target.y, groundHeight(target.x, target.z) + 1.2);
    camPos.current.lerp(target, 1 - Math.exp(-6 * Math.min(dt, 0.1)));
    camera.position.copy(camPos.current);
    camera.lookAt(player.x, floor + (portrait ? 3 : 1.8) + (player.y - floor) * 0.35, player.z);
    hudTime.current += dt;
    if (hudTime.current >= 0.1) { hudTime.current = 0; onUpdate(game); }
  }, -1);
  return <>
    {RESIDENTS.map((racer, index) => <ResidentModel key={racer.color} game={game} index={index} />)}
  </>;
}

function ResidentModel({ game, index }: { game: Life; index: number }) {
  const model = useRef<TukkiHandle>(null);
  const ring = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const actor = game.actors[index], m = model.current;
    if (!m) return;
    m.group.position.set(actor.x, actor.y, actor.z); m.group.rotation.y = actor.facing;
    const speed = Math.hypot(actor.vx, actor.vz);
    const forwardSpeed = actor.vx * Math.sin(actor.facing) + actor.vz * Math.cos(actor.facing);
    const sideSpeed = -actor.vx * Math.cos(actor.facing) + actor.vz * Math.sin(actor.facing);
    m.animate(actor.walk, Math.min(1, speed / 7), forwardSpeed / 10 * 0.18, game.elapsed + index,
      speed > 0.2 ? sideSpeed / speed : 0, index === 0 && game.resting);
    ring.current.position.set(actor.x, groundHeight(actor.x, actor.z) + 0.08, actor.z);
    ring.current.visible = index === 0 && game.resting;
  });
  return <>
    <TukkiModel ref={model} color={RESIDENTS[index].color} scale={index === 0 ? 1 : 0.85} />
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[1.05, 1.3, 32]} /><meshBasicMaterial color="#cbdc99" transparent opacity={0.8} depthWrite={false} />
    </mesh>
  </>;
}

/* ------------------------------------------------------------------ */
/*  草原：地面・木々・雲・仲間の暮らし                              */
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

function World() {
  return <>
    <TukkiLandscape />
    <TukkiVillage />
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
  const [phase, setPhase] = useState<'intro' | 'playing' | 'help'>('intro');
  const { input, setStick, setButton } = useInput(phase === 'playing');
  const [game] = useState(createLife);
  const [hud, setHud] = useState(() => lifeSnapshot(game));
  const [message, setMessage] = useState<{ name: string; text: string } | null>(null);
  const playerPos = useRef(new THREE.Vector3());
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const stickRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [stickUi, setStickUi] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const action = () => { if (phase !== 'playing') return; setMessage(interact(game)); setHud(lifeSnapshot(game)); };
  const actionRef = useRef(action); actionRef.current = action;
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); actionRef.current(); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(null), 6000); return () => window.clearTimeout(timer); }, [message]);
  const stopInput = () => { setStick(0, 0); setButton(false); stickRef.current = null; drag.current = null; setStickUi(null); input.current.yawDelta = input.current.pitchDelta = 0; };
  const pointerDown = (e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth / 2) {
      stickRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; setStickUi({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    } else drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    const stick = stickRef.current;
    if (stick?.id === e.pointerId) {
      let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const length = Math.hypot(dx, dy);
      if (length > 60) { dx *= 60 / length; dy *= 60 / length; }
      setStick(dx / 60, dy / 60); setStickUi({ x: stick.ox, y: stick.oy, dx, dy }); return;
    }
    const d = drag.current;
    if (d?.id === e.pointerId) { input.current.yawDelta += (e.clientX - d.x) * 0.005; input.current.pitchDelta += (e.clientY - d.y) * 0.004; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; }
  };
  const pointerUp = (e: React.PointerEvent) => { if (stickRef.current?.id === e.pointerId) { stickRef.current = null; setStick(0, 0); setStickUi(null); } if (drag.current?.id === e.pointerId) drag.current = null; };
  const pause = () => { stopInput(); setMessage(null); setPhase('help'); };
  return <div style={{ position: 'fixed', inset: 0, background: SKY_BOTTOM, touchAction: 'none', userSelect: 'none', fontFamily: 'system-ui, sans-serif', color: '#43532e' }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <style>{`
      .life-stick { display: none; }
      @media (max-width:600px), (max-height:500px), (pointer:coarse) {
        .life-stick { display: block; }
        .life-jump, .life-subtitle { display: none !important; }
        .life-map { width: 138px !important; }
        .life-title { font-size: 17px !important; }
        .life-message { bottom: 180px !important; }
      }
      @media (max-height:500px) { .life-map { width: 116px !important; } .life-message { bottom: 20px !important; max-width: 45vw !important; } }
    `}</style>
    <Canvas shadows camera={{ position: [0, 5, 12], fov: 55, near: 0.1, far: 500 }} dpr={[1, 2]}>
      <fog attach="fog" args={[SKY_BOTTOM, 65, 150]} /><Sky /><hemisphereLight args={['#fff8e4', '#6c9552', 1.2]} /><ambientLight intensity={0.35} />
      <FollowLight target={playerPos} /><World /><LifeScene input={input} game={game} onUpdate={(life) => setHud(lifeSnapshot(life))} playerPos={playerPos} running={phase === 'playing'} />
    </Canvas>
    {phase === 'playing' && <>
      <div style={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: 12, maxWidth: 'calc(100% - 80px)', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 16, background: '#fffbeae8', pointerEvents: 'none' }}>
        <div className="life-title" style={{ fontSize: 20, fontWeight: 800 }}>ツッキーくんの のんびり生活</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{hud.resting ? 'ひと休み中 ☕' : '今日は、どこへ行こう？'}</div>
        <div className="life-subtitle" style={{ fontSize: 11, marginTop: 4 }}>WASDで散歩 · Eであいさつ / 休む · ドラッグで見回す</div>
      </div>
      <button aria-label="遊び方 / 一時停止" onPointerDown={(e) => e.stopPropagation()} onClick={pause} style={{ ...buttonStyle, position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', right: 12, width: 44, height: 44, fontSize: 22 }}>Ⅱ</button>
      <div className="life-map" style={{ position: 'absolute', top: 78, right: 12, width: 154, padding: 8, borderRadius: 16, background: '#fffbeae8', boxSizing: 'border-box', pointerEvents: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 800 }}>草原の地図 <span style={{ float: 'right' }}>↑北</span></div>
        <svg viewBox="-64 -64 128 128" role="img" aria-label="草原の地図。青い矢印があなた、丸が仲間、家とベンチの場所" style={{ width: '100%', display: 'block', borderRadius: '50%', background: '#dceacb', marginTop: 4 }}>
          <circle r={WORLD_RADIUS} fill="#d6e5bd" stroke="#91aa70" /><path d="M0 -58V58M-50 -29L50 29M-50 29L50 -29" stroke="#f5e5b9" strokeWidth="4" />
          {HOMES.map((p, i) => <path key={i} transform={`translate(${p.x} ${p.z})`} d="M-4 0L0 -5L4 0V5H-4Z" fill={p.color} stroke="#765329" strokeWidth="1" />)}
          {BENCHES.map((p, i) => <rect key={i} x={p.x - 3} y={p.z - 1.5} width="6" height="3" fill="#94734d" />)}
          {hud.actors.slice(1).map((p, i) => <circle key={i} cx={p.x} cy={p.z} r="2.6" fill={TUKKI_COLORS[RESIDENTS[i + 1].color].body} stroke="#765329" strokeWidth="0.7" />)}
          <g transform={`translate(${hud.actors[0].x} ${hud.actors[0].z})`}><circle r="5" fill="white" stroke="#1265ac" /><path transform={`rotate(${hud.actors[0].facing * 180 / Math.PI + 180})`} d="M0 -4L3 3L0 1L-3 3Z" fill="#1265ac" /></g>
        </svg>
        <div style={{ fontSize: 9, textAlign: 'center', marginTop: 4, whiteSpace: 'nowrap' }}>⌂ 家　▰ ベンチ　● 仲間</div>
      </div>
      <div className="life-stick" role="group" aria-label="移動スティック" style={{ position: 'absolute', left: 'max(24px, env(safe-area-inset-left))', bottom: 'max(28px, env(safe-area-inset-bottom))', width: 120, height: 120, borderRadius: '50%', border: '2px solid #ffffffaa', background: '#fffbea55', touchAction: 'none' }}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); stickRef.current = { id: e.pointerId, ox: r.x + r.width / 2, oy: r.y + r.height / 2 }; e.currentTarget.setPointerCapture(e.pointerId); pointerMove(e); }} onLostPointerCapture={pointerUp}>
        <span style={{ position: 'absolute', top: -24, width: '100%', textAlign: 'center', fontSize: 12, fontWeight: 800, pointerEvents: 'none' }}>お散歩</span>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 64, color: '#647b4a88', pointerEvents: 'none' }}>＋</div>
        <div style={{ position: 'absolute', left: 36, top: 36, width: 48, height: 48, borderRadius: '50%', background: '#fffbea', border: '2px solid #6b8757', boxSizing: 'border-box', transform: `translate(${(stickUi?.dx ?? 0) * 0.6}px, ${(stickUi?.dy ?? 0) * 0.6}px)`, pointerEvents: 'none' }} />
      </div>
      <button aria-label="生活アクション" onPointerDown={(e) => e.stopPropagation()} onClick={action} style={{ ...buttonStyle, position: 'absolute', right: 16, bottom: 'max(28px, env(safe-area-inset-bottom))', width: 94, height: 72, borderRadius: 24, fontSize: 13, fontWeight: 800, background: '#ffe3a1' }}>{hud.action.label}</button>
      <button className="life-jump" aria-label="ジャンプ" onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setButton(true); }} onPointerUp={() => setButton(false)} onPointerCancel={() => setButton(false)} onLostPointerCapture={() => setButton(false)} style={{ ...buttonStyle, position: 'absolute', right: 16, bottom: 112, padding: 10 }}>ジャンプ</button>
      {message && <div className="life-message" role="status" style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'min(80vw, 420px)', maxWidth: '80vw', padding: '14px 18px', background: '#fffbeaf5', borderRadius: 18, boxShadow: '0 4px 20px #354b2522', boxSizing: 'border-box', pointerEvents: 'none' }}><strong style={{ fontSize: 13 }}>{message.name}</strong><div style={{ fontSize: 14, lineHeight: 1.7, marginTop: 5 }}>{message.text}</div></div>}
    </>}
    {phase !== 'playing' && <div onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, background: '#36564166', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="life-title" style={{ width: '100%', maxWidth: 480, maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box', borderRadius: 28, padding: 'clamp(22px, 4vw, 34px)', background: '#fffbea', boxShadow: '0 20px 60px #142e3933' }}>
        <div style={{ letterSpacing: 3, fontSize: 12, color: '#8a784e' }}>A SLOW DAY</div><h1 id="life-title" style={{ fontSize: 30, lineHeight: 1.35 }}>ツッキーくんの<br />のんびり生活</h1>
        <p style={{ lineHeight: 1.8 }}>急がなくても、何もしなくても大丈夫。<br />仲間たちと、草原でゆっくり過ごそう。</p>
        <div style={{ background: '#edf2d9', borderRadius: 16, padding: 16, lineHeight: 1.9, fontSize: 14 }}>🌿 好きなところへお散歩<br />💬 仲間の近くで「あいさつ」<br />☕ ベンチや草の上で「ひと休み」<br /><span style={{ color: '#71814f' }}>制限時間も、順位もありません。</span></div>
        <p style={{ fontSize: 13, lineHeight: 1.8 }}>スマホ：左下のスティックで移動、右側をドラッグして見回す。右下のボタンであいさつ・ひと休み。<br />PC：WASD / 矢印で移動、Eでアクション、Spaceでジャンプ。</p>
        <button autoFocus onClick={() => setPhase('playing')} style={{ ...buttonStyle, width: '100%', padding: 16, fontWeight: 800, fontSize: 18, background: '#e5bc5d', borderRadius: 16 }}>{phase === 'intro' ? '草原へ行く' : 'お散歩に戻る'}</button>
      </section>
    </div>}
  </div>;
}
const buttonStyle: React.CSSProperties = { border: '1px solid #b5c4a1', background: '#fffbea', color: '#43532e', borderRadius: 14, cursor: 'pointer', touchAction: 'none' };
