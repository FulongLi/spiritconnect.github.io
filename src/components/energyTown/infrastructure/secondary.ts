import * as THREE from "three";
import { terrainHeight } from "../scene/terrain";
import type { InfraContext } from "./context";
import { Parts, placement } from "./parts";

/* ------------------------------------------------------------------ */
/* Secondary infrastructure: vehicle chargers (instanced), landing-pad */
/* paint and edge lights. (Dome foundations live in ./habitat.)        */
/* ------------------------------------------------------------------ */

export type ChargerSpot = { x: number; z: number; rot: number };

/** charging posts; the glowing bay marking keeps the shared conduit material */
export function buildChargers(ctx: InfraContext, stations: ChargerSpot[], bayMat: THREE.Material) {
  const { kit, detail, track, shadows, group } = ctx;
  const p = new Parts(kit, detail);
  // base slab
  p.slab("foundation", 3.6, 0.22, 3.0, 0, -0.06, 0, { c: 0.04 });
  // pillar: aluminium shell between graphite side fins, graphite cap
  p.slab("alu", 1.2, 2.3, 0.8, 0, 0.16, 0, { c: 0.06 });
  for (const s of [-1, 1]) p.slab("graphite", 0.08, 2.24, 0.72, s * 0.64, 0.16, 0, { c: 0.02, plain: true });
  p.slab("graphite", 1.36, 0.12, 0.92, 0, 2.46, 0, { c: 0.03, plain: true });
  // operator screen + status strip (faces -z, toward the bay)
  p.box("graphite", 0.84, 0.58, 0.03, 0, 1.65, -0.41, { plain: true });
  p.box("glass", 0.74, 0.48, 0.02, 0, 1.65, -0.43);
  p.box("lightInfo", 0.74, 0.04, 0.02, 0, 2.05, -0.415);
  // connector arm and holstered cable
  p.rod("frame", 0.06, [0, 2.3, -0.35], [0, 1.95, -1.35], 8);
  p.box("graphite", 0.18, 0.22, 0.26, 0, 1.9, -1.42, { c: 0.02 });
  p.box("frame", 0.12, 0.2, 0.14, 0.45, 1.3, -0.47);
  p.torus("cable", 0.22, 0.035, 0.45, 0.98, -0.52, { rx: -Math.PI / 2, seg: 20 });
  // bollards with a cool marker band
  for (const s of [-1, 1]) {
    p.cyl("frame", 0.08, 0.08, 0.9, s * 1.45, 0.45, -1.3, { seg: 10 });
    p.cyl("lightCool", 0.085, 0.085, 0.05, s * 1.45, 0.78, -1.3, { seg: 10 });
  }
  if (detail) p.decal("EV-CHG", 0.6, 0.681, 2.05, 0, { ry: Math.PI / 2 });

  const matrices = stations.map((s) => placement(s.x, terrainHeight(s.x, s.z), s.z, s.rot));
  group.add(p.instanced(track, shadows, matrices));

  // glowing bay marking in front of every post (unchanged identity element)
  const spotGeo = track(new THREE.PlaneGeometry(4.0, 3.2));
  spotGeo.rotateX(-Math.PI / 2);
  spotGeo.translate(0, 0.14, -2.35);
  const spots = track(new THREE.InstancedMesh(spotGeo, bayMat, stations.length));
  matrices.forEach((m, i) => spots.setMatrixAt(i, m));
  spots.computeBoundingSphere();
  group.add(spots);

  for (const s of stations) ctx.ground.rect(s.x, s.z, 3.8, 3.2, s.rot);
}

export type PadSpot = { x: number; z: number; r: number; top: number; dome: boolean };

/** pad paint, rim lights and ground contact for every landing pad */
export function buildPadDetails(ctx: InfraContext, pads: PadSpot[]) {
  const p = new Parts(ctx.kit, ctx.detail);
  for (const pd of pads) {
    ctx.ground.disc(pd.x, pd.z, pd.r + 0.6);
    if (pd.dome) continue;
    ctx.ground.padMarking(pd.x, pd.top, pd.z, pd.r * 0.8);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = pd.x + Math.cos(a) * (pd.r - 0.25);
      const z = pd.z + Math.sin(a) * (pd.r - 0.25);
      p.box("graphite", 0.26, 0.06, 0.26, x, pd.top + 0.03, z, { ry: -a, plain: true });
      p.box(i % 3 === 0 ? "lightAmber" : "lightCool", 0.14, 0.04, 0.14, x, pd.top + 0.07, z, { ry: -a });
    }
  }
  ctx.group.add(p.build(ctx.track, ctx.shadows, "pad-details"));
}
