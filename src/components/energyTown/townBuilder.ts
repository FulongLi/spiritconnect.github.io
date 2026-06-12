import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Lunar habitat — a futuristic human settlement on the Moon.          */
/* Barren grey regolith with craters, geodesic domes, capsule modules, */
/* connecting tubes, a solar farm, a glowing reactor core, and Earth   */
/* hanging in a black, star-filled sky. Energy conduits are the only   */
/* colour accent (brand blue + amber).                                 */
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

/* ---------------- value noise (fine regolith relief) ---------------- */
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

/* ---------------- craters (deterministic, used by height + tint) --- */
type Crater = { x: number; z: number; r: number };
const CRATERS: Crater[] = (() => {
  const rng = mulberry32(987654321);
  const list: Crater[] = [];
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const dist = 45 + rng() * 145;
    const r = 4 + rng() * (dist > 90 ? 26 : 12);
    list.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, r });
  }
  // a few small ones closer in
  for (let i = 0; i < 8; i++) {
    const a = rng() * Math.PI * 2;
    const dist = 28 + rng() * 35;
    list.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, r: 2 + rng() * 4 });
  }
  // many craterlets for realistic pockmarking
  for (let i = 0; i < 50; i++) {
    const a = rng() * Math.PI * 2;
    const dist = 30 + rng() * 170;
    list.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, r: 0.8 + rng() * 2.6 });
  }
  return list;
})();

/** Radius of the "mini-moon": ground curves away so the horizon is round. */
const MOON_CURVE = 1250;

export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const flat = smoothstep(28, 90, r);
  // gentle mare undulation, flattened near the habitat
  let h =
    flat *
    (1.4 * Math.sin(x * 0.03) * Math.cos(z * 0.035) +
      1.0 * Math.sin((x - z) * 0.022) +
      0.8);
  // fine fractal regolith relief (subtle near the base, stronger out wide)
  h += fbm(x * 0.13, z * 0.13) * (0.35 + 1.45 * flat);
  // craters: raised rim, sunken bowl
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1.8) {
      const rim = Math.exp(-((d - 1) * (d - 1)) / 0.07) * c.r * 0.055;
      const bowl = d < 1 ? -(Math.cos(d * Math.PI) * 0.5 + 0.5) * c.r * 0.11 : 0;
      h += rim + bowl;
    }
  }
  // spherical drop-off → round horizon, square edges fall out of sight
  h -= (r * r) / MOON_CURVE;
  return h;
}

/** crater shading: darker bowls, brighter ejecta rings around large craters */
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

/** fine granular regolith bump texture */
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
  // a few soft blotches for medium-scale variation
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

/* ------------------------------------------------------------------ */
/* Scene palettes (consumed by TownCanvas for sky/fog/lights)          */
/* Lunar day: harsh white sun, bright grey dust, black sky.            */
/* Lunar night: dim blue earthshine, glowing habitat.                  */
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
  applyTheme: (mix: number) => void; // 0 = lunar day, 1 = lunar night
  dispose: () => void;
};

/* ---------------- helpers ---------------- */

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

/** photovoltaic cell-grid texture: cells, busbars, frame */
function makeSolarCellTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext("2d")!;
  // frame
  ctx.fillStyle = "#b9c2cc";
  ctx.fillRect(0, 0, 256, 192);
  // panel background
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
      // each cell: subtle radial sheen, slightly varied tone
      const tone = 0.85 + rng() * 0.3;
      const g = ctx.createLinearGradient(px, py, px + cw, py + ch);
      g.addColorStop(0, `rgba(${Math.round(31 * tone)}, ${Math.round(95 * tone)}, ${Math.round(186 * tone)}, 1)`);
      g.addColorStop(0.5, `rgba(${Math.round(20 * tone)}, ${Math.round(64 * tone)}, ${Math.round(140 * tone)}, 1)`);
      g.addColorStop(1, `rgba(${Math.round(26 * tone)}, ${Math.round(82 * tone)}, ${Math.round(168 * tone)}, 1)`);
      ctx.fillStyle = g;
      ctx.fillRect(px + 1.5, py + 1.5, cw - 3, ch - 3);
      // busbar lines across each cell
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

