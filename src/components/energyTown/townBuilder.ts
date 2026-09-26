import * as THREE from "three";
import { R, rand } from "./scene/random";
import { craterShade, terrainHeight } from "./scene/terrain";
import {
  makeDotTexture,
  makeGlowTexture,
  makeRegolithTexture,
  makeSolarCellTexture,
} from "./scene/textures";
import { buildAtmosphere } from "./scene/atmosphere";
import { buildConduits } from "./scene/conduits";

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
/* atmosphere (dust + sky) and conduits (energy / data networks).      */
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
    conduits.applyTheme(mix, conduitMat.color);
    conduitMat.emissiveIntensity = 0.55 + 0.85 * mix;
    coreMat.emissiveIntensity = 0.9 + 0.7 * mix;
    stripMat.emissiveIntensity = 0.3 + 0.9 * mix;
    solarMat.emissiveIntensity = 0.1 + 0.45 * mix;
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

    sstRingMat.emissiveIntensity = (0.7 + 0.6 * lastMix) * (0.8 + 0.3 * Math.sin(elapsed * 2.1));

    const blink = Math.max(0, Math.sin(elapsed * 2.3));
    beaconRedMat.opacity = 0.15 + 0.75 * blink * blink * blink;
    const breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.1);
    beaconBlueMat.opacity = 0.35 + 0.4 * breathe;

    // AI loop: information lights and the data-centre glow come alive
    bessLightMat.emissiveIntensity = 0.8 * (1 + 0.9 * loop);
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
    panelMesh.dispose();
    legMesh.dispose();
  }

  applyThemeWrapped(0);
  return { group, update, applyTheme: applyThemeWrapped, setLoop, dispose };
}
