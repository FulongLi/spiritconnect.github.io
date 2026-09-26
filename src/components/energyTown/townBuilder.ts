import * as THREE from "three";
import { rand } from "./scene/random";
import { craterShade, terrainHeight } from "./scene/terrain";
import { makeDotTexture, makeGlowTexture, makeRegolithTexture } from "./scene/textures";
import { buildAtmosphere } from "./scene/atmosphere";
import { buildConduits } from "./scene/conduits";
import { createIndustrialKit } from "./scene/materials";
import { buildRocks } from "./scene/rocks";
import type { InfraContext } from "./infrastructure/context";
import { createGroundLayer } from "./infrastructure/ground";
import { buildSST } from "./infrastructure/sst";
import { buildDataCentre } from "./infrastructure/dataCentre";
import { buildBESS } from "./infrastructure/bess";
import { buildNuclearCore } from "./infrastructure/nuclear";
import { buildSolarField } from "./infrastructure/solarField";
import { buildChargers, buildDomeCollars, buildPadDetails } from "./infrastructure/secondary";

export { terrainHeight } from "./scene/terrain";
export { DAY, NIGHT } from "./scene/palette";

/* ------------------------------------------------------------------ */
/* Lunar micro-grid, organized by energy flow:                         */
/*   INPUTS  : PV array + nuclear reactor (east, side by side)         */
/*   STORAGE : battery banks (BESS)                                    */
/*   PROCESS : solid-state transformer (SST) + landing pad / charging  */
/*   LOADS   : data centre + habitat ring (domes & capsules in a       */
/*             closed loop of tubes), with the portal pedestal inside  */
/*             the main dome.                                          */
/* ------------------------------------------------------------------ */
/*                                                                     */
/* Pure helpers live in ./scene: random (shared seeded stream),        */
/* terrain (height field, craters, ribbons), textures, palette,        */
/* materials (the shared industrial material kit), rocks, atmosphere   */
/* (dust + sky) and conduits (energy / data networks).                 */
/* The engineered installations (SST, data centre, BESS, nuclear core, */
/* solar field, chargers) are authored in ./infrastructure and merged  */
/* per material; ground decals tie them into the regolith.             */
/* ------------------------------------------------------------------ */

export type Town = {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  applyTheme: (mix: number) => void;
  /** AI → energy feedback loop strength, 0..1 */
  setLoop: (k: number) => void;
  dispose: () => void;
};

/* ------------------------------------------------------------------ */

