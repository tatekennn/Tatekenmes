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
  blue: { body: '#4ba7e6', ear: '#8fd0f5', belly: '#ffffff', muzzle: '#fff3dd', nose: '#4a2e1f', cheek: '#f7a8c0' },
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

const OUTLINE_COLOR = '#3b2616';

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
      armL.current.rotation.x = -0.9 + swing;
      armR.current.rotation.x = -0.9 - swing;
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
        {/* 胴体: 下が広い洋梨型（大きい球＋上に少し小さい球で頭とつなぐ） */}
        <Part geometry={S} material={mats.body} outline={O} position={[0, 1.25, 0]} scale={[1.3, 1.15, 1.15]} width={1.035} />
        <Part geometry={S} material={mats.body} outline={O} position={[0, 2.0, -0.02]} scale={[1.12, 0.95, 1.0]} width={1.035} />

        {/* 白い三日月のお腹: 横に広い白の上に体色をかぶせて、両端が上に尖った三日月にする */}
        <mesh geometry={S} material={mats.belly} position={[0, 1.2, 0.3]} scale={[1.2, 0.62, 0.96]} />
        <mesh geometry={S} material={mats.body} position={[0, 1.68, 0.3]} scale={[1.0, 0.52, 0.99]} />

        {/* 頭: 胴に深くめり込ませて首を作らない */}
        <group ref={head} position={[0, 2.75, 0.05]}>
          <Part geometry={S} material={mats.body} outline={O} scale={[1.08, 0.98, 1.0]} width={1.035} />
          {/* 耳: 小さめで頭の上側面。内側に明るい色の丸 */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.82, 0.72, -0.1]}>
              <Part geometry={S} material={mats.body} outline={O} scale={0.3} width={1.1} />
              <mesh geometry={S} material={mats.ear} position={[0, 0, 0.16]} scale={0.16} />
            </group>
          ))}
          {/* 目: 小さな横長の点を離して置く */}
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={S} material={mats.eye} position={[s * 0.5, 0.0, 0.93]} scale={[0.1, 0.06, 0.05]} />
          ))}
          {/* 鼻: 大きめの濃い茶色、顔の中央 */}
          <Part geometry={S} material={mats.nose} outline={O} position={[0, -0.1, 1.02]} scale={[0.24, 0.2, 0.16]} width={1.12} castShadow={false} />
          {/* マズル: 鼻の下に小さなクリーム色 */}
          <Part geometry={S} material={mats.muzzle} outline={O} position={[0, -0.42, 0.92]} scale={[0.36, 0.24, 0.22]} width={1.08} castShadow={false} />
          {/* 牙: マズルの両脇から下に */}
          {[-1, 1].map((s) => (
            <Part
              key={s}
              geometry={geo.cone}
              material={mats.fang}
              outline={O}
              position={[s * 0.3, -0.58, 0.98]}
              rotation={[Math.PI, 0, s * 0.15]}
              scale={[0.07, 0.2, 0.07]}
              width={1.15}
              castShadow={false}
            />
          ))}
          {/* ほっぺ */}
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={S} material={mats.cheek} position={[s * 0.72, -0.25, 0.72]} scale={[0.2, 0.13, 0.08]} />
          ))}
        </group>

        {/* 腕: 肩から前へ曲げ、お腹の前で手を合わせる。爪は内側向き */}
        {[
          { r: armL, s: -1 },
          { r: armR, s: 1 },
        ].map(({ r, s }) => (
          <group key={s} ref={r} position={[s * 0.98, 1.7, 0.5]} rotation={[-0.9, s * 1.05, 0]}>
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
          <group key={s} ref={r} position={[s * 0.6, 0.55, 0.05]} rotation={[0, 0, s * -0.12]}>
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
