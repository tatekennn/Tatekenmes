const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  const absolute = path.resolve(__dirname, '..', file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} }; cache.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', code)((name) => load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), `${name}.ts`))), module, module.exports);
  return module.exports;
}
const { createRace, stepRace, COLLISION_PAUSE, REFILL_AMOUNT } = load('src/lib/tukki-race.ts');
const { HAKI_SPOTS, groundHeight, WORLD_RADIUS, TREE_SPOTS } = load('src/lib/tukki-game.ts');
const idle = { x: 0, z: 0, jump: false };
function advance(game, seconds, input = idle) { for (let i = 0; i < Math.ceil(seconds * 60); i++) stepRace(game, 1 / 60, input); }
function isolate(game) {
  game.active.fill(false);
  game.actors.forEach((actor, i) => { actor.x = Math.cos(i / 9 * Math.PI * 2) * 56; actor.z = Math.sin(i / 9 * Math.PI * 2) * 56; actor.y = groundHeight(actor.x, actor.z); actor.stoppedUntil = 1000; });
}

test('eight rivals seek and collect orbs, and scores account for every pickup', () => {
  const game = createRace(); advance(game, 24);
  assert(game.actors.slice(1).every((actor) => actor.score > 0));
  assert.equal(game.actors.reduce((total, actor) => total + actor.score, 0), game.pickups);
  assert(game.pickups > HAKI_SPOTS.length);
  assert(game.refills >= 2);
});

test('one orb has one owner; the closer eligible rival wins, not always the player', () => {
  const game = createRace(); isolate(game);
  const spot = HAKI_SPOTS[0]; game.active[0] = true;
  Object.assign(game.actors[0], { x: spot.x + 1.8, z: spot.z, y: 0 });
  Object.assign(game.actors[1], { x: spot.x - 0.8, z: spot.z, y: 0 });
  stepRace(game, 1 / 60, idle);
  assert.equal(game.actors[1].score, 1); assert.equal(game.actors[0].score, 0);
  advance(game, 1); assert.equal(game.pickups, 1);
});

test('collision pauses BOTH racers, separates their bodies and never changes their scores', () => {
  const game = createRace(); isolate(game);
  const a = game.actors[0], b = game.actors[1];
  Object.assign(a, { x: 0, z: 0, y: 0, vx: 8, stoppedUntil: 0, score: 7 });
  Object.assign(b, { x: 1.5, z: 0, y: 0, stoppedUntil: 0, score: 11 });
  stepRace(game, 1 / 60, idle);
  assert.equal(a.vx, 0); assert.equal(b.vx, 0);
  assert(a.stoppedUntil > game.elapsed); assert(b.stoppedUntil > game.elapsed);
  assert(Math.hypot(a.x - b.x, a.z - b.z) >= a.radius + b.radius - 0.005);
  assert.equal(a.score, 7); assert.equal(b.score, 11);
  const pauseEnd = a.stoppedUntil, x = a.x;
  advance(game, COLLISION_PAUSE / 2, { x: -1, z: 0, jump: false });
  assert(Math.abs(a.x - x) < 0.01); assert.equal(a.stoppedUntil, pauseEnd);
  advance(game, 0.5, { x: -1, z: 0, jump: false });
  assert(a.x < x - 0.1); assert.equal(game.playerBumps, 1);
  assert.equal(a.score, 7); assert.equal(b.score, 11);
});

test('same stationary contact does not repeatedly stun, but separation allows another contact', () => {
  const game = createRace(); isolate(game);
  const a = game.actors[0], b = game.actors[1];
  Object.assign(a, { x: 0, z: 0, y: 0, stoppedUntil: 0 });
  Object.assign(b, { x: 1.5, z: 0, y: 0, stoppedUntil: 1000 });
  stepRace(game, 1 / 60, idle); const pause = a.stoppedUntil;
  // Disable AI movement to leave the pair touching after the pause expires.
  b.stoppedUntil = 1000; advance(game, 1);
  assert.equal(a.stoppedUntil, pause); assert.equal(game.playerBumps, 1);
  b.x = 8; stepRace(game, 1 / 60, idle);
  b.x = a.x + 1.5; stepRace(game, 1 / 60, idle);
  assert.equal(game.playerBumps, 2);
});

test('replenishment adds at most six missing orbs every eight seconds without resetting scores', () => {
  const game = createRace(); isolate(game); game.actors[0].score = 9;
  game.elapsed = 7.9; stepRace(game, 0.05, idle); assert.equal(game.active.filter(Boolean).length, 0);
  stepRace(game, 0.1, idle); assert.equal(game.active.filter(Boolean).length, REFILL_AMOUNT);
  assert.equal(game.actors[0].score, 9); assert.equal(game.nextRefill, 16);
  game.active.fill(true); game.elapsed = 15.99; stepRace(game, 0.02, idle);
  assert.equal(game.active.filter(Boolean).length, HAKI_SPOTS.length);
});

test('jump lands and holding the button does not cause automatic repeated jumps', () => {
  const game = createRace(); isolate(game); Object.assign(game.actors[0], { x: 0, y: 0, z: 0, stoppedUntil: 0 });
  advance(game, 0.2, { ...idle, jump: true }); assert(game.actors[0].y > 0.5);
  advance(game, 1.5, { ...idle, jump: true }); assert.equal(game.actors[0].y, 0);
  stepRace(game, 1 / 60, idle); stepRace(game, 1 / 60, { ...idle, jump: true }); assert(game.actors[0].vy > 0);
});

test('movement stays within the field, above ground, and outside tree trunks', () => {
  const game = createRace(); advance(game, 35, { x: 1, z: 0, jump: false });
  for (const actor of game.actors) {
    assert(Math.hypot(actor.x, actor.z) <= WORLD_RADIUS - actor.radius + 0.01);
    assert(actor.y >= groundHeight(actor.x, actor.z) - 0.001);
    assert(TREE_SPOTS.every((tree) => Math.hypot(actor.x - tree.x, actor.z - tree.z) >= actor.radius + 0.35 - 0.01));
  }
  const fresh = createRace(); assert.equal(fresh.elapsed, 0); assert(fresh.actors.every((actor) => actor.score === 0));
});

test('a three-racer pileup separates bodies without changing scores', () => {
  const game = createRace(); isolate(game);
  game.actors.slice(0, 3).forEach((actor, i) => Object.assign(actor, { x: i * 0.1, z: 0, y: 0, score: i + 5, stoppedUntil: 0 }));
  stepRace(game, 1 / 60, idle);
  for (let i = 0; i < 3; i++) {
    assert.equal(game.actors[i].score, i + 5);
    assert(game.actors[i].stoppedUntil > game.elapsed);
    for (let j = i + 1; j < 3; j++) {
      const a = game.actors[i], b = game.actors[j];
      assert(Math.hypot(a.x - b.x, a.z - b.z) >= a.radius + b.radius - 0.03);
    }
  }
});


test('changing from forward to strafe removes forward drift and release brakes promptly', () => {
  const game = createRace(); isolate(game);
  const player = game.actors[0]; Object.assign(player, { x: 0, z: 0, y: groundHeight(0, 0), stoppedUntil: 0 });
  advance(game, 0.5, { x: 0, z: -1, jump: false });
  assert(player.vz < -9);
  const startX = player.x;
  advance(game, 0.4, { x: 1, z: 0, jump: false });
  assert(player.x > startX + 2);
  assert(player.vx > 9); assert(Math.abs(player.vz) < 0.2);
  const releaseX = player.x;
  advance(game, 0.3);
  assert(Math.abs(player.vx) < 0.1); assert(player.x - releaseX < 0.7);
});
