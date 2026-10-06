'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  ツッキーくん 3D モデル                                              */
/*  元絵の特徴: 頭と胴がつながった洋梨型のシルエット / 小さな横長の目    */
/*  大きな鼻と小さなクリーム色のマズル / 口元の牙 / 横に広い白い三日月   */
/*  お腹の前で合わせた手と爪 / 茶色の輪郭線とフラットな塗り             */
/*  身長はおよそ 3.6（足裏 y=0 〜 耳の先）                              */
/* ------------------------------------------------------------------ */

export interface TukkiPalette {
  body: string;
  ear: string; // 耳の内側
  belly: string;
  muzzle: string;
  nose: string;
  cheek: string;
}

export const TUKKI_COLORS: Record<string, TukkiPalette> = {
  blue: { body: '#4ba7e6', ear: '#f8c5cb', belly: '#ffffff', muzzle: '#fff3dd', nose: '#4a2e1f', cheek: '#f7a8c0' },
  green: { body: '#55c46f', ear: '#a2e8b2', belly: '#ffffff', muzzle: '#f6ffe3', nose: '#3a2e1f', cheek: '#ffb9a6' },
  lime: { body: '#bfdc4f', ear: '#e2f39a', belly: '#ffffff', muzzle: '#fcffe8', nose: '#3a3a1f', cheek: '#ffb4b4' },
  orange: { body: '#f59d3e', ear: '#ffcf96', belly: '#ffffff', muzzle: '#fff3dd', nose: '#4a2e1f', cheek: '#ff93a4' },
  pink: { body: '#f59fc5', ear: '#ffd2e6', belly: '#ffffff', muzzle: '#fff1f6', nose: '#4a2235', cheek: '#ff7394' },
  purple: { body: '#9f80df', ear: '#cfbdf5', belly: '#ffffff', muzzle: '#f5f0ff', nose: '#2e2440', cheek: '#ffa3d4' },
  tan: { body: '#dcb48f', ear: '#f1d8bf', belly: '#fff9ef', muzzle: '#fff3dd', nose: '#4a2e1f', cheek: '#ffa3b9' },
  white: { body: '#f6f6f6', ear: '#ffe3ec', belly: '#ffffff', muzzle: '#fff3dd', nose: '#4a2e1f', cheek: '#ffb9c9' },
  yellow: { body: '#f7d44f', ear: '#fff0a8', belly: '#ffffff', muzzle: '#fff9dd', nose: '#4a2e1f', cheek: '#ffa3a4' },
};

export type TukkiColor = keyof typeof TUKKI_COLORS;

const OUTLINE_COLOR = '#765329';

