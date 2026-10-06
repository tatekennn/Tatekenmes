'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { HAKI_SPOTS, WORLD_RADIUS, touchesHaki } from '@/lib/tukki-game';
import * as THREE from 'three';
import TukkiModel, { TUKKI_COLORS, type TukkiColor, type TukkiHandle } from './TukkiModel';

/* ------------------------------------------------------------------ */
/*  定数                                                               */
/* ------------------------------------------------------------------ */
const PLAYER_COLOR: TukkiColor = 'blue';
const BUDDIES = (Object.keys(TUKKI_COLORS) as TukkiColor[]).filter((c) => c !== PLAYER_COLOR);

const FLOOR_Y = 0;

const MAX_SPEED = 10;
const ACCEL = 32;
const DAMP = 6;

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
function Player({
  input,
  onPose,
}: {
  input: React.MutableRefObject<InputState>;
  onPose: (p: THREE.Vector3, speed: number) => void;
}) {
  const model = useRef<TukkiHandle>(null);
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const vel = useRef(new THREE.Vector3());
  const walk = useRef(0);
  const jumpHeld = useRef(false);
  const facing = useRef(Math.PI); // モデルの向き（yaw）
  const { camera } = useThree();

  // カメラの向き（yaw/pitch）はプレイヤー側で管理し、三人称で追従させる
  const yaw = useRef(0);
  const pitch = useRef(0.3);
  const camPos = useRef(new THREE.Vector3(0, 5, 12));

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const inp = input.current;
    const t = clock.getElapsedTime();

    // ドラッグ分を消費
    yaw.current -= inp.yawDelta;
    pitch.current = THREE.MathUtils.clamp(pitch.current + inp.pitchDelta, 0.12, 0.85);
    inp.yawDelta = 0;
    inp.pitchDelta = 0;

    // カメラの yaw に相対した移動方向（水平面）。カメラは +sin/+cos 側に居るので前方はその逆
    const fwdDir = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const sideDir = new THREE.Vector3(-fwdDir.z, 0, fwdDir.x);
    const wish = new THREE.Vector3()
      .addScaledVector(fwdDir, inp.fwd)
      .addScaledVector(sideDir, inp.side);
    if (wish.lengthSq() > 1) wish.normalize();

    // 加速と減衰（入力の無い軸だけ減衰させると操作感が素直になる）
    vel.current.addScaledVector(wish, ACCEL * dt);
    const damp = Math.exp(-DAMP * dt);
    if (inp.jump && !jumpHeld.current && pos.current.y <= FLOOR_Y + 0.001) vel.current.y = 9;
    jumpHeld.current = inp.jump;
    vel.current.y -= 24 * dt;
    if (inp.fwd === 0 && inp.side === 0) {
      vel.current.x *= damp;
      vel.current.z *= damp;
    } else {
      const h = Math.hypot(vel.current.x, vel.current.z);
      if (h > MAX_SPEED) {
        vel.current.x *= MAX_SPEED / h;
        vel.current.z *= MAX_SPEED / h;
      }
    }

    pos.current.addScaledVector(vel.current, dt);

    // 行動範囲の端で跳ね返す
    const r = Math.hypot(pos.current.x, pos.current.z);
    if (r > WORLD_RADIUS) {
      pos.current.x *= WORLD_RADIUS / r;
      pos.current.z *= WORLD_RADIUS / r;
      vel.current.x *= -0.4;
      vel.current.z *= -0.4;
    }
    if (pos.current.y < FLOOR_Y) {
      pos.current.y = FLOOR_Y;
      vel.current.y = Math.max(0, vel.current.y);
    }
    // モデル更新：進行方向を向き、速度に応じて歩く・前傾する
    const hSpeed = Math.hypot(vel.current.x, vel.current.z);
    const speed = vel.current.length();
    const m = model.current;
    if (m) {
      m.group.position.copy(pos.current);
      if (hSpeed > 0.5) {
        const targetYaw = Math.atan2(vel.current.x, vel.current.z);
        // 最短方向で回す
        let d = targetYaw - facing.current;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        facing.current += d * Math.min(1, 12 * dt);
      }
      m.group.rotation.y = facing.current;
      const amount = THREE.MathUtils.clamp(hSpeed / 8, 0, 1);
      walk.current += dt * (4 + hSpeed * 0.7);
      const lean = THREE.MathUtils.clamp(hSpeed / MAX_SPEED, 0, 1) * 0.35 - vel.current.y * 0.012;
      m.animate(walk.current, amount, lean, t);

    }

    // 三人称カメラ追従
    const dist = 12;
    const offset = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    ).multiplyScalar(dist);
    const target = new THREE.Vector3(pos.current.x, 1.2, pos.current.z).add(offset);
    target.y = Math.max(target.y, FLOOR_Y + 1.2);
    camPos.current.lerp(target, 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos.current);
    camera.lookAt(pos.current.x, 1.8 + pos.current.y * 0.35, pos.current.z);

    onPose(pos.current, speed);
  });

  return <TukkiModel ref={model} color={PLAYER_COLOR} />;
}

