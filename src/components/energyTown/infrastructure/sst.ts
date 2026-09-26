import { terrainHeight } from "../scene/terrain";
import { hazardStrip, insulator, louvre, radiatorPanel, serviceDoor, stairs } from "./components";
import type { InfraContext } from "./context";
import { siteLevel } from "./ground";
import { Parts } from "./parts";

/* ------------------------------------------------------------------ */
/* Solid-state transformer: a power-electronics conversion station.    */
/*                                                                     */
/* Power arrives from the east (PV, reactor, storage), passes an HV    */
/* termination cabinet and ceramic-insulated busbars into the medium-  */
/* frequency converter hall, whose converter cells sit in a row of     */
/* cabinets along the south aisle. Heat leaves through a radiator bank */
/* on the north side; conditioned power exits west via an enclosed bus */
/* duct toward the data centre and the habitat.                        */
/* Local frame: x east, z south-north (camera sees the east + south    */
/* faces), y = 0 at the deck surface.                                  */
/* ------------------------------------------------------------------ */

const W = 15;
const D = 11;

export function buildSST(ctx: InfraContext, cx: number, cz: number) {
  const { kit, detail } = ctx;
  const lvl = siteLevel(cx, cz, W + 1, D + 1);
  const deck = lvl.max + 0.55;
  const skirt = deck - (lvl.min - 0.35);
  const p = new Parts(kit, detail);

  /* ---- foundation: sintered plinth, steel edge, deck plate ---- */
  p.slab("foundation", W, skirt, D, 0, -skirt, 0, { c: 0.1 });
  p.slab("graphite", W + 0.06, 0.2, D + 0.06, 0, -0.2, 0, { c: 0.03 });
  p.slab("graphite", W - 0.9, 0.05, D - 0.9, 0, 0, 0);
  const E = 0.05; // equipment base

  // cable entry hoods where the energy conduits reach the plinth
  for (const [hx, hz, ry] of [
    [W / 2 + 0.2, 1, 0],
    [W / 2 + 0.2, 4.6, 0],
    [5, -D / 2 - 0.2, Math.PI / 2],
    [-4, -D / 2 - 0.2, Math.PI / 2],
    [-W / 2 - 0.2, 2, 0],
  ] as const) {
    p.box("graphite", 0.45, 0.5, 1.1, hx, -0.3, hz, { ry, c: 0.05 });
  }

  /* ---- converter hall (medium-frequency transformer core) ---- */
  const hx = -1.5;
  const hw = 5.2;
  const hd = 4.2;
  p.slab("graphite", hw + 0.1, 0.5, hd + 0.1, hx, E, 0, { c: 0.05 });
  p.slab("alu", hw, 3.7, hd, hx, E + 0.5, 0, { c: 0.1 });
  p.slab("graphite", hw + 0.3, 0.3, hd + 0.3, hx, E + 4.2, 0, { c: 0.08 });
  const roof = E + 4.5;

  // converter-cell bays on the long faces: pilasters, access panels,
  // a status slit and a louvre per cell
  for (const side of [-1, 1]) {
    const fz = side * (hd / 2);
    for (const px of [-1.3, 0, 1.3]) {
      p.box("graphite", 0.14, 3.7, 0.08, hx + px, E + 0.5 + 1.85, fz + side * 0.04);
    }
    for (const bx of [-1.95, -0.65, 0.65, 1.95]) {
      const x = hx + bx;
      p.box("alu", 1.0, 2.6, 0.04, x, E + 1.95, fz + side * 0.02, { c: 0.01, plain: true });
      p.box("lightPulse", 0.56, 0.05, 0.02, x, E + 3.08, fz + side * 0.05);
      if (side < 0 || detail) {
        p.push(x, E + 1.0, fz + side * 0.04, side < 0 ? Math.PI : 0);
        louvre(p, 0, 0, 0, 0.72, 0.36);
        p.pop();
      }
      if (detail) p.box("frame", 0.04, 0.3, 0.05, x + 0.36, E + 2.0, fz + side * 0.06);
    }
  }

  // east wall: main service door, ID plate, HV warning, wall bushings
  p.push(hx + hw / 2, E, -1.3, Math.PI / 2);
  serviceDoor(p, 0, 0, 0, 1.1, 2.2, { lamp: "lightAmber", window: true });
  p.pop();
  p.decal("SST-01", 1.1, hx + hw / 2 + 0.012, E + 2.55, 1.15, { ry: Math.PI / 2 });
  p.decal("hv", 0.42, hx + hw / 2 + 0.012, E + 1.55, -0.38, { ry: Math.PI / 2 });
  hazardStrip(p, -1.95, -0.65, 0.056, hx + hw / 2 + 0.55, "z", 0.2);
  const busY = E + 3.3;
  const phases = [-0.9, 0, 0.9];
  for (const z of phases) {
    p.box("graphite", 0.1, 0.46, 0.46, hx + hw / 2 + 0.05, busY, z, { c: 0.03 });
    insulator(p, [hx + hw / 2 + 0.1, busY, z], 0.75, 0.13, "x");
  }

  /* ---- HV input: termination cabinet, post insulators, busbars ---- */
  const sgx = 5.9;
  p.slab("graphite", 1.3, 2.2, 3.2, sgx, E, 0, { c: 0.06 });
  p.slab("graphite", 1.4, 0.1, 3.3, sgx, E + 2.2, 0, { c: 0.03 });
  for (const z of [-0.72, 0.72]) {
    p.box("alu", 0.04, 1.8, 1.3, sgx + 0.66, E + 1.05, z, { c: 0.01, plain: true });
    if (detail) p.box("frame", 0.05, 0.36, 0.04, sgx + 0.7, E + 1.1, z + (z < 0 ? 0.52 : -0.52));
  }
  p.decal("HV-IN", 0.9, sgx + 0.692, E + 2.03, -0.72, { ry: Math.PI / 2 });
  p.decal("hv", 0.36, sgx + 0.692, E + 1.35, 0.72, { ry: Math.PI / 2 });
  // grated cable trench from the plinth edge into the cabinet
  p.slab("vent", W / 2 - 0.45 - (sgx + 0.65), 0.03, 2.6, (sgx + 0.65 + W / 2 - 0.45) / 2, E, 0, { uvTurn: true });
  for (const z of phases) insulator(p, [sgx, E + 2.3, z], 0.95, 0.12, "y");

  // busbar support: steel portal with station-post insulators
  const px = 3.7;
  for (const z of [-1.35, 1.35]) p.box("frame", 0.18, 2.3, 0.18, px, E + 1.15, z);
  p.box("frame", 0.22, 0.22, 3.0, px, E + 2.2, 0);
  if (detail) {
    p.rod("frame", 0.05, [px, E + 0.1, -1.35], [px, E + 1.9, -0.2]);
    p.rod("frame", 0.05, [px, E + 0.1, 1.35], [px, E + 1.9, 0.2]);
  }
  for (const z of phases) {
    insulator(p, [px, E + 2.31, z], 0.82, 0.11, "y");
    p.box("copper", 0.16, 0.16, 0.16, px, busY - 0.08, z);
    p.rod("alu", 0.055, [hx + hw / 2 + 0.85, busY, z], [sgx, busY, z]);
    p.box("copper", 0.14, 0.14, 0.2, hx + hw / 2 + 0.9, busY, z);
    p.box("copper", 0.2, 0.14, 0.14, sgx, busY - 0.02, z);
  }

  /* ---- converter cell cabinets along the south aisle ---- */
  const rowZ = -3.75;
  const n = 7;
  const pitch = 1.12;
  const x0 = -5.1;
  const rowEnd = x0 + (n - 1) * pitch + 0.55;
  p.slab("frame", n * pitch + 0.1, 0.12, 1.0, x0 + ((n - 1) * pitch) / 2, E, rowZ);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * pitch;
    p.slab("graphite", 1.1, 2.3, 1.0, x, E + 0.12, rowZ, { c: 0.03 });
    const fz = rowZ - 0.5;
    p.box("alu", 0.96, 1.96, 0.03, x, E + 1.22, fz - 0.015, { c: 0.008, plain: true });
    p.box("lightCool", 0.03, 0.42, 0.02, x + 0.41, E + 1.62, fz - 0.04);
    p.box("lightPulse", 0.46, 0.05, 0.02, x - 0.12, E + 2.0, fz - 0.04);
    p.push(x - 0.06, E + 0.6, fz - 0.03, Math.PI);
    louvre(p, 0, 0, 0, 0.68, 0.34);
    p.pop();
    if (detail) p.box("frame", 0.03, 0.28, 0.04, x + 0.28, E + 1.3, fz - 0.05);
  }
  p.decal("PEC-A", 0.8, rowEnd + 0.012, E + 2.05, rowZ, { ry: Math.PI / 2 });
  // cable tray over the row, with cross trays into the hall
  const trayY = E + 2.62;
  const trayLen = n * pitch;
  const trayX = x0 + ((n - 1) * pitch) / 2;
  p.slab("frame", trayLen, 0.03, 0.44, trayX, trayY, rowZ + 0.15);
  for (const s of [-1, 1]) p.slab("frame", trayLen, 0.12, 0.025, trayX, trayY, rowZ + 0.15 + s * 0.21);
  for (const tx of [-3.4, -0.6]) {
    p.slab("frame", 0.44, 0.03, 1.3, tx, trayY, -2.75);
    for (const s of [-1, 1]) p.slab("frame", 0.025, 0.12, 1.3, tx + s * 0.21, trayY, -2.75);
  }
  if (detail) {
    for (const cz of [-0.1, 0, 0.1]) {
      p.rod("cable", 0.04, [x0 - 0.5, trayY + 0.07, rowZ + 0.15 + cz], [rowEnd, trayY + 0.07, rowZ + 0.15 + cz], 6);
    }
    for (const x of [x0 - 0.3, x0 + 2.5, x0 + 5.3]) p.box("frame", 0.05, 0.28, 0.05, x, E + 2.48, rowZ + 0.15);
  }
  // painted maintenance zone in front of the cabinets
  hazardStrip(p, x0 - 0.55, rowEnd, 0.056, rowZ - 1.2, "x", 0.16);

  /* ---- heat rejection: radiator bank on the north side ---- */
  const radZ = 4.3;
  const radX = [-5.4, -3.4, -1.4, 0.6];
  p.slab("frame", 8.3, 0.35, 0.9, -2.4, E, radZ);
  for (const x of radX) radiatorPanel(p, x, E + 0.5, radZ, 1.84, 5.0);
  if (detail) {
    for (const x of [-6.4, -2.4, 1.6]) p.rod("frame", 0.05, [x, E + 4.5, radZ + 0.06], [x, E + 0.35, radZ + 0.75]);
  }
  // coolant loop: pump skid on the roof → top header, bottom header → riser
  p.slab("graphite", 1.8, 0.75, 1.3, hx - 0.4, roof, 1.1, { c: 0.05 });
  p.push(hx - 0.4, roof + 0.38, 1.1 - 0.66, Math.PI);
  louvre(p, 0, 0, 0, 1.3, 0.42);
  p.pop();
  p.pipe("alu", 0.08, [
    [hx - 0.9, roof + 0.55, 1.75],
    [hx - 0.9, roof + 0.55, 3.4],
    [hx - 0.9, E + 5.52, radZ - 0.05],
  ]);
  p.pipe("alu", 0.08, [
    [hx + 0.2, E + 0.45, radZ - 0.05],
    [hx + 0.2, E + 0.45, 2.75],
    [hx + 0.2, roof + 0.55, 2.75],
    [hx + 0.2, roof + 0.55, 1.75],
  ]);
  if (detail) {
    for (const [fx, fy, fz] of [
      [hx - 0.9, roof + 0.55, 2.4],
      [hx + 0.2, E + 2.4, 2.75],
    ] as const) {
      p.cyl("frame", 0.13, 0.13, 0.06, fx, fy, fz, fy > roof ? { rx: Math.PI / 2 } : {});
    }
    // roof guard rail (maintenance access)
    const rx0 = hx - hw / 2 + 0.1;
    const rx1 = hx + hw / 2 - 0.1;
    const rz = hd / 2 + 0.05;
    for (const [ax, az, bx, bz] of [
      [rx0, -rz, rx1, -rz],
      [rx1, -rz, rx1, rz],
    ] as const) {
      const len = Math.hypot(bx - ax, bz - az);
      const k = Math.round(len / 1.3);
      for (let i = 0; i <= k; i++) {
        const t = i / k;
        p.rod("frame", 0.025, [ax + (bx - ax) * t, roof, az + (bz - az) * t], [ax + (bx - ax) * t, roof + 0.9, az + (bz - az) * t], 6);
      }
      p.rod("alu", 0.025, [ax, roof + 0.9, az], [bx, roof + 0.9, bz], 6);
    }
  }

  /* ---- MV output: enclosed bus duct to the output cabinet ---- */
  p.slab("graphite", 2.2, 0.5, 0.5, hx - hw / 2 - 1.1, E + 3.0, 0.8, { c: 0.04 });
  p.slab("graphite", 0.5, 1.3, 0.5, -6.3, E + 2.2, 0.8, { c: 0.04 });
  p.slab("graphite", 1.2, 2.2, 2.4, -6.3, E, 0.8, { c: 0.06 });
  p.slab("graphite", 1.3, 0.1, 2.5, -6.3, E + 2.2, 0.8, { c: 0.03 });
  p.push(-6.3, E, 0.8 - 1.2, Math.PI);
  louvre(p, 0, 1.6, 0, 0.8, 0.4);
  p.pop();
  p.decal("MV-OUT", 0.8, -6.3, E + 1.05, 0.8 - 1.212, { ry: Math.PI });

  /* ---- lightning / aviation mast ---- */
  p.slab("foundation", 0.7, 0.3, 0.7, 6.8, E, 4.7, { c: 0.04 });
  p.cyl("frame", 0.06, 0.14, 8, 6.8, E + 4.3, 4.7, { seg: 8 });
  p.cyl("frame", 0.02, 0.03, 1.2, 6.8, E + 8.9, 4.7, { seg: 6 });
  p.sphere("lightAmber", 0.1, 6.8, E + 8.35, 4.7);

  /* ---- access stair at the south-east corner ---- */
  const sx = 1.5;
  const groundAtStair = terrainHeight(cx + sx, cz - D / 2 - 0.8) - deck;
  stairs(p, sx, -D / 2, groundAtStair, 1.4);

  const mesh = p.build(ctx.track, ctx.shadows, "sst");
  mesh.position.set(cx, deck, cz);
  ctx.group.add(mesh);

  /* ---- ground: graded apron, contact shadow, service track ---- */
  ctx.ground.site(cx, cz, 0, W + 13, D + 13, 4401, (g) => {
    g.apron(0, 0, W + 6, D + 6, 2.5, 0.5);
    g.contact(0, 0, W, D, 0, 0.72, 0.8);
    g.dust(0, 0, W, D);
    g.tracks([
      [14, -12],
      [9.5, -9.2],
      [6.4, -7.6],
      [2.5, -7.4],
      [-3, -7.9],
      [-9, -9.6],
      [-14, -11.5],
    ]);
  });
}