/** 3段階のトゥーン陰影（フラットな塗りに見せる） */
function makeGradientMap(): THREE.DataTexture {
  const data = new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** 外から毎フレーム呼ぶアニメーション用ハンドル */
export interface TukkiHandle {
  group: THREE.Group;
  /** walk: 歩きの位相（rad）、amount: 0..1 で振りの大きさ、lean: 前傾（rad）、t: 経過秒 */
  animate: (walk: number, amount: number, lean: number, t: number) => void;
}

interface Props {
  color: TukkiColor;
  scale?: number;
}

type Vec3 = [number, number, number];

/** 輪郭線付きのパーツ。裏面だけを描く少し大きい複製で線を出す */
function Part({
  geometry,
  material,
  outline,
  position,
  rotation,
  scale,
  width = 1.05,
  castShadow = true,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  outline: THREE.Material;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
  width?: number;
  castShadow?: boolean;
}) {
  return (
    <mesh geometry={geometry} material={material} position={position} rotation={rotation} scale={scale} castShadow={castShadow}>
      <mesh geometry={geometry} material={outline} scale={width} />
    </mesh>
  );
}

// A single surface keeps the head and belly connected without overlapping outlines.
const BODY_PROFILE = new THREE.SplineCurve([
  new THREE.Vector2(0, 0.24), new THREE.Vector2(0.82, 0.38),
  new THREE.Vector2(1.25, 0.95), new THREE.Vector2(1.29, 1.45),
  new THREE.Vector2(1.13, 2.1), new THREE.Vector2(1.08, 2.8),
  new THREE.Vector2(0.84, 3.3), new THREE.Vector2(0.48, 3.48),
  new THREE.Vector2(0.2, 3.54), new THREE.Vector2(0, 3.55),
]);
const BODY_POINTS = BODY_PROFILE.getPoints(96);
function frontSurface(x: number, y: number) {
  const i = BODY_POINTS.findIndex((point) => point.y >= y);
  const a = BODY_POINTS[Math.max(0, i - 1)];
  const b = BODY_POINTS[Math.max(0, i)];
  const blend = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
  const radius = THREE.MathUtils.lerp(a.x, b.x, blend);
  return Math.sqrt(Math.max(0, radius * radius - x * x)) * 0.78;
}
function makeBelly() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.04, 1.94);
  shape.bezierCurveTo(-0.65, 1.57, 0.65, 1.57, 1.04, 1.94);
  shape.bezierCurveTo(0.7, 1.27, -0.7, 1.27, -1.04, 1.94);
  const geometry = new THREE.ShapeGeometry(shape, 48);
  // Subdivide the patch so its interior follows the rounded body too.
  const source = geometry.toNonIndexed();
  const vertices: number[] = [];
  const pos = source.getAttribute('position');
  const point = (i: number) => new THREE.Vector2(pos.getX(i), pos.getY(i));
  const emit = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, depth: number) => {
    if (depth === 0) {
      for (const v of [a, b, c]) vertices.push(v.x, v.y, frontSurface(v.x, v.y) + 0.018);
      return;
    }
    const ab = a.clone().lerp(b, 0.5), bc = b.clone().lerp(c, 0.5), ca = c.clone().lerp(a, 0.5);
    emit(a, ab, ca, depth - 1); emit(ab, b, bc, depth - 1);
    emit(ca, bc, c, depth - 1); emit(ab, bc, ca, depth - 1);
  };
  for (let i = 0; i < pos.count; i += 3) emit(point(i), point(i + 1), point(i + 2), 3);
  source.dispose(); geometry.dispose();
  const patch = new THREE.BufferGeometry();
  patch.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  patch.computeVertexNormals();
  return patch;
}