/** stylized Earth texture */
function makeEarthTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#2a6bb5");
  g.addColorStop(0.5, "#1d5499");
  g.addColorStop(1, "#2a6bb5");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const rng = mulberry32(42);
  ctx.fillStyle = "#3f7a4f";
  for (let i = 0; i < 14; i++) {
    const x = rng() * 256;
    const y = 20 + rng() * 88;
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + rng() * 22, 6 + rng() * 12, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 26; i++) {
    const x = rng() * 256;
    const y = rng() * 128;
    ctx.beginPath();
    ctx.ellipse(x, y, 8 + rng() * 18, 2.5 + rng() * 4, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillRect(0, 118, 256, 10);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
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

  /* ---------------- materials (PBR for richer shading) ------------- */
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
    flatShading: false, // smooth shading: craters read as curved bowls, not facets
    bumpMap: regolithTex,
    bumpScale: 0.38, // restrained: too much bump shimmers/aliases in motion
  });
  // brand-blue tinted shells; double-sided so the dome hull stays solid
  // when the camera flies through it in the final shot
  const shellMat = std("#cfe0ec", {
    roughness: 0.5,
    metalness: 0.12,
    side: THREE.DoubleSide,
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
    emissiveIntensity: 0.1, // panels read deep blue even in shadow
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

  /* ---------------- terrain ---------------- */
  const segs = quality === "high" ? 220 : 120;
  const terrainGeo = track(new THREE.PlaneGeometry(480, 480, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const baseGrey = 0.5; // real regolith is a dark, dusty grey
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    const g = baseGrey * (0.94 + rand() * 0.12) * craterShade(x, z);
    colors[i * 3] = g;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = g * 1.02; // faint cool cast
  }
  terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  terrainMat.vertexColors = true;
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = shadows;
  group.add(terrain);

  /* ---------------- habitat: domes ---------------- */
  type Dome = { x: number; z: number; r: number };
  const domes: Dome[] = [
    { x: 0, z: 0, r: 14 },
    { x: 23, z: 9, r: 8.5 },
    { x: -19, z: 13, r: 7.5 },
    { x: 9, z: -19, r: 6 },
    { x: -14, z: -14, r: 5 },
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
    // slim glowing base ring
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(d.r * 1.04, 0.2, 8, 56)),
      conduitMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(d.x, gy + 0.35, d.z);
    group.add(ring);
    // warm window band partway up the larger domes
    if (d.r >= 7) {
      const band = new THREE.Mesh(
        track(new THREE.TorusGeometry(d.r * 0.9, 0.14, 8, 56)),
        stripMat
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(d.x, gy + d.r * 0.42, d.z);
      group.add(band);
    }
  }

  /* ---------------- habitat: capsule modules + window strips ------- */
  type Module = { x: number; z: number; len: number; rot: number };
  const modules: Module[] = [
    { x: 12, z: 16, len: 9, rot: 0.5 },
    { x: -8, z: 20, len: 8, rot: -0.4 },
    { x: 20, z: -8, len: 10, rot: 1.2 },
    { x: -22, z: -2, len: 9, rot: 0.2 },
    { x: 2, z: -26, len: 8, rot: -1.0 },
    { x: 32, z: 2, len: 7, rot: 0.9 },
  ];
  const ribGeo = track(new THREE.TorusGeometry(1.58, 0.08, 6, 22));
  for (const mod of modules) {
    const gy = terrainHeight(mod.x, mod.z);
    const capGeo = track(new THREE.CapsuleGeometry(1.5, mod.len, 4, 16));
    const cap = new THREE.Mesh(capGeo, shellMat);
    cap.rotation.z = Math.PI / 2;
    cap.rotation.y = mod.rot;
    cap.position.set(mod.x, gy + 1.5, mod.z);
    cap.castShadow = shadows;
    group.add(cap);
    // structural ribs around the hull
    const axX = -Math.cos(mod.rot);
    const axZ = Math.sin(mod.rot);
    for (const f of [-0.32, 0, 0.32]) {
      const rib = new THREE.Mesh(ribGeo, shellDarkMat);
      rib.position.set(
        mod.x + axX * mod.len * f,
        gy + 1.5,
        mod.z + axZ * mod.len * f
      );
      rib.rotation.y = mod.rot - Math.PI / 2;
      group.add(rib);
    }
    // window strips on both sides
    for (const side of [-1, 1]) {
      const stripGeo = track(new THREE.BoxGeometry(mod.len * 0.72, 0.28, 0.06));
      const strip = new THREE.Mesh(stripGeo, stripMat);
      const offX = Math.sin(mod.rot) * 1.52 * side;
      const offZ = Math.cos(mod.rot) * 1.52 * side;
      strip.position.set(mod.x + offX, gy + 1.8, mod.z + offZ);
      strip.rotation.y = mod.rot;
      group.add(strip);
    }
  }

  /* ---------------- connecting tubes ---------------- */
  const tubeLinks: [number, number, number, number][] = [
    [0, 0, 23, 9],
    [0, 0, -19, 13],
    [0, 0, 9, -19],
    [0, 0, -14, -14],
    [23, 9, 32, 2],
    [-19, 13, -8, 20],
    [9, -19, 2, -26],
  ];
  const tubeGeoUnit = track(new THREE.CylinderGeometry(0.8, 0.8, 1, 10));
  for (const [ax, az, bx, bz] of tubeLinks) {
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
  }

  /* ---------------- comms tower ---------------- */
  {
    const gy = terrainHeight(34, -30);
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.3, 13, 6)), shellDarkMat);
    mast.position.set(34, gy + 6.5, -30);
    mast.castShadow = shadows;
    const dish = new THREE.Mesh(track(new THREE.CircleGeometry(2.4, 18)), shellMat);
    dish.position.set(34, gy + 12.4, -30);
    dish.rotation.x = -Math.PI / 3;
    dish.material.side = THREE.DoubleSide;
    const tip = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 8, 6)), coreMat);
    tip.position.set(34, gy + 13.2, -30);
    group.add(mast, dish, tip);
  }

  /* ---------------- reactor core ---------------- */
  const reactor = { x: -48, z: -32 };
  {
    const gy = terrainHeight(reactor.x, reactor.z);
    const base = new THREE.Mesh(track(new THREE.CylinderGeometry(5, 5.6, 1.2, 14)), shellDarkMat);
    base.position.set(reactor.x, gy + 0.6, reactor.z);
    const body = new THREE.Mesh(track(new THREE.CylinderGeometry(3, 3.4, 5.5, 12)), shellMat);
    body.position.set(reactor.x, gy + 3.9, reactor.z);
    body.castShadow = shadows;
    const core = new THREE.Mesh(track(new THREE.CylinderGeometry(2.1, 2.1, 6.0, 12)), coreMat);
    core.position.set(reactor.x, gy + 3.95, reactor.z);
    const haloRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(4.6, 0.26, 8, 48)),
      conduitMat
    );
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(reactor.x, gy + 1.4, reactor.z);
    group.add(base, body, core, haloRing);
    // radiator fins
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(track(new THREE.BoxGeometry(0.25, 4.2, 3.4)), shellDarkMat);
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      fin.position.set(reactor.x + Math.cos(a) * 4.6, gy + 3.4, reactor.z + Math.sin(a) * 4.6);
      fin.rotation.y = -a;
      fin.castShadow = shadows;
      group.add(fin);
    }
  }

  /* ---------------- landing pad + lander ---------------- */
  const pad = { x: -18, z: 52 };
  {
    const gy = terrainHeight(pad.x, pad.z);
    const padMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(11, 11.6, 0.5, 24)), shellDarkMat);
    padMesh.position.set(pad.x, gy + 0.25, pad.z);
    padMesh.receiveShadow = shadows;
    const padRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(9.6, 0.18, 8, 64)),
      conduitMat
    );
    padRing.rotation.x = Math.PI / 2;
    padRing.position.set(pad.x, gy + 0.55, pad.z);
    // inner touchdown marking
    const padMark = new THREE.Mesh(
      track(new THREE.TorusGeometry(5.6, 0.1, 6, 48)),
      shellDarkMat
    );
    padMark.rotation.x = Math.PI / 2;
    padMark.position.set(pad.x, gy + 0.53, pad.z);
    group.add(padMesh, padRing, padMark);
    // small lander
    const body = new THREE.Mesh(track(new THREE.ConeGeometry(1.8, 3.2, 8)), shellMat);
    body.position.set(pad.x + 2, gy + 2.3, pad.z - 1);
    body.castShadow = shadows;
    group.add(body);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const leg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 5)), shellDarkMat);
      leg.position.set(
        pad.x + 2 + Math.cos(a) * 1.5,
        gy + 1.0,
        pad.z - 1 + Math.sin(a) * 1.5
      );
      leg.rotation.z = Math.cos(a) * 0.5;
      leg.rotation.x = -Math.sin(a) * 0.5;
      group.add(leg);
    }
  }

  /* ---------------- lunar rover (parked by the pad) ---------------- */
  {
    const rx = pad.x + 14;
    const rz = pad.z - 4;
    const rot = -0.5;
    const gy = terrainHeight(rx, rz);
    const rover = new THREE.Group();
    rover.position.set(rx, gy, rz);
    rover.rotation.y = rot;
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(2.7, 0.85, 1.7)), shellMat);
    body.position.y = 1.05;
    body.castShadow = shadows;
    rover.add(body);
    // rooftop solar panel
    const roof = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.08, 1.4)), solarMat);
    roof.position.y = 1.55;
    rover.add(roof);
    // six wheels
    const tireMat = std("#1d242e", { roughness: 0.95 });
    const wheelGeo = track(new THREE.CylinderGeometry(0.45, 0.45, 0.34, 12));
    for (const wx of [-1.05, 0, 1.05]) {
      for (const wz of [-1.0, 1.0]) {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.45, wz);
        wheel.castShadow = shadows;
        rover.add(wheel);
      }
    }
    // camera mast
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.07, 1.0, 6)), shellDarkMat);
    mast.position.set(1.0, 2.0, 0.3);
    const head = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.22, 0.2)), shellDarkMat);
    head.position.set(1.0, 2.55, 0.3);
    const eye = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 8, 6)), coreMat);
    eye.position.set(1.18, 2.55, 0.3);
    rover.add(mast, head, eye);
    group.add(rover);
  }

  /* ---------------- solar farm ---------------- */
  const solarCenter = { x: 72, z: 42 };
  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const panelPlacements: THREE.Matrix4[] = [];
  const legPlacements: THREE.Matrix4[] = [];
  // Panels face the sun (and the camera's approach from the south-east):
  // tilt up by 0.55 rad, then yaw the whole array toward the sun azimuth.
  const panelYaw = Math.atan2(150 - solarCenter.x, 90 - solarCenter.z); // toward sun at (150, 65, 90)
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
        // rotate the local leg offset (lx, 0, -0.7) by the array yaw
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

  /* ---------------- battery energy storage (BESS) ---------------- */
  const bessLightMat = std("#10161f", {
    roughness: 0.4,
    emissive: new THREE.Color("#2ebcfe"),
    emissiveIntensity: 0.8,
  });
  const bessCenter = { x: 63, z: 12 };
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
      // blue accent stripe + status light strip
      const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(4.46, 0.5, 2.76)), solarMat);
      stripe.position.set(bx, gy + 2.35, bz);
      stripe.rotation.y = 0.18;
      group.add(stripe);
      const status = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 0.16, 0.06)), bessLightMat);
      status.position.set(
        bx + Math.sin(0.18) * 1.41,
        gy + 1.0,
        bz + Math.cos(0.18) * 1.41
      );
      status.rotation.y = 0.18;
      group.add(status);
    }
  }

  /* ---------------- solid-state transformer (SST) station --------- */
  const sstCenter = { x: 56, z: -12 };
  const sstRingMat = std("#1a1410", {
    roughness: 0.35,
    emissive: new THREE.Color("#ffc23f"),
    emissiveIntensity: 0.8,
  });
  {
    const gy = terrainHeight(sstCenter.x, sstCenter.z);
    // platform
    const platform = new THREE.Mesh(track(new THREE.BoxGeometry(15, 0.7, 11)), shellDarkMat);
    platform.position.set(sstCenter.x, gy + 0.35, sstCenter.z);
    platform.receiveShadow = shadows;
    group.add(platform);
    // rectangular converter body with glowing amber conversion bands
    const sstBody = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 5.4, 3.6)), shellMat);
    sstBody.position.set(sstCenter.x - 3, gy + 3.1, sstCenter.z - 1);
    sstBody.castShadow = shadows;
    group.add(sstBody);
    for (const bandY of [2.3, 4.1]) {
      const band = new THREE.Mesh(
        track(new THREE.BoxGeometry(4.78, 0.22, 3.78)),
        sstRingMat
      );
      band.position.set(sstCenter.x - 3, gy + bandY, sstCenter.z - 1);
      group.add(band);
    }
    // radiator fins on the back face
    for (let k = 0; k < 5; k++) {
      const fin = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 4.2, 1.3)), shellDarkMat);
      fin.position.set(
        sstCenter.x - 3 - 1.8 + k * 0.9,
        gy + 3.1,
        sstCenter.z - 1 - 2.4
      );
      fin.castShadow = shadows;
      group.add(fin);
    }
    // insulator bushings on the roof
    for (const bx of [-1.3, 0, 1.3]) {
      const post = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.13, 0.16, 0.85, 8)),
        shellDarkMat
      );
      post.position.set(sstCenter.x - 3 + bx, gy + 6.2, sstCenter.z - 1);
      const tip = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 8, 6)), sstRingMat);
      tip.position.set(sstCenter.x - 3 + bx, gy + 6.72, sstCenter.z - 1);
      group.add(post, tip);
    }
    // control cabinets with blue status strips
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

  /* ---------------- data center ---------------- */
  const dcCenter = { x: 40, z: -24 };
  {
    const rot = 0.3;
    const gy = terrainHeight(dcCenter.x, dcCenter.z);
    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(11, 4, 6.5)), shellMat);
    hall.position.set(dcCenter.x, gy + 2, dcCenter.z);
    hall.rotation.y = rot;
    hall.castShadow = shadows;
    group.add(hall);
    // roof radiator fins (servers run hot, even on the Moon)
    for (let k = 0; k < 5; k++) {
      const fx = -4 + k * 2;
      const fin = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 1.1, 5.9)), shellDarkMat);
      fin.position.set(
        dcCenter.x + Math.cos(rot) * fx,
        gy + 4.55,
        dcCenter.z - Math.sin(rot) * fx
      );
      fin.rotation.y = rot;
      fin.castShadow = shadows;
      group.add(fin);
    }
    // server status light rows on both long walls
    for (const side of [-1, 1]) {
      for (const ly of [1.1, 2.0, 2.9]) {
        const strip = new THREE.Mesh(
          track(new THREE.BoxGeometry(9.6, 0.14, 0.06)),
          bessLightMat
        );
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

  /* ---------------- energy conduits + flowing dots ---------------- */
  const pathDefs: [number, number][][] = [
    // solar farm -> battery storage
    [
      [66, 36],
      [64, 26],
      [63, 17],
    ],
    // battery storage -> SST station
    [
      [62, 7],
      [59, -1],
      [57, -8],
    ],
    // SST station -> habitat (the managed feed)
    [
      [51, -13],
      [36, -10],
      [20, -5],
      [10, -2],
    ],
    // SST station -> data center (compute is a load too)
    [
      [52, -15],
      [46, -20],
      [41, -23],
    ],
    // reactor -> habitat
    [
      [-44, -28],
      [-30, -18],
      [-16, -8],
      [-6, -2],
    ],
    // habitat ring
    [
      [18, 0],
      [13, 13],
      [0, 19],
      [-13, 13],
      [-18, 0],
      [-13, -13],
      [0, -18],
      [13, -13],
      [18, 0],
    ],
    // habitat -> landing pad
    [
      [-4, 16],
      [-10, 32],
      [-16, 44],
    ],
    // habitat -> comms tower
    [
      [16, -10],
      [25, -20],
      [33, -28],
    ],
  ];

  type Flow = { samples: Float32Array; nSamples: number; count: number; speed: number };
  const flows: Flow[] = [];
  const conduitPulses: { mat: THREE.MeshStandardMaterial; phase: number }[] = [];
  let totalDots = 0;
  let pathIndex = 0;
  for (const def of pathDefs) {
    const pts = def.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.25, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
    const len = curve.getLength();
    const ribbon = track(makeRibbon(curve, 1.1, Math.max(28, Math.floor(len / 1.8)), 0.16));
    const ribbonMat = track(conduitMat.clone());
    conduitPulses.push({ mat: ribbonMat, phase: pathIndex * 1.35 });
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
    totalDots += count;
  }

  const dotPositions = new Float32Array(totalDots * 3);
  const dotColors = new Float32Array(totalDots * 3);
  const cBlue = new THREE.Color("#2ebcfe");
  const cAmber = new THREE.Color("#ffc23f");
  let di = 0;
  for (const f of flows) {
    for (let i = 0; i < f.count; i++) {
      const c = i % 3 === 2 ? cAmber : cBlue;
      dotColors[di * 3] = c.r;
      dotColors[di * 3 + 1] = c.g;
      dotColors[di * 3 + 2] = c.b;
      di++;
    }
  }
  const dotGeo = track(new THREE.BufferGeometry());
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
  dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
  const dotMat = track(
    new THREE.PointsMaterial({
      size: 1.35,
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

  /* ---------------- sky: stars + Earth ---------------- */
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const elev = Math.asin(rand() * 0.95 + 0.04);
    const rr = 380;
    starPos[i * 3] = Math.cos(a) * Math.cos(elev) * rr;
    starPos[i * 3 + 1] = Math.sin(elev) * rr;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(elev) * rr;
    starSizes[i] = rand();
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

  // a handful of bright "hero" stars
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

  // faint Milky Way band across the sky
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
    if (mwDir.y < 0.03) continue; // keep above the horizon
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

  /* ---------------- drifting dust motes ---------------- */
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

  const earthTex = track(makeEarthTexture());
  const earthMat = track(new THREE.MeshBasicMaterial({ map: earthTex, fog: false }));
  const earth = new THREE.Mesh(track(new THREE.SphereGeometry(17, 28, 20)), earthMat);
  earth.position.set(130, 150, -180);
  group.add(earth);
  const glowTex = track(makeGlowTexture());
  const glowMat = track(
    new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const earthGlow = new THREE.Sprite(glowMat);
  earthGlow.scale.setScalar(58);
  earthGlow.position.copy(earth.position);
  group.add(earthGlow);

  /* ---------------- blinking beacons ---------------- */
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
  beaconRed.position.set(34, terrainHeight(34, -30) + 13.6, -30); // comms tower tip
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
  beaconBlue.position.set(0, terrainHeight(0, 0) + 14.6, 0); // main dome apex
  group.add(beaconBlue);

  /* ---------------- theme ---------------- */
  const themePairs: [THREE.MeshStandardMaterial, string, string][] = [
    [terrainMat, "#ffffff", "#5d6b85"],
    [shellMat, "#cfe0ec", "#39435a"],
    [shellDarkMat, "#a9bfd1", "#2b3346"],
    [solarMat, "#ffffff", "#7088ad"],
    [conduitMat, "#10161f", "#0b1018"],
  ];
  const pairColors = themePairs.map(
    ([mat, d, n]) => [mat, new THREE.Color(d), new THREE.Color(n)] as const
  );

  function applyTheme(mix: number) {
    for (const [material, d, n] of pairColors) {
      material.color.copy(d).lerp(n, mix);
    }
    for (const p of conduitPulses) {
      p.mat.color.copy(conduitMat.color);
    }
    conduitMat.emissiveIntensity = 0.55 + 0.85 * mix;
    coreMat.emissiveIntensity = 0.9 + 0.7 * mix;
    stripMat.emissiveIntensity = 0.3 + 0.9 * mix;
    solarMat.emissiveIntensity = 0.12 + 0.45 * mix;
    starMat.opacity = 0.85 + 0.1 * mix;
    dotMat.size = 1.35 + 0.75 * mix;
    glowMat.opacity = 0.55 + 0.2 * mix;
    dustMat.opacity = 0.13 + 0.07 * mix;
  }

  /* ---------------- per-frame update ---------------- */
  const flowOffsets = flows.map(() => rand());
  let corePulse = 0;
  function update(dt: number, elapsed: number) {
    // reactor core breathing
    corePulse = (Math.sin(elapsed * 1.6) + 1) / 2;
    coreMat.emissiveIntensity =
      (0.9 + 0.7 * lastMix) * (0.85 + corePulse * 0.3);

    // dust drifts slowly around the base
    dust.rotation.y = elapsed * 0.0045;
    dust.position.y = Math.sin(elapsed * 0.12) * 0.6;

    // Earth turns imperceptibly
    earth.rotation.y = elapsed * 0.008;

    // energy waves travel along the conduits (staggered pulse)
    const baseGlow = 0.55 + 0.85 * lastMix;
    for (const p of conduitPulses) {
      const w = 0.5 + 0.5 * Math.sin(elapsed * 1.7 + p.phase);
      p.mat.emissiveIntensity = baseGlow * (0.75 + 0.45 * w);
    }

    // SST conversion rings hum
    sstRingMat.emissiveIntensity =
      (0.7 + 0.6 * lastMix) * (0.8 + 0.3 * Math.sin(elapsed * 2.1));

    // beacon blinking
    const blink = Math.max(0, Math.sin(elapsed * 2.3));
    beaconRedMat.opacity = 0.15 + 0.75 * blink * blink * blink;
    const breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.1);
    beaconBlueMat.opacity = 0.35 + 0.4 * breathe;

    let idx = 0;
    for (let fi = 0; fi < flows.length; fi++) {
      const f = flows[fi];
      flowOffsets[fi] = (flowOffsets[fi] + dt * f.speed) % 1;
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

  let lastMix = 0;
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
