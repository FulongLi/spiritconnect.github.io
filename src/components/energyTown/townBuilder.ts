import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Deterministic PRNG so the town layout is stable between reloads     */
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

/* ------------------------------------------------------------------ */
/* Terrain height field — flat in the centre, gentle hills outside,   */
/* one larger hill under the wind farm.                               */
/* ------------------------------------------------------------------ */
function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const edge = smoothstep(55, 165, r);
  let h =
    edge *
    (2.6 * Math.sin(x * 0.045) +
      2.0 * Math.cos(z * 0.05) +
      1.6 * Math.sin((x + z) * 0.03) +
      2.2);
  // wind-farm hill
  const dw = Math.hypot(x + 85, z + 85);
  h += 8 * Math.exp(-(dw * dw) / (2 * 42 * 42));
  return h;
}

/* ------------------------------------------------------------------ */
/* Day / night palettes                                                */
/* ------------------------------------------------------------------ */
export const DAY = {
  background: new THREE.Color("#cfe9f5"),
  fogNear: 170,
  fogFar: 420,
  hemiSky: new THREE.Color("#d9efff"),
  hemiGround: new THREE.Color("#7fa05a"),
  hemiIntensity: 1.0,
  sunColor: new THREE.Color("#fff3d6"),
  sunIntensity: 2.4,
  terrainTint: new THREE.Color("#ffffff"),
  wallTint: new THREE.Color("#ffffff"),
  emissiveWarm: 0,
  emissiveSolar: 0,
  starOpacity: 0,
};

export const NIGHT = {
  background: new THREE.Color("#070d1a"),
  fogNear: 110,
  fogFar: 360,
  hemiSky: new THREE.Color("#16243f"),
  hemiGround: new THREE.Color("#0c1410"),
  hemiIntensity: 0.55,
  sunColor: new THREE.Color("#7fa8ff"),
  sunIntensity: 0.35,
  terrainTint: new THREE.Color("#41546e"),
  wallTint: new THREE.Color("#3d4760"),
  emissiveWarm: 0.5,
  emissiveSolar: 0.55,
  starOpacity: 0.95,
};

export type Town = {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  applyTheme: (mix: number) => void; // 0 = day, 1 = night
  dispose: () => void;
};

