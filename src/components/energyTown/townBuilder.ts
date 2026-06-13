import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Lunar micro-grid, organized by energy flow:                         */
/*   INPUTS  : PV array + nuclear reactor (east, side by side)         */
/*   STORAGE : battery banks (BESS)                                    */
/*   PROCESS : solid-state transformer (SST) + landing pad / charging  */
/*   LOADS   : data centre + habitat ring (domes & capsules in a       */
/*             closed loop of tubes), with the portal pedestal inside  */
/*             the main dome.                                          */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260611);
const R = (min: number, max: number) => min + rand() * (max - min);

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

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
function craterShade(x: number, z: number) {
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

/* ---------------- textures ---------------- */
function makeRegolithTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(256, 256);
  const rng = mulberry32(13579);
  for (let i = 0; i < 256 * 256; i++) {
    const g = 110 + rng() * 70;
    img.data[i * 4] = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 60; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = 6 + rng() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rng() > 0.5 ? "255,255,255" : "0,0,0";
    g.addColorStop(0, `rgba(${tone},0.10)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  return tex;
}

function makeSolarCellTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#b9c2cc";
  ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = "#0d2c55";
  ctx.fillRect(6, 6, 244, 180);
  const cols = 8;
  const rows = 5;
  const cw = 244 / cols;
  const ch = 180 / rows;
  const rng = mulberry32(24680);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const px = 6 + x * cw;
      const py = 6 + y * ch;
      const tone = 0.85 + rng() * 0.3;
      const g = ctx.createLinearGradient(px, py, px + cw, py + ch);
      g.addColorStop(0, `rgba(${Math.round(31 * tone)}, ${Math.round(95 * tone)}, ${Math.round(186 * tone)}, 1)`);
      g.addColorStop(0.5, `rgba(${Math.round(20 * tone)}, ${Math.round(64 * tone)}, ${Math.round(140 * tone)}, 1)`);
      g.addColorStop(1, `rgba(${Math.round(26 * tone)}, ${Math.round(82 * tone)}, ${Math.round(168 * tone)}, 1)`);
      ctx.fillStyle = g;
      ctx.fillRect(px + 1.5, py + 1.5, cw - 3, ch - 3);
      ctx.strokeStyle = "rgba(190, 215, 240, 0.5)";
      ctx.lineWidth = 0.8;
      for (let b = 1; b <= 3; b++) {
        ctx.beginPath();
        ctx.moveTo(px + (b * cw) / 4, py + 2);
        ctx.lineTo(px + (b * cw) / 4, py + ch - 2);
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** soft radial glow sprite texture */
function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(160,210,255,0.9)");
  g.addColorStop(0.4, "rgba(110,170,255,0.32)");
  g.addColorStop(1, "rgba(80,140,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** round point sprite for the energy dots */
function makeDotTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.9)");
  g.addColorStop(0.7, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
export const DAY = {
  background: new THREE.Color("#050608"),
  fogNear: 210,
  fogFar: 520,
  hemiSky: new THREE.Color("#9aa3ad"),
  hemiGround: new THREE.Color("#3c3f43"),
  hemiIntensity: 0.5,
  sunColor: new THREE.Color("#fff8ee"),
  sunIntensity: 3.0,
};

export const NIGHT = {
  background: new THREE.Color("#030407"),
  fogNear: 150,
  fogFar: 440,
  hemiSky: new THREE.Color("#1c2a44"),
  hemiGround: new THREE.Color("#0a0d12"),
  hemiIntensity: 0.4,
  sunColor: new THREE.Color("#8fb0e8"),
  sunIntensity: 0.25,
};

export type Town = {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  applyTheme: (mix: number) => void;
  dispose: () => void;
};

/** glowing energy conduit ribbon hugging the terrain */
function makeRibbon(curve: THREE.CatmullRomCurve3, width: number, segments: number, lift: number) {
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

/* ------------------------------------------------------------------ */
export function buildTown(quality: "high" | "low"): Town {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T): T => {
    disposables.push(o);
    return o;
  };
  const shadows = quality === "high";

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const v = new THREE.Vector3();

  /* ---------------- materials ---------------- */
  const std = (color: string, extra?: THREE.MeshStandardMaterialParameters) =>
    track(
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.9,
        metalness: 0.05,
        ...extra,
      })
    );

  const regolithTex = track(makeRegolithTexture());
  const terrainMat = std("#ffffff", {
    roughness: 1,
    metalness: 0,
    flatShading: false,
    bumpMap: regolithTex,
    bumpScale: 0.38,
  });
  const shellMat = std("#cfe0ec", {
    roughness: 0.5,
    metalness: 0.12,
    side: THREE.DoubleSide, // dome hull stays solid during the fly-through
  });
  const shellDarkMat = std("#a9bfd1", { roughness: 0.6, metalness: 0.15 });
  const solarCellTex = track(makeSolarCellTexture());
  const solarMat = std("#ffffff", {
    map: solarCellTex,
    bumpMap: solarCellTex,
    bumpScale: 0.06,
    roughness: 0.3,
    metalness: 0.45,
    flatShading: false,
    emissive: new THREE.Color("#1f7fe8"),
    emissiveIntensity: 0.1,
  });
  const conduitMat = std("#10161f", {
    roughness: 0.4,
    emissive: new THREE.Color("#2ebcfe"),
    emissiveIntensity: 0.55,
  });
  const coreMat = std("#0d1726", {
    roughness: 0.3,
    emissive: new THREE.Color("#67d6ff"),
    emissiveIntensity: 0.9,
  });
  const stripMat = std("#2b3346", {
    roughness: 0.4,
    emissive: new THREE.Color("#ffd9a0"),
    emissiveIntensity: 0.3,
  });
  const goldMat = std("#c9a86a", { roughness: 0.35, metalness: 0.6 });
  const glowTex = track(makeGlowTexture());
  const dotTex = track(makeDotTexture());

  /* ---------------- terrain ---------------- */
  const segs = quality === "high" ? 240 : 130;
  const terrainGeo = track(new THREE.PlaneGeometry(580, 580, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const baseGrey = 0.5;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    const g = baseGrey * (0.94 + rand() * 0.12) * craterShade(x, z);
    colors[i * 3] = g;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = g * 1.02;
  }
  terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  terrainMat.vertexColors = true;
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = shadows;
  group.add(terrain);

  /* ================== LOADS: habitat — hexagon layout ==============
     One central main dome, six SECONDARY DOMES at the vertices of a
     regular hexagon, spokes from the centre to every dome, and
     perimeter tubes closing the hexagon — exactly like the sketch. */
  type Dome = { x: number; z: number; r: number };
  const HEX_R = 26;
  const HEX_OFF = 0.18;
  const hexNodes: { x: number; z: number; angle: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + HEX_OFF;
    hexNodes.push({ x: Math.cos(angle) * HEX_R, z: Math.sin(angle) * HEX_R, angle });
  }
  const domes: Dome[] = [
    { x: 0, z: 0, r: 14 }, // the central dome — the portal lives inside
    ...hexNodes.map((n) => ({ x: n.x, z: n.z, r: 6.5 })),
  ];

  const seamMat = track(
    new THREE.LineBasicMaterial({ color: "#7e8a9c", transparent: true, opacity: 0.25 })
  );
  for (const d of domes) {
    const gy = terrainHeight(d.x, d.z);
    const domeGeo = track(
      new THREE.SphereGeometry(d.r, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)
    );
    const dome = new THREE.Mesh(domeGeo, shellMat);
    dome.position.set(d.x, gy + 0.1, d.z);
    dome.castShadow = shadows;
    group.add(dome);
    // geodesic panel seams
    const seamSrc = track(
      new THREE.SphereGeometry(d.r * 1.004, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    );
    const seamGeo = track(new THREE.WireframeGeometry(seamSrc));
    const seams = new THREE.LineSegments(seamGeo, seamMat);
    seams.position.set(d.x, gy + 0.1, d.z);
    group.add(seams);
    // glowing base ring
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(d.r * 1.04, 0.2, 8, 56)),
      conduitMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(d.x, gy + 0.35, d.z);
    group.add(ring);
    // brand-blue crown ring near the apex
    const crownH = d.r * 0.78;
    const crownR = Math.sqrt(Math.max(0.05, d.r * d.r - crownH * crownH));
    const crown = new THREE.Mesh(
      track(new THREE.TorusGeometry(crownR * 1.02, 0.14, 8, 48)),
      conduitMat
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.set(d.x, gy + 0.1 + crownH, d.z);
    group.add(crown);
    // warm window band partway up every habitat dome
    if (d.r >= 6) {
      const band = new THREE.Mesh(
        track(new THREE.TorusGeometry(d.r * 0.9, 0.14, 8, 56)),
        stripMat
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(d.x, gy + d.r * 0.42, d.z);
      group.add(band);
    }
  }

  /* (the six hexagon vertices are secondary domes — built above) */

  /* ----- tubes: consecutive ring nodes (closed loop) + spokes ----- */
  const tubeGeoUnit = track(new THREE.CylinderGeometry(0.8, 0.8, 1, 10));
  const addTube = (ax: number, az: number, bx: number, bz: number) => {
    const ay = terrainHeight(ax, az) + 1.1;
    const by = terrainHeight(bx, bz) + 1.1;
    const A = new THREE.Vector3(ax, ay, az);
    const B = new THREE.Vector3(bx, by, bz);
    const dir = new THREE.Vector3().subVectors(B, A);
    const len = dir.length();
    const tube = new THREE.Mesh(tubeGeoUnit, shellDarkMat);
    tube.scale.set(1, len, 1);
    tube.position.copy(A).addScaledVector(dir, 0.5);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    tube.castShadow = shadows;
    group.add(tube);
  };
  // perimeter: each capsule connected to the next (closed hexagon)
  for (let i = 0; i < hexNodes.length; i++) {
    const a = hexNodes[i];
    const b = hexNodes[(i + 1) % hexNodes.length];
    addTube(a.x, a.z, b.x, b.z);
  }
  // spokes: the central dome connected to every capsule
  for (const n of hexNodes) {
    addTube(0, 0, n.x, n.z);
  }

  /* (dome interior stage removed — the handoff to the portal happens
     through a brief dark beat with the WELCOME caption instead) */

  /* ================== INPUTS: PV array + reactor =================== */
  const solarCenter = { x: 76, z: 38 };
  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const panelPlacements: THREE.Matrix4[] = [];
  const legPlacements: THREE.Matrix4[] = [];
  const panelYaw = Math.atan2(150 - solarCenter.x, 90 - solarCenter.z);
  const panelTilt = 0.55;
  const cosY = Math.cos(panelYaw);
  const sinY = Math.sin(panelYaw);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const px = solarCenter.x - 19 + col * 7.6 + R(-0.2, 0.2);
      const pz = solarCenter.z - 14 + row * 7.0 + R(-0.2, 0.2);
      const gy = terrainHeight(px, pz);
      const mm = new THREE.Matrix4();
      mm.compose(
        new THREE.Vector3(px, gy + 1.5, pz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(panelTilt, panelYaw, 0, "YXZ")),
        new THREE.Vector3(6.6, 0.18, 5.0)
      );
      panelPlacements.push(mm);
      for (const lx of [-2.4, 2.4]) {
        const ox = lx * cosY - 0.7 * sinY;
        const oz = -lx * sinY - 0.7 * cosY;
        const lm = new THREE.Matrix4();
        lm.compose(
          new THREE.Vector3(px + ox, gy + 0.6, pz + oz),
          new THREE.Quaternion(),
          new THREE.Vector3(0.16, 1.2, 0.16)
        );
        legPlacements.push(lm);
      }
    }
  }
  const panelMesh = new THREE.InstancedMesh(boxGeo, solarMat, panelPlacements.length);
  panelMesh.castShadow = shadows;
  panelPlacements.forEach((mm, i) => panelMesh.setMatrixAt(i, mm));
  const legMesh = new THREE.InstancedMesh(boxGeo, shellDarkMat, legPlacements.length);
  legPlacements.forEach((mm, i) => legMesh.setMatrixAt(i, mm));
  group.add(panelMesh, legMesh);

  /* ----- nuclear reactor (detailed) ----- */
  const reactor = { x: 90, z: 0 };
  {
    const gy = terrainHeight(reactor.x, reactor.z);
    const X = reactor.x;
    const Z = reactor.z;
    // octagonal platform + skirt
    const platform = new THREE.Mesh(track(new THREE.CylinderGeometry(7, 7.6, 0.9, 8)), shellDarkMat);
    platform.position.set(X, gy + 0.45, Z);
    platform.receiveShadow = shadows;
    group.add(platform);
    // main vessel with segment rings
    const vessel = new THREE.Mesh(track(new THREE.CylinderGeometry(2.9, 3.3, 6.2, 16)), shellMat);
    vessel.position.set(X, gy + 4.0, Z);
    vessel.castShadow = shadows;
    group.add(vessel);
    for (const ry of [2.4, 4.0, 5.6]) {
      const seg = new THREE.Mesh(track(new THREE.TorusGeometry(3.12, 0.12, 8, 32)), shellDarkMat);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(X, gy + ry, Z);
      group.add(seg);
    }
    // glowing core showing through the vessel
    const core = new THREE.Mesh(track(new THREE.CylinderGeometry(2.2, 2.2, 6.4, 12)), coreMat);
    core.position.set(X, gy + 4.0, Z);
    group.add(core);
    // top cap dome + vent + antenna
    const cap = new THREE.Mesh(
      track(new THREE.SphereGeometry(2.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
      shellMat
    );
    cap.position.set(X, gy + 7.1, Z);
    cap.castShadow = shadows;
    group.add(cap);
    const vent = new THREE.Mesh(track(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 8)), shellDarkMat);
    vent.position.set(X + 1.2, gy + 8.4, Z + 0.6);
    group.add(vent);
    const antenna = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.08, 2.4, 6)), shellDarkMat);
    antenna.position.set(X, gy + 10.0, Z);
    const tip = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 8, 6)), coreMat);
    tip.position.set(X, gy + 11.2, Z);
    group.add(antenna, tip);
    // radiator fins (bigger, panel-like)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(track(new THREE.BoxGeometry(0.25, 5.0, 3.4)), shellDarkMat);
      fin.position.set(X + Math.cos(a) * 4.9, gy + 3.6, Z + Math.sin(a) * 4.9);
      fin.rotation.y = -a;
      fin.castShadow = shadows;
      group.add(fin);
    }
    // coolant tanks + connecting pipes
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.95, 2.2, 4, 12)), shellMat);
      tank.position.set(X + side * 5.6, gy + 2.3, Z - 3.6);
      tank.castShadow = shadows;
      group.add(tank);
      const pipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8)), shellDarkMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.rotation.y = 0.6 * side;
      pipe.position.set(X + side * 3.4, gy + 1.7, Z - 2.2);
      group.add(pipe);
    }
    // pipe ring around the vessel base
    const pipeRing = new THREE.Mesh(track(new THREE.TorusGeometry(3.8, 0.16, 8, 40)), shellDarkMat);
    pipeRing.rotation.x = Math.PI / 2;
    pipeRing.position.set(X, gy + 1.15, Z);
    group.add(pipeRing);
    // glowing halo + ground ring
    const halo = new THREE.Mesh(track(new THREE.TorusGeometry(4.6, 0.22, 8, 48)), conduitMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(X, gy + 1.5, Z);
    group.add(halo);
  }

  /* ================== STORAGE: battery banks ======================= */
  const bessLightMat = std("#10161f", {
    roughness: 0.4,
    emissive: new THREE.Color("#2ebcfe"),
    emissiveIntensity: 0.8,
  });
  const bessCenter = { x: 74, z: -32 };
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bx = bessCenter.x - 6 + col * 6 + (row % 2) * 1.2;
      const bz = bessCenter.z - 3.5 + row * 7;
      const gy = terrainHeight(bx, bz);
      const body = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 2.7, 2.7)), shellMat);
      body.position.set(bx, gy + 1.45, bz);
      body.rotation.y = 0.18;
      body.castShadow = shadows;
      group.add(body);
      const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(4.46, 0.5, 2.76)), solarMat);
      stripe.position.set(bx, gy + 2.35, bz);
      stripe.rotation.y = 0.18;
      group.add(stripe);
      const status = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 0.16, 0.06)), bessLightMat);
      status.position.set(bx + Math.sin(0.18) * 1.41, gy + 1.0, bz + Math.cos(0.18) * 1.41);
      status.rotation.y = 0.18;
      group.add(status);
    }
  }

  /* ================== PROCESS: SST station ========================= */
  const sstCenter = { x: 44, z: 0 };
  const sstRingMat = std("#1a1410", {
    roughness: 0.35,
    emissive: new THREE.Color("#ffc23f"),
    emissiveIntensity: 0.8,
  });
  {
    const gy = terrainHeight(sstCenter.x, sstCenter.z);
    const platform = new THREE.Mesh(track(new THREE.BoxGeometry(15, 0.7, 11)), shellDarkMat);
    platform.position.set(sstCenter.x, gy + 0.35, sstCenter.z);
    platform.receiveShadow = shadows;
    group.add(platform);
    const sstBody = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 5.4, 3.6)), shellMat);
    sstBody.position.set(sstCenter.x - 3, gy + 3.1, sstCenter.z - 1);
    sstBody.castShadow = shadows;
    group.add(sstBody);
    for (const bandY of [2.3, 4.1]) {
      const band = new THREE.Mesh(track(new THREE.BoxGeometry(4.78, 0.22, 3.78)), sstRingMat);
      band.position.set(sstCenter.x - 3, gy + bandY, sstCenter.z - 1);
      group.add(band);
    }
    for (let k = 0; k < 5; k++) {
      const fin = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 4.2, 1.3)), shellDarkMat);
      fin.position.set(sstCenter.x - 3 - 1.8 + k * 0.9, gy + 3.1, sstCenter.z - 1 - 2.4);
      fin.castShadow = shadows;
      group.add(fin);
    }
    for (const bx of [-1.3, 0, 1.3]) {
      const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.13, 0.16, 0.85, 8)), shellDarkMat);
      post.position.set(sstCenter.x - 3 + bx, gy + 6.2, sstCenter.z - 1);
      const tipB = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 8, 6)), sstRingMat);
      tipB.position.set(sstCenter.x - 3 + bx, gy + 6.72, sstCenter.z - 1);
      group.add(post, tipB);
    }
    for (const [cx, cz] of [
      [3.6, 2.4],
      [3.6, -2.6],
    ] as [number, number][]) {
      const cab = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 3.1, 1.8)), shellMat);
      cab.position.set(sstCenter.x + cx, gy + 2.25, sstCenter.z + cz);
      cab.castShadow = shadows;
      group.add(cab);
      const led = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.14, 0.06)), bessLightMat);
      led.position.set(sstCenter.x + cx, gy + 3.2, sstCenter.z + cz + 0.94);
      group.add(led);
    }
  }

  /* ----- landing pads + charging posts, laid out like the hand sketch ----- */
  const pads = [
    { x: -26, z: -6, r: 5.2 }, // node attached to the habitat ring
    { x: -42, z: -22, r: 5.4 }, // diagonal approach node
    { x: -58, z: -38, r: 6.4 }, // charger branch junction
    { x: -76, z: -42, r: 5.8 }, // left terminal pad beside chargers
    { x: -58, z: -58, r: 5.8 }, // lower terminal pad beside chargers
    { x: -36, z: 20, r: 5.2 }, // second node attached to the habitat ring
    { x: -58, z: 40, r: 5.4 }, // second diagonal approach node
    { x: -80, z: 60, r: 6.4 }, // second charger branch junction
    { x: -100, z: 64, r: 5.8 }, // second left terminal pad beside chargers
    { x: -80, z: 82, r: 5.8 }, // second lower terminal pad beside chargers
  ];
  const padTops: number[] = [];
  for (let pi = 0; pi < pads.length; pi++) {
    const pd = pads[pi];
    // sample the rim so the pad always clears the local terrain
    let maxEdge = -1e9;
    let minEdge = 1e9;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const h = terrainHeight(pd.x + Math.cos(a) * pd.r, pd.z + Math.sin(a) * pd.r);
      maxEdge = Math.max(maxEdge, h);
      minEdge = Math.min(minEdge, h);
    }
    const top = maxEdge + 0.22; // low profile
    padTops[pi] = top;
    const baseH = top - (minEdge - 0.8);
    const padMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(pd.r, pd.r + 0.6, baseH, 28)),
      shellDarkMat
    );
    padMesh.position.set(pd.x, top - baseH / 2, pd.z);
    padMesh.receiveShadow = shadows;
    group.add(padMesh);
    const padRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(pd.r * 0.86, 0.15, 8, 64)),
      conduitMat
    );
    padRing.rotation.x = Math.PI / 2;
    padRing.position.set(pd.x, top + 0.05, pd.z);
    const padMark = new THREE.Mesh(
      track(new THREE.TorusGeometry(pd.r * 0.48, 0.08, 6, 48)),
      shellDarkMat
    );
    padMark.rotation.x = Math.PI / 2;
    padMark.position.set(pd.x, top + 0.04, pd.z);
    group.add(padRing, padMark);
  }
  {
    const pad = pads[3];
    /* detailed lander on the left terminal pad */
    const lx = pad.x + 0.8;
    const lz = pad.z - 0.7;
    const lander = new THREE.Group();
    lander.position.set(lx, padTops[3], lz);
    lander.rotation.y = 0.2;
    // descent stage: octagonal, gold-foil skirt
    const descent = new THREE.Mesh(track(new THREE.CylinderGeometry(1.6, 1.7, 1.0, 8)), goldMat);
    descent.position.y = 1.35;
    descent.castShadow = shadows;
    lander.add(descent);
    const skirt = new THREE.Mesh(track(new THREE.CylinderGeometry(1.7, 1.95, 0.35, 8)), goldMat);
    skirt.position.y = 0.78;
    lander.add(skirt);
    // engine nozzle
    const nozzle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.62, 0.6, 12)), shellDarkMat);
    nozzle.position.y = 0.42;
    lander.add(nozzle);
    // ascent module: cone + porthole ring
    const ascent = new THREE.Mesh(track(new THREE.ConeGeometry(1.25, 1.7, 8)), shellMat);
    ascent.position.y = 2.7;
    ascent.castShadow = shadows;
    lander.add(ascent);
    const portRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.95, 0.07, 6, 24)), stripMat);
    portRing.rotation.x = Math.PI / 2;
    portRing.position.y = 2.25;
    lander.add(portRing);
    // antenna + dish
    const mastL = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6)), shellDarkMat);
    mastL.position.set(0.5, 3.9, 0.2);
    const dishL = new THREE.Mesh(track(new THREE.CircleGeometry(0.34, 12)), shellMat);
    dishL.position.set(0.5, 4.5, 0.2);
    dishL.rotation.x = -Math.PI / 3;
    (dishL.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    lander.add(mastL, dishL);
    // four legs with footpads
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.09, 2.1, 6)), shellDarkMat);
      leg.position.set(Math.cos(a) * 1.75, 1.0, Math.sin(a) * 1.75);
      leg.rotation.z = Math.cos(a) * 0.55;
      leg.rotation.x = -Math.sin(a) * 0.55;
      const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.34, 0.42, 0.12, 10)), goldMat);
      foot.position.set(Math.cos(a) * 2.45, 0.07, Math.sin(a) * 2.45);
      lander.add(leg, foot);
    }
    group.add(lander);

    const chargerGeo = track(new THREE.BoxGeometry(1.4, 2.4, 0.85));
    const chargerBaseGeo = track(new THREE.BoxGeometry(3.6, 0.16, 3.0));
    const screenGeo = track(new THREE.BoxGeometry(0.82, 0.5, 0.08));
    const armGeo = track(new THREE.CylinderGeometry(0.06, 0.06, 1.55, 6));
    const spotGeo = track(new THREE.PlaneGeometry(4.0, 3.2));
    const chargers = [
      // three square charger posts on the left branch
      { x: -92, z: -45, rot: -1.48 },
      { x: -102, z: -47, rot: -1.48 },
      { x: -112, z: -49, rot: -1.48 },
      // three square charger posts on the lower branch
      { x: -46, z: -60, rot: -0.06 },
      { x: -34, z: -60.5, rot: -0.06 },
      { x: -22, z: -61, rot: -0.06 },
      // three square charger posts on the second left branch
      { x: -108, z: 66, rot: -1.38 },
      { x: -118, z: 68, rot: -1.38 },
      { x: -128, z: 70, rot: -1.38 },
      // three square charger posts on the second lower branch
      { x: -68, z: 84, rot: 0.12 },
      { x: -56, z: 86, rot: 0.12 },
      { x: -44, z: 88, rot: 0.12 },
    ];
    for (const station of chargers) {
      const gy = terrainHeight(station.x, station.z);
      const charger = new THREE.Group();
      charger.position.set(station.x, gy, station.z);
      charger.rotation.y = station.rot;

      const base = new THREE.Mesh(chargerBaseGeo, shellDarkMat);
      base.position.y = 0.08;
      base.receiveShadow = shadows;
      charger.add(base);

      const pillar = new THREE.Mesh(chargerGeo, shellMat);
      pillar.position.set(0, 1.35, 0);
      pillar.castShadow = shadows;
      charger.add(pillar);

      const screen = new THREE.Mesh(screenGeo, bessLightMat);
      screen.position.set(0, 1.65, -0.47);
      charger.add(screen);

      const arm = new THREE.Mesh(armGeo, shellDarkMat);
      arm.rotation.x = Math.PI / 2.6;
      arm.position.set(0, 2.22, -0.72);
      charger.add(arm);

      const spot = new THREE.Mesh(spotGeo, conduitMat);
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(0, 0.14, -2.35);
      charger.add(spot);

      group.add(charger);
    }
  }

  /* ================== LOAD: data centre ============================ */
  const dcCenter = { x: 16, z: -42 };
  {
    const rot = 0.3;
    const gy = terrainHeight(dcCenter.x, dcCenter.z);
    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(11, 4, 6.5)), shellMat);
    hall.position.set(dcCenter.x, gy + 2, dcCenter.z);
    hall.rotation.y = rot;
    hall.castShadow = shadows;
    group.add(hall);
    for (let k = 0; k < 5; k++) {
      const fx = -4 + k * 2;
      const fin = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 1.1, 5.9)), shellDarkMat);
      fin.position.set(dcCenter.x + Math.cos(rot) * fx, gy + 4.55, dcCenter.z - Math.sin(rot) * fx);
      fin.rotation.y = rot;
      fin.castShadow = shadows;
      group.add(fin);
    }
    for (const side of [-1, 1]) {
      for (const ly of [1.1, 2.0, 2.9]) {
        const strip = new THREE.Mesh(track(new THREE.BoxGeometry(9.6, 0.14, 0.06)), bessLightMat);
        strip.position.set(
          dcCenter.x + Math.sin(rot) * 3.31 * side,
          gy + ly,
          dcCenter.z + Math.cos(rot) * 3.31 * side
        );
        strip.rotation.y = rot;
        group.add(strip);
      }
    }
  }

  /* ---------------- comms tower ---------------- */
  const comms = { x: 30, z: 32 };
  {
    const gy = terrainHeight(comms.x, comms.z);
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.3, 13, 6)), shellDarkMat);
    mast.position.set(comms.x, gy + 6.5, comms.z);
    mast.castShadow = shadows;
    const dish = new THREE.Mesh(track(new THREE.CircleGeometry(2.4, 18)), shellMat);
    dish.position.set(comms.x, gy + 12.4, comms.z);
    dish.rotation.x = -Math.PI / 3;
    (dish.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const tip = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 8, 6)), coreMat);
    tip.position.set(comms.x, gy + 13.2, comms.z);
    group.add(mast, dish, tip);
  }

  /* ---------------- conduits: two semantic networks ----------------
     POWER (amber dots / warm ribbons): generation → storage → SST → loads
     DATA  (blue dots / blue ribbons): habitat ring, comms, data centre  */
  const conduitAmberMat = std("#1a1208", {
    roughness: 0.4,
    emissive: new THREE.Color("#ffb53f"),
    emissiveIntensity: 0.5,
  });

  /* Every link in the base carries a TWIN pair of lines:
     an amber ENERGY line and, running beside it, a blue DATA line
     (data dots flow in the opposite direction — information returns). */
  const LINKS: [number, number][][] = [
    // the fan: PV / reactor / BESS each feed the SST hub directly
    [[72, 34], [60, 22], [50, 6]], // PV -> SST
    [[85, 1], [70, 1], [52, 1]], // reactor -> SST
    [[70, -28], [58, -16], [49, -5]], // BESS -> SST
    // SST outputs
    [[40, -7], [30, -24], [20, -38]], // SST -> data centre
    [[39, 2], [30, 2], [24, 2]], // SST -> habitat hexagon
    [[39, 2], [24, 0], [-25, -5], [-42, -22], [-58, -38]], // habitat edge -> charger branch junction
    [[-58, -38], [-67, -40], [-76, -42], [-92, -45], [-112, -49]], // junction -> left pad + charger branch
    [[-58, -38], [-58, -48], [-58, -58], [-46, -60], [-22, -61]], // junction -> lower pad + charger branch
    [[-19, 14], [-36, 20], [-58, 40], [-80, 60]], // second habitat edge -> charger branch junction
    [[-80, 60], [-90, 62], [-100, 64], [-108, 66], [-128, 70]], // second junction -> left pad + charger branch
    [[-80, 60], [-80, 72], [-80, 82], [-68, 84], [-44, 88]], // second junction -> lower pad + charger branch
    // habitat loop following the hexagon perimeter
    [
      [22.6, 4.1],
      [7.8, 21.7],
      [-14.9, 17.5],
      [-22.6, -4.1],
      [-7.8, -21.7],
      [14.9, -17.5],
      [22.6, 4.1],
    ],
    [[18, 12], [24, 24], [30, 31]], // hexagon -> comms tower
    [[14, -38], [8, -30], [4, -24]], // data centre -> hexagon
    [[-19, 14], [-23, 24], [-25, 31]], // hexagon -> HDU
  ];

  /** shift a polyline sideways so the twin lines run in parallel */
  function offsetPath(pts: [number, number][], d: number): [number, number][] {
    const n = pts.length;
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const L = Math.hypot(dx, dz) || 1;
      return [p[0] - (dz / L) * d, p[1] + (dx / L) * d] as [number, number];
    });
  }

  type PathDef = { kind: "power" | "data"; pts: [number, number][] };
  const pathDefs: PathDef[] = LINKS.flatMap((pts) => [
    { kind: "power" as const, pts: offsetPath(pts, 0.85) },
    { kind: "data" as const, pts: offsetPath(pts, -0.85) },
  ]);

  type Flow = { samples: Float32Array; nSamples: number; count: number; speed: number };
  const flows: Flow[] = [];
  const flowKinds: ("power" | "data")[] = [];
  const conduitPulses: {
    mat: THREE.MeshStandardMaterial;
    phase: number;
    kind: "power" | "data";
  }[] = [];
  let totalDots = 0;
  let pathIndex = 0;
  for (const def of pathDefs) {
    const pts = def.pts.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.25, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
    const len = curve.getLength();
    const ribbon = track(makeRibbon(curve, 0.85, Math.max(28, Math.floor(len / 1.8)), 0.16));
    const ribbonMat = track((def.kind === "power" ? conduitAmberMat : conduitMat).clone());
    conduitPulses.push({ mat: ribbonMat, phase: pathIndex * 1.35, kind: def.kind });
    pathIndex++;
    const conduitMesh = new THREE.Mesh(ribbon, ribbonMat);
    group.add(conduitMesh);

    const nSamples = 220;
    const spaced = curve.getSpacedPoints(nSamples - 1);
    const samples = new Float32Array(nSamples * 3);
    spaced.forEach((p, i) => {
      samples[i * 3] = p.x;
      samples[i * 3 + 1] = terrainHeight(p.x, p.z) + 0.6;
      samples[i * 3 + 2] = p.z;
    });
    const count = Math.max(5, Math.round(len / 3.2));
    flows.push({ samples, nSamples, count, speed: R(0.03, 0.05) });
    flowKinds.push(def.kind);
    totalDots += count;
  }

  const dotPositions = new Float32Array(totalDots * 3);
  const dotColors = new Float32Array(totalDots * 3);
  const cBlue = new THREE.Color("#2ebcfe"); // information
  const cAmber = new THREE.Color("#ffb53f"); // energy
  let di = 0;
  flows.forEach((f, fi) => {
    const c = flowKinds[fi] === "power" ? cAmber : cBlue;
    for (let i = 0; i < f.count; i++) {
      dotColors[di * 3] = c.r;
      dotColors[di * 3 + 1] = c.g;
      dotColors[di * 3 + 2] = c.b;
      di++;
    }
  });
  const dotGeo = track(new THREE.BufferGeometry());
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
  dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
  const dotMat = track(
    new THREE.PointsMaterial({
      size: 1.35,
      map: dotTex, // round sprites instead of square points
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.frustumCulled = false;
  group.add(dots);

  /* ---------------- drifting dust ---------------- */
  const dustCount = quality === "high" ? 360 : 160;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = R(-115, 115);
    dustPos[i * 3 + 1] = R(0.5, 16);
    dustPos[i * 3 + 2] = R(-115, 115);
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = track(
    new THREE.PointsMaterial({
      color: "#aab4c4",
      size: 0.55,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  /* ---------------- sky: stars + Milky Way ---------------- */
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const elev = Math.asin(rand() * 0.95 + 0.04);
    const rr = 380;
    starPos[i * 3] = Math.cos(a) * Math.cos(elev) * rr;
    starPos[i * 3 + 1] = Math.sin(elev) * rr;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(elev) * rr;
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = track(
    new THREE.PointsMaterial({
      color: "#dde8ff",
      size: 1.3,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: false,
      depthWrite: false,
    })
  );
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  const brightCount = 130;
  const brightPos = new Float32Array(brightCount * 3);
  for (let i = 0; i < brightCount; i++) {
    const a = rand() * Math.PI * 2;
    const elev = Math.asin(rand() * 0.94 + 0.05);
    const rr = 375;
    brightPos[i * 3] = Math.cos(a) * Math.cos(elev) * rr;
    brightPos[i * 3 + 1] = Math.sin(elev) * rr;
    brightPos[i * 3 + 2] = Math.sin(a) * Math.cos(elev) * rr;
  }
  const brightGeo = track(new THREE.BufferGeometry());
  brightGeo.setAttribute("position", new THREE.BufferAttribute(brightPos, 3));
  const brightMat = track(
    new THREE.PointsMaterial({
      color: "#ffffff",
      size: 2.4,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      depthWrite: false,
    })
  );
  const brightStars = new THREE.Points(brightGeo, brightMat);
  brightStars.frustumCulled = false;
  group.add(brightStars);

  const mwCount = quality === "high" ? 2400 : 1200;
  const mwPos = new Float32Array(mwCount * 3);
  const mwNormal = new THREE.Vector3(0.42, 1, 0.3).normalize();
  const mwU = new THREE.Vector3(1, 0, 0).cross(mwNormal).normalize();
  const mwV = new THREE.Vector3().crossVectors(mwNormal, mwU).normalize();
  const mwDir = new THREE.Vector3();
  let mwI = 0;
  for (let i = 0; i < mwCount * 2 && mwI < mwCount; i++) {
    const th = rand() * Math.PI * 2;
    const spread = (rand() + rand() + rand() - 1.5) * 0.16;
    mwDir
      .copy(mwU)
      .multiplyScalar(Math.cos(th))
      .addScaledVector(mwV, Math.sin(th))
      .addScaledVector(mwNormal, spread)
      .normalize();
    if (mwDir.y < 0.03) continue;
    mwPos[mwI * 3] = mwDir.x * 372;
    mwPos[mwI * 3 + 1] = mwDir.y * 372;
    mwPos[mwI * 3 + 2] = mwDir.z * 372;
    mwI++;
  }
  const mwGeo = track(new THREE.BufferGeometry());
  mwGeo.setAttribute("position", new THREE.BufferAttribute(mwPos.slice(0, mwI * 3), 3));
  const mwMat = track(
    new THREE.PointsMaterial({
      color: "#b9c8e8",
      size: 0.9,
      transparent: true,
      opacity: 0.42,
      sizeAttenuation: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const milkyWay = new THREE.Points(mwGeo, mwMat);
  milkyWay.frustumCulled = false;
  group.add(milkyWay);

  /* ---------------- beacons ---------------- */
  const beaconRedMat = track(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: "#ff5a4a",
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const beaconRed = new THREE.Sprite(beaconRedMat);
  beaconRed.scale.setScalar(3.2);
  beaconRed.position.set(comms.x, terrainHeight(comms.x, comms.z) + 13.6, comms.z);
  group.add(beaconRed);

  const beaconBlueMat = track(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: "#9fd8ff",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const beaconBlue = new THREE.Sprite(beaconBlueMat);
  beaconBlue.scale.setScalar(2.6);
  beaconBlue.position.set(0, terrainHeight(0, 0) + 14.6, 0);
  group.add(beaconBlue);

  /* ---------------- theme ---------------- */
  const themePairs: [THREE.MeshStandardMaterial, string, string][] = [
    [terrainMat, "#ffffff", "#5d6b85"],
    [shellMat, "#cfe0ec", "#39435a"],
    [shellDarkMat, "#a9bfd1", "#2b3346"],
    [solarMat, "#ffffff", "#7088ad"],
    [conduitMat, "#10161f", "#0b1018"],
    [goldMat, "#c9a86a", "#5d5038"],
  ];
  const pairColors = themePairs.map(
    ([mat, d, n]) => [mat, new THREE.Color(d), new THREE.Color(n)] as const
  );

  function applyTheme(mix: number) {
    for (const [material, d, n] of pairColors) {
      material.color.copy(d).lerp(n, mix);
    }
    conduitAmberMat.color.copy(conduitMat.color);
    for (const p of conduitPulses) {
      p.mat.color.copy(conduitMat.color);
    }
    conduitMat.emissiveIntensity = 0.55 + 0.85 * mix;
    conduitAmberMat.emissiveIntensity = 0.5 + 0.8 * mix;
    coreMat.emissiveIntensity = 0.9 + 0.7 * mix;
    stripMat.emissiveIntensity = 0.3 + 0.9 * mix;
    solarMat.emissiveIntensity = 0.1 + 0.45 * mix;
    starMat.opacity = 0.85 + 0.1 * mix;
    dotMat.size = 1.35 + 0.75 * mix;
    dustMat.opacity = 0.13 + 0.07 * mix;
  }

  /* ---------------- per-frame update ---------------- */
  const flowOffsets = flows.map(() => rand());
  let lastMix = 0;
  function update(dt: number, elapsed: number) {
    const corePulse = (Math.sin(elapsed * 1.6) + 1) / 2;
    coreMat.emissiveIntensity = (0.9 + 0.7 * lastMix) * (0.85 + corePulse * 0.3);

    dust.rotation.y = elapsed * 0.0045;
    dust.position.y = Math.sin(elapsed * 0.12) * 0.6;

    const baseBlue = 0.55 + 0.85 * lastMix;
    const baseAmber = 0.5 + 0.8 * lastMix;
    for (const p of conduitPulses) {
      const w = 0.5 + 0.5 * Math.sin(elapsed * 1.7 + p.phase);
      p.mat.emissiveIntensity =
        (p.kind === "power" ? baseAmber : baseBlue) * (0.75 + 0.45 * w);
    }

    sstRingMat.emissiveIntensity = (0.7 + 0.6 * lastMix) * (0.8 + 0.3 * Math.sin(elapsed * 2.1));

    const blink = Math.max(0, Math.sin(elapsed * 2.3));
    beaconRedMat.opacity = 0.15 + 0.75 * blink * blink * blink;
    const breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.1);
    beaconBlueMat.opacity = 0.35 + 0.4 * breathe;

    let idx = 0;
    for (let fi = 0; fi < flows.length; fi++) {
      const f = flows[fi];
      // energy flows outward; data flows back the other way
      const dir = flowKinds[fi] === "data" ? -1 : 1;
      flowOffsets[fi] = (((flowOffsets[fi] + dt * f.speed * dir) % 1) + 1) % 1;
      for (let i = 0; i < f.count; i++) {
        const t = (i / f.count + flowOffsets[fi]) % 1;
        const fIdx = t * (f.nSamples - 1);
        const i0 = Math.floor(fIdx);
        const i1 = Math.min(f.nSamples - 1, i0 + 1);
        const frac = fIdx - i0;
        dotPositions[idx * 3] = f.samples[i0 * 3] + (f.samples[i1 * 3] - f.samples[i0 * 3]) * frac;
        dotPositions[idx * 3 + 1] =
          f.samples[i0 * 3 + 1] + (f.samples[i1 * 3 + 1] - f.samples[i0 * 3 + 1]) * frac;
        dotPositions[idx * 3 + 2] =
          f.samples[i0 * 3 + 2] + (f.samples[i1 * 3 + 2] - f.samples[i0 * 3 + 2]) * frac;
        idx++;
      }
    }
    (dotGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  const applyThemeWrapped = (mix: number) => {
    lastMix = mix;
    applyTheme(mix);
  };

  function dispose() {
    for (const d of disposables) d.dispose();
    panelMesh.dispose();
    legMesh.dispose();
  }

  applyThemeWrapped(0);
  return { group, update, applyTheme: applyThemeWrapped, dispose };
}
