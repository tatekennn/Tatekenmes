'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface RankDef {
  name: string;
  cssColor: string;
  emissive: number;
  coreSize: number;
  tapPower: number;
  autoFireRate: number;
  auraDps: number;
  auraRadius: number;
  maxHp: number;
  xpNeed: number;
}

type Phase = 'lobby' | 'playing' | 'levelup' | 'win' | 'lose';

interface GameState {
  phase: Phase;
  wave: number;
  rankIdx: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpNeed: number;
  score: number;
  combo: number;
  burstMeter: number;
  shake: number;
  flash: number;
  messageTitle: string;
  messageSub: string;
}

interface GameControls {
  start: () => void;
  burst: () => void;
}

interface EnemyObj {
  id: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  hp: number;
  maxHp: number;
  speed: number;
  value: number;
  type: number;
  flash: number;
}

interface ProjObj {
  id: number;
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  power: number;
}

interface BurstObj {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
  pos: THREE.Vector3;
}

interface ParticleObj {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const RANKS: RankDef[] = [
  { name: '気', cssColor: '#e6e6e6', emissive: 0xcccccc, coreSize: 0.9, tapPower: 30, autoFireRate: 0, auraDps: 0, auraRadius: 4.0, maxHp: 100, xpNeed: 150 },
  { name: '闘気', cssColor: '#f0dcb0', emissive: 0xffcc88, coreSize: 1.3, tapPower: 65, autoFireRate: 1.2, auraDps: 6, auraRadius: 6.5, maxHp: 320, xpNeed: 700 },
  { name: '武装色の覇気', cssColor: '#d9b845', emissive: 0xffaa22, coreSize: 1.8, tapPower: 130, autoFireRate: 3.0, auraDps: 28, auraRadius: 10, maxHp: 900, xpNeed: 2600 },
  { name: '覇気', cssColor: '#e07020', emissive: 0xff6622, coreSize: 2.5, tapPower: 270, autoFireRate: 6.5, auraDps: 120, auraRadius: 16, maxHp: 2400, xpNeed: 9800 },
  { name: '覇王色の覇気', cssColor: '#ff0a2a', emissive: 0xff0033, coreSize: 3.8, tapPower: 650, autoFireRate: 15, auraDps: 9999, auraRadius: 26, maxHp: 9000, xpNeed: 999999 },
];

const MAX_WAVE = 20;

const ENEMY_TYPES = [
  { name: '迷い', hp: 28, radius: 0.7, speed: 3.4, matColor: 0x777777, value: 6 },
  { name: '雑念', hp: 65, radius: 1.0, speed: 4.4, matColor: 0x995555, value: 12 },
  { name: '敵意', hp: 150, radius: 1.5, speed: 3.0, matColor: 0xcc2222, value: 30 },
  { name: '怨念', hp: 400, radius: 2.1, speed: 2.1, matColor: 0xff0000, value: 85 },
];

/* ------------------------------------------------------------------ */
/*  Shared geometries / materials                                      */
/* ------------------------------------------------------------------ */
const CORE_GEOM = new THREE.SphereGeometry(1, 32, 32);
const GLOW_GEOM = new THREE.SphereGeometry(1, 24, 24);
const ENEMY_GEOM = new THREE.IcosahedronGeometry(1, 0);
const PROJ_GEOM = new THREE.SphereGeometry(0.22, 8, 8);
const BURST_GEOM = new THREE.RingGeometry(0.25, 0.5, 64);
const PARTICLE_GEOM = new THREE.TetrahedronGeometry(0.15, 0);

const PROJ_MAT = new THREE.MeshBasicMaterial({ color: 0xffeebb });
const BURST_MAT = new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const PARTICLE_MAT = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.95 });

/* ------------------------------------------------------------------ */
/*  Audio                                                              */
/* ------------------------------------------------------------------ */
let aCtx: AudioContext | null = null;
function ac() {
  if (typeof window === 'undefined') return null;
  if (!aCtx) aCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return aCtx;
}
function sfx(freq: number, type: OscillatorType, dur: number, vol: number, when?: number) {
  const ctx = ac();
  if (!ctx) return;
  const t = when ?? ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}
