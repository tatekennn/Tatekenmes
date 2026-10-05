'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import TukkiModel, { TUKKI_COLORS, type TukkiColor, type TukkiHandle } from './TukkiModel';

/* ------------------------------------------------------------------ */
/*  定数                                                               */
/* ------------------------------------------------------------------ */
const PLAYER_COLOR: TukkiColor = 'blue';
const BUDDIES = (Object.keys(TUKKI_COLORS) as TukkiColor[]).filter((c) => c !== PLAYER_COLOR);

const WORLD_RADIUS = 70; // XZ の行動範囲
const WORLD_HEIGHT = 45; // Y の上限
const FLOOR_Y = 0;

const MAX_SPEED = 18;
const ACCEL = 60;
const DAMP = 6;

const SKY_TOP = '#0b0a2a';
const SKY_BOTTOM = '#2a1b5e';

/* ------------------------------------------------------------------ */
/*  入力（キーボード＋タッチ）を ref に集約し、描画ループから読む       */
/* ------------------------------------------------------------------ */
interface InputState {
  fwd: number; // -1..1（前後）
  side: number; // -1..1（左右）
  vert: number; // -1..1（上下）
  yawDelta: number; // ドラッグによるカメラ回転の蓄積
  pitchDelta: number;
}

function useInput() {
  const input = useRef<InputState>({ fwd: 0, side: 0, vert: 0, yawDelta: 0, pitchDelta: 0 });
  const keys = useRef<Set<string>>(new Set());
  const stick = useRef({ x: 0, y: 0 });
  const buttons = useRef({ up: false, down: false });
  const recompute = useRef(() => {});

  useEffect(() => {
    recompute.current = () => {
      const k = keys.current;
      const kf = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      const ks = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const kv =
        (k.has('Space') || k.has('KeyE') || buttons.current.up ? 1 : 0) -
        (k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyQ') || buttons.current.down ? 1 : 0);
      input.current.fwd = THREE.MathUtils.clamp(kf + -stick.current.y, -1, 1);
      input.current.side = THREE.MathUtils.clamp(ks + stick.current.x, -1, 1);
      input.current.vert = THREE.MathUtils.clamp(kv, -1, 1);
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
  const setButton = (which: 'up' | 'down', pressed: boolean) => {
    buttons.current[which] = pressed;
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
  const pos = useRef(new THREE.Vector3(0, 6, 0));
  const vel = useRef(new THREE.Vector3());
  const walk = useRef(0);
  const facing = useRef(0); // モデルの向き（yaw）
  const { camera } = useThree();

  // カメラの向き（yaw/pitch）はプレイヤー側で管理し、三人称で追従させる
  const yaw = useRef(0);
  const pitch = useRef(0.3);
  const camPos = useRef(new THREE.Vector3(0, 10, 14));

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const inp = input.current;
    const t = clock.getElapsedTime();

    // ドラッグ分を消費
    yaw.current -= inp.yawDelta;
    pitch.current = THREE.MathUtils.clamp(pitch.current + inp.pitchDelta, -0.5, 1.2);
    inp.yawDelta = 0;
    inp.pitchDelta = 0;

    // カメラの yaw に相対した移動方向（水平面）。カメラは +sin/+cos 側に居るので前方はその逆
    const fwdDir = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const sideDir = new THREE.Vector3(-fwdDir.z, 0, fwdDir.x);
    const wish = new THREE.Vector3()
      .addScaledVector(fwdDir, inp.fwd)
      .addScaledVector(sideDir, inp.side)
      .add(new THREE.Vector3(0, inp.vert, 0));
    if (wish.lengthSq() > 1) wish.normalize();

    // 加速と減衰（入力の無い軸だけ減衰させると操作感が素直になる）
    vel.current.addScaledVector(wish, ACCEL * dt);
    const damp = Math.exp(-DAMP * dt);
    if (inp.vert === 0) vel.current.y *= damp;
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
    vel.current.y = THREE.MathUtils.clamp(vel.current.y, -MAX_SPEED, MAX_SPEED);

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
    if (pos.current.y > WORLD_HEIGHT) {
      pos.current.y = WORLD_HEIGHT;
      vel.current.y = Math.min(0, vel.current.y);
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
      // 空中では少しふわっと浮く
      m.group.position.y += pos.current.y > FLOOR_Y + 0.1 ? Math.sin(t * 2.5) * 0.08 : 0;
    }

    // 三人称カメラ追従
    const dist = 13;
    const offset = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    ).multiplyScalar(dist);
    const target = new THREE.Vector3().copy(pos.current).add(offset);
    target.y = Math.max(target.y, FLOOR_Y + 1.2);
    camPos.current.lerp(target, 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos.current);
    camera.lookAt(pos.current.x, pos.current.y + 1.8, pos.current.z);

    onPose(pos.current, speed);
  });

  return <TukkiModel ref={model} color={PLAYER_COLOR} />;
}

/* ------------------------------------------------------------------ */
/*  仲間のツッキーくん（8色）が空間を巡回する                             */
/* ------------------------------------------------------------------ */
function Buddy({ color, seed }: { color: TukkiColor; seed: number }) {
  const model = useRef<TukkiHandle>(null);
  const radius = 16 + (seed % 5) * 9;
  const height = 2 + ((seed * 7) % 28);
  const omega = (0.1 + (seed % 3) * 0.05) * (seed % 2 === 0 ? 1 : -1);
  const phase = seed * 1.7;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = model.current;
    if (!m) return;
    const a = t * omega + phase;
    const y = height + Math.sin(t * 0.8 + phase) * 2;
    m.group.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    // 円周の接線方向を向く
    const vx = -Math.sin(a) * omega;
    const vz = Math.cos(a) * omega;
    m.group.rotation.y = Math.atan2(vx, vz);
    m.animate(t * (5 + seed * 0.3), 0.8, 0.15, t + seed);
  });

  return <TukkiModel ref={model} color={color} scale={0.85} />;
}

