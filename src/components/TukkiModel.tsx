'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  ツッキーくん 3D モデル（プリミティブの組み合わせ）                   */
/*  身長はおよそ 3.4（足裏 y=0 〜 耳の先 y≈3.4）                        */
/* ------------------------------------------------------------------ */

export interface TukkiPalette {
  body: string;
  bodyDark: string; // 耳の内側など
  belly: string;
  muzzle: string;
  nose: string;
  cheek: string;
}

export const TUKKI_COLORS: Record<string, TukkiPalette> = {
  blue: { body: '#4aa3e3', bodyDark: '#2f7fc2', belly: '#ffffff', muzzle: '#fff2dc', nose: '#3a2a22', cheek: '#ff9fb5' },
  green: { body: '#4fbf6b', bodyDark: '#2f9a4e', belly: '#ffffff', muzzle: '#f5ffe0', nose: '#2a3a22', cheek: '#ffb5a0' },
  lime: { body: '#b8d94a', bodyDark: '#8fb52a', belly: '#ffffff', muzzle: '#fbffe6', nose: '#3a3a22', cheek: '#ffb0b0' },
  orange: { body: '#f29a3c', bodyDark: '#d37a1f', belly: '#ffffff', muzzle: '#fff2dc', nose: '#3a2a22', cheek: '#ff8fa0' },
  pink: { body: '#f49ac1', bodyDark: '#e06fa3', belly: '#ffffff', muzzle: '#fff0f5', nose: '#3a2230', cheek: '#ff6f8f' },
  purple: { body: '#9b7bdc', bodyDark: '#7656c0', belly: '#ffffff', muzzle: '#f4efff', nose: '#2a223a', cheek: '#ff9fd0' },
  tan: { body: '#d9b08c', bodyDark: '#b98c66', belly: '#fff8ee', muzzle: '#fff2dc', nose: '#3a2a22', cheek: '#ff9fb5' },
  white: { body: '#f4f4f4', bodyDark: '#d6d6d6', belly: '#ffffff', muzzle: '#fff2dc', nose: '#3a2a22', cheek: '#ffb5c5' },
  yellow: { body: '#f6d14b', bodyDark: '#d9b02a', belly: '#ffffff', muzzle: '#fff8dc', nose: '#3a2a22', cheek: '#ff9fa0' },
};

export type TukkiColor = keyof typeof TUKKI_COLORS;

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