function sfxShoot() {
  sfx(880, 'sine', 0.06, 0.06);
  sfx(1320, 'triangle', 0.04, 0.03);
}
function sfxBurstSound() {
  sfx(180, 'sine', 0.18, 0.13);
  sfx(120, 'triangle', 0.14, 0.05);
}
function sfxExplode() {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  g.gain.setValueAtTime(0.11, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.24);
}
function sfxLevelUp() {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  [0, 0.10, 0.22].forEach((off, i) => {
    sfx(440 + i * 220, 'sine', 0.38, 0.10, t + off);
    sfx(660 + i * 220, 'triangle', 0.32, 0.05, t + off + 0.04);
  });
}
function sfxWarning() {
  sfx(180, 'square', 0.10, 0.06);
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */
function Scene({
  gameRef,
  controlsRef,
}: {
  gameRef: React.MutableRefObject<GameState>;
  controlsRef: React.MutableRefObject<GameControls | null>;
}) {
  const { camera, size } = useThree();
  const groupEnemy = useRef<THREE.Group>(null);
  const groupProj = useRef<THREE.Group>(null);
  const groupBurst = useRef<THREE.Group>(null);
  const groupParticle = useRef<THREE.Group>(null);

  const coreRef = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const enemies = useRef<EnemyObj[]>([]);
  const projs = useRef<ProjObj[]>([]);
  const bursts = useRef<BurstObj[]>([]);
  const particles = useRef<ParticleObj[]>([]);
  const spawner = useRef({ count: 0, spawned: 0, interval: 0, last: 0, types: [0] });
  const nextId = useRef(1);
  const autoTimer = useRef(0);
  const waveRef = useRef(1);
  const rankRef = useRef(0);
  const hpRef = useRef(RANKS[0].maxHp);
  const maxHpRef = useRef(RANKS[0].maxHp);
  const xpRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const comboTimerRef = useRef(0);
  const burstMeterRef = useRef(0);
  const flashRef = useRef(0);
  const shakeRef = useRef(0);

  const tempVec = useRef(new THREE.Vector3());

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const isPortrait = size.height > size.width;
    perspective.position.set(0, isPortrait ? 28 : 22, isPortrait ? 34 : 26);
    perspective.fov = isPortrait ? 58 : 48;
    perspective.lookAt(0, 0, 0);
    perspective.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  /* ---------------------------------------------------------------- */
  const initGame = useCallback(() => {
    // reset arrays
    enemies.current.forEach(e => {
      groupEnemy.current?.remove(e.mesh);
      e.mat.dispose();
    });
    projs.current.forEach(p => groupProj.current?.remove(p.mesh));
    bursts.current.forEach(b => groupBurst.current?.remove(b.mesh));
    particles.current.forEach(pt => {
      groupParticle.current?.remove(pt.mesh);
      (pt.mesh.material as THREE.MeshBasicMaterial).dispose();
    });
    enemies.current = [];
    projs.current = [];
    bursts.current = [];
    particles.current = [];

    waveRef.current = 1;
    rankRef.current = 0;
    hpRef.current = RANKS[0].maxHp;
    maxHpRef.current = RANKS[0].maxHp;
    xpRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 1;
    comboTimerRef.current = 0;
    burstMeterRef.current = 0;
    flashRef.current = 0;
    shakeRef.current = 0;
    autoTimer.current = 0;
    nextId.current = 1;
    configureWave(1);

    // apply rank 0 visuals
    const r = RANKS[0];
    if (coreRef.current) coreRef.current.scale.setScalar(r.coreSize);
    if (coreMat.current) {
      coreMat.current.emissive.setHex(r.emissive);
      coreMat.current.emissiveIntensity = 1.5;
    }
    if (glowRef.current) glowRef.current.scale.setScalar(r.coreSize * 1.45);
    if (glowMat.current) {
      glowMat.current.color.setHex(r.emissive);
      glowMat.current.opacity = 0.28;
    }
    if (ringRef.current) ringRef.current.scale.setScalar(r.coreSize * 1.1);
    if (ringMat.current) {
      ringMat.current.color.setHex(r.emissive);
      ringMat.current.opacity = 0.5;
    }
    if (lightRef.current) {
      lightRef.current.color.setHex(r.emissive);
      lightRef.current.intensity = 2;
    }

    gameRef.current = {
      phase: 'playing', wave: 1, rankIdx: 0,
      hp: hpRef.current, maxHp: maxHpRef.current,
      xp: 0, xpNeed: RANKS[0].xpNeed,
      score: 0, combo: 1, burstMeter: 0,
      shake: 0, flash: 0, messageTitle: '', messageSub: '',
    };
  }, [gameRef]);

  function configureWave(wave: number) {
    const types =
      wave <= 3 ? [0] :
      wave <= 6 ? [0, 0, 1] :
      wave <= 10 ? [0, 1, 1, 2] :
      wave <= 15 ? [0, 1, 2, 2, 3] :
      [1, 2, 2, 3, 3];
    const dur = Math.max(3.2, 8.8 - wave * 0.28);
    const count = Math.floor(7 + wave * 2.1);
    const interval = dur / count;
    spawner.current = { count, spawned: 0, interval, last: performance.now() - interval * 1000, types };
  }

  /* ---------------------------------------------------------------- */
  function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 6;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = 0.5 + (Math.random() - 0.5) * 2.5;

    const tIdx = spawner.current.types[Math.floor(Math.random() * spawner.current.types.length)];
    const d = ENEMY_TYPES[tIdx];
    const hpScale = 1 + waveRef.current * 0.075;

    const mat = new THREE.MeshStandardMaterial({
      color: d.matColor, emissive: d.matColor, emissiveIntensity: 0.22,
      roughness: 0.85, metalness: 0.1, flatShading: true,
    });
    const mesh = new THREE.Mesh(ENEMY_GEOM, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(d.radius);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    groupEnemy.current!.add(mesh);

    enemies.current.push({
      id: nextId.current++,
      mesh, mat,
      hp: d.hp * hpScale,
      maxHp: d.hp,
      speed: d.speed * (0.85 + Math.random() * 0.3),
      value: d.value,
      type: tIdx,
      flash: 0,
    });
  }

  function findNearestEnemy(pos: THREE.Vector3) {
    let best: EnemyObj | null = null;
    let bd = Infinity;
    for (const e of enemies.current) {
      const d = pos.distanceToSquared(e.mesh.position);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function launchProjectile(target: THREE.Vector3, powerScale = 1) {
    const rank = RANKS[rankRef.current];
    const mesh = new THREE.Mesh(PROJ_GEOM, PROJ_MAT);
    mesh.position.set(0, 0.5, 0);
    groupProj.current!.add(mesh);

    const dir = new THREE.Vector3().subVectors(target, mesh.position).normalize();
    projs.current.push({
      id: nextId.current++,
      mesh,
      vel: dir.multiplyScalar(22),
      life: 2.8,
      power: rank.tapPower * powerScale,
    });
    sfxShoot();
  }

  function createBurst(at: THREE.Vector3, maxR: number) {
    const mesh = new THREE.Mesh(BURST_GEOM, BURST_MAT.clone());
    mesh.position.set(at.x, 0.5, at.z);
    mesh.rotation.x = -Math.PI / 2;
    groupBurst.current!.add(mesh);
    bursts.current.push({
      mesh,
      life: 0.32,
      maxLife: 0.32,
      maxScale: maxR,
      pos: new THREE.Vector3(at.x, 0.5, at.z),
    });
    sfxBurstSound();
  }

  function spawnParticles(at: THREE.Vector3, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const mat = PARTICLE_MAT.clone();
      mat.color.setHex(color);
      const mesh = new THREE.Mesh(PARTICLE_GEOM, mat);
      mesh.position.copy(at);
      mesh.scale.setScalar(0.5 + Math.random());
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8 + 3,
        (Math.random() - 0.5) * 14
      );
      groupParticle.current!.add(mesh);
      particles.current.push({ mesh, vel, life: 0.35 + Math.random() * 0.45, maxLife: 1 });
    }
  }

  function killEnemy(e: EnemyObj, big: boolean, reward = true) {
    spawnParticles(e.mesh.position, ENEMY_TYPES[e.type].matColor, big ? 18 : 8);
    groupEnemy.current!.remove(e.mesh);
    e.mat.dispose();
    if (reward) {
      const combo = comboRef.current;
      scoreRef.current += Math.round(e.value * 100 * combo);
      xpRef.current += e.value;
      burstMeterRef.current = Math.min(100, burstMeterRef.current + e.value * 0.65);
      comboRef.current = Math.min(99, comboRef.current + 1);
      comboTimerRef.current = 2.35;
    }
    sfxExplode();
  }

  /* ---------------------------------------------------------------- */
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    if (gameRef.current.phase !== 'playing') return;
    const point = e.point as THREE.Vector3;
    let closest: EnemyObj | null = null;
    let closestD = 9;
    for (const enemy of enemies.current) {
      const d = enemy.mesh.position.distanceToSquared(point);
      if (d < closestD) {
        closest = enemy;
        closestD = d;
      }
    }
    const target = closest?.mesh.position ?? point;
    const isPrecision = closest !== null;
    launchProjectile(target, isPrecision ? 1.35 : 1);
    createBurst(point, RANKS[rankRef.current].auraRadius * (isPrecision ? 0.95 : 0.62));
    if (isPrecision) {
      scoreRef.current += 25 * comboRef.current;
      burstMeterRef.current = Math.min(100, burstMeterRef.current + 1.8);
    }
  }, [gameRef]);

  const triggerHakiBurst = useCallback(() => {
    if (gameRef.current.phase !== 'playing' || burstMeterRef.current < 100) return;
    const rank = RANKS[rankRef.current];
    burstMeterRef.current = 0;
    flashRef.current = 1.4;
    shakeRef.current = 1.4;
    createBurst(new THREE.Vector3(0, 0.5, 0), 32);
    for (let i = enemies.current.length - 1; i >= 0; i--) {
      const enemy = enemies.current[i];
      enemy.hp -= rank.tapPower * 3.6 + 400;
      enemy.flash = 0.35;
      const dir = enemy.mesh.position.clone().normalize();
      enemy.mesh.position.addScaledVector(dir, 3.4);
      if (enemy.hp <= 0) {
        killEnemy(enemy, true);
        enemies.current.splice(i, 1);
      }
    }
    scoreRef.current += 2000 + waveRef.current * 150;
    sfxLevelUp();
  }, [gameRef]);

  useEffect(() => {
    controlsRef.current = { start: initGame, burst: triggerHakiBurst };
    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, initGame, triggerHakiBurst]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Enter') {
        if (gameRef.current.phase !== 'playing') {
          controlsRef.current?.start();
        }
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (gameRef.current.phase === 'playing') {
          controlsRef.current?.burst();
        } else {
          controlsRef.current?.start();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controlsRef, gameRef]);

  /* ---------------------------------------------------------------- */
  function checkLevelUp() {
    const rank = RANKS[rankRef.current];
    if (xpRef.current >= rank.xpNeed && rankRef.current < RANKS.length - 1) {
      doLevelUp();
    }
  }

  function doLevelUp() {
    const old = rankRef.current;
    const idx = Math.min(old + 1, RANKS.length - 1);
    rankRef.current = idx;
    const r = RANKS[idx];
    maxHpRef.current = r.maxHp;
    hpRef.current = maxHpRef.current;
    xpRef.current = 0;

    flashRef.current = 1.2;
    shakeRef.current = 1.0;
    sfxLevelUp();

    // visuals
    if (coreRef.current) coreRef.current.scale.setScalar(r.coreSize);
    if (coreMat.current) {
      coreMat.current.emissive.setHex(r.emissive);
      coreMat.current.emissiveIntensity = 2 + idx * 0.5;
    }
    if (glowRef.current) glowRef.current.scale.setScalar(r.coreSize * 1.45);
    if (glowMat.current) {
      glowMat.current.color.setHex(r.emissive);
      glowMat.current.opacity = 0.28 + idx * 0.07;
    }
    if (ringRef.current) ringRef.current.scale.setScalar(r.coreSize * 1.15);
    if (ringMat.current) {
      ringMat.current.color.setHex(r.emissive);
      ringMat.current.opacity = 0.5 + idx * 0.08;
    }
    if (lightRef.current) {
      lightRef.current.color.setHex(r.emissive);
      lightRef.current.intensity = 2 + idx * 1.2;
    }

    // kill all enemies spectacularly
    for (const e of enemies.current) {
      killEnemy(e, true, false);
    }
    enemies.current = [];

    gameRef.current.rankIdx = idx;
    gameRef.current.xpNeed = r.xpNeed;
    gameRef.current.messageTitle = r.name;
    gameRef.current.messageSub = 'RANK UP';
    gameRef.current.phase = 'levelup';

    setTimeout(() => {
      gameRef.current.messageTitle = '';
      gameRef.current.messageSub = '';
      gameRef.current.phase = 'playing';
      const sp = spawner.current;
      if (sp.spawned >= sp.count) {
        waveRef.current++;
        configureWave(waveRef.current);
        gameRef.current.wave = waveRef.current;
      }
    }, 2200);
  }

  function triggerLose() {
    gameRef.current.phase = 'lose';
    gameRef.current.messageTitle = '覇気散逸';
    gameRef.current.messageSub = `Wave ${waveRef.current} 到達`;
  }

  function triggerWin() {
    gameRef.current.phase = 'win';
    gameRef.current.messageTitle = '覇王の覇気';
    gameRef.current.messageSub = '全てを圧倒した';
    sfxLevelUp();
  }

  /* ---------------------------------------------------------------- */
  useFrame((_state, dt) => {
    const g = gameRef.current;
    if (g.phase !== 'playing') {
      // still animate particles and bursts in other phases
      updateEffects(dt);
      return;
    }

    const rank = RANKS[rankRef.current];
    const ts = performance.now();
    if (comboTimerRef.current > 0) {
      comboTimerRef.current = Math.max(0, comboTimerRef.current - dt);
      if (comboTimerRef.current === 0) comboRef.current = 1;
    }

    // core rotation
    if (coreRef.current) coreRef.current.rotation.y += dt * 0.7;
    if (ringRef.current) ringRef.current.rotation.z += dt * (0.9 + rankRef.current * 0.35);

    // spawn
    const sp = spawner.current;
    while (sp.spawned < sp.count && ts - sp.last >= sp.interval * 1000) {
      spawnEnemy();
      sp.spawned++;
      sp.last += sp.interval * 1000;
    }

    // auto fire
    if (rank.autoFireRate > 0) {
      autoTimer.current += dt;
      const interval = 1 / rank.autoFireRate;
      while (autoTimer.current >= interval) {
        autoTimer.current -= interval;
        const target = findNearestEnemy(new THREE.Vector3(0, 0.5, 0));
        if (target) launchProjectile(target.mesh.position);
      }
    }

    // projectiles
    for (let i = projs.current.length - 1; i >= 0; i--) {
      const p = projs.current[i];
      p.life -= dt;
      if (p.life <= 0) {
        groupProj.current!.remove(p.mesh);
        projs.current.splice(i, 1);
        continue;
      }
      // mild homing to nearest enemy
      let near: EnemyObj | null = null;
      let nearD = 4.5;
      for (const e of enemies.current) {
        const d = p.mesh.position.distanceTo(e.mesh.position);
        if (d < nearD) { nearD = d; near = e; }
      }
      if (near) {
        const desired = new THREE.Vector3().subVectors(near.mesh.position, p.mesh.position).normalize().multiplyScalar(22);
        p.vel.lerp(desired, 5 * dt);
      }
      p.mesh.position.addScaledVector(p.vel, dt);

      // Hit enemy
      let hit = false;
      for (let j = enemies.current.length - 1; j >= 0; j--) {
        const e = enemies.current[j];
        const dist = p.mesh.position.distanceTo(e.mesh.position);
        if (dist < 0.25 + ENEMY_TYPES[e.type].radius) {
          e.hp -= p.power;
          e.flash = 0.18;
          spawnParticles(e.mesh.position, 0xffaa44, 4);
          hit = true;
          if (e.hp <= 0) {
            killEnemy(e, false);
            enemies.current.splice(j, 1);
          }
          break;
        }
      }
      if (hit) {
        groupProj.current!.remove(p.mesh);
        projs.current.splice(i, 1);
        continue;
      }
      // look forward
      p.mesh.lookAt(p.mesh.position.clone().add(p.vel));
    }

    // bursts update + damage enemies
    for (let i = bursts.current.length - 1; i >= 0; i--) {
      const b = bursts.current[i];
      b.life -= dt;
      if (b.life <= 0) {
        groupBurst.current!.remove(b.mesh);
        (b.mesh.material as THREE.MeshBasicMaterial).dispose();
        bursts.current.splice(i, 1);
        continue;
      }
      const t = 1 - b.life / b.maxLife;
      const s = b.maxScale * Math.sin(t * Math.PI * 0.9);
      if (s > 0) {
        b.mesh.scale.setScalar(s * 2.5); // ring geom radius is ~0.4, so overall radius ~ s
        (b.mesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.7;
      }
      // burst damage
      for (const e of enemies.current) {
        const d = b.pos.distanceTo(e.mesh.position);
        if (d < s + ENEMY_TYPES[e.type].radius * 0.7) {
          // knockback
          const dir = new THREE.Vector3().subVectors(e.mesh.position, b.pos).normalize();
          e.mesh.position.addScaledVector(dir, 18 * dt);
          e.hp -= rank.tapPower * dt * 3;
          e.flash = 0.12;
        }
      }
    }

    // enemies movement, aura, core hit, flash
    for (let i = enemies.current.length - 1; i >= 0; i--) {
      const e = enemies.current[i];
      const d = e.mesh.position;
      const target = tempVec.current.set(0, 0.5, 0);
      const dir = new THREE.Vector3().subVectors(target, d).normalize();
      const wobble = Math.sin(ts / 300 + e.id) * 0.12;
      dir.x += wobble; dir.z -= wobble; dir.normalize();
      e.mesh.position.addScaledVector(dir, e.speed * dt);
      e.mesh.rotation.x += dt * 0.8;
      e.mesh.rotation.y += dt * 1.2;

      // flash decay
      if (e.flash > 0) {
        e.flash -= dt;
        e.mat.emissive.setHex(0xffffff);
        e.mat.emissiveIntensity = Math.max(0, e.flash * 12);
      } else {
        e.mat.emissive.setHex(ENEMY_TYPES[e.type].matColor);
        e.mat.emissiveIntensity = 0.22;
      }

      // aura damage
      const distToCore = e.mesh.position.distanceTo(target);
      if (distToCore < rank.auraRadius + ENEMY_TYPES[e.type].radius) {
        e.hp -= rank.auraDps * dt;
        if (Math.random() < 0.2) spawnParticles(e.mesh.position, rank.emissive, 1);
        if (e.hp <= 0) {
          killEnemy(e, false);
          enemies.current.splice(i, 1);
          continue;
        }
      }

      // core hit
      if (distToCore < rank.coreSize * 0.7 + ENEMY_TYPES[e.type].radius * 0.7) {
        hpRef.current -= 9 + waveRef.current * 1.3;
        groupEnemy.current!.remove(e.mesh);
        e.mat.dispose();
        enemies.current.splice(i, 1);
        flashRef.current = 0.8;
        shakeRef.current = 1.0;
        spawnParticles(target, 0xff2222, 14);
        sfxWarning();
        if (hpRef.current <= 0) {
          hpRef.current = 0;
          triggerLose();
          break;
        }
        continue;
      }
    }

    // wave clear / level up / win
    if (sp.spawned >= sp.count && enemies.current.length === 0) {
      if (waveRef.current >= MAX_WAVE) {
        triggerWin();
      } else {
        checkLevelUp();
        if (gameRef.current.phase !== 'levelup') {
          waveRef.current++;
          g.wave = waveRef.current;
          configureWave(waveRef.current);
        }
      }
    } else {
      checkLevelUp();
    }

    // effects decay
    flashRef.current = Math.max(0, flashRef.current - dt * 2.5);
    shakeRef.current = Math.max(0, shakeRef.current - dt * 3.5);
    g.flash = flashRef.current;
    g.shake = shakeRef.current;
    g.hp = hpRef.current;
    g.maxHp = maxHpRef.current;
    g.xp = xpRef.current;
    g.xpNeed = rank.xpNeed;
    g.score = scoreRef.current;
    g.combo = comboRef.current;
    g.burstMeter = burstMeterRef.current;
    updateEffects(dt);

    // core light flicker when low hp
    if (lightRef.current) {
      const hpPct = hpRef.current / maxHpRef.current;
      if (hpPct < 0.3) {
        lightRef.current.intensity = 1 + Math.sin(ts * 0.015) * 0.6;
      } else {
        lightRef.current.intensity = 2 + rankRef.current * 1.2;
      }
    }
  });

  function updateEffects(dt: number) {
    // particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.life -= dt;
      if (p.life <= 0) {
        groupParticle.current!.remove(p.mesh);
        (p.mesh.material as THREE.MeshBasicMaterial).dispose();
        particles.current.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= dt * 6;
      const a = Math.max(0, p.life / (p.maxLife || 1));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = a;
      p.mesh.scale.setScalar(a * 0.8);
      p.mesh.rotation.x += dt * 2;
      p.mesh.rotation.y += dt * 3;
    }
  }

  /* ---------------------------------------------------------------- */
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 8, 0]} intensity={0.4} color={0xffffff} />
      <pointLight ref={lightRef} position={[0, 2, 0]} intensity={2} distance={35} color={0xffffff} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Invisible ground for raycasting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false} onPointerDown={handlePointerDown}>
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* Core group */}
      <group position={[0, 0.5, 0]}>
        <mesh ref={coreRef} scale={RANKS[0].coreSize}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial ref={coreMat} emissive={RANKS[0].emissive} emissiveIntensity={1.5} color={0x222222} roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh ref={glowRef} scale={RANKS[0].coreSize * 1.45}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial ref={glowMat} color={RANKS[0].emissive} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} scale={RANKS[0].coreSize * 1.1}>
          <torusGeometry args={[1.6, 0.04, 16, 100]} />
          <meshBasicMaterial ref={ringMat} color={RANKS[0].emissive} transparent opacity={0.5} />
        </mesh>
      </group>

      <group ref={groupEnemy} />
      <group ref={groupProj} />
      <group ref={groupBurst} />
      <group ref={groupParticle} />

      {/* Restart / start tap catcher on lobby / end phases */}
      {['lobby', 'lose', 'win'].includes(gameRef.current.phase) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} visible={false} onPointerDown={() => {
          const ctx = ac();
          if (ctx?.state === 'suspended') ctx.resume();
          initGame();
        }}>
          <planeGeometry args={[200, 200]} />
        </mesh>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Overlay                                                            */