/* ------------------------------------------------------------------ */
/*  仲間のツッキーくん（8色）が草原を歩く                             */
/* ------------------------------------------------------------------ */
function Buddy({ color, seed }: { color: TukkiColor; seed: number }) {
  const model = useRef<TukkiHandle>(null);
  const radius = 16 + (seed % 5) * 9;
  const omega = (0.1 + (seed % 3) * 0.05) * (seed % 2 === 0 ? 1 : -1);
  const phase = seed * 1.7;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = model.current;
    if (!m) return;
    const a = t * omega + phase;
    m.group.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    // 円周の接線方向を向く
    const vx = -Math.sin(a) * omega;
    const vz = Math.cos(a) * omega;
    m.group.rotation.y = Math.atan2(vx, vz);
    m.animate(t * (5 + seed * 0.3), 0.8, 0.15, t + seed);
  });

  return <TukkiModel ref={model} color={color} scale={0.85} />;
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

function Haki({ index, collected }: { index: number; collected: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const spot = HAKI_SPOTS[index];
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.position.y = 1.5 + Math.sin(t * 2.5 + index) * 0.16;
    group.current.rotation.y = t * 0.8;
  });
  return (
    <group ref={group} position={[spot.x, 1.5, spot.z]} visible={!collected}>
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
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#79c85d" roughness={1} />
      </mesh>
      {/* 土の広場と歩きやすい小道 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial color="#ead7a3" />
      </mesh>
      {[0, Math.PI / 3, -Math.PI / 3].map((angle, index) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008 + index * 0.004, 0]} receiveShadow>
            <planeGeometry args={[4, WORLD_RADIUS * 2]} />
            <meshStandardMaterial color="#dfcd9b" />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i / 12 * Math.PI * 2;
        return <mesh key={`hill-${i}`} position={[Math.cos(angle) * 120, -5, Math.sin(angle) * 120]} scale={[30, 16 + i % 3 * 5, 24]}>
          <sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color={i % 2 ? '#a1c985' : '#88b980'} roughness={1} />
        </mesh>;
      })}
      {Array.from({ length: 42 }, (_, i) => {
        const angle = i * 2.39996;
        const radius = 64 + (i % 4) * 9;
        return (
          <group key={i} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
            <mesh position={[0, 2, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.55, 4, 8]} /><meshStandardMaterial color="#957047" />
            </mesh>
            <mesh position={[0, 5, 0]} castShadow>
              <sphereGeometry args={[2.8, 12, 10]} /><meshStandardMaterial color={i % 2 ? '#579e61' : '#70ad61'} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: 60 }, (_, i) => {
        const angle = i * 2.39996, radius = 9 + (i % 7) * 7;
        return <mesh key={i} position={[Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius]}>
          <sphereGeometry args={[0.25, 8, 6]} /><meshStandardMaterial color={['#fff0a1', '#fff5ec', '#f5b3bd'][i % 3]} />
        </mesh>;
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.15, WORLD_RADIUS + 0.15, 128]} />
        <meshBasicMaterial color="#f3e5b5" transparent opacity={0.7} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => <Cloud key={i} position={[(i - 4) * 24, 32 + (i % 3) * 4, -65]} scale={1.8} seed={i} />)}
    </>
  );
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
  const [collected, setCollected] = useState<Set<number>>(() => new Set());
  const found = useRef(new Set<number>());
  const previous = useRef(new THREE.Vector3());
  const [message, setMessage] = useState('黄金の覇気に近づいて集めよう！');
  const [round, setRound] = useState(0);
  const [mapPos, setMapPos] = useState({ x: 0, z: 0 });
  const mapFrame = useRef(0);
  const [showHelp, setShowHelp] = useState(true);
  const playerPos = useRef(new THREE.Vector3(0, 0, 0));
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const stickRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [stickUi, setStickUi] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const onPose = (p: THREE.Vector3, speed: number) => {
    playerPos.current.copy(p);
    if (++mapFrame.current % 10 === 0) setMapPos({ x: p.x, z: p.z });
    let changed = false;
    HAKI_SPOTS.forEach((spot, index) => {
      if (!found.current.has(index) && touchesHaki(previous.current.x, previous.current.z, p.x, p.z, spot.x, spot.z)) {
        found.current.add(index);
        changed = true;
      }
    });
    previous.current.copy(p);
    if (changed) {
      setCollected(new Set(found.current));
      setMessage(found.current.size === HAKI_SPOTS.length ? 'ぜんぶ集めた！ 覇気マスター！' : '覇気をゲット！');
    }
    if (speed > 2 && showHelp) setShowHelp(false);
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
      <style>{`@media (max-width: 600px) { .tukki-help { bottom: 132px !important; font-size: 12px !important; } }`}</style>
      <Canvas shadows camera={{ position: [0, 5, 12], fov: 55, near: 0.1, far: 500 }} dpr={[1, 2]}>
        <fog attach="fog" args={[SKY_BOTTOM, 65, 150]} />
        <Sky />
        <hemisphereLight args={['#fff8e4', '#6c9552', 1.2]} />
        <ambientLight intensity={0.35} />
        <FollowLight target={playerPos} />
        <World />
        <Player key={round} input={input} onPose={onPose} />
        {HAKI_SPOTS.map((_, i) => <Haki key={i} index={i} collected={collected.has(i)} />)}
        {BUDDIES.map((c, i) => (
          <Buddy key={c} color={c} seed={i + 1} />
        ))}
      </Canvas>

      <div style={hudStyle}>
        <div style={{ fontSize: 13, letterSpacing: 2 }}>ツッキーくんの覇気あつめ</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>覇気 {collected.size} / {HAKI_SPOTS.length}</div>
        <div role="progressbar" aria-label="集めた覇気" aria-valuemin={0} aria-valuemax={HAKI_SPOTS.length} aria-valuenow={collected.size}
          style={{ height: 7, background: '#d8dfc7', borderRadius: 8, marginTop: 8 }}>
          <div style={{ width: `${collected.size / HAKI_SPOTS.length * 100}%`, height: '100%', background: '#efb838', borderRadius: 8 }} />
        </div>
        <div role="status" style={{ fontSize: 13, marginTop: 8 }}>{message}</div>
      </div>

      {showHelp && <div className="tukki-help" style={helpStyle}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>草原に散らばった32個の覇気を探そう</div>
        <div>WASD / 矢印で歩く · Space / Eでジャンプ · ドラッグで見回す</div>
        <div style={{ fontSize: 12, marginTop: 5 }}>スマホ：左半分で歩く・右半分で見回す</div>
      </div>}

      {collected.size === HAKI_SPOTS.length && <div className="tukki-help" style={{ ...helpStyle, pointerEvents: 'auto' }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>覇気マスター！</div>
        <div>草原の覇気をすべて集めたよ！</div>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => {
          found.current.clear(); setCollected(new Set()); previous.current.set(0, 0, 0);
          playerPos.current.set(0, 0, 0); setStick(0, 0); setButton(false);
          stickRef.current = null; setStickUi(null); drag.current = null;
          setMessage('もう一度、覇気を集めよう！'); setShowHelp(true); setRound((r) => r + 1);
        }} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 20, border: 0, background: '#f8cf62', color: '#52401c', fontWeight: 700, cursor: 'pointer' }}>もう一度あそぶ</button>
      </div>}

      <button style={{ ...btnStyle, position: 'absolute', right: 20, bottom: 24 }}
        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setButton(true); }}
        onPointerUp={(e) => { e.stopPropagation(); setButton(false); }}
        onPointerCancel={() => setButton(false)} onLostPointerCapture={() => setButton(false)} aria-label="ジャンプ">ジャンプ</button>

      <div style={{ position: 'absolute', bottom: 20, left: 16, pointerEvents: 'none', width: 'clamp(100px, 15vw, 150px)' }}>
        <svg viewBox="-64 -64 128 128" role="img" aria-label="覇気の地図。金色の点が残りの覇気、青い点がツッキーくん" style={{ width: '100%', display: 'block', background: 'rgba(255,253,239,.88)', borderRadius: '50%', boxShadow: '0 3px 14px #48653522' }}>
          <circle r={WORLD_RADIUS} fill="#d6e5bd" stroke="#91aa70" strokeWidth="1" />
          <path d="M0 -58V58M-50 -29L50 29M-50 29L50 -29" stroke="#f5e5b9" strokeWidth="4" />
          {HAKI_SPOTS.map((spot, i) => !collected.has(i) && <circle key={i} cx={spot.x} cy={spot.z} r="2.3" fill="#eab029" stroke="#9d741c" strokeWidth="0.5" />)}
          <circle cx={mapPos.x} cy={mapPos.z} r="3.5" fill="#409ed2" stroke="white" strokeWidth="1.5" />
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
