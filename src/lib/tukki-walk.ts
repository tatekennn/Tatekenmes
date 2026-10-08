import { TREE_SPOTS, WORLD_RADIUS } from './tukki-game';

type Point = { x: number; z: number };
export type WalkStop = Point & { pause: number; facing: number };
// Each resident has their own loop: shade, homes, picnic, flowers, and open views.
export const RESIDENT_WALKS: WalkStop[][] = [
  [],
  [{ x: 7, z: -5, pause: 3, facing: -1 }, { x: 21, z: -8, pause: 6, facing: 1.2 }, { x: 18, z: 17, pause: 5, facing: 0.8 }, { x: 8, z: 10, pause: 3, facing: -1.8 }],
  [{ x: -6, z: -17, pause: 6, facing: -Math.PI / 2 }, { x: -5, z: -7, pause: 3, facing: 0 }, { x: 6, z: -17, pause: 6, facing: Math.PI / 2 }, { x: 0, z: -24, pause: 4, facing: Math.PI }],
  [{ x: 7, z: 1, pause: 2, facing: -1 }, { x: 14, z: 11, pause: 3, facing: 0.8 }, { x: -4, z: 14, pause: 2, facing: -1 }, { x: -8, z: -3, pause: 3, facing: 2 }],
  [{ x: 17, z: 7, pause: 8, facing: 1.2 }, { x: 27, z: 13, pause: 9, facing: 1 }, { x: 19, z: -3, pause: 7, facing: -1.5 }, { x: 9, z: -10, pause: 5, facing: 0 }],
  [{ x: -11, z: 2, pause: 7, facing: -1.2 }, { x: -26, z: -2, pause: 10, facing: -1.5 }, { x: -25, z: 17, pause: 8, facing: 0 }, { x: -8, z: 18, pause: 6, facing: 0.6 }],
  [{ x: -10, z: -10, pause: 4, facing: Math.PI }, { x: 1, z: -7, pause: 3, facing: 1 }, { x: 13, z: 11, pause: 8, facing: 0.4 }, { x: 1, z: 17, pause: 4, facing: -1 }],
  [{ x: -8, z: 7, pause: 6, facing: Math.PI / 2 }, { x: -13, z: -3, pause: 4, facing: -1 }, { x: 0, z: -10, pause: 5, facing: Math.PI }, { x: 8, z: 7, pause: 6, facing: -Math.PI / 2 }],
  [{ x: 18, z: -16, pause: 6, facing: 1 }, { x: 26, z: -8, pause: 8, facing: 1.5 }, { x: 18, z: 2, pause: 7, facing: 0 }, { x: 10, z: -7, pause: 4, facing: -1 }],
];

/** Static navigation grid with extra space around props for the residents' bodies. */
export function createWalkNavigator(homes: Point[], benches: Point[]) {
  const spacing = 2, extent = 48, width = 49;
  const clear = (p: Point) => Math.hypot(p.x, p.z) < WORLD_RADIUS - 2 &&
    homes.every(h => Math.hypot(p.x - h.x, p.z - h.z) > 5.3) &&
    TREE_SPOTS.every(t => Math.hypot(p.x - t.x, p.z - t.z) > 1.9) &&
    benches.every(b => Math.hypot(Math.max(0, Math.abs(p.x - b.x) - 1.7), Math.max(0, Math.abs(p.z - (b.z - 0.1)) - 0.65)) > 1.55);
  const points = Array.from({ length: width * width }, (_, i) => ({ x: i % width * spacing - extent, z: Math.floor(i / width) * spacing - extent }));
  const allowed = points.map(clear);
  const segmentClear = (a: Point, b: Point) => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
    for (let i = 0; i <= steps; i++) { const t = steps ? i / steps : 0; if (!clear({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false; }
    return true;
  };
  const nearest = (p: Point) => {
    let best = -1, distance = Infinity;
    points.forEach((point, i) => { const d = Math.hypot(p.x - point.x, p.z - point.z); if (allowed[i] && d < distance) { best = i; distance = d; } });
    return best;
  };
  return { clear, segmentClear, plan(start: Point, destination: Point): Point[] {
    const first = nearest(start), last = nearest(destination);
    if (first < 0 || last < 0) return [];
    const costs = new Float64Array(points.length).fill(Infinity), previous = new Int32Array(points.length).fill(-1);
    const open = new Set([first]), closed = new Set<number>(); costs[first] = 0;
    while (open.size) {
      let current = -1, score = Infinity;
      for (const i of open) { const f = costs[i] + Math.hypot(points[i].x - points[last].x, points[i].z - points[last].z); if (f < score) { score = f; current = i; } }
      if (current === last) break;
      open.delete(current); closed.add(current);
      const cx = current % width, cz = Math.floor(current / width);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if ((!dx && !dz) || cx + dx < 0 || cx + dx >= width || cz + dz < 0 || cz + dz >= width) continue;
        const next = current + dx + dz * width;
        if (!allowed[next] || closed.has(next) || !segmentClear(points[current], points[next])) continue;
        const cost = costs[current] + Math.hypot(dx, dz) * spacing;
        if (cost < costs[next]) { costs[next] = cost; previous[next] = current; open.add(next); }
      }
    }
    if (!Number.isFinite(costs[last])) return [];
    const path: Point[] = []; let node = last;
    while (node !== first) { path.unshift(points[node]); node = previous[node]; }
    if (segmentClear(points[last], destination)) path.push(destination);
    // Keep only visible corners so characters take gentle, direct stretches.
    const smooth: Point[] = []; let anchor = start, index = 0;
    while (index < path.length) {
      let farthest = index;
      for (let i = index; i < path.length; i++) { if (segmentClear(anchor, path[i])) farthest = i; else break; }
      smooth.push(path[farthest]); anchor = path[farthest]; index = farthest + 1;
    }
    return smooth;
  } };
}
