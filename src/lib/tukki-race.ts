import { HAKI_SPOTS, WORLD_RADIUS, TREE_SPOTS, groundHeight, touchesHaki } from './tukki-game';
import type { TukkiColor } from '@/components/TukkiModel';

export const RACE_SECONDS = 60;
export const REFILL_SECONDS = 8;
export const REFILL_AMOUNT = 6;
export const COLLISION_PAUSE = 0.35;
export const RACERS: { color: TukkiColor; name: string }[] = [
  { color: 'blue', name: 'あなた' }, { color: 'green', name: 'みどり' },
  { color: 'lime', name: 'こうじ' }, { color: 'orange', name: 'オレンジ' },
  { color: 'pink', name: 'えかき' }, { color: 'purple', name: 'むらさき' },
  { color: 'tan', name: 'コック' }, { color: 'white', name: 'しんし' },
  { color: 'yellow', name: 'きいろ' },
];
export interface Racer {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  facing: number; walk: number; score: number; radius: number;
  stoppedUntil: number; avoidUntil: number; target: number; chooseAt: number;
}
export interface Race {
  actors: Racer[]; active: boolean[]; elapsed: number; nextRefill: number;
  contacts: Set<string>; jumpHeld: boolean; pickups: number; refills: number; playerBumps: number;
}
export interface RaceInput { x: number; z: number; jump: boolean }

export function createRace(): Race {
  return {
    actors: RACERS.map((_, i) => {
      const angle = (i - 1) / 8 * Math.PI * 2;
      const x = i === 0 ? 0 : Math.cos(angle) * (11 + i % 3 * 4);
      const z = i === 0 ? 0 : Math.sin(angle) * (11 + i % 3 * 4);
      return { x, y: groundHeight(x, z), z, vx: 0, vy: 0, vz: 0, facing: Math.PI, walk: 0,
        score: 0, radius: i === 0 ? 1.3 : 1.12, stoppedUntil: 0, avoidUntil: 0, target: -1, chooseAt: 0 };
    }),
    active: HAKI_SPOTS.map(() => true), elapsed: 0, nextRefill: REFILL_SECONDS,
    contacts: new Set(), jumpHeld: false, pickups: 0, refills: 0, playerBumps: 0,
  };
}

function keepInField(actor: Racer) {
  const radius = Math.hypot(actor.x, actor.z), limit = WORLD_RADIUS - actor.radius;
  if (radius > limit) { actor.x *= limit / radius; actor.z *= limit / radius; }
  for (const tree of TREE_SPOTS) {
    const dx = actor.x - tree.x, dz = actor.z - tree.z, distance = Math.hypot(dx, dz), clearance = actor.radius + 0.35;
    if (distance < clearance) {
      actor.x = tree.x + (distance ? dx / distance : 1) * clearance;
      actor.z = tree.z + (distance ? dz / distance : 0) * clearance;
    }
  }
  const floor = groundHeight(actor.x, actor.z);
  if (actor.y < floor) { actor.y = floor; actor.vy = 0; }
}

function npcWish(race: Race, actor: Racer, index: number) {
  if (race.elapsed >= actor.chooseAt || actor.target < 0 || !race.active[actor.target]) {
    actor.target = -1;
    let best = Infinity;
    HAKI_SPOTS.forEach((spot, i) => {
      if (!race.active[i]) return;
      const cost = Math.hypot(actor.x - spot.x, actor.z - spot.z) + ((index + i) % 4) * 0.4;
      if (cost < best) { best = cost; actor.target = i; }
    });
    actor.chooseAt = race.elapsed + 0.5;
  }
  const spot = actor.target >= 0 ? HAKI_SPOTS[actor.target] : { x: Math.cos(index + race.elapsed * 0.12) * 24, z: Math.sin(index + race.elapsed * 0.12) * 24 };
  let dx = spot.x - actor.x, dz = spot.z - actor.z;
  const distance = Math.hypot(dx, dz) || 1; dx /= distance; dz /= distance;
  for (const tree of TREE_SPOTS) {
    const tx = actor.x - tree.x, tz = actor.z - tree.z, d = Math.hypot(tx, tz);
    if (d < 4 && d > 0.001) {
      const strength = (4 - d) * 0.9;
      dx += tx / d * strength; dz += tz / d * strength;
      // A tangential component lets rivals get around trunks instead of facing into them.
      dx += -tz / d * strength * 0.7; dz += tx / d * strength * 0.7;
    }
  }
  if (race.elapsed < actor.avoidUntil) {
    const angle = index % 2 ? 0.9 : -0.9, oldX = dx;
    dx = dx * Math.cos(angle) - dz * Math.sin(angle); dz = oldX * Math.sin(angle) + dz * Math.cos(angle);
  }
  const length = Math.hypot(dx, dz) || 1;
  return { x: dx / length, z: dz / length };
}

