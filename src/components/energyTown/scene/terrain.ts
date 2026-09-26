import * as THREE from "three";
import { mulberry32, smoothstep } from "./random";

/* ---------------- key sites (flattened ground, no craters) --------- */
const SITES: [number, number][] = [
  [76, 38], // PV array (top of the fan)
  [90, 0], // reactor (middle of the fan)
  [74, -32], // BESS (bottom of the fan)
  [44, 0], // SST — the hub the fan converges on
  [-26, -6], // habitat-side landing pad node
  [-42, -22], // approach landing pad node
  [-58, -38], // charger branch junction pad
  [-76, -42], // left terminal landing pad
  [-58, -58], // lower terminal landing pad
  [-102, -47], // left charging branch
  [-34, -60], // lower charging branch
  [-36, 20], // second habitat-side landing pad node
  [-58, 40], // second approach landing pad node
  [-80, 60], // second charger branch junction pad
  [-100, 64], // second left terminal landing pad
  [-80, 82], // second lower terminal landing pad
  [-118, 68], // second left charging branch
  [-56, 86], // second lower charging branch
  [16, -42], // data centre
  [-26, 34], // HDU
  [30, 32], // comms tower
];

function siteMask(x: number, z: number) {
  let m = 0;
  for (const [sx, sz] of SITES) {
    const d2 = (x - sx) * (x - sx) + (z - sz) * (z - sz);
    m = Math.max(m, Math.exp(-d2 / (2 * 20 * 20)));
  }
  return m;
}

/* ---------------- value noise ---------------- */
function latticeHash(ix: number, iz: number) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 1000) / 1000;
}

function valueNoise(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = latticeHash(ix, iz);
  const b = latticeHash(ix + 1, iz);
  const c = latticeHash(ix, iz + 1);
  const d = latticeHash(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

function fbm(x: number, z: number) {
  return (
    valueNoise(x, z) * 0.55 +
    valueNoise(x * 2.13, z * 2.13) * 0.28 +
    valueNoise(x * 4.7, z * 4.7) * 0.17 -
    0.5
  );
}

/* ---------------- craters (avoid the built sites) ---------------- */
type Crater = { x: number; z: number; r: number };
const CRATERS: Crater[] = (() => {
  const rng = mulberry32(987654321);
  const list: Crater[] = [];
  const clearOfSites = (x: number, z: number, r: number) =>
    SITES.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > r + 24);
  let guard = 0;
  while (list.length < 26 && guard++ < 300) {
    const a = rng() * Math.PI * 2;
    const dist = 45 + rng() * 145;
    const r = 4 + rng() * (dist > 90 ? 26 : 12);
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (clearOfSites(x, z, r)) list.push({ x, z, r });
  }
  guard = 0;
  while (list.length < 34 && guard++ < 300) {
    const a = rng() * Math.PI * 2;
    const dist = 28 + rng() * 35;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (clearOfSites(x, z, 4)) list.push({ x, z, r: 2 + rng() * 4 });
  }
  guard = 0;
  while (list.length < 84 && guard++ < 600) {
    const a = rng() * Math.PI * 2;
    const dist = 30 + rng() * 170;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (clearOfSites(x, z, 3)) list.push({ x, z, r: 0.8 + rng() * 2.6 });
  }
  return list;
})();

/** Radius of the "mini-moon": ground curves away so the horizon is round. */
const MOON_CURVE = 1250;

export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const flat = smoothstep(28, 90, r);
  let h =
    flat *
    (1.4 * Math.sin(x * 0.03) * Math.cos(z * 0.035) +
      1.0 * Math.sin((x - z) * 0.022) +
      0.8);
  h += fbm(x * 0.13, z * 0.13) * (0.35 + 1.45 * flat);
  // flatten under the built sites
  h *= 1 - 0.88 * siteMask(x, z);
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1.8) {
      const rim = Math.exp(-((d - 1) * (d - 1)) / 0.07) * c.r * 0.055;
      const bowl = d < 1 ? -(Math.cos(d * Math.PI) * 0.5 + 0.5) * c.r * 0.11 : 0;
      h += rim + bowl;
    }
  }
  h -= (r * r) / MOON_CURVE;
  // steep circular limb → clean, well-rounded horizon arc
  // (larger radius = wider, better-proportioned moon disc)
  h -= smoothstep(245, 278, r) * 85;
  return h;
}

/** crater shading: darker bowls, brighter ejecta rings */
export function craterShade(x: number, z: number) {
  let shade = 1;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1) shade -= (1 - d) * 0.18;
    else if (c.r > 9 && d < 1.9) {
      shade += Math.exp(-((d - 1.35) * (d - 1.35)) / 0.12) * 0.07;
    }
  }
  return Math.min(1.12, Math.max(0.72, shade));
}

/** glowing energy conduit ribbon hugging the terrain */
export function makeRibbon(curve: THREE.CatmullRomCurve3, width: number, segments: number, lift: number) {
  const pts = curve.getSpacedPoints(segments);
  const verts = new Float32Array((segments + 1) * 2 * 3);
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const p = pts[i];
    const pNext = pts[Math.min(segments, i + 1)];
    const pPrev = pts[Math.max(0, i - 1)];
    tangent.subVectors(pNext, pPrev).setY(0).normalize();
    side.crossVectors(up, tangent).normalize().multiplyScalar(width / 2);
    const y0 = terrainHeight(p.x - side.x, p.z - side.z) + lift;
    const y1 = terrainHeight(p.x + side.x, p.z + side.z) + lift;
    verts[i * 6] = p.x - side.x;
    verts[i * 6 + 1] = y0;
    verts[i * 6 + 2] = p.z - side.z;
    verts[i * 6 + 3] = p.x + side.x;
    verts[i * 6 + 4] = y1;
    verts[i * 6 + 5] = p.z + side.z;
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
