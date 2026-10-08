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
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', code)((name) => load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), `${name}.ts`))), module, module.exports);
  return module.exports;
}
const { createLife, stepLife, interact, lifeAction, BENCHES, HOMES } = load('src/lib/tukki-life.ts');
const { groundHeight, WORLD_RADIUS, TREE_SPOTS } = load('src/lib/tukki-game.ts');
const idle = { x: 0, z: 0, jump: false };
function advance(life, seconds, input = idle) { for (let i = 0; i < Math.ceil(seconds * 60); i++) stepLife(life, 1 / 60, input); }
function isolate(life) { life.actors.slice(1).forEach((a, i) => { a.x = Math.cos(i / 8 * Math.PI * 2) * 50; a.z = Math.sin(i / 8 * Math.PI * 2) * 50; a.y = groundHeight(a.x, a.z); a.stoppedUntil = 1000; }); }

test('greeting stops a nearby resident, turns toward the player and returns their dialogue', () => {
  const life = createLife(), friend = life.actors[1];
  assert.equal(lifeAction(life).kind, 'greet');
  const message = interact(life);
  assert.equal(message.name, 'みどり'); assert(message.text.length > 5);
  assert(friend.stoppedUntil >= 5); assert.equal(life.greetings, 1);
  const position = { x: friend.x, z: friend.z }; advance(life, 2);
  assert(Math.hypot(friend.x - position.x, friend.z - position.z) < 0.01);
});

test('bench resting stays seated even with movement input, and standing returns to the ground', () => {
  const life = createLife(); isolate(life); const p = life.actors[0], bench = BENCHES[0];
  p.x = bench.x + 1; p.z = bench.z; p.y = groundHeight(p.x, p.z);
  assert.equal(lifeAction(life).label, 'ベンチに座る'); interact(life);
  assert(life.resting); assert.equal(p.x, bench.x); assert.equal(p.z, bench.z);
  const height = p.y; advance(life, 3, { x: 1, z: 1, jump: true });
  assert.equal(p.x, bench.x); assert.equal(p.y, height); assert.equal(lifeAction(life).kind, 'stand');
  interact(life); assert(!life.resting); assert.equal(p.y, groundHeight(p.x, p.z));
});

test('resting on grass and then standing is available away from others', () => {
  const life = createLife(); isolate(life); life.actors[0].x = 8; life.actors[0].z = 0;
  assert.equal(lifeAction(life).label, 'ひと休み'); interact(life); assert(life.resting); assert.equal(life.restBench, null);
  interact(life); assert(!life.resting);
});

test('movement changes direction without drift and release brakes', () => {
  const life = createLife(); isolate(life); const p = life.actors[0];
  advance(life, 0.5, { x: 0, z: -1, jump: false }); assert(p.vz < -6);
  advance(life, 0.5, { x: 1, z: 0, jump: false }); assert(p.vx > 6); assert(Math.abs(p.vz) < 0.1);
  advance(life, 0.4); assert(Math.abs(p.vx) < 0.02);
});

test('jump lands and a held jump does not keep repeating', () => {
  const life = createLife(); isolate(life); advance(life, 0.2, { ...idle, jump: true }); assert(life.actors[0].y > 0.5);
  advance(life, 1.5, { ...idle, jump: true }); assert.equal(life.actors[0].y, 0);
});

test('residents stroll slowly and living continues beyond one minute', () => {
  const life = createLife(), initial = life.actors.map(a => ({ x: a.x, z: a.z }));
  advance(life, 120);
  assert(life.elapsed > 119); assert(life.actors.slice(1).every((a, i) => Math.hypot(a.x - initial[i + 1].x, a.z - initial[i + 1].z) > 1));
  assert(life.actors.slice(1).every(a => Math.hypot(a.vx, a.vz) <= 2.11));
});

test('characters remain inside the field and outside houses and trees', () => {
  const life = createLife(); advance(life, 35, { x: 1, z: 0, jump: false });
  for (const a of life.actors) {
    assert(Math.hypot(a.x, a.z) <= WORLD_RADIUS - a.radius + 0.01);
    assert(a.y >= groundHeight(a.x, a.z) - 0.001);
    assert(TREE_SPOTS.every(p => Math.hypot(a.x - p.x, a.z - p.z) >= a.radius + 0.35 - 0.02));
    assert(HOMES.every(p => Math.hypot(a.x - p.x, a.z - p.z) >= a.radius + 3.7 - 0.02));
  }
});

