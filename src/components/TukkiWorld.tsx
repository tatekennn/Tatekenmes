'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  定数                                                               */
/* ------------------------------------------------------------------ */
const FRAME_COUNT = 12;
const COLORS = ['blue', 'green', 'lime', 'orange', 'pink', 'purple', 'tan', 'white', 'yellow'] as const;
type Color = (typeof COLORS)[number];

const PLAYER_COLOR: Color = 'blue';
const WORLD_RADIUS = 70; // XZ の行動範囲
const WORLD_HEIGHT = 45; // Y の上限
const FLOOR_Y = 0;
const SPRITE_H = 3.2;
const SPRITE_W = SPRITE_H * (320 / 380);

const MAX_SPEED = 18;
const ACCEL = 60;
const DAMP = 6;

function frameUrls(color: Color): string[] {
  return Array.from({ length: FRAME_COUNT }, (_, i) => `/tukki/${color}_${String(i + 1).padStart(2, '0')}.png`);
}

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

  // キーボード
  useEffect(() => {
    const recompute = () => {
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
      recompute();
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      recompute();
    };
    const blur = () => {
      keys.current.clear();
      recompute();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    // タッチ側から呼べるように公開
    (input.current as InputState & { recompute?: () => void }).recompute = recompute;
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const setStick = (x: number, y: number) => {
    stick.current = { x, y };
    (input.current as InputState & { recompute?: () => void }).recompute?.();
  };
  const setButton = (which: 'up' | 'down', pressed: boolean) => {
    buttons.current[which] = pressed;
    (input.current as InputState & { recompute?: () => void }).recompute?.();
  };

  return { input, setStick, setButton };
}

/* ------------------------------------------------------------------ */
/*  アニメーションスプライト（12コマを順番に差し替える）                */
/* ------------------------------------------------------------------ */
function useFrames(color: Color): THREE.Texture[] {
  const urls = useMemo(() => frameUrls(color), [color]);
  const textures = useLoader(THREE.TextureLoader, urls);
  useEffect(() => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
    }
  }, [textures]);
  return textures;
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
  const frames = useFrames(PLAYER_COLOR);
  const sprite = useRef<THREE.Sprite>(null);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false }), [frames]);
  const pos = useRef(new THREE.Vector3(0, 6, 0));
  const vel = useRef(new THREE.Vector3());
  const frameT = useRef(0);
  const facing = useRef(1);
  const { camera } = useThree();

  // カメラの向き（yaw/pitch）はプレイヤー側で管理し、三人称で追従させる
  const yaw = useRef(Math.PI); // 初期は +Z 側から見る
  const pitch = useRef(0.35);
  const camPos = useRef(new THREE.Vector3(0, 10, 14));

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const inp = input.current;

    // ドラッグ分を消費
    yaw.current -= inp.yawDelta;
    pitch.current = THREE.MathUtils.clamp(pitch.current + inp.pitchDelta, -0.6, 1.2);
    inp.yawDelta = 0;
    inp.pitchDelta = 0;

    // カメラの yaw に相対した移動方向（水平面）
    const fwdDir = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current)).multiplyScalar(-1);
    const sideDir = new THREE.Vector3(-fwdDir.z, 0, fwdDir.x);
    const wish = new THREE.Vector3()
      .addScaledVector(fwdDir, inp.fwd)
      .addScaledVector(sideDir, inp.side)
      .add(new THREE.Vector3(0, inp.vert, 0));
    if (wish.lengthSq() > 1) wish.normalize();

    // 加速と減衰
    vel.current.addScaledVector(wish, ACCEL * dt);
    const damp = Math.exp(-DAMP * dt);
    if (wish.lengthSq() === 0) vel.current.multiplyScalar(damp);
    else {
      // 入力の無い軸だけ減衰させると操作感が素直になる
      if (inp.vert === 0) vel.current.y *= damp;
      const h = new THREE.Vector3(vel.current.x, 0, vel.current.z);
      if (inp.fwd === 0 && inp.side === 0) {
        vel.current.x *= damp;
        vel.current.z *= damp;
      } else if (h.length() > MAX_SPEED) {
        h.setLength(MAX_SPEED);
        vel.current.x = h.x;
        vel.current.z = h.z;
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
    const minY = FLOOR_Y + SPRITE_H / 2;
    if (pos.current.y < minY) {
      pos.current.y = minY;
      vel.current.y = Math.max(0, vel.current.y);
    }
    if (pos.current.y > WORLD_HEIGHT) {
      pos.current.y = WORLD_HEIGHT;
      vel.current.y = Math.min(0, vel.current.y);
    }

    // スプライト更新（歩きコマ・向き）
    const speed = vel.current.length();
    const s = sprite.current;
    if (s) {
      s.position.copy(pos.current);
      if (speed > 0.8) {
        frameT.current += dt * (8 + speed * 0.6);
        mat.map = frames[Math.floor(frameT.current) % FRAME_COUNT];
      } else {
        frameT.current = 0;
        mat.map = frames[0];
      }
      // カメラから見て左に進んでいるなら反転
      const camRight = new THREE.Vector3().crossVectors(camera.up, new THREE.Vector3().subVectors(camera.position, pos.current)).normalize();
      const lateral = vel.current.dot(camRight);
      if (Math.abs(lateral) > 1.5) facing.current = lateral > 0 ? -1 : 1;
      s.scale.set(SPRITE_W * facing.current, SPRITE_H, 1);
      // ふわっと上下に揺れる
      s.position.y += Math.sin(performance.now() / 500) * 0.08;
    }

    // 三人称カメラ追従
    const dist = 14;
    const offset = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    ).multiplyScalar(dist);
    const target = new THREE.Vector3().copy(pos.current).add(offset);
    if (target.y < FLOOR_Y + 1) target.y = FLOOR_Y + 1;
    camPos.current.lerp(target, 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos.current);
    camera.lookAt(pos.current.x, pos.current.y + 0.5, pos.current.z);

    onPose(pos.current, speed);
  });

  return <sprite ref={sprite} material={mat} position={[0, 6, 0]} scale={[SPRITE_W, SPRITE_H, 1]} />;
}