/* ------------------------------------------------------------------ */
/*  空間：床・雲・浮遊クリスタル・境界リング                              */
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

function Crystal({ position, size, hue, seed }: { position: [number, number, number]; size: number; hue: number; seed: number }) {
  const m = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    m.current.rotation.y = t * 0.4 + seed;
    m.current.rotation.x = Math.sin(t * 0.5 + seed) * 0.3;
    m.current.position.y = position[1] + Math.sin(t * 0.9 + seed) * 0.6;
  });
  return (
    <mesh ref={m} position={position} castShadow>
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial
        color={`hsl(${hue}, 85%, 70%)`}
        emissive={`hsl(${hue}, 85%, 45%)`}
        emissiveIntensity={0.9}
        roughness={0.3}
        flatShading
      />
    </mesh>
  );
}

function World() {
  const crystals = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2 + (i % 3) * 0.4;
        const r = 14 + (i % 5) * 12;
        return {
          pos: [Math.cos(a) * r, 2 + ((i * 5) % (WORLD_HEIGHT - 4)), Math.sin(a) * r] as [number, number, number],
          size: 0.7 + (i % 3) * 0.45,
          hue: (i * 37) % 360,
        };
      }),
    [],
  );
  const clouds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.3;
        const r = 22 + (i % 4) * 14;
        return {
          pos: [Math.cos(a) * r, 6 + ((i * 9) % 32), Math.sin(a) * r] as [number, number, number],
          scale: 1 + (i % 3) * 0.5,
        };
      }),
    [],
  );
  return (
    <>
      {/* 床 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.01, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS + 6, 96]} />
        <meshStandardMaterial color="#1a1444" roughness={1} />
      </mesh>
      <gridHelper args={[WORLD_RADIUS * 2, 40, '#6b4fd6', '#2f2470']} position={[0, FLOOR_Y, 0]} />
      {/* 床のリング模様 */}
      {[10, 25, 40, 55].map((rr) => (
        <mesh key={rr} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.02, 0]}>
          <ringGeometry args={[rr - 0.1, rr + 0.1, 96]} />
          <meshBasicMaterial color="#8d78ff" transparent opacity={0.25} />
        </mesh>
      ))}
      {/* 行動範囲の境界 */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <mesh key={f} position={[0, WORLD_HEIGHT * f, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[WORLD_RADIUS - 0.15, WORLD_RADIUS, 96]} />
          <meshBasicMaterial color="#7c5cff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {crystals.map((c, i) => (
        <Crystal key={i} position={c.pos} size={c.size} hue={c.hue} seed={i} />
      ))}
      {clouds.map((c, i) => (
        <Cloud key={i} position={c.pos} scale={c.scale} seed={i} />
      ))}
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
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
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
      intensity={2.2}
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
  const [hud, setHud] = useState({ x: 0, y: 6, z: 0, speed: 0 });
  const [showHelp, setShowHelp] = useState(true);
  const hudTimer = useRef(0);
  const playerPos = useRef(new THREE.Vector3(0, 6, 0));
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const stickRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [stickUi, setStickUi] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const onPose = (p: THREE.Vector3, speed: number) => {
    playerPos.current.copy(p);
    hudTimer.current += 1;
    if (hudTimer.current % 6 === 0) setHud({ x: p.x, y: p.y, z: p.z, speed });
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
      <Canvas shadows camera={{ position: [0, 10, 14], fov: 55, near: 0.1, far: 500 }} dpr={[1, 2]}>
        <fog attach="fog" args={[SKY_BOTTOM, 70, 200]} />
        <Sky />
        <hemisphereLight args={['#cfd8ff', '#3b2a7a', 0.9]} />
        <ambientLight intensity={0.35} />
        <FollowLight target={playerPos} />
        <Stars radius={200} depth={80} count={4000} factor={5} fade speed={0.5} />
        <World />
        <Player input={input} onPose={onPose} />
        {BUDDIES.map((c, i) => (
          <Buddy key={c} color={c} seed={i + 1} />
        ))}
      </Canvas>

      {/* HUD */}
      <div style={hudStyle}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>tukki.覇気.com</div>
        <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
          x {hud.x.toFixed(1)} / y {hud.y.toFixed(1)} / z {hud.z.toFixed(1)} · 速度 {hud.speed.toFixed(1)}
        </div>
      </div>

      {showHelp && (
        <div style={helpStyle}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>ツッキーくんを動かそう</div>
          <div>WASD / 矢印: 前後左右</div>
          <div>Space / E: 上昇　Shift / Q: 下降</div>
          <div>ドラッグ: カメラ回転</div>
          <div style={{ marginTop: 6, opacity: 0.7 }}>スマホ: 左半分スティック・右半分ドラッグ・右下ボタンで上下</div>
        </div>
      )}

      {/* 上下ボタン（タッチ用） */}
      <div style={{ position: 'absolute', right: 16, bottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(['up', 'down'] as const).map((which) => (
          <button
            key={which}
            style={btnStyle}
            onPointerDown={(e) => {
              e.stopPropagation();
              setButton(which, true);
            }}
            onPointerUp={() => setButton(which, false)}
            onPointerCancel={() => setButton(which, false)}
            onPointerLeave={() => setButton(which, false)}
            aria-label={which === 'up' ? '上昇' : '下降'}
          >
            {which === 'up' ? '▲' : '▼'}
          </button>
        ))}
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
  color: '#f7f1df',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  textShadow: '0 1px 6px rgba(0,0,0,.8)',
  pointerEvents: 'none',
};

const helpStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 32,
  transform: 'translateX(-50%)',
  background: 'rgba(10, 8, 30, .75)',
  border: '1px solid rgba(124, 92, 255, .5)',
  borderRadius: 12,
  padding: '12px 18px',
  color: '#f7f1df',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  pointerEvents: 'none',
  textAlign: 'center',
  maxWidth: '90vw',
};

const btnStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  border: '1px solid rgba(124, 92, 255, .6)',
  background: 'rgba(10, 8, 30, .6)',
  color: '#f7f1df',
  fontSize: 24,
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