/* ------------------------------------------------------------------ */
/* Town construction                                                   */
/* ------------------------------------------------------------------ */
export function buildTown(quality: "high" | "low"): Town {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const shadows = quality === "high";

  /* ---------------- terrain ---------------- */
  const segs = quality === "high" ? 110 : 64;
  const terrainGeo = track(new THREE.PlaneGeometry(380, 380, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cBase = new THREE.Color("#79a838");
  const cLight = new THREE.Color("#90bf48");
  const cDark = new THREE.Color("#5e8c2e");
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const n = rand();
    tmp.copy(cBase).lerp(n > 0.5 ? cLight : cDark, Math.abs(n - 0.5) * 1.4);
    tmp.lerp(cLight, smoothstep(0, 12, h) * 0.35);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  const terrainMat = track(
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
  );
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = shadows;
  group.add(terrain);

  /* ---------------- shared materials ---------------- */
  const wallMat = track(
    new THREE.MeshLambertMaterial({
      color: "#f4f1ea",
      flatShading: true,
      emissive: new THREE.Color("#ffb45a"),
      emissiveIntensity: 0,
    })
  );
  const roofMat = track(
    new THREE.MeshLambertMaterial({ flatShading: true, color: "#ffffff" })
  );
  const towerMat = track(
    new THREE.MeshLambertMaterial({
      color: "#e8ecef",
      flatShading: true,
      emissive: new THREE.Color("#9fc4ff"),
      emissiveIntensity: 0,
    })
  );
  const trunkMat = track(
    new THREE.MeshLambertMaterial({ color: "#7a5a3a", flatShading: true })
  );
  const foliageMat = track(
    new THREE.MeshLambertMaterial({ flatShading: true, color: "#ffffff" })
  );
  const panelMat = track(
    new THREE.MeshLambertMaterial({
      color: "#1f5fa8",
      flatShading: true,
      emissive: new THREE.Color("#2e9bff"),
      emissiveIntensity: 0,
    })
  );
  const turbineMat = track(
    new THREE.MeshLambertMaterial({ color: "#f2f4f5", flatShading: true })
  );
  const cableMat = track(
    new THREE.MeshLambertMaterial({ color: "#8d9aa0", flatShading: true })
  );

  /* ---------------- houses ---------------- */
  const clusterCenters: [number, number][] = [
    [42, 22],
    [-38, 32],
    [27, -42],
    [-22, -38],
    [58, -12],
    [-55, 5],
  ];
  type HouseSpec = { x: number; z: number; w: number; d: number; h: number; rot: number };
  const houses: HouseSpec[] = [];
  for (const [cx, cz] of clusterCenters) {
    const n = 6 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r = R(3, 14);
      houses.push({
        x: cx + Math.cos(a) * r,
        z: cz + Math.sin(a) * r,
        w: R(2.2, 3.4),
        d: R(2.4, 3.8),
        h: R(1.8, 2.6),
        rot: Math.floor(rand() * 4) * (Math.PI / 2) + R(-0.15, 0.15),
      });
    }
  }

  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const roofGeo = track(new THREE.ConeGeometry(0.72, 1, 4));

  const houseMesh = new THREE.InstancedMesh(boxGeo, wallMat, houses.length);
  const roofMesh = new THREE.InstancedMesh(roofGeo, roofMat, houses.length);
  houseMesh.castShadow = shadows;
  roofMesh.castShadow = shadows;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const v = new THREE.Vector3();
  const roofRed = new THREE.Color("#c84b3c");
  const roofBlue = new THREE.Color("#2f6fb3");
  houses.forEach((hs, i) => {
    const gy = terrainHeight(hs.x, hs.z);
    e.set(0, hs.rot, 0);
    q.setFromEuler(e);
    m.compose(v.set(hs.x, gy + hs.h / 2, hs.z), q, s.set(hs.w, hs.h, hs.d));
    houseMesh.setMatrixAt(i, m);
    e.set(0, hs.rot + Math.PI / 4, 0);
    q.setFromEuler(e);
    const rh = hs.h * 0.65;
    m.compose(
      v.set(hs.x, gy + hs.h + rh / 2, hs.z),
      q,
      s.set(Math.max(hs.w, hs.d) * 1.15, rh, Math.max(hs.w, hs.d) * 1.15)
    );
    roofMesh.setMatrixAt(i, m);
    roofMesh.setColorAt(i, rand() > 0.3 ? roofRed : roofBlue);
  });
  group.add(houseMesh, roofMesh);

  /* ---------------- office towers + apartments ---------------- */
  type TowerSpec = { x: number; z: number; w: number; d: number; h: number };
  const towers: TowerSpec[] = [
    { x: -6, z: -4, w: 11, d: 9, h: 20 },
    { x: 8, z: 4, w: 9, d: 9, h: 16 },
    { x: -2, z: 12, w: 8, d: 7, h: 12 },
    { x: 12, z: -10, w: 7, d: 8, h: 14 },
    { x: -16, z: 6, w: 7, d: 7, h: 10 },
  ];
  const ringR = 32;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    towers.push({
      x: Math.cos(a) * ringR,
      z: Math.sin(a) * ringR,
      w: R(6, 9),
      d: R(5, 8),
      h: R(6, 10),
    });
  }
  const towerMesh = new THREE.InstancedMesh(boxGeo, towerMat, towers.length);
  towerMesh.castShadow = shadows;
  const towerShades = ["#e8ecef", "#dfe5e9", "#eef1f3", "#d6dde2"].map(
    (c) => new THREE.Color(c)
  );
  towers.forEach((t, i) => {
    const gy = terrainHeight(t.x, t.z);
    m.compose(
      v.set(t.x, gy + t.h / 2, t.z),
      q.setFromEuler(e.set(0, 0, 0)),
      s.set(t.w, t.h, t.d)
    );
    towerMesh.setMatrixAt(i, m);
    towerMesh.setColorAt(i, towerShades[i % towerShades.length]);
  });
  group.add(towerMesh);

  /* ---------------- rooftop solar ---------------- */
  const roofPanels: THREE.Matrix4[] = [];
  const addRoofPanels = (x: number, z: number, topY: number, w: number, d: number) => {
    const cols = Math.max(1, Math.floor(w / 2.4));
    const rows = Math.max(1, Math.floor(d / 2.4));
    for (let cI = 0; cI < cols; cI++) {
      for (let rI = 0; rI < rows; rI++) {
        const px = x - w / 2 + (cI + 0.5) * (w / cols);
        const pz = z - d / 2 + (rI + 0.5) * (d / rows);
        const mm = new THREE.Matrix4();
        mm.compose(
          new THREE.Vector3(px, topY + 0.12, pz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, 0, 0)),
          new THREE.Vector3(w / cols - 0.5, 0.12, d / rows - 0.5)
        );
        roofPanels.push(mm);
      }
    }
  };
  towers.forEach((t) => {
    if (rand() > 0.25)
      addRoofPanels(t.x, t.z, terrainHeight(t.x, t.z) + t.h, t.w * 0.9, t.d * 0.9);
  });

  /* ---------------- ground solar farm ---------------- */
  const solarCenter = { x: 72, z: 72 };
  const farmPanels: THREE.Matrix4[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const px = solarCenter.x - 21 + col * 6.4 + R(-0.3, 0.3);
      const pz = solarCenter.z - 13 + row * 6.0 + R(-0.3, 0.3);
      const gy = terrainHeight(px, pz);
      const mm = new THREE.Matrix4();
      mm.compose(
        new THREE.Vector3(px, gy + 0.9, pz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0)),
        new THREE.Vector3(5.4, 0.16, 4.4)
      );
      farmPanels.push(mm);
    }
  }
  const allPanels = [...roofPanels, ...farmPanels];
  const panelMesh = new THREE.InstancedMesh(boxGeo, panelMat, allPanels.length);
  panelMesh.castShadow = shadows;
  allPanels.forEach((mm, i) => panelMesh.setMatrixAt(i, mm));
  group.add(panelMesh);

  /* ---------------- trees ---------------- */
  const treeCount = quality === "high" ? 320 : 160;
  const pineGeo = track(new THREE.ConeGeometry(0.9, 2.4, 6));
  const roundGeo = track(new THREE.IcosahedronGeometry(1.05, 0));
  const trunkGeo = track(new THREE.CylinderGeometry(0.16, 0.22, 1, 5));
  const pineMesh = new THREE.InstancedMesh(pineGeo, foliageMat, treeCount);
  const roundMesh = new THREE.InstancedMesh(roundGeo, foliageMat, treeCount);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount * 2);
  pineMesh.castShadow = shadows;
  roundMesh.castShadow = shadows;
  const greens = ["#3e8a3c", "#59a838", "#2e7d32", "#6cab46"].map(
    (c) => new THREE.Color(c)
  );
  let pineI = 0;
  let roundI = 0;
  let trunkI = 0;
  for (let i = 0; i < treeCount * 2; i++) {
    const a = rand() * Math.PI * 2;
    const r = 18 + Math.pow(rand(), 0.6) * 150;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // keep solar farm + wind hill summit clear
    if (Math.hypot(x - solarCenter.x, z - solarCenter.z) < 26) continue;
    const gy = terrainHeight(x, z);
    const sc = R(0.8, 1.7);
    m.compose(
      v.set(x, gy + 0.5 * sc, z),
      q.setFromEuler(e.set(0, 0, 0)),
      s.set(sc, sc, sc)
    );
    trunkMesh.setMatrixAt(trunkI++, m);
    const color = greens[Math.floor(rand() * greens.length)];
    if (rand() > 0.45 && pineI < treeCount) {
      m.compose(
        v.set(x, gy + sc + 1.2 * sc, z),
        q,
        s.set(sc, sc * R(1, 1.6), sc)
      );
      pineMesh.setMatrixAt(pineI, m);
      pineMesh.setColorAt(pineI, color);
      pineI++;
    } else if (roundI < treeCount) {
      m.compose(v.set(x, gy + sc + 1.0 * sc, z), q, s.set(sc, sc, sc));
      roundMesh.setMatrixAt(roundI, m);
      roundMesh.setColorAt(roundI, color);
      roundI++;
    }
    if (pineI >= treeCount && roundI >= treeCount) break;
  }
  pineMesh.count = pineI;
  roundMesh.count = roundI;
  trunkMesh.count = trunkI;
  group.add(pineMesh, roundMesh, trunkMesh);

  /* ---------------- wind turbines ---------------- */
  const towerGeo = track(new THREE.CylinderGeometry(0.24, 0.5, 16, 7));
  const nacelleGeo = track(new THREE.BoxGeometry(1.4, 0.8, 0.8));
  const bladeGeo = track(new THREE.BoxGeometry(0.5, 7, 0.14));
  bladeGeo.translate(0, 3.5, 0); // pivot at hub
  const bladeGroups: THREE.Group[] = [];
  const turbinePositions: [number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const tx = -85 + Math.cos((i / 9) * Math.PI * 2) * R(14, 38) + R(-6, 6);
    const tz = -85 + Math.sin((i / 9) * Math.PI * 2) * R(14, 38) + R(-6, 6);
    turbinePositions.push([tx, tz]);
    const gy = terrainHeight(tx, tz);
    const tg = new THREE.Group();
    tg.position.set(tx, gy, tz);
    tg.rotation.y = Math.PI * 0.3 + R(-0.2, 0.2); // face roughly same wind direction
    const towerM = new THREE.Mesh(towerGeo, turbineMat);
    towerM.position.y = 8;
    towerM.castShadow = shadows;
    const nac = new THREE.Mesh(nacelleGeo, turbineMat);
    nac.position.set(0, 16, 0);
    nac.castShadow = shadows;
    const blades = new THREE.Group();
    blades.position.set(0.85, 16, 0);
    blades.rotation.y = Math.PI / 2;
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, turbineMat);
      blade.rotation.z = (b / 3) * Math.PI * 2;
      blade.castShadow = shadows;
      blades.add(blade);
    }
    blades.userData.speed = R(0.6, 1.1);
    blades.rotation.z = rand() * Math.PI * 2;
    bladeGroups.push(blades);
    tg.add(towerM, nac, blades);
    group.add(tg);
  }

  /* ---------------- cable network + energy flow ---------------- */
  const pathDefs: [number, number][][] = [
    // wind farm -> town centre
    [
      [-78, -72],
      [-52, -44],
      [-28, -20],
      [-10, -8],
    ],
    // solar farm -> town centre
    [
      [66, 64],
      [46, 42],
      [24, 18],
      [10, 6],
    ],
    // ring road around the centre
    [
      [26, 0],
      [18, 19],
      [0, 27],
      [-19, 18],
      [-26, 0],
      [-18, -19],
      [0, -26],
      [19, -18],
      [26, 0],
    ],
    // spurs to housing clusters
    [
      [24, 10],
      [34, 17],
      [42, 22],
    ],
    [
      [-22, 14],
      [-31, 24],
      [-38, 32],
    ],
    [
      [14, -22],
      [21, -33],
      [27, -42],
    ],
    [
      [-13, -22],
      [-18, -31],
      [-22, -38],
    ],
    [
      [30, -4],
      [45, -8],
      [58, -12],
    ],
    [
      [-28, 2],
      [-42, 4],
      [-55, 5],
    ],
  ];

  type Flow = { samples: Float32Array; nSamples: number; count: number; speed: number };
  const flows: Flow[] = [];
  let totalDots = 0;
  for (const def of pathDefs) {
    const pts = def.map(
      ([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.35, z)
    );
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
    const len = curve.getLength();
    const tube = track(
      new THREE.TubeGeometry(curve, Math.max(24, Math.floor(len / 2.2)), 0.32, 5)
    );
    const tubeMesh = new THREE.Mesh(tube, cableMat);
    tubeMesh.receiveShadow = shadows;
    group.add(tubeMesh);

    const nSamples = 220;
    const spaced = curve.getSpacedPoints(nSamples - 1);
    const samples = new Float32Array(nSamples * 3);
    spaced.forEach((p, i) => {
      samples[i * 3] = p.x;
      samples[i * 3 + 1] = p.y + 0.55;
      samples[i * 3 + 2] = p.z;
    });
    const count = Math.max(4, Math.round(len / 4.2));
    flows.push({ samples, nSamples, count, speed: R(0.025, 0.045) });
    totalDots += count;
  }

  const dotPositions = new Float32Array(totalDots * 3);
  const dotColors = new Float32Array(totalDots * 3);
  const cBlue = new THREE.Color("#2e9bff");
  const cYellow = new THREE.Color("#ffd23f");
  let di = 0;
  for (const f of flows) {
    for (let i = 0; i < f.count; i++) {
      const c = i % 2 === 0 ? cBlue : cYellow;
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
      size: 1.5,
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

  /* ---------------- stars (night only) ---------------- */
  const starCount = 700;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const elev = Math.asin(rand() * 0.92 + 0.06);
    const rr = 330;
    starPos[i * 3] = Math.cos(a) * Math.cos(elev) * rr;
    starPos[i * 3 + 1] = Math.sin(elev) * rr;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(elev) * rr;
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = track(
    new THREE.PointsMaterial({
      color: "#cfe2ff",
      size: 1.2,
      transparent: true,
      opacity: 0,
      sizeAttenuation: false,
      depthWrite: false,
    })
  );
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  /* ---------------- theme bindings ---------------- */
  const lerpC = (out: THREE.Color, a: THREE.Color, b: THREE.Color, t: number) =>
    out.copy(a).lerp(b, t);
  const dayWall = new THREE.Color("#ffffff");
  const dayTerrain = new THREE.Color("#ffffff");
  const dayCable = new THREE.Color("#8d9aa0");
  const nightCable = new THREE.Color("#3a4556");
  const dayTurbine = new THREE.Color("#f2f4f5");
  const nightTurbine = new THREE.Color("#4a5468");
  const dayTrunk = new THREE.Color("#7a5a3a");
  const nightTrunk = new THREE.Color("#2e2a30");
  const dayPanel = new THREE.Color("#1f5fa8");
  const nightPanel = new THREE.Color("#16365e");

  function applyTheme(mix: number) {
    lerpC(terrainMat.color, dayTerrain, NIGHT.terrainTint, mix);
    lerpC(wallMat.color, dayWall, NIGHT.wallTint, mix);
    lerpC(roofMat.color, dayWall, NIGHT.wallTint, mix);
    lerpC(towerMat.color, dayWall, NIGHT.wallTint, mix);
    lerpC(foliageMat.color, dayWall, NIGHT.terrainTint, mix);
    lerpC(cableMat.color, dayCable, nightCable, mix);
    lerpC(turbineMat.color, dayTurbine, nightTurbine, mix);
    lerpC(trunkMat.color, dayTrunk, nightTrunk, mix);
    lerpC(panelMat.color, dayPanel, nightPanel, mix);
    wallMat.emissiveIntensity = NIGHT.emissiveWarm * mix;
    towerMat.emissiveIntensity = 0.3 * mix;
    panelMat.emissiveIntensity = NIGHT.emissiveSolar * mix;
    starMat.opacity = NIGHT.starOpacity * mix;
    dotMat.size = 1.5 + 0.7 * mix;
  }

  /* ---------------- per-frame update ---------------- */
  const flowOffsets = flows.map(() => rand());
  function update(dt: number, _elapsed: number) {
    for (const bg of bladeGroups) {
      bg.rotation.z += dt * (bg.userData.speed as number);
    }
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
        dotPositions[idx * 3] =
          f.samples[i0 * 3] + (f.samples[i1 * 3] - f.samples[i0 * 3]) * frac;
        dotPositions[idx * 3 + 1] =
          f.samples[i0 * 3 + 1] +
          (f.samples[i1 * 3 + 1] - f.samples[i0 * 3 + 1]) * frac;
        dotPositions[idx * 3 + 2] =
          f.samples[i0 * 3 + 2] +
          (f.samples[i1 * 3 + 2] - f.samples[i0 * 3 + 2]) * frac;
        idx++;
      }
    }
    (dotGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  function dispose() {
    for (const d of disposables) d.dispose();
    houseMesh.dispose();
    roofMesh.dispose();
    towerMesh.dispose();
    panelMesh.dispose();
    pineMesh.dispose();
    roundMesh.dispose();
    trunkMesh.dispose();
  }

  applyTheme(0);
  return { group, update, applyTheme, dispose };
}
