export const WORLD_RADIUS = 58;
export const HAKI_SPOTS = [
  { x: 0, z: -7 }, { x: 0, z: -13 }, { x: 0, z: -19 }, { x: 0, z: -25 },
  ...Array.from({ length: 28 }, (_, i) => {
    const angle = i * 2.399963229728653;
    const radius = 15 + (i % 5) * 8;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }),
];

// Test the whole travelled segment so a long frame cannot skip a pickup.
export function touchesHaki(ax: number, az: number, bx: number, bz: number, x: number, z: number) {
  const dx = bx - ax, dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
  return Math.hypot(ax + dx * t - x, az + dz * t - z) <= 1.9;
}

/** Gentle terrain; the starting plaza stays level. */
export function groundHeight(x: number, z: number) {
  const fade = Math.min(1, Math.max(0, (Math.hypot(x, z) - 7) / 16));
  return fade * (Math.sin(x * 0.065) * Math.sin(z * 0.075) * 1.05 + Math.sin(z * 0.038) * 0.45);
}

export const TREE_SPOTS = Array.from({ length: 120 }, (_, i) => {
  const angle = i * 2.39996323, radius = 23 + i % 7 * 5;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, seed: i };
}).filter((tree) =>
  HAKI_SPOTS.every((spot) => Math.hypot(tree.x - spot.x, tree.z - spot.z) > 4) &&
  [0, Math.PI / 3, -Math.PI / 3].every((angle) => Math.abs(tree.x * Math.cos(angle) - tree.z * Math.sin(angle)) > 4)
).slice(0, 22);