/** Advance in short substeps; collisions, collection and refill share one ordered simulation. */
export function stepRace(race: Race, seconds: number, input: RaceInput) {
  const clockDuration = Math.max(0, Math.min(seconds, RACE_SECONDS - race.elapsed));
  const duration = Math.min(clockDuration, 0.1);
  if (duration === 0) return;
  const steps = Math.ceil(duration / (1 / 60)), dt = duration / steps;
  for (let step = 0; step < steps; step++) {
    race.elapsed = Math.min(RACE_SECONDS, race.elapsed + clockDuration / steps);
    while (race.elapsed >= race.nextRefill) {
      let added = 0;
      const start = race.refills * 7 % race.active.length;
      for (let i = 0; i < race.active.length && added < REFILL_AMOUNT; i++) {
        const index = (start + i) % race.active.length;
        if (!race.active[index]) { race.active[index] = true; added++; }
      }
      race.refills++; race.nextRefill += REFILL_SECONDS;
    }
    const previous = race.actors.map((a) => ({ x: a.x, z: a.z }));
    race.actors.forEach((actor, index) => {
      const stopped = race.elapsed < actor.stoppedUntil;
      const wish = index === 0 ? input : npcWish(race, actor, index);
      const length = Math.hypot(wish.x, wish.z), factor = length > 1 ? 1 / length : 1;
      if (stopped) { actor.vx = 0; actor.vz = 0; }
      else if (index === 0) {
        // Steer both axes toward the current input so a turn does not retain old sideways drift.
        const blend = 1 - Math.exp(-(length < 0.01 ? 16 : 12) * dt);
        actor.vx += (wish.x * factor * 10 - actor.vx) * blend;
        actor.vz += (wish.z * factor * 10 - actor.vz) * blend;
      } else {
        const speed = 6 + index % 4 * 0.45, blend = 1 - Math.exp(-8 * dt);
        actor.vx += (wish.x * factor * speed - actor.vx) * blend;
        actor.vz += (wish.z * factor * speed - actor.vz) * blend;
      }
      if (index === 0 && input.jump && !race.jumpHeld && !stopped && actor.y <= groundHeight(actor.x, actor.z) + 0.001) actor.vy = 9;
      actor.vy -= 24 * dt;
      actor.x += actor.vx * dt; actor.z += actor.vz * dt; actor.y += actor.vy * dt;
      keepInField(actor);
    });
    race.jumpHeld = input.jump;

    // Only a new contact pauses both racers. Staying next to each other does not retrigger it.
    for (let i = 0; i < race.actors.length; i++) for (let j = i + 1; j < race.actors.length; j++) {
      const a = race.actors[i], b = race.actors[j], key = `${i}:${j}`;
      const distance = Math.hypot(b.x - a.x, b.z - a.z), minimum = a.radius + b.radius;
      if (distance > minimum + 0.3 || Math.abs(a.y - b.y) > 2.8) race.contacts.delete(key);
      if (distance < minimum && Math.abs(a.y - b.y) <= 2.8 && !race.contacts.has(key)) {
        race.contacts.add(key);
        a.stoppedUntil = b.stoppedUntil = race.elapsed + COLLISION_PAUSE;
        a.avoidUntil = b.avoidUntil = race.elapsed + 1.3;
        a.vx = a.vz = b.vx = b.vz = 0;
        if (i === 0) race.playerBumps++;
      }
    }
    // Several passes also separate groups of three or more without transferring any score.
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < race.actors.length; i++) for (let j = i + 1; j < race.actors.length; j++) {
        const a = race.actors[i], b = race.actors[j];
        if (Math.abs(a.y - b.y) > 2.8) continue;
        const dx = b.x - a.x, dz = b.z - a.z, distance = Math.hypot(dx, dz), minimum = a.radius + b.radius;
        if (distance >= minimum) continue;
        const nx = distance > 0.0001 ? dx / distance : 1, nz = distance > 0.0001 ? dz / distance : 0;
        const push = (minimum - distance + 0.002) / 2;
        a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
      }
      race.actors.forEach(keepInField);
    }

    // Choose the nearest eligible racer for each orb, rather than giving the player first pick.
    HAKI_SPOTS.forEach((spot, index) => {
      if (!race.active[index]) return;
      let winner = -1, nearest = Infinity;
      race.actors.forEach((actor, i) => {
        if (!touchesHaki(previous[i].x, previous[i].z, actor.x, actor.z, spot.x, spot.z)) return;
        const distance = Math.hypot(actor.x - spot.x, actor.z - spot.z);
        if (distance < nearest - 0.001 || (Math.abs(distance - nearest) < 0.001 && (i + race.pickups) % 9 < (winner + race.pickups) % 9)) { nearest = distance; winner = i; }
      });
      if (winner >= 0) { race.active[index] = false; race.actors[winner].score++; race.pickups++; }
    });
    race.actors.forEach((actor) => {
      const speed = Math.hypot(actor.vx, actor.vz);
      if (speed > 0.2) {
        const target = Math.atan2(actor.vx, actor.vz), difference = Math.atan2(Math.sin(target - actor.facing), Math.cos(target - actor.facing));
        actor.facing += difference * Math.min(1, 12 * dt);
      }
      actor.walk += dt * speed * 1.1;
    });
  }
  if (race.elapsed >= RACE_SECONDS - 1e-8) {
    race.elapsed = RACE_SECONDS;
    race.actors.forEach((actor) => { actor.vx = actor.vy = actor.vz = 0; });
  }
}

export function raceSnapshot(race: Race) {
  return {
    actors: race.actors.map((actor) => ({ x: actor.x, z: actor.z, score: actor.score, facing: actor.facing })),
    timeLeft: Math.max(0, Math.ceil(RACE_SECONDS - race.elapsed - 1e-8)),
    finished: race.elapsed >= RACE_SECONDS,
    active: [...race.active], refillIn: Math.max(0, Math.ceil(race.nextRefill - race.elapsed)),
    playerStopped: race.elapsed < race.actors[0].stoppedUntil,
    playerBumps: race.playerBumps, refills: race.refills,
  };
}
