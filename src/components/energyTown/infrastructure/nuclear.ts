import { terrainHeight } from "../scene/terrain";
import { handrail, radiatorPanel, stairs } from "./components";
import type { InfraContext } from "./context";
import { siteLevel } from "./ground";
import { Parts } from "./parts";

/* ------------------------------------------------------------------ */
/* Nuclear power core (fission surface power): a dark containment      */
/* vessel with heavy steel shield bands and a bolted closure head,     */
/* standing in an octagonal sintered-regolith shield silo. Two Brayton */
/* power-conversion units, four radial heat-rejection wings, coolant   */
/* accumulators and a power termination cabinet surround it. Amber is  */
/* used sparingly: one light ring at the vessel, the access lamp and   */
/* the radiation / hazard markings at the shielded access door.        */
/* Local frame: world-aligned, camera sees the +x / +z quadrant.       */
/* ------------------------------------------------------------------ */

const R_DECK = 7.4; // octagon circumradius

export function buildNuclearCore(ctx: InfraContext, cx: number, cz: number) {
  const { kit, detail } = ctx;
  const lvl = siteLevel(cx, cz, R_DECK * 2, R_DECK * 2);
  const deck = lvl.max + 0.7;
  const skirt = deck - (lvl.min - 0.35);
  const p = new Parts(kit, detail);

  /* ---- octagonal platform ---- */
  p.prism("foundation", R_DECK, skirt, 8, 0, -skirt / 2, 0);
  p.prism("graphite", R_DECK + 0.05, 0.22, 8, 0, -0.11, 0);
  p.prism("graphite", R_DECK - 0.45, 0.05, 8, 0, 0.025, 0);
  const E = 0.05;

  /* ---- shield silo: eight sintered wall segments + coping ---- */
  const apo = 3.95;
  const side = 2 * apo * Math.tan(Math.PI / 8);
  const wallH = 2.4;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const ry = Math.PI / 2 - a;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    p.box("foundation", side, wallH, 0.8, ca * (apo - 0.4), E + wallH / 2, sa * (apo - 0.4), { ry });
    p.box("graphite", side + 0.02, 0.16, 0.9, ca * (apo - 0.4), E + wallH + 0.08, sa * (apo - 0.4), { ry, plain: true });
  }
  const siloTop = E + wallH + 0.16;

  /* ---- containment vessel ---- */
  const vr = 2.45;
  const vTop = E + 7.0;
  p.cyl("graphite", vr, vr, vTop - E, 0, (E + vTop) / 2, 0, { seg: 40 });
  for (const y of [E + 3.05, E + 4.35, E + 5.65]) p.cyl("frame", vr + 0.13, vr + 0.13, 0.32, 0, y, 0, { seg: 40 });
  // controlled amber: a single thin light ring where the vessel leaves the silo
  p.cyl("lightAmber", vr + 0.05, vr + 0.05, 0.06, 0, siloTop + 0.12, 0, { seg: 40, open: true });
  // closure head: bolted flange, dished head, drive-mechanism housings
  p.cyl("frame", vr + 0.25, vr + 0.25, 0.3, 0, vTop + 0.15, 0, { seg: 40 });
  p.cyl("graphite", 1.55, vr + 0.05, 0.7, 0, vTop + 0.65, 0, { seg: 40 });
  p.cyl("frame", 1.55, 1.55, 0.1, 0, vTop + 1.05, 0, { seg: 32 });
  const head = vTop + 1.1;
  if (detail) {
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      p.cyl("frame", 0.05, 0.05, 0.14, Math.cos(a) * (vr + 0.14), vTop + 0.37, Math.sin(a) * (vr + 0.14), { seg: 6 });
    }
  }
  const crdm: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) crdm.push([Math.cos((i * Math.PI) / 3) * 0.75, Math.sin((i * Math.PI) / 3) * 0.75]);
  for (const [x, z] of crdm) {
    p.cyl("alu", 0.15, 0.15, 1.1, x, head + 0.55, z, { seg: 12 });
    p.cyl("graphite", 0.18, 0.18, 0.12, x, head + 1.16, z, { seg: 12 });
  }
  // instrument mast
  p.cyl("frame", 0.04, 0.06, 2.6, 1.15, head + 1.3, -0.5, { seg: 6 });
  p.sphere("lightCool", 0.08, 1.15, head + 2.65, -0.5);
  // penetration / instrument ports on the exposed vessel
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    p.box("graphite", 0.4, 0.5, 0.4, Math.cos(a) * (vr + 0.1), E + 6.35, Math.sin(a) * (vr + 0.1), { ry: -a, c: 0.04 });
  }

  /* ---- heat rejection: four radial radiator wings ---- */
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    p.push(ca * 5.35, E, sa * 5.35, -a);
    p.slab("frame", 2.7, 0.3, 0.5, 0, 0, 0);
    radiatorPanel(p, 0, 0.6, 0, 2.4, 5.0);
    if (detail) {
      for (const s of [-1, 1]) p.rod("frame", 0.04, [s * 1.25, 0.3, 0.22], [s * 0.3, 3.2, 0.05], 6);
    }
    p.pop();
    // hot-leg feed from the vessel to the top header
    p.pipe("alu", 0.09, [
      [ca * (vr + 0.1), E + 5.62, sa * (vr + 0.1)],
      [ca * 4.05, E + 5.62, sa * 4.05],
    ], false);
    p.cyl("frame", 0.15, 0.15, 0.08, ca * 3.3, E + 5.62, sa * 3.3, { rz: Math.PI / 2, ry: -a });
  }

  /* ---- power conversion units (+x and -z) ---- */
  const pcu = (a: number, label: "PCU-1" | "PCU-2") => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    p.push(ca * 5.3, E, sa * 5.3, -a);
    // radial axis = local x: recuperator dome, turbo-alternator body, generator
    for (const s of [-0.45, 0.45]) p.slab("frame", 0.22, 0.4, 0.9, s, 0, 0);
    p.cyl("alu", 0.5, 0.5, 1.4, 0, 0.85, 0, { rz: Math.PI / 2, seg: 24 });
    p.sphere("alu", 0.5, -0.7, 0.85, 0);
    p.cyl("graphite", 0.42, 0.42, 0.6, 1.0, 0.85, 0, { rz: Math.PI / 2, seg: 20 });
    p.cyl("frame", 0.54, 0.54, 0.07, 0.7, 0.85, 0, { rz: Math.PI / 2, seg: 24 });
    p.cyl("frame", 0.54, 0.54, 0.07, -0.2, 0.85, 0, { rz: Math.PI / 2, seg: 24 });
    p.decal(label, 0.56, 0.25, 0.85, 0.505, {});
    p.pop();
    // feed over the shield wall into the converter
    p.pipe("alu", 0.1, [
      [ca * (vr + 0.1), E + 3.45, sa * (vr + 0.1)],
      [ca * 4.55, E + 3.45, sa * 4.55],
      [ca * 4.55, E + 1.3, sa * 4.55],
    ]);
  };
  pcu(0, "PCU-1");
  pcu(-Math.PI / 2, "PCU-2");

  /* ---- west: coolant accumulators + power termination cabinet ---- */
  for (const deg of [158, 202]) {
    const a = (deg * Math.PI) / 180;
    const x = Math.cos(a) * 5.35;
    const z = Math.sin(a) * 5.35;
    p.cyl("frame", 0.72, 0.72, 0.3, x, E + 0.15, z, { seg: 20 });
    p.cyl("alu", 0.62, 0.62, 1.6, x, E + 1.1, z, { seg: 20 });
    p.sphere("alu", 0.62, x, E + 1.9, z, { cap: true });
    p.cyl("frame", 0.66, 0.66, 0.06, x, E + 1.2, z, { seg: 20 });
  }
  p.slab("graphite", 1.0, 2.0, 1.6, -5.85, E, 0, { c: 0.05 });
  p.decal("hv", 0.36, -5.85, E + 1.5, 0.812, {});

  /* ---- +z: shielded access door, markings, stair ---- */
  const dz = apo;
  p.box("frame", 1.5, 2.15, 0.22, 0, E + 1.075, dz + 0.08, { c: 0.03, plain: true });
  p.box("graphite", 1.2, 1.95, 0.08, 0, E + 0.98, dz + 0.22, { c: 0.02, plain: true });
  for (const s of [-1, 1]) p.decal("hazard", 1.9, s * 0.92, E + 1.0, dz + 0.012, { rz: Math.PI / 2, h: 0.18 });
  p.decal("trefoil", 0.62, 1.35, E + 1.7, dz + 0.012);
  p.decal("NPC-01", 1.0, apo + 0.012, E + 1.9, 0, { ry: Math.PI / 2 });
  p.box("graphite", 0.7, 0.08, 0.2, 0, E + 2.28, dz + 0.18, { plain: true });
  p.box("lightAmber", 0.5, 0.04, 0.06, 0, E + 2.22, dz + 0.26);
  for (const s of [-1, 1]) {
    const x = s * 0.9;
    for (let z = dz + 0.5; z < 6.5; z += 1.44) p.decal("hazard", 1.44, x, 0.056, z + 0.72, { rx: -Math.PI / 2, ry: Math.PI / 2, h: 0.18 });
  }
  const apothem = R_DECK * Math.cos(Math.PI / 8);
  p.push(0, 0, 0, Math.PI);
  stairs(p, 0, -apothem, terrainHeight(cx, cz + apothem + 0.8) - deck, 1.6);
  p.pop();

  // perimeter guard rail (open at the stair)
  if (detail) {
    const corners: [number, number][] = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI / 2 + Math.PI / 8 + (k * Math.PI) / 4;
      corners.push([Math.cos(a) * (R_DECK - 0.3), Math.sin(a) * (R_DECK - 0.3)]);
    }
    handrail(p, corners.slice(0, 8), 0.05, 1.05, 1.6);
  }

  const mesh = p.build(ctx.track, ctx.shadows, "nuclear-core");
  mesh.position.set(cx, deck, cz);
  ctx.group.add(mesh);

  ctx.ground.site(cx, cz, 0, 26, 26, 4404, (g) => {
    g.apron(0, 0, 21, 21, 10, 0.5);
    g.disc(0, 0, R_DECK - 0.2, 0.72, 0.8);
    g.tracks([
      [-12, 11],
      [-5, 9.4],
      [0, 8.3],
      [5, 9.4],
      [12, 11],
    ]);
    g.trench([
      [-7.2, 0.3],
      [-10, 0.8],
      [-13, 1],
    ]);
  });
}
