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