const TukkiModel = forwardRef<TukkiHandle, Props>(function TukkiModel({ color, scale = 1 }, ref) {
  const p = TUKKI_COLORS[color];
  const group = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);

  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: p.body, roughness: 0.85, metalness: 0 }),
      bodyDark: new THREE.MeshStandardMaterial({ color: p.bodyDark, roughness: 0.85 }),
      belly: new THREE.MeshStandardMaterial({ color: p.belly, roughness: 0.9 }),
      muzzle: new THREE.MeshStandardMaterial({ color: p.muzzle, roughness: 0.9 }),
      nose: new THREE.MeshStandardMaterial({ color: p.nose, roughness: 0.4 }),
      eye: new THREE.MeshStandardMaterial({ color: '#1b1412', roughness: 0.3 }),
      eyeLight: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }),
      cheek: new THREE.MeshStandardMaterial({ color: p.cheek, roughness: 1, transparent: true, opacity: 0.85 }),
      fang: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }),
      claw: new THREE.MeshStandardMaterial({ color: '#fff2dc', roughness: 0.6 }),
      mouth: new THREE.MeshStandardMaterial({ color: '#5a2a2a', roughness: 0.8 }),
    }),
    [p],
  );

  useImperativeHandle(ref, () => ({
    group: group.current,
    animate: (walk, amount, lean, t) => {
      const swing = Math.sin(walk) * 0.9 * amount;
      // 腕と脚は逆位相
      armL.current.rotation.x = swing;
      armR.current.rotation.x = -swing;
      legL.current.rotation.x = -swing * 0.8;
      legR.current.rotation.x = swing * 0.8;
      // 腕は少し外側に開いた構え
      armL.current.rotation.z = 0.55 + Math.sin(t * 2) * 0.03;
      armR.current.rotation.z = -0.55 - Math.sin(t * 2) * 0.03;
      // 体の前傾と弾み
      torso.current.rotation.x = lean;
      torso.current.position.y = Math.abs(Math.sin(walk)) * 0.12 * amount + Math.sin(t * 2.2) * 0.03;
      // 呼吸と首振り
      const breath = 1 + Math.sin(t * 2.2) * 0.015;
      torso.current.scale.set(breath, 1 / breath, breath);
      head.current.rotation.z = Math.sin(walk * 0.5) * 0.08 * amount + Math.sin(t * 1.3) * 0.03;
      head.current.rotation.y = Math.sin(t * 0.9) * 0.08 * (1 - amount);
    },
  }));

  return (
    <group ref={group} scale={scale}>
      <group ref={torso}>
        {/* 胴体 */}
        <mesh position={[0, 1.35, 0]} scale={[1, 1.12, 0.92]} material={mats.body} castShadow receiveShadow>
          <sphereGeometry args={[1.0, 40, 32]} />
        </mesh>
        {/* お腹の白い三日月 */}
        <mesh position={[0, 1.15, 0.6]} scale={[0.95, 0.68, 0.5]} material={mats.belly} castShadow>
          <sphereGeometry args={[0.9, 32, 24]} />
        </mesh>
        {/* お腹の上側を体色で覆って三日月型に見せる */}
        <mesh position={[0, 1.6, 0.64]} scale={[1.1, 0.55, 0.6]} material={mats.body}>
          <sphereGeometry args={[0.86, 32, 24]} />
        </mesh>

        {/* 頭 */}
        <group ref={head} position={[0, 2.55, 0]}>
          <mesh material={mats.body} castShadow>
            <sphereGeometry args={[0.95, 40, 32]} />
          </mesh>
          {/* 耳 */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.68, 0.72, -0.05]}>
              <mesh material={mats.body} castShadow>
                <sphereGeometry args={[0.32, 24, 18]} />
              </mesh>
              <mesh position={[0, 0, 0.17]} material={mats.bodyDark}>
                <sphereGeometry args={[0.18, 16, 12]} />
              </mesh>
            </group>
          ))}
          {/* マズル */}
          <mesh position={[0, -0.22, 0.78]} scale={[1, 0.78, 0.7]} material={mats.muzzle} castShadow>
            <sphereGeometry args={[0.45, 32, 24]} />
          </mesh>
          {/* 鼻 */}
          <mesh position={[0, -0.05, 1.12]} scale={[1.2, 0.9, 0.8]} material={mats.nose}>
            <sphereGeometry args={[0.15, 20, 16]} />
          </mesh>
          {/* 口（にっこり） */}
          <mesh position={[0, -0.3, 1.08]} rotation={[0.2, 0, Math.PI]} material={mats.mouth}>
            <torusGeometry args={[0.13, 0.025, 8, 24, Math.PI]} />
          </mesh>
          {/* 牙 */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, -0.42, 1.14]} rotation={[Math.PI, 0, 0]} material={mats.fang}>
              <coneGeometry args={[0.045, 0.14, 8]} />
            </mesh>
          ))}
          {/* 目 */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.36, 0.15, 0.86]}>
              <mesh material={mats.eye}>
                <sphereGeometry args={[0.1, 16, 12]} />
              </mesh>
              <mesh position={[s * 0.03, 0.04, 0.07]} material={mats.eyeLight}>
                <sphereGeometry args={[0.035, 8, 8]} />
              </mesh>
            </group>
          ))}
          {/* ほっぺ */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.62, -0.12, 0.68]} scale={[1, 0.7, 0.4]} material={mats.cheek}>
              <sphereGeometry args={[0.16, 16, 12]} />
            </mesh>
          ))}
        </group>

        {/* 腕（肩を支点に回す） */}
        {[
          { r: armL, s: -1 },
          { r: armR, s: 1 },
        ].map(({ r, s }) => (
          <group key={s} ref={r} position={[s * 0.88, 1.7, 0.15]}>
            <mesh position={[0, -0.42, 0]} material={mats.body} castShadow>
              <capsuleGeometry args={[0.24, 0.5, 8, 16]} />
            </mesh>
            {/* 手先 */}
            <mesh position={[0, -0.78, 0.05]} material={mats.body}>
              <sphereGeometry args={[0.26, 16, 12]} />
            </mesh>
            {/* 爪 */}
            {[-1, 0, 1].map((k) => (
              <mesh
                key={k}
                position={[k * 0.12, -0.9, 0.22]}
                rotation={[-Math.PI / 2 + 0.3, 0, 0]}
                material={mats.claw}
              >
                <coneGeometry args={[0.04, 0.14, 8]} />
              </mesh>
            ))}
          </group>
        ))}

        {/* 脚（腰を支点に回す） */}
        {[
          { r: legL, s: -1 },
          { r: legR, s: 1 },
        ].map(({ r, s }) => (
          <group key={s} ref={r} position={[s * 0.45, 0.62, 0]}>
            <mesh position={[0, -0.25, 0]} material={mats.body} castShadow>
              <capsuleGeometry args={[0.3, 0.3, 8, 16]} />
            </mesh>
            {/* 足先 */}
            <mesh position={[0, -0.5, 0.12]} scale={[1, 0.6, 1.3]} material={mats.body} castShadow>
              <sphereGeometry args={[0.3, 16, 12]} />
            </mesh>
            {[-1, 0, 1].map((k) => (
              <mesh key={k} position={[k * 0.14, -0.55, 0.48]} rotation={[Math.PI / 2, 0, 0]} material={mats.claw}>
                <coneGeometry args={[0.045, 0.14, 8]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
});

export default TukkiModel;
