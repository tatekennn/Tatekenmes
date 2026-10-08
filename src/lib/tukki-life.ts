import { WORLD_RADIUS, TREE_SPOTS, groundHeight } from './tukki-game';
import type { TukkiColor } from '@/components/TukkiModel';

export const RESIDENTS: { color: TukkiColor; name: string; greetings: string[] }[] = [
  { color: 'blue', name: 'ツッキーくん', greetings: [] },
  { color: 'green', name: 'みどり', greetings: ['いい風だね。今日はゆっくり歩こう。', '木陰で深呼吸すると、気持ちいいよ。'] },
  { color: 'lime', name: 'こうじ', greetings: ['小さなおうち、気に入ってくれた？', '今日はお仕事もひと休み。'] },
  { color: 'orange', name: 'オレンジ', greetings: ['やっほー！ 一緒にお散歩しよう。', '会えてうれしいな。いい一日になりそう！'] },
  { color: 'pink', name: 'えかき', greetings: ['この景色を絵にしてみようかな。', 'お花も空も、今日はきれいな色だね。'] },
  { color: 'purple', name: 'むらさき', greetings: ['雲を見ていると、時間を忘れちゃうね。', '急がなくて大丈夫。のんびりいこう。'] },
  { color: 'tan', name: 'コック', greetings: ['お散歩のあとに、お茶はいかが？', '今日はピクニック日和だね。'] },
  { color: 'white', name: 'しんし', greetings: ['ごきげんよう。素敵な午後ですね。', 'ベンチでひと休みするのもよいものです。'] },
  { color: 'yellow', name: 'きいろ', greetings: ['あのお花、かわいいね！', '今日は何もしない日でもいいんだよ。'] },
];
export const HOMES = [{ x: -12, z: -17, color: '#e6a18a' }, { x: 12, z: -17, color: '#a4bc9a' }, { x: -18, z: 10, color: '#c6afd8' }];
export const BENCHES = [{ x: -4, z: 4 }, { x: 4, z: 4 }];
export interface Resident {
  x: number; y: number; z: number; vx: number; vy: number; vz: number; facing: number; walk: number;
  radius: number; stoppedUntil: number; chooseAt: number; targetX: number; targetZ: number;
}
export interface Life { actors: Resident[]; elapsed: number; resting: boolean; restBench: number | null; jumpHeld: boolean; greetings: number }
export function createLife(): Life {
  return { actors: RESIDENTS.map((_, i) => {
    const angle = (i - 1) / 8 * Math.PI * 2;
    const x = i === 0 ? 0 : i === 1 ? 4 : Math.cos(angle) * 12;
    const z = i === 0 ? 0 : i === 1 ? -2 : Math.sin(angle) * 12;
    return { x, z, y: groundHeight(x, z), vx: 0, vy: 0, vz: 0, facing: Math.PI, walk: 0, radius: i === 0 ? 1.3 : 1.12,
      stoppedUntil: i === 0 ? 0 : 3 + i * 0.4, chooseAt: 0, targetX: x, targetZ: z };
  }), elapsed: 0, resting: false, restBench: null, jumpHeld: false, greetings: 0 };
}
function keepInField(a: Resident) {
  const radius = Math.hypot(a.x, a.z), limit = WORLD_RADIUS - a.radius;
  if (radius > limit) { a.x *= limit / radius; a.z *= limit / radius; }
  const obstacles = [...TREE_SPOTS.map((p) => ({ ...p, radius: 0.35 })), ...HOMES.map((p) => ({ ...p, radius: 3.7 }))];
  for (const p of obstacles) {
    const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz), minimum = a.radius + p.radius;
    if (d < minimum) { a.x = p.x + (d ? dx / d : 1) * minimum; a.z = p.z + (d ? dz / d : 0) * minimum; }
  }
  for (const bench of BENCHES) {
    if (a.y > groundHeight(bench.x, bench.z) + 1.8) continue;
    const localX = a.x - bench.x, localZ = a.z - bench.z;
    const closestX = Math.max(-1.7, Math.min(1.7, localX));
    const closestZ = Math.max(-0.75, Math.min(0.55, localZ));
    const dx = localX - closestX, dz = localZ - closestZ, distance = Math.hypot(dx, dz);
    if (distance >= a.radius) continue;
    if (distance > 0.0001) {
      a.x += dx / distance * (a.radius - distance); a.z += dz / distance * (a.radius - distance);
    } else {
      const sides = [{ gap: localX + 1.7, x: -1, z: 0 }, { gap: 1.7 - localX, x: 1, z: 0 }, { gap: localZ + 0.75, x: 0, z: -1 }, { gap: 0.55 - localZ, x: 0, z: 1 }];
      const side = sides.reduce((best, candidate) => candidate.gap < best.gap ? candidate : best);
      a.x += side.x * (side.gap + a.radius); a.z += side.z * (side.gap + a.radius);
    }
  }
  const floor = groundHeight(a.x, a.z);
  if (a.y < floor) { a.y = floor; a.vy = 0; }
}
export function lifeActions(life: Life) {
  const player = life.actors[0];
  let closest = -1, distance = 5;
  life.actors.slice(1).forEach((a, i) => { const d = Math.hypot(a.x - player.x, a.z - player.z); if (d < distance) { closest = i + 1; distance = d; } });
  let bench = -1; distance = 4;
  BENCHES.forEach((p, i) => { const d = Math.hypot(p.x - player.x, p.z - player.z); if (d < distance) { bench = i; distance = d; } });
  return {
    greet: { kind: 'greet' as const, index: closest, label: 'あいさつ', available: closest >= 0 },
    rest: life.resting ? { kind: 'stand' as const, index: -1, label: '立ち上がる' } : { kind: 'sit' as const, index: bench, label: bench >= 0 ? 'ベンチに座る' : 'ひと休み' },
  };
}
export function lifeAction(life: Life) {
  const actions = lifeActions(life);
  if (life.resting || (actions.rest.index >= 0 && Math.hypot(life.actors[0].x - BENCHES[actions.rest.index].x, life.actors[0].z - BENCHES[actions.rest.index].z) < 2)) return actions.rest;
  return actions.greet.available ? actions.greet : actions.rest;
}
export function interact(life: Life, choice?: 'greet' | 'rest') {
  const action = choice ? lifeActions(life)[choice] : lifeAction(life), player = life.actors[0];
  if (action.kind === 'stand') { if (life.restBench !== null) player.z = BENCHES[life.restBench].z + 2; life.resting = false; life.restBench = null; player.y = groundHeight(player.x, player.z); return { name: 'ツッキーくん', text: 'さあ、またゆっくりお散歩しよう。' }; }
  if (action.kind === 'greet') {
    if (action.index < 0) return { name: 'あいさつ', text: '仲間の近くへ行って、声をかけよう。' };
    const other = life.actors[action.index], resident = RESIDENTS[action.index];
    other.stoppedUntil = life.elapsed + 5; other.vx = other.vz = 0;
    other.facing = Math.atan2(player.x - other.x, player.z - other.z);
    if (!life.resting) player.facing = Math.atan2(other.x - player.x, other.z - player.z);
    const text = resident.greetings[life.greetings++ % resident.greetings.length];
    return { name: resident.name, text };
  }
  life.resting = true; life.restBench = action.index >= 0 ? action.index : null;
  player.vx = player.vy = player.vz = 0;
  player.y = groundHeight(player.x, player.z) + 0.17;
  if (life.restBench !== null) { const p = BENCHES[life.restBench]; player.x = p.x; player.z = p.z; player.y = groundHeight(p.x, p.z) + 0.98; player.facing = 0; }
  return { name: 'ひと休み', text: '風と雲を眺めながら、ゆっくり過ごそう。' };
}
export function stepLife(life: Life, seconds: number, input: { x: number; z: number; jump: boolean }) {
  const duration = Math.max(0, Math.min(seconds, 0.1));
  if (!duration) return;
  const steps = Math.ceil(duration * 60), dt = duration / steps;
  life.elapsed += Math.max(0, seconds);
  for (let step = 0; step < steps; step++) {
    life.actors.forEach((a, i) => {
      if (i === 0 && life.resting) return;
      let x = input.x, z = input.z;
      if (i > 0) {
        if (life.elapsed >= a.chooseAt && life.elapsed >= a.stoppedUntil) {
          const angle = i * 2.4 + life.elapsed * 0.18;
          a.targetX = Math.cos(angle) * (8 + i % 3 * 4); a.targetZ = Math.sin(angle) * (8 + i % 3 * 4); a.chooseAt = life.elapsed + 7 + i % 4;
        }
        x = a.targetX - a.x; z = a.targetZ - a.z;
        if (Math.hypot(x, z) < 1 && life.elapsed >= a.stoppedUntil) { a.stoppedUntil = life.elapsed + 3 + i % 3; a.chooseAt = a.stoppedUntil; }
        for (const bench of BENCHES) { const dx = a.x - bench.x, dz = a.z - bench.z, d = Math.hypot(dx, dz); if (d > 0 && d < 4) { x += dx / d * (4 - d) * 4; z += dz / d * (4 - d) * 4; } }
        for (const tree of TREE_SPOTS) { const dx = a.x - tree.x, dz = a.z - tree.z, d = Math.hypot(dx, dz); if (d > 0 && d < 4) { x += dx / d * (4 - d) * 3; z += dz / d * (4 - d) * 3; } }
      }
      if (life.elapsed < a.stoppedUntil) x = z = 0;
      const length = Math.hypot(x, z), factor = length > 1 ? 1 / length : 1, speed = i === 0 ? 6.5 : 1.6 + i % 3 * 0.25;
      const blend = 1 - Math.exp(-(length < 0.01 ? 16 : 10) * dt);
      a.vx += (x * factor * speed - a.vx) * blend; a.vz += (z * factor * speed - a.vz) * blend;
      if (i === 0 && input.jump && !life.jumpHeld && a.y <= groundHeight(a.x, a.z) + 0.001) a.vy = 9;
      a.vy -= 24 * dt; a.x += a.vx * dt; a.z += a.vz * dt; a.y += a.vy * dt; keepInField(a);
      const moving = Math.hypot(a.vx, a.vz);
      if (moving > 0.2) { const target = Math.atan2(a.vx, a.vz), difference = Math.atan2(Math.sin(target - a.facing), Math.cos(target - a.facing)); a.facing += difference * Math.min(1, 12 * dt); }
      a.walk += dt * moving * (i === 0 ? 1.8 : 3);
    });
    life.jumpHeld = input.jump;
    for (let pass = 0; pass < 6; pass++) for (let i = 0; i < life.actors.length; i++) for (let j = i + 1; j < life.actors.length; j++) {
      const a = life.actors[i], b = life.actors[j];
      if (Math.abs(a.y - b.y) > 2.8) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
      if (d >= min) continue;
      const nx = d > 0.001 ? dx / d : 1, nz = d > 0.001 ? dz / d : 0, push = min - d + 0.002;
      const fixedA = i === 0 && life.resting;
      if (!fixedA) { a.x -= nx * push / 2; a.z -= nz * push / 2; keepInField(a); }
      b.x += nx * push * (fixedA ? 1 : 0.5); b.z += nz * push * (fixedA ? 1 : 0.5); keepInField(b);
    }
  }
}
export function lifeSnapshot(life: Life) { return { actors: life.actors.map((a) => ({ x: a.x, z: a.z, facing: a.facing })), resting: life.resting, actions: lifeActions(life) }; }