export function buildTown(quality: "high" | "low"): Town {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T): T => {
    disposables.push(o);
    return o;
  };
  const shadows = quality === "high";
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

  /* shared industrial materials + ground integration layer */
  const kit = createIndustrialKit(track);
  const ground = createGroundLayer(group, track, quality, shadows);
  const infra: InfraContext = { group, kit, track, detail: quality === "high", shadows, ground };

  /* ================== INPUTS: PV array (first: consumes the shared
     random stream exactly where the original layout did) ============ */
  const solarCenter = { x: 76, z: 38 };
  buildSolarField(infra, solarCenter.x, solarCenter.z);

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

  /* ----- nuclear power core ----- */
  const reactor = { x: 90, z: 0 };
  buildNuclearCore(infra, reactor.x, reactor.z);

  /* ================== STORAGE: battery banks ======================= */
  buildBESS(infra, 74, -32);

  /* ================== PROCESS: SST station ========================= */
  buildSST(infra, 44, 0);

  /* ----- landing pads + charging posts, laid out like the hand sketch ----- */
  type PadNode = { x: number; z: number; r: number; kind?: "pad" | "dome" };
  const pads: PadNode[] = [
    { x: -42, z: -8, r: 5.2 }, // node #0 — chain pushed west along the red arrow
    { x: -58, z: -12, r: 6.4, kind: "dome" }, // small dome #1 (moved up +12)
    { x: -74, z: -16, r: 5.8 }, // landing pad #2 — on the straight line through #0 and #1
    { x: -92, z: -20, r: 5.8 }, // left terminal pad beside chargers (follows #2)
    { x: -94, z: 4, r: 5.8 }, // terminal pad #4 — flipped up, moved a big step left (-X)
    { x: -36, z: 20, r: 5.2 }, // second node attached to the habitat ring
    { x: -58, z: 40, r: 6.4, kind: "dome" }, // small dome at the second approach node
    { x: -80, z: 60, r: 5.8 }, // second landing pad at the charger branch junction
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
    // every node sits on a raised disc platform that clears the local terrain
    const baseH = top - (minEdge - 0.8);
    const padMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(pd.r, pd.r + 0.6, baseH, 28)),
      shellDarkMat
    );
    padMesh.position.set(pd.x, top - baseH / 2, pd.z);
    padMesh.receiveShadow = shadows;
    group.add(padMesh);

    if (pd.kind === "dome") {
      // small habitat dome resting ON the platform (not sunk into the terrain),
      // built with the same elements as the main habitat domes
      const domeRadius = pd.r * 0.92;
      const domeGeo = track(
        new THREE.SphereGeometry(domeRadius, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2)
      );
      const dome = new THREE.Mesh(domeGeo, shellMat);
      dome.position.set(pd.x, top + 0.05, pd.z);
      dome.castShadow = shadows;
      group.add(dome);

      const seamSrc = track(
        new THREE.SphereGeometry(domeRadius * 1.004, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
      );
      const seamGeo = track(new THREE.WireframeGeometry(seamSrc));
      const seams = new THREE.LineSegments(seamGeo, seamMat);
      seams.position.set(pd.x, top + 0.05, pd.z);
      group.add(seams);

      // glowing base ring (brand blue) — shares the emissive material that
      // brightens at night, exactly like the central + secondary domes
      const baseRing = new THREE.Mesh(
        track(new THREE.TorusGeometry(domeRadius * 1.04, 0.2, 8, 48)),
        conduitMat
      );
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(pd.x, top + 0.23, pd.z);
      group.add(baseRing);

      // brand-blue crown ring near the apex (matches the main habitat domes)
      const crownH = domeRadius * 0.78;
      const crownR = Math.sqrt(Math.max(0.05, domeRadius * domeRadius - crownH * crownH));
      const crown = new THREE.Mesh(
        track(new THREE.TorusGeometry(crownR * 1.02, 0.14, 8, 48)),
        conduitMat
      );
      crown.rotation.x = Math.PI / 2;
      crown.position.set(pd.x, top + 0.05 + crownH, pd.z);
      group.add(crown);

      // warm window band partway up the dome
      const band = new THREE.Mesh(
        track(new THREE.TorusGeometry(domeRadius * 0.9, 0.14, 8, 56)),
        stripMat
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(pd.x, top + domeRadius * 0.42, pd.z);
      group.add(band);
      continue;
    }

    const padRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(pd.r * 0.86, 0.15, 8, 64)),
      conduitMat
    );
    padRing.rotation.x = Math.PI / 2;
    padRing.position.set(pd.x, top + 0.05, pd.z);
    group.add(padRing);
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

    const chargers = [
      // three square charger posts on the left branch
      { x: -108, z: -23, rot: -1.48 },
      { x: -118, z: -25, rot: -1.48 },
      { x: -128, z: -27, rot: -1.48 },
      // three square charger posts on the upper branch (flipped up, moved left of #4)
      { x: -104, z: 5, rot: -0.06 },
      { x: -116, z: 6, rot: -0.06 },
      { x: -128, z: 7, rot: -0.06 },
      // three square charger posts on the second left branch
      { x: -108, z: 66, rot: -1.38 },
      { x: -118, z: 68, rot: -1.38 },
      { x: -128, z: 70, rot: -1.38 },
      // three square charger posts on the second lower branch
      { x: -68, z: 84, rot: 0.12 },
      { x: -56, z: 86, rot: 0.12 },
      { x: -44, z: 88, rot: 0.12 },
    ];
    buildChargers(infra, chargers, conduitMat);
  }
  buildPadDetails(
    infra,
    pads.map((pd, i) => ({ x: pd.x, z: pd.z, r: pd.r, top: padTops[i], dome: pd.kind === "dome" })),
  );
  buildDomeCollars(
    infra,
    domes.map((d) => ({ x: d.x, z: d.z, r: d.r, base: terrainHeight(d.x, d.z) + 0.1 })),
  );

  /* ================== LOAD: data centre ============================ */
  const dcCenter = { x: 16, z: -42 };
  buildDataCentre(infra, dcCenter.x, dcCenter.z, 0.3);

  /* the data centre's "intelligence" glow — dark until the AI loop engages */
  const dcGlowMat = track(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: "#7fd6ff",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const dcGlow = new THREE.Sprite(dcGlowMat);
  dcGlow.position.set(dcCenter.x, terrainHeight(dcCenter.x, dcCenter.z) + 6.5, dcCenter.z);
  dcGlow.scale.setScalar(7);
  dcGlow.visible = false;
  group.add(dcGlow);


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


  const conduits = buildConduits({ group, track, std, conduitMat, dotTex });

  /* boulders, kept clear of every installation, pad and dome */
  const rocks = buildRocks(group, track, quality, shadows, [
    { x: 0, z: 0, r: 36 },
    { x: solarCenter.x, z: solarCenter.z, r: 30 },
    { x: reactor.x, z: reactor.z, r: 14 },
    { x: 74, z: -32, r: 18 },
    { x: 44, z: 0, r: 16 },
    { x: dcCenter.x, z: dcCenter.z, r: 15 },
    { x: comms.x, z: comms.z, r: 5 },
    { x: -26, z: 34, r: 10 },
    { x: -50, z: -35, r: 6 },
    ...pads.map((pd) => ({ x: pd.x, z: pd.z, r: pd.r + 4 })),
    ...[
      [-118, -25],
      [-116, 6],
      [-118, 68],
      [-56, 86],
    ].map(([x, z]) => ({ x, z, r: 16 })),
  ]);
  ground.build();

  /* dust, stars, Milky Way */
  const atmosphere = buildAtmosphere(group, track, quality);

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
    conduits.applyTheme(mix, conduitMat.color);
    conduitMat.emissiveIntensity = 0.55 + 0.85 * mix;
    coreMat.emissiveIntensity = 0.9 + 0.7 * mix;
    stripMat.emissiveIntensity = 0.3 + 0.9 * mix;
    kit.applyTheme(mix);
    ground.applyTheme(mix);
    rocks.applyTheme(mix);
    atmosphere.applyTheme(mix);
  }

  /* ---------------- per-frame update ---------------- */
  let lastMix = 0;
  let loop = 0;
  function update(dt: number, elapsed: number) {
    const corePulse = (Math.sin(elapsed * 1.6) + 1) / 2;
    coreMat.emissiveIntensity = (0.9 + 0.7 * lastMix) * (0.85 + corePulse * 0.3);

    atmosphere.update(elapsed);
    conduits.update(dt, elapsed, lastMix);

    const blink = Math.max(0, Math.sin(elapsed * 2.3));
    beaconRedMat.opacity = 0.15 + 0.75 * blink * blink * blink;
    const breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.1);
    beaconBlueMat.opacity = 0.35 + 0.4 * breathe;

    // AI loop: information lights and the data-centre glow come alive
    kit.update(elapsed, loop);
    dcGlow.visible = loop > 0.002;
    if (dcGlow.visible) {
      const hum = 0.85 + 0.15 * Math.sin(elapsed * 2.4);
      dcGlowMat.opacity = 0.55 * loop * hum;
      dcGlow.scale.setScalar(7 + 7 * loop);
    }
  }

  function setLoop(k: number) {
    loop = Math.min(1, Math.max(0, k));
    conduits.setLoop(loop);
  }

  const applyThemeWrapped = (mix: number) => {
    lastMix = mix;
    applyTheme(mix);
  };

  function dispose() {
    for (const d of disposables) d.dispose();
  }

  applyThemeWrapped(0);
  return { group, update, applyTheme: applyThemeWrapped, setLoop, dispose };
}
