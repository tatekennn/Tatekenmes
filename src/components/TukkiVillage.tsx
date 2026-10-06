'use client';
import { BENCHES, HOMES } from '@/lib/tukki-life';
import { groundHeight } from '@/lib/tukki-game';
export default function TukkiVillage() {
  return <>
    {HOMES.map((p, i) => <group key={i} position={[p.x, groundHeight(p.x, p.z), p.z]}>
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow><boxGeometry args={[4.8, 4.4, 4]} /><meshStandardMaterial color="#fff0cf" roughness={0.95} /></mesh>
      <mesh position={[0, 5.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[4.1, 2.6, 4]} /><meshStandardMaterial color={p.color} roughness={0.85} /></mesh>
      <mesh position={[0, 1.25, 2.03]}><boxGeometry args={[1.25, 2.5, 0.14]} /><meshStandardMaterial color="#9f7651" /></mesh>
      <mesh position={[0.4, 1.2, 2.15]}><sphereGeometry args={[0.1, 12, 8]} /><meshStandardMaterial color="#e7c87a" /></mesh>
      {[-1.6, 1.6].map((x) => <group key={x} position={[x, 2.7, 2.06]}>
        <mesh><boxGeometry args={[1, 1.1, 0.15]} /><meshStandardMaterial color="#8b6747" /></mesh>
        <mesh position={[0, 0, 0.09]}><boxGeometry args={[0.78, 0.87, 0.08]} /><meshStandardMaterial color="#a6d9df" /></mesh>
        <mesh position={[0, 0, 0.16]}><boxGeometry args={[0.07, 0.95, 0.06]} /><meshStandardMaterial color="#fff0cf" /></mesh>
      </group>)}
      <mesh position={[0, 0.12, 3.2]} receiveShadow><boxGeometry args={[2.3, 0.24, 1.7]} /><meshStandardMaterial color="#c7b698" /></mesh>
      {[-2.5, 2.5].map((x) => <group key={x} position={[x, 0.3, 2.5]}>
        <mesh><cylinderGeometry args={[0.55, 0.4, 0.6, 10]} /><meshStandardMaterial color="#cb936c" /></mesh>
        {[0, 1, 2].map((n) => <group key={n} position={[(n - 1) * 0.25, 0.5 + n * 0.1, 0]}>
          <mesh><cylinderGeometry args={[0.04, 0.04, 0.7, 6]} /><meshStandardMaterial color="#789255" /></mesh>
          <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.21, 10, 8]} /><meshStandardMaterial color={['#f3acb2', '#edcf77', '#cbb3dd'][i]} /></mesh>
        </group>)}
      </group>)}
    </group>)}
    {BENCHES.map((p, i) => <group key={i} position={[p.x, groundHeight(p.x, p.z), p.z]}>
      {[0, 1, 2].map((n) => <mesh key={n} position={[0, 1, (n - 1) * 0.35]} castShadow><boxGeometry args={[3.4, 0.18, 0.3]} /><meshStandardMaterial color="#b78c58" /></mesh>)}
      {[1.55, 1.9].map((y) => <mesh key={y} position={[0, y, -0.65]} castShadow><boxGeometry args={[3.4, 0.28, 0.16]} /><meshStandardMaterial color="#b78c58" /></mesh>)}
      {[-1.3, 1.3].map((x) => <group key={x}>
        <mesh position={[x, 0.5, 0]} castShadow><boxGeometry args={[0.16, 1, 1.1]} /><meshStandardMaterial color="#647365" /></mesh>
        <mesh position={[x, 1.5, -0.65]} castShadow><boxGeometry args={[0.14, 1.4, 0.14]} /><meshStandardMaterial color="#647365" /></mesh>
      </group>)}
    </group>)}
    <group position={[13, groundHeight(13, 8) + 0.06, 8]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[5, 3.8]} /><meshStandardMaterial color="#eed5ba" /></mesh>
      {[-1.5, -0.5, 0.5, 1.5].map((x) => <mesh key={x} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, 3.8]} /><meshStandardMaterial color="#d4a49a" /></mesh>)}
      <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.55, 0.7, 0.8, 12]} /><meshStandardMaterial color="#b88a53" /></mesh>
    </group>
  </>;
}