test('neighbors separate gently without pushing a seated player off the bench', () => {
  const life = createLife(); isolate(life); const p = life.actors[0];
  p.x = BENCHES[0].x; p.z = BENCHES[0].z; interact(life);
  const other = life.actors[1]; other.x = p.x + 0.1; other.z = p.z; other.y = p.y;
  const x = p.x, z = p.z; stepLife(life, 1 / 60, idle);
  assert.equal(p.x, x); assert.equal(p.z, z); assert(Math.hypot(other.x - p.x, other.z - p.z) >= p.radius + other.radius - 0.01);
});

test('rest and greeting can be chosen independently beside a friend and bench', () => {
  const life = createLife(); isolate(life); const p = life.actors[0], friend = life.actors[1], bench = BENCHES[0];
  p.x = bench.x; p.z = bench.z + 2.2; p.y = groundHeight(p.x, p.z);
  friend.x = p.x + 3; friend.z = p.z; friend.y = p.y;
  const greeting = interact(life, 'greet'); assert.equal(greeting.name, 'みどり'); assert(!life.resting);
  interact(life, 'rest'); assert(life.resting); assert.equal(life.restBench, 0);
  const facing = p.facing; interact(life, 'greet'); assert(life.resting); assert.equal(p.facing, facing);
  interact(life, 'rest'); assert(!life.resting);
});

test('greeting without a nearby friend never switches to resting', () => {
  const life = createLife(); isolate(life);
  interact(life, 'greet'); assert(!life.resting); assert.equal(life.greetings, 0);
});

test('player and residents cannot walk through the front, back or ends of a bench', () => {
  for (const index of [0, 1]) for (const direction of [{ x: 0, z: -1 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 1, z: 0 }]) {
    const life = createLife(); isolate(life); const a = life.actors[index], bench = BENCHES[0];
    if (index) { life.actors[0].x = 40; life.actors[0].z = 0; }
    a.x = bench.x - direction.x * 5; a.z = bench.z - direction.z * 5; a.y = groundHeight(a.x, a.z);
    a.stoppedUntil = 0; a.chooseAt = 1000; a.targetX = bench.x + direction.x * 5; a.targetZ = bench.z + direction.z * 5;
    for (let frame = 0; frame < 180; frame++) {
      stepLife(life, 1 / 60, { ...direction, jump: false });
      const dx = a.x - Math.max(bench.x - 1.7, Math.min(bench.x + 1.7, a.x));
      const dz = a.z - Math.max(bench.z - 0.75, Math.min(bench.z + 0.55, a.z));
      assert(Math.hypot(dx, dz) >= a.radius - 0.01);
    }
  }
});

const { RESIDENT_WALKS, createWalkNavigator } = load('src/lib/tukki-walk.ts');
test('resident routes have distinct destinations and clear paths around village props', () => {
  const nav = createWalkNavigator(HOMES, BENCHES), life = createLife();
  assert.equal(new Set(RESIDENT_WALKS.slice(1).map(route => JSON.stringify(route))).size, 8);
  RESIDENT_WALKS.slice(1).forEach((route, i) => {
    let from = life.actors[i + 1];
    for (const stop of route) {
      const path = nav.plan(from, stop); assert(path.length > 0);
      for (const next of path) { assert(nav.clear(next)); assert(nav.segmentClear(from, next)); from = next; }
    }
  });
});

test('every resident visits multiple stops and takes pauses during a three minute stroll', () => {
  const life = createLife(), visited = life.actors.map(() => new Set()), pauses = life.actors.map(() => 0);
  for (let frame = 0; frame < 180 * 30; frame++) {
    stepLife(life, 1 / 30, idle);
    life.actors.slice(1).forEach((a, i) => {
      visited[i + 1].add(a.routeStop);
      if (life.elapsed > 10 && a.stoppedUntil > life.elapsed) pauses[i + 1]++;
      const floor = groundHeight(a.x, a.z);
      assert(a.y >= floor - 0.01); assert(HOMES.every(h => Math.hypot(a.x - h.x, a.z - h.z) >= a.radius + 3.7 - 0.01));
    });
  }
  life.actors.slice(1).forEach((_, i) => { assert(visited[i + 1].size >= 3, `resident ${i + 1} keeps making progress: ${JSON.stringify(life.actors[i + 1])}`); assert(pauses[i + 1] > 30); });
});