/* ------------------------------------------------------------------ */
/*  仲間のツッキーくん（8色）がふわふわ漂う                              */
/* ------------------------------------------------------------------ */
function Buddy({ color, seed }: { color: Color; seed: number }) {
  const frames = useFrames(color);
  const sprite = useRef<THREE.Sprite>(null);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false }), [frames]);
  const radius = 14 + (seed % 5) * 9;
  const height = 4 + ((seed * 7) % 30);
  const speed = 0.12 + (seed % 3) * 0.05;
  const phase = seed * 1.7;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = sprite.current;
    if (!s) return;
    const a = t * speed + phase;
    s.position.set(Math.cos(a) * radius, height + Math.sin(t * 0.8 + phase) * 2, Math.sin(a) * radius);
    mat.map = frames[Math.floor(t * 8 + seed) % FRAME_COUNT];
    const dir = Math.cos(a + Math.PI / 2) >= 0 ? -1 : 1; // 進行方向で反転
    s.scale.set(SPRITE_W * 0.85 * dir, SPRITE_H * 0.85, 1);
  });

  return <sprite ref={sprite} material={mat} />;
}

/* ------------------------------------------------------------------ */
/*  空間の目印（床グリッド・浮遊する光の柱・リング）                      */
/* ------------------------------------------------------------------ */
function World() {
  const pillars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2 + (i % 3) * 0.4;
        const r = 18 + (i % 4) * 13;
        return {
          pos: [Math.cos(a) * r, (i * 5) % WORLD_HEIGHT, Math.sin(a) * r] as [number, number, number],
          size: 0.8 + (i % 3) * 0.5,
          hue: (i * 37) % 360,
        };
      }),
    [],
  );
  return (
    <>
      <gridHelper args={[WORLD_RADIUS * 2, 40, '#3a2a60', '#1b1430']} position={[0, FLOOR_Y, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.02, 0]}>
        <circleGeometry args={[WORLD_RADIUS, 64]} />
        <meshStandardMaterial color="#0b0820" />
      </mesh>
      {/* 行動範囲の境界 */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <mesh key={f} position={[0, WORLD_HEIGHT * f, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[WORLD_RADIUS - 0.15, WORLD_RADIUS, 96]} />
          <meshBasicMaterial color="#7c5cff" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {pillars.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <icosahedronGeometry args={[p.size, 0]} />
          <meshStandardMaterial
            color={`hsl(${p.hue}, 80%, 65%)`}
            emissive={`hsl(${p.hue}, 80%, 40%)`}
            emissiveIntensity={0.8}
            flatShading
          />
        </mesh>
      ))}
    </>
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
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const stickRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [stickUi, setStickUi] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const onPose = (p: THREE.Vector3, speed: number) => {
    hudTimer.current += 1;
    if (hudTimer.current % 6 === 0) setHud({ x: p.x, y: p.y, z: p.z, speed });
    if (speed > 2 && showHelp) setShowHelp(false);
  };

  // 右側ドラッグ＝カメラ回転、左側ドラッグ＝仮想スティック
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
      style={{ position: 'fixed', inset: 0, background: '#050314', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas camera={{ position: [0, 10, 14], fov: 60, near: 0.1, far: 400 }} dpr={[1, 2]}>
        <color attach="background" args={['#050314']} />
        <fog attach="fog" args={['#050314', 60, 160]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 30, 10]} intensity={1.5} />
        <Stars radius={150} depth={60} count={3000} factor={4} fade speed={0.6} />
        <World />
        <React.Suspense fallback={null}>
          <Player input={input} onPose={onPose} />
          {COLORS.filter((c) => c !== PLAYER_COLOR).map((c, i) => (
            <Buddy key={c} color={c} seed={i + 1} />
          ))}
        </React.Suspense>
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
        <button
          style={btnStyle}
          onPointerDown={(e) => {
            e.stopPropagation();
            setButton('up', true);
          }}
          onPointerUp={() => setButton('up', false)}
          onPointerCancel={() => setButton('up', false)}
          onPointerLeave={() => setButton('up', false)}
          aria-label="上昇"
        >
          ▲
        </button>
        <button
          style={btnStyle}
          onPointerDown={(e) => {
            e.stopPropagation();
            setButton('down', true);
          }}
          onPointerUp={() => setButton('down', false)}
          onPointerCancel={() => setButton('down', false)}
          onPointerLeave={() => setButton('down', false)}
          aria-label="下降"
        >
          ▼
        </button>
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
