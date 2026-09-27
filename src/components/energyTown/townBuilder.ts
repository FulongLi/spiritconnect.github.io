import * as THREE from "three";
import { MAIN_DOME } from "@/components/shared/domeArchitecture";
import { rand } from "./scene/random";
import { craterShade, terrainHeight } from "./scene/terrain";
import { makeDotTexture, makeGlowTexture, makeRegolithTexture } from "./scene/textures";
import { buildAtmosphere } from "./scene/atmosphere";
import { buildConduits } from "./scene/conduits";
import { mainDomeToWorld } from "./scene/habitatSite";
import { createIndustrialKit } from "./scene/materials";
import { buildRocks } from "./scene/rocks";
import type { InfraContext } from "./infrastructure/context";
import { createGroundLayer } from "./infrastructure/ground";
import { buildSST } from "./infrastructure/sst";
import { buildDataCentre } from "./infrastructure/dataCentre";
import { buildBESS } from "./infrastructure/bess";
import { buildNuclearCore } from "./infrastructure/nuclear";
import { buildSolarField } from "./infrastructure/solarField";
import { buildHabitat } from "./infrastructure/habitat";
import { buildMobility } from "./infrastructure/mobility";

export { terrainHeight } from "./scene/terrain";
export { DAY, NIGHT } from "./scene/palette";

/* ------------------------------------------------------------------ */
/* Lunar micro-grid, organized by energy flow:                         */
/*   INPUTS  : PV array + nuclear reactor (east, side by side)         */
/*   STORAGE : battery banks (BESS)                                    */
/*   PROCESS : solid-state transformer (SST)                           */
/*   ACTION  : landing pads, lander, rover charging rows (mobility)    */
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
/* solar field, mobility) are authored in ./infrastructure and merged  */
/* per material; ground decals tie them into the regolith.             */
/* ------------------------------------------------------------------ */

export type Town = {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  applyTheme: (mix: number) => void;
  /** AI → energy feedback loop strength, 0..1 */
  setLoop: (k: number) => void;
  /** reduced motion: the loop brightens without travelling waves */
  setReducedMotion: (reduced: boolean) => void;
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

  /* ================== LOADS: habitat =============================
     The main Dome (home of the workspace) in the centre, six satellite
     domes on a hexagon, corridors along the spokes and the perimeter —
     authored in ./infrastructure/habitat, in the same architectural
     language as the Dome interior. Built after the mobility district
     (below) so the small pad domes join it. */

  /* ----- nuclear power core ----- */
  const reactor = { x: 90, z: 0 };
  buildNuclearCore(infra, reactor.x, reactor.z);

  /* ================== STORAGE: battery banks ======================= */
  buildBESS(infra, 74, -32);

  /* ================== PROCESS: SST station ========================= */
  buildSST(infra, 44, 0);

  /* ================= MOBILITY: landing pads, lander, rover chargers ==
     where the energy system enters the physical world (see
     ./infrastructure/mobility). Built before the habitat so the small
     pad domes join it. */
  const mobility = buildMobility(infra);
  const habitat = buildHabitat(infra, mobility.padDomes);

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


  // no flow dots under the pads, under the main Dome, or across its entrance
  // court — where the final approach flies low toward the airlock
  const court = mainDomeToWorld(0, 0, 24);
  const conduits = buildConduits({
    group,
    track,
    std,
    conduitMat,
    dotTex,
    covered: [
      ...mobility.footprints,
      { x: 0, z: 0, r: MAIN_DOME.radius + 1 },
      { x: court.x, z: court.z, r: 14 },
    ],
  });

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
    ...mobility.keepClear,
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

  // navigation light on the main Dome's oculus: neutral, not brand blue
  const beaconBlueMat = track(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: "#eef2f6",
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const beaconBlue = new THREE.Sprite(beaconBlueMat);
  beaconBlue.scale.setScalar(1.4);
  beaconBlue.position.set(0, habitat.crownY + 0.35, 0);
  group.add(beaconBlue);

  /* ---------------- theme ---------------- */
  const themePairs: [THREE.MeshStandardMaterial, string, string][] = [
    [terrainMat, "#ffffff", "#5d6b85"],
    [shellMat, "#cfe0ec", "#39435a"],
    [shellDarkMat, "#a9bfd1", "#2b3346"],
    [conduitMat, "#10161f", "#0b1018"],
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
    kit.applyTheme(mix);
    habitat.applyTheme(mix);
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
    beaconBlueMat.opacity = 0.25 + 0.3 * breathe;

    // AI loop: information lights and the data-centre glow come alive
    kit.update(elapsed, loop);
    dcGlow.visible = loop > 0.002;
    if (dcGlow.visible) {
      const hum = 0.85 + 0.15 * Math.sin(elapsed * 2.4);
      // each feedback wave leaves the data centre with a soft pulse
      const pulse = conduits.feedbackPulse();
      dcGlowMat.opacity = 0.55 * loop * hum + 0.3 * pulse;
      dcGlow.scale.setScalar(7 + 7 * loop + 4 * pulse);
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
  return {
    group,
    update,
    applyTheme: applyThemeWrapped,
    setLoop,
    setReducedMotion: (reduced: boolean) => conduits.setReducedMotion(reduced),
    dispose,
  };
}