const TukkiModel = forwardRef<TukkiHandle, Props>(function TukkiModel({ color, scale = 1 }, ref) {
  const p = TUKKI_COLORS[color];
  const group = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);

  const geo = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(1, 40, 28),
      body: new THREE.LatheGeometry(BODY_POINTS, 64),
      belly: makeBelly(),
      cone: new THREE.ConeGeometry(1, 1, 10),
      capsule: new THREE.CapsuleGeometry(1, 1, 8, 16),
    }),
    [],
  );

  const mats = useMemo(() => {
    const gradientMap = makeGradientMap();
    const toon = (c: string, extra: Partial<THREE.MeshToonMaterialParameters> = {}) =>
      new THREE.MeshToonMaterial({ color: c, gradientMap, ...extra });
    return {
      outline: new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide }),
      body: toon(p.body),
      ear: toon(p.ear),
      belly: toon(p.belly),
      muzzle: toon(p.muzzle),
      nose: toon(p.nose),
      eye: new THREE.MeshBasicMaterial({ color: '#2a1a10' }),
      cheek: toon(p.cheek, { transparent: true, opacity: 0.9 }),
      fang: toon('#ffffff'),
      claw: toon('#fff3dd'),
    };
  }, [p]);

  useImperativeHandle(ref, () => ({
    group: group.current,
    animate: (walk, amount, lean, t) => {
      const swing = Math.sin(walk) * 0.7 * amount;
      // 腕は基本「お腹の前で合わせる」構え。歩くとそこから前後に揺れる
      armL.current.rotation.x = -0.3 + swing * 0.35;
      armR.current.rotation.x = -0.3 - swing * 0.35;
      legL.current.rotation.x = -swing * 0.9;
      legR.current.rotation.x = swing * 0.9;
      // 体の前傾と弾み
      torso.current.rotation.x = lean;
      torso.current.position.y = Math.abs(Math.sin(walk)) * 0.1 * amount + Math.sin(t * 2.2) * 0.025;
      // 呼吸と首振り
      const breath = 1 + Math.sin(t * 2.2) * 0.012;
      torso.current.scale.set(breath, 1 / breath, breath);
      head.current.rotation.z = Math.sin(walk * 0.5) * 0.06 * amount + Math.sin(t * 1.3) * 0.025;
      head.current.rotation.y = Math.sin(t * 0.9) * 0.08 * (1 - amount);
    },
  }));

  const S = geo.sphere;
  const O = mats.outline;

  return (
    <group ref={group} scale={scale}>
      <group ref={torso}>
        {/* 頭から胴へ一続きの洋梨型。白いお腹は表面に沿う三日月。 */}
        <Part geometry={geo.body} material={mats.body} outline={O} scale={[1, 1, 0.78]} width={1.025} />
        <mesh geometry={geo.belly} material={mats.belly} />

        <group ref={head} position={[0, 2.7, 0]}>
          {/* 耳: 小さめで頭の上側面。内側に明るい色の丸 */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.82, 0.67, -0.08]}>
              <Part geometry={S} material={mats.body} outline={O} scale={0.24} width={1.1} />
              <mesh geometry={S} material={mats.ear} position={[0, 0, 0.16]} scale={0.135} />
            </group>
          ))}
          {/* 目: 小さな横長の点を離して置く */}
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={S} material={mats.eye} position={[s * 0.5, 0.05, 0.78]} scale={[0.065, 0.047, 0.035]} />
          ))}
          {/* 鼻: 大きめの濃い茶色、顔の中央 */}
          <Part geometry={S} material={mats.nose} outline={O} position={[0, -0.11, 0.92]} scale={[0.27, 0.2, 0.15]} width={1.12} castShadow={false} />
          <mesh geometry={S} material={mats.muzzle} position={[-0.075, -0.04, 1.058]} scale={[0.065, 0.05, 0.012]} />
          {/* マズル: 鼻の下に小さなクリーム色 */}
          <Part geometry={S} material={mats.muzzle} outline={O} position={[0, -0.34, 0.87]} scale={[0.35, 0.18, 0.14]} width={1.08} castShadow={false} />
          {/* 牙: マズルの両脇から下に */}
          {[-1, 1].map((s) => (
            <Part
              key={s}
              geometry={geo.cone}
              material={mats.fang}
              outline={O}
              position={[s * 0.24, -0.56, 0.94]}
              rotation={[Math.PI, 0, s * 0.15]}
              scale={[0.065, 0.32, 0.065]}
              width={1.15}
              castShadow={false}
            />
          ))}
          {/* ほっぺ */}
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={S} material={mats.cheek} position={[s * 0.73, -0.14, 0.66]} scale={[0.17, 0.075, 0.035]} />
          ))}
        </group>

        {/* 腕: 肩から前へ曲げ、お腹の前で手を合わせる。爪は内側向き */}
        {[
          { r: armL, s: -1 },
          { r: armR, s: 1 },
        ].map(({ r, s }) => (
          <group key={s} ref={r} position={[s * 1.02, 1.57, 0.82]} rotation={[-0.3, 0, -s * 0.95]}>
            <Part geometry={geo.capsule} material={mats.body} outline={O} position={[0, -0.45, 0]} scale={[0.27, 0.32, 0.27]} width={1.08} />
            <Part geometry={S} material={mats.body} outline={O} position={[0, -0.9, 0]} scale={[0.3, 0.26, 0.3]} width={1.08} />
            {[-1, 0, 1].map((k) => (
              <Part
                key={k}
                geometry={geo.cone}
                material={mats.claw}
                outline={O}
                position={[s * -0.18, -0.95 + k * 0.1, k * 0.14]}
                rotation={[0, 0, s * Math.PI / 2]}
                scale={[0.05, 0.16, 0.05]}
                width={1.2}
                castShadow={false}
              />
            ))}
          </group>
        ))}

        {/* 脚: 短く太く、やや外に開いた立ち方 */}
        {[
          { r: legL, s: -1 },
          { r: legR, s: 1 },
        ].map(({ r, s }) => (
          <group key={s} ref={r} position={[s * 0.74, 0.49, 0.02]} rotation={[0, 0, s * -0.12]}>
            <Part geometry={geo.capsule} material={mats.body} outline={O} position={[0, -0.15, 0]} scale={[0.36, 0.2, 0.36]} width={1.06} />
            <Part geometry={S} material={mats.body} outline={O} position={[0, -0.38, 0.12]} scale={[0.38, 0.22, 0.46]} width={1.06} />
            {[-1, 0, 1].map((k) => (
              <Part
                key={k}
                geometry={geo.cone}
                material={mats.claw}
                outline={O}
                position={[k * 0.16, -0.45, 0.56]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[0.05, 0.16, 0.05]}
                width={1.2}
                castShadow={false}
              />
            ))}
          </group>
        ))}
      </group>
    </group>
  );
});

export default TukkiModel;
