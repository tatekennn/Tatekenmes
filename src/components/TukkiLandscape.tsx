'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { groundHeight, TREE_SPOTS, WORLD_RADIUS, DECORATION_CLEARINGS } from '@/lib/tukki-game';

function Grass() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const wind = useMemo(() => ({ value: 0 }), []);
  const material = useMemo(() => {
    const result = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 });
    result.onBeforeCompile = (shader) => {
      shader.uniforms.tukkiWindTime = wind;
      shader.vertexShader = 'uniform float tukkiWindTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.x += sin(tukkiWindTime * 1.8 + instanceMatrix[3].x * 0.3 + instanceMatrix[3].z * 0.2) * position.y * position.y * 0.2;`);
    };
    result.customProgramCacheKey = () => 'tukki-grass-wind';
    return result;
  }, [wind]);
  useFrame(({ clock }) => { wind.value = clock.getElapsedTime(); });
  useEffect(() => () => material.dispose(), [material]);
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.08, 0, 0, 0.08, 0, 0, 0.06, 0.52, 0,
      0, 0, -0.08, 0, 0, 0.08, -0.03, 0.4, 0.03,
      -0.09, 0, -0.07, 0.08, 0, 0.07, -0.13, 0.32, 0.03,
    ], 3));
    result.computeVertexNormals(); return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const transform = new THREE.Object3D();
    for (let i = 0; i < 1800; i++) {
      const angle = i * 2.39996, radius = 9 + Math.sqrt((i * 73 % 1800) / 1800) * 65;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const onPath = [0, Math.PI / 3, -Math.PI / 3].some((a) => Math.abs(x * Math.cos(a) - z * Math.sin(a)) < 2.4 && radius < WORLD_RADIUS);
      transform.position.set(x, groundHeight(x, z), z);
      transform.rotation.y = angle;
      transform.scale.setScalar(onPath ? 0 : 0.7 + i % 5 * 0.15);
      transform.updateMatrix(); mesh.current.setMatrixAt(i, transform.matrix);
      mesh.current.setColorAt(i, new THREE.Color(['#72ad49', '#8cbe56', '#9acd64', '#64a64b'][i % 4]));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, []);
  return <instancedMesh ref={mesh} args={[geometry, material, 1800]} frustumCulled={false} />;
}

type Instance = { matrix: THREE.Matrix4; color: string };
function Batch({ geometry, items, shadows = false }: { geometry: THREE.BufferGeometry; items: Instance[]; shadows?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    items.forEach((item, i) => { mesh.current.setMatrixAt(i, item.matrix); mesh.current.setColorAt(i, new THREE.Color(item.color)); });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={mesh} args={[geometry, undefined, items.length]} castShadow={shadows} receiveShadow>
    <meshStandardMaterial roughness={1} />
  </instancedMesh>;
}

function Forest() {
  const geometries = useMemo(() => ({ trunk: new THREE.CylinderGeometry(0.62, 1, 1, 10), leaf: new THREE.IcosahedronGeometry(1, 2) }), []);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  const instances = useMemo(() => {
    const trunks: Instance[] = [], leaves: Instance[] = [];
    const trees = [...TREE_SPOTS, ...Array.from({ length: 30 }, (_, i) => {
      const angle = i * 2.39996, radius = 69 + i % 4 * 12;
      return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, seed: i };
    })];
    for (const tree of trees) {
      const root = new THREE.Object3D(), part = new THREE.Object3D();
      root.position.set(tree.x, groundHeight(tree.x, tree.z), tree.z);
      root.rotation.y = tree.seed; root.scale.setScalar(0.8 + tree.seed % 4 * 0.15); root.updateMatrix();
      const add = (list: Instance[], position: [number, number, number], scale: [number, number, number], color: string, rotation = 0) => {
        part.position.set(...position); part.scale.set(...scale); part.rotation.set(0, 0, rotation); part.updateMatrix();
        list.push({ matrix: root.matrix.clone().multiply(part.matrix), color });
      };
      add(trunks, [0, 1.8, 0], [0.38, 3.6, 0.38], '#9a7347');
      for (const sign of [-1, 1]) add(trunks, [sign * 0.35, 2.8, 0], [0.17, 1.8, 0.17], '#9a7347', sign * -0.6);
      [[0, 4.8, 0, 2.2], [-1.35, 3.9, 0.2, 1.6], [1.25, 4.1, -0.25, 1.7], [0.2, 4.2, 1.1, 1.5]].forEach(([x, y, z, radius], i) => {
        add(leaves, [x, y, z], [radius, radius * 0.92, radius], ['#61a65b', '#78b565', '#87bf6b', '#73ae61'][(tree.seed + i) % 4]);
      });
    }
    return { trunks, leaves };
  }, []);
  return <><Batch geometry={geometries.trunk} items={instances.trunks} shadows /><Batch geometry={geometries.leaf} items={instances.leaves} shadows /></>;
}