/* ------------------------------------------------------------------ */
function Overlay({
  gameRef,
  controlsRef,
}: {
  gameRef: React.MutableRefObject<GameState>;
  controlsRef: React.MutableRefObject<GameControls | null>;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const g = gameRef.current;
  const phase = g.phase;
  const rank = RANKS[g.rankIdx];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10,
        transform: `translate(${(Math.random()-0.5)*g.shake*12}px, ${(Math.random()-0.5)*g.shake*12}px)`,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top HUD */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: 'max(1.2rem, env(safe-area-inset-top)) max(1.2rem, env(safe-area-inset-right)) 0 max(1.2rem, env(safe-area-inset-left))',
        color: '#f7f1df',
      }}>
        <div>
          <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em' }}>WAVE</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fceeb5' }}>{g.wave}/{MAX_WAVE}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em' }}>RANK</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: rank.cssColor }}>{rank.name}</div>
          <div style={{ marginTop: 4, fontSize: '0.72rem', color: g.combo > 1 ? '#ffe0a0' : 'rgba(247,241,223,0.42)', fontWeight: 800 }}>
            {g.combo > 1 ? `COMBO x${g.combo}` : 'COMBO READY'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em' }}>SCORE</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 950, color: '#fceeb5' }}>{Math.round(g.score).toLocaleString('ja-JP')}</div>
          <div style={{ marginTop: 6, fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em' }}>CORE HP</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: g.hp / g.maxHp < 0.3 ? '#ff4444' : '#f7f1df' }}>
            {Math.ceil((g.hp / g.maxHp) * 100)}%
          </div>
        </div>
      </div>

      {/* Bottom XP */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '0 1.2rem max(1.2rem, env(safe-area-inset-bottom))', pointerEvents: 'none', zIndex: 10 }}>
        <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(1, g.xp / (g.xpNeed || 1)) * 100}%`, height: '100%', borderRadius: 999,
            background: g.rankIdx >= 4 ? 'linear-gradient(90deg, #ff0a2a, #ff4d6e)' : rank.cssColor,
            boxShadow: `0 0 14px ${rank.cssColor}`,
            transition: 'width 150ms linear',
          }} />
        </div>
        {phase === 'playing' && (
          <button
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
              controlsRef.current?.burst();
            }}
            disabled={g.burstMeter < 100}
            style={{
              pointerEvents: 'auto',
              display: 'block',
              width: 'min(440px, 100%)',
              margin: '0.7rem auto 0',
              minHeight: 42,
              border: '1px solid rgba(247,241,223,0.16)',
              borderRadius: 999,
              color: g.burstMeter >= 100 ? '#0c0a08' : 'rgba(247,241,223,0.56)',
              background: g.burstMeter >= 100
                ? 'linear-gradient(135deg, #ffe0a0, #ff3048)'
                : 'rgba(255,255,255,0.06)',
              boxShadow: g.burstMeter >= 100 ? '0 0 42px rgba(255,48,72,0.34)' : 'none',
              fontWeight: 950,
              letterSpacing: '0.08em',
              touchAction: 'none',
            }}
          >
            覇王バースト {Math.floor(g.burstMeter)}%
          </button>
        )}
      </div>

      {/* Flash overlay */}
      {g.flash > 0 && (
        <div style={{
          position: 'fixed', inset: 0, background: `rgba(255, 240, 220, ${g.flash * 0.3})`, pointerEvents: 'none', zIndex: 8,
        }} />
      )}

      {/* Phase overlays */}
      {(phase === 'lobby' || phase === 'lose' || phase === 'win' || phase === 'levelup') && (
        <div
          onPointerDown={(event) => {
            if (phase === 'levelup') return;
            event.stopPropagation();
            controlsRef.current?.start();
          }}
          style={{
            position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
            zIndex: 20, background: 'rgba(5,5,5,0.72)', backdropFilter: 'blur(6px)', pointerEvents: 'auto',
          }}
        >
          <div style={{
            display: 'grid', gap: '0.8rem', textAlign: 'center', padding: '2.2rem 2.6rem',
            border: `1px solid ${phase === 'win' ? 'rgba(215,169,46,0.55)' : phase === 'lose' ? 'rgba(179,25,40,0.45)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 20, background: 'rgba(8,6,4,0.84)',
            boxShadow: `0 40px 120px ${phase === 'win' ? 'rgba(215,169,46,0.22)' : 'rgba(0,0,0,0.55)'}`,
            animation: 'popIn 0.35s cubic-bezier(0.22,1,0.36,1)', minWidth: 260,
          }}>
            {g.messageSub && (
              <div style={{ fontSize: '0.68rem', color: 'rgba(247,241,223,0.5)', letterSpacing: '0.22em' }}>{g.messageSub}</div>
            )}
            <h2 style={{
              margin: 0, fontSize: 'clamp(2.4rem, 7.5vw, 4.2rem)', lineHeight: 0.9, fontWeight: 900,
              color: phase === 'win' ? '#ffe0a0' : phase === 'lose' ? '#ff2a3a' : phase === 'levelup' ? rank.cssColor : '#fff1c7',
              textShadow: `0 0 36px ${phase === 'win' ? 'rgba(255,224,160,0.45)' : phase === 'lose' ? 'rgba(255,42,58,0.35)' : 'rgba(247,209,91,0.4)'}`,
            }}>
              {phase === 'lobby' ? '覇気の星' : g.messageTitle}
            </h2>

            {phase === 'lobby' && (
              <>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(247,241,223,0.7)', lineHeight: 1.6, maxWidth: 290 }}>
                  宇宙の中心に浮かぶ「覇気の星」を守れ。<br />
                  タップで追尾弾と衝撃波を放つ。<br />
                  敵を連続で倒してコンボ、100%で覇王バースト。<br />
                  20ウェーブ、星を高めろ。
                </p>
                <div style={{
                  marginTop: 4, padding: '0.9rem 1.8rem', borderRadius: 999,
                  background: 'linear-gradient(135deg, #d7a92e, #b31928)', color: '#0c0a08',
                  fontWeight: 950, fontSize: '0.9rem', letterSpacing: '0.08em',
                  boxShadow: '0 16px 50px rgba(179,25,40,0.25)',
                }}>
                  TAP ANYWHERE TO START
                </div>
              </>
            )}

            {phase === 'lose' && (
              <>
                <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.55)' }}>覇気は散った...</div>
                <div style={{
                  marginTop: 4, padding: '0.9rem 1.8rem', borderRadius: 999,
                  background: 'linear-gradient(135deg, #444, #b31928)', color: '#0c0a08',
                  fontWeight: 950, fontSize: '0.9rem', letterSpacing: '0.08em',
                  boxShadow: '0 16px 50px rgba(179,25,40,0.25)',
                }}>
                  TRY AGAIN
                </div>
              </>
            )}

            {phase === 'win' && (
              <>
                <div style={{ fontSize: '0.85rem', color: 'rgba(247,241,223,0.55)' }}>覇気は全てを圧倒した。</div>
                <div style={{
                  marginTop: 4, padding: '0.9rem 1.8rem', borderRadius: 999,
                  background: 'linear-gradient(135deg, #d7a92e, #b31928)', color: '#0c0a08',
                  fontWeight: 950, fontSize: '0.9rem', letterSpacing: '0.08em',
                  boxShadow: '0 16px 50px rgba(179,25,40,0.25)',
                }}>
                  PLAY AGAIN
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Top-level component                                                */
/* ------------------------------------------------------------------ */
export default function HakiStarGame() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const gameRef = useRef<GameState>({
    phase: 'lobby', wave: 1, rankIdx: 0,
    hp: RANKS[0].maxHp, maxHp: RANKS[0].maxHp,
    xp: 0, xpNeed: RANKS[0].xpNeed,
    score: 0, combo: 1, burstMeter: 0,
    shake: 0, flash: 0, messageTitle: '', messageSub: '',
  });
  const controlsRef = useRef<GameControls | null>(null);

  if (!ready) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#050302', display: 'grid', placeItems: 'center', color: '#f7f1df', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050302', touchAction: 'none', userSelect: 'none', cursor: 'crosshair' }}>
      <Canvas
        camera={{ position: [0, 22, 26], fov: 48, near: 0.1, far: 500 }}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => { gl.setClearColor('#050302'); }}
      >
        <Scene gameRef={gameRef} controlsRef={controlsRef} />
      </Canvas>
      <Overlay gameRef={gameRef} controlsRef={controlsRef} />
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
