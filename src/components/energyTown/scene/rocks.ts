import * as THREE from "three";
import { mulberry32 } from "./random";
import { terrainHeight } from "./terrain";

type Track = <T extends { dispose: () => void }>(o: T) => T;

/** circle that must stay clear of boulders (structures, pads, roads) */
export type KeepOut = { x: number; z: number; r: number };

/**
 * Scattered regolith boulders: one instanced, flat-shaded rock shape,
 * power-law sized so most are small cobbles and a few are real blocks.
 * Uses its own random stream — the shared layout stream is untouched.
 */
export function buildRocks(
  group: THREE.Group,
  track: Track,
  quality: "high" | "low",
  shadows: boolean,
  keepOut: KeepOut[],
) {
  const rng = mulberry32(777001);
  // a lumpy icosahedron, displaced once and shared by every instance
  const geo = track(new THREE.IcosahedronGeometry(1, quality === "high" ? 1 : 0));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const bump = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let k = bump.get(key);
    if (k === undefined) {
      k = 0.78 + rng() * 0.4;
      bump.set(key, k);
    }
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.72, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();

  const mat = track(
    new THREE.MeshStandardMaterial({ color: "#8b8b8a", roughness: 0.96, metalness: 0, flatShading: true }),
  );
  const count = quality === "high" ? 420 : 180;
  const mesh = track(new THREE.InstancedMesh(geo, mat, count));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 20) {
    const a = rng() * Math.PI * 2;
    const dist = 12 + Math.sqrt(rng()) * 220;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    const size = 0.12 + Math.pow(rng(), 5) * 1.9;
    if (keepOut.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + size)) continue;
    s.set(size * (0.8 + rng() * 0.5), size * (0.7 + rng() * 0.6), size * (0.8 + rng() * 0.5));
    e.set(rng() * 0.6, rng() * Math.PI * 2, rng() * 0.6);
    p.set(x, terrainHeight(x, z) + s.y * 0.25, z);
    m.compose(p, q.setFromEuler(e), s);
    mesh.setMatrixAt(placed++, m);
  }
  mesh.count = placed;
  mesh.computeBoundingSphere();
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  group.add(mesh);

  const day = new THREE.Color("#8b8b8a");
  const night = new THREE.Color("#3a4252");
  return {
    applyTheme(mix: number) {
      mat.color.copy(day).lerp(night, mix);
    },
  };
}