function Flowers() {
  const geometries = useMemo(() => ({ sphere: new THREE.SphereGeometry(1, 8, 6), stem: new THREE.CylinderGeometry(1, 1, 1, 5) }), []);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  const items = useMemo(() => {
    const stems: Instance[] = [], petals: Instance[] = [], centers: Instance[] = [];
    const part = new THREE.Object3D();
    const add = (list: Instance[], x: number, y: number, z: number, scale: [number, number, number], color: string) => {
      part.position.set(x, y, z); part.scale.set(...scale); part.updateMatrix(); list.push({ matrix: part.matrix.clone(), color });
    };
    for (let i = 0; i < 100; i++) {
      const angle = i * 2.39996, radius = 10 + i % 7 * 6, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius, y = groundHeight(x, z);
      if (DECORATION_CLEARINGS.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 1.6)) continue;
      add(stems, x, y + 0.2, z, [0.025, 0.4, 0.025], '#679147');
      add(centers, x, y + 0.41, z, [0.08, 0.08, 0.08], '#ecc551');
      for (let j = 0; j < 5; j++) add(petals, x + Math.cos(j * Math.PI * 0.4) * 0.12, y + 0.4, z + Math.sin(j * Math.PI * 0.4) * 0.12, [0.105, 0.037, 0.105], ['#fff4d2', '#f5b5ca', '#d6c3ed'][i % 3]);
    }
    return { stems, centers, petals };
  }, []);
  return <><Batch geometry={geometries.stem} items={items.stems} /><Batch geometry={geometries.sphere} items={items.centers} /><Batch geometry={geometries.sphere} items={items.petals} /></>;
}

function Water() {
  const material = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(() => ({ time: { value: 0 }, color: { value: new THREE.Color('#56c6ca') } }), []);
  useFrame(({ clock }) => { material.current.uniforms.time.value = clock.getElapsedTime(); });
  return <group position={[-84, -0.8, -16]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.45, 1]} receiveShadow>
      <circleGeometry args={[24, 80]} /><meshStandardMaterial color="#eadba8" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[1, 1.45, 1]}>
      <circleGeometry args={[21, 80]} />
      <shaderMaterial ref={material} uniforms={uniforms} transparent
        vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={`uniform float time; uniform vec3 color; varying vec2 vUv;
          void main(){ float ripple=sin(vUv.x*105.0+sin(vUv.y*48.0+time)*2.0+time*1.4);
          float glint=pow(max(0.0,ripple),16.0)*0.2; gl_FragColor=vec4(color+glint,0.93);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`} />
    </mesh>
  </group>;
}

function Sign() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f8e9bd'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#6c502e'; ctx.textAlign = 'center'; ctx.font = 'bold 54px sans-serif';
    ctx.fillText('のんびり草原', 256, 106); ctx.font = '28px sans-serif'; ctx.fillText('ひと休みしていきませんか', 256, 171);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[-4.8, 0, -4]} rotation={[0, 0.35, 0]}>
    <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[0.18, 2, 0.18]} /><meshStandardMaterial color="#977041" /></mesh>
    <mesh position={[0, 2, 0]} castShadow><boxGeometry args={[2.3, 1.2, 0.16]} /><meshStandardMaterial color="#a37a45" /></mesh>
    <mesh position={[0, 2, 0.086]}><planeGeometry args={[2.12, 1.04]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
  </group>;
}

export default function TukkiLandscape() {
  const ground = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(380, 380, 190, 190);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute('position');
    const colors: number[] = [];
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i), y = groundHeight(x, z);
      positions.setY(i, y - 0.025);
      color.set('#88c66b').lerp(new THREE.Color('#a6ce7c'), (Math.sin(x * 0.08) * Math.cos(z * 0.09) + 1) * 0.22);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals(); return geometry;
  }, []);
  const paths = useMemo(() => [0, Math.PI / 3, -Math.PI / 3].map((angle, index) => {
    const vertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= 116; i++) {
      const distance = i - 58;
      for (const side of [-1, 1]) {
        const x = side * 2 * Math.cos(angle) + distance * Math.sin(angle);
        const z = -side * 2 * Math.sin(angle) + distance * Math.cos(angle);
        vertices.push(x, groundHeight(x, z) + 0.025 + index * 0.006, z);
      }
      if (i < 116) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  }), []);
  useEffect(() => () => { ground.dispose(); paths.forEach((path) => path.dispose()); }, [ground, paths]);
  return <>
    <mesh geometry={ground} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
    {paths.map((path, i) => <mesh key={i} geometry={path} receiveShadow><meshStandardMaterial color="#e2d0a0" roughness={1} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.048, 0]} receiveShadow><circleGeometry args={[7, 64]} /><meshStandardMaterial color="#ead8ac" /></mesh>
    <Grass /><Water /><Sign />
    <Forest /><Flowers />
    {Array.from({ length: 18 }, (_, i) => {
      const angle = i * 2.39996, radius = 58 + i % 3 * 8;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      return <group key={`rock-${i}`} position={[x, groundHeight(x, z), z]} rotation={[0, angle, 0]}>
        {[0, 1, 2].map((j) => <mesh key={j} position={[j * 0.65, 0.35 + j * 0.1, j * 0.2]} scale={[1.1 - j * 0.2, 0.8, 0.85]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.95 - j * 0.17, 0]} /><meshStandardMaterial color={j === 0 ? '#a5afa0' : '#b2b8a5'} roughness={1} flatShading />
        </mesh>)}
      </group>;
    })}
    {Array.from({ length: 12 }, (_, i) => {
      const angle = i / 12 * Math.PI * 2;
      return <mesh key={`hill-${i}`} position={[Math.cos(angle) * 145, -7, Math.sin(angle) * 145]} scale={[40, 22 + i % 3 * 9, 34]}>
        <sphereGeometry args={[1, 32, 20]} /><meshStandardMaterial color={i % 2 ? '#a0c28b' : '#88b580'} roughness={1} />
      </mesh>;
    })}
  </>;
}
