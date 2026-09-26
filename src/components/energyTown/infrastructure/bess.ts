import { DECAL_LABELS, type DecalName } from "../scene/surfaceTextures";
import { terrainHeight } from "../scene/terrain";
import { louvre, radiatorPanel } from "./components";
import type { InfraContext } from "./context";
import { siteLevel } from "./ground";
import { Parts } from "./parts";

/* ------------------------------------------------------------------ */
/* Battery energy storage: six containerised battery modules on        */
/* sintered piers, each with service doors, a thermal-management unit, */
/* a sky-facing radiator on the roof and a cable junction box feeding  */
/* the covered trench between the rows. A power conversion skid at the */
/* west end ties the bank into the SST line.                           */
/* ------------------------------------------------------------------ */

const LEN = 4.4;
const WID = 2.7;
const ROT = 0.18;
const BOX_IDS = DECAL_LABELS.filter((l) => l.startsWith("B-"));

export function buildBESS(ctx: InfraContext, cx: number, cz: number) {
  const { kit, detail } = ctx;
  const base = terrainHeight(cx, cz);
  const p = new Parts(kit, detail);
  const units: { x: number; z: number }[] = [];

  let id = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      // identical placement to the original bank
      const bx = cx - 6 + col * 6 + (row % 2) * 1.2;
      const bz = cz - 3.5 + row * 7;
      units.push({ x: bx, z: bz });
      const lvl = siteLevel(bx, bz, LEN + 0.6, WID, ROT);
      const floor = lvl.max + 0.38;
      p.push(bx - cx, floor - base, bz - cz, ROT);
      container(p, floor - (lvl.min - 0.3), row === 0 ? 1 : -1, BOX_IDS[id++]);
      p.pop();
    }
  }

  /* ---- power conversion skid (inverter + step-up transformer) ---- */
  {
    const sx = cx - 10.2;
    const sz = cz;
    const lvl = siteLevel(sx, sz, 4, 3.2, ROT);
    const top = lvl.max + 0.3;
    p.push(sx - cx, top - base, sz - cz, ROT);
    const skirt = top - (lvl.min - 0.3);
    p.slab("foundation", 4.0, skirt, 3.2, 0, -skirt, 0, { c: 0.08 });
    p.slab("graphite", 1.7, 2.3, 2.6, -0.9, 0, 0, { c: 0.05 });
    p.slab("graphite", 1.8, 0.1, 2.7, -0.9, 2.3, 0, { c: 0.03 });
    p.push(-0.05, 0, 0, Math.PI / 2);
    louvre(p, -0.6, 1.2, 0, 0.8, 1.4);
    louvre(p, 0.6, 1.2, 0, 0.8, 1.4);
    p.pop();
    p.decal("PCS-01", 0.8, -0.9, 2.02, -1.312, { ry: Math.PI });
    p.decal("hv", 0.32, -0.3, 1.5, -1.312, { ry: Math.PI });
    // transformer tank with fin radiators
    p.slab("alu", 1.1, 1.4, 1.3, 1.0, 0, 0, { c: 0.05 });
    for (const s of [-1, 1]) {
      p.push(1.0, 0.15, s * 0.72, 0);
      radiatorPanel(p, 0, 0, 0, 0.9, 1.0);
      p.pop();
    }
    for (const z of [-0.35, 0, 0.35]) {
      p.cyl("ceramic", 0.06, 0.08, 0.45, 1.0, 1.62, z, { seg: 10 });
      p.cyl("frame", 0.05, 0.05, 0.06, 1.0, 1.88, z, { seg: 8 });
    }
    p.pop();
  }

  const mesh = p.build(ctx.track, ctx.shadows, "bess");
  mesh.position.set(cx, base, cz);
  ctx.group.add(mesh);

  ctx.ground.site(cx, cz, 0, 34, 26, 4403, (g) => {
    g.apron(-1.5, 0, 28, 19, 2.5, 0.5);
    for (const u of units) {
      g.contact(u.x - cx, u.z - cz, LEN + 0.7, WID + 0.2, ROT, 0.62, 0.55);
      g.dust(u.x - cx, u.z - cz, LEN + 0.7, WID + 0.2, ROT, 0.14);
    }
    g.contact(-10.2, 0, 4.0, 3.2, ROT, 0.65, 0.6);
    // covered cable trench between the rows, with a stub from every junction box
    g.trench([
      [-10.2, 0],
      [-4, 0.2],
      [4, 0.5],
      [9.5, 0.7],
    ]);
    for (const u of units) {
      const lx = u.x - cx - 1.3;
      const lz = u.z - cz;
      g.trench(
        [
          [lx, lz + (lz < 0 ? 1.5 : -1.5)],
          [lx, lz < 0 ? -0.05 : 0.05],
        ],
        0.4,
      );
    }
    // service loop around the east end of the bank
    g.tracks([
      [-16, -7.4],
      [-6, -6.6],
      [5, -6.8],
      [11.5, -5.2],
      [13.2, 0],
      [11.5, 5.4],
      [5, 7],
      [-6, 6.8],
      [-16, 7.4],
    ]);
  });
}

/**
 * One battery container in its own frame: x along the length, doors on
 * +x, thermal unit on -x, junction box on the `conn` side (±z).
 * y = 0 at the skid; `pier` is how far the piers reach below it.
 */
function container(p: Parts, pier: number, conn: 1 | -1, label: DecalName) {
  const L = LEN;
  const H = 2.36;
  const hw = WID / 2;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) p.slab("foundation", 0.5, pier, 0.5, sx * (L / 2 - 0.35), -pier, sz * (hw - 0.3), { c: 0.04 });
  p.slab("frame", L, 0.18, WID - 0.1, 0, 0, 0);
  p.slab("ribbed", L - 0.14, H, WID - 0.18, 0, 0.18, 0, { c: 0.02 });
  const top = 0.18 + H;
  // ISO-style corner posts and rails
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) p.box("graphite", 0.14, H + 0.12, 0.14, sx * (L / 2 - 0.07), 0.18 + (H + 0.12) / 2, sz * (hw - 0.09), { plain: true });
  for (const sz of [-1, 1]) p.box("graphite", L, 0.12, 0.14, 0, top, sz * (hw - 0.09), { plain: true });
  for (const sx of [-1, 1]) p.box("graphite", 0.14, 0.12, WID - 0.18, sx * (L / 2 - 0.07), top, 0, { plain: true });

  /* +x end: double service doors with locking bars, status strip, ID */
  const ex = L / 2 - 0.05;
  for (const z of [-0.58, 0.58]) {
    p.box("alu", 0.04, 2.0, 1.12, ex, 0.3 + 1.0, z, { c: 0.008, plain: true });
    if (p.detail) {
      for (const bz of [-0.3, 0.3]) p.rod("frame", 0.018, [ex + 0.04, 0.38, z + bz], [ex + 0.04, 2.24, z + bz], 5);
      p.box("frame", 0.04, 0.2, 0.05, ex + 0.05, 1.2, z + (z < 0 ? 0.42 : -0.42));
    }
  }
  p.box("lightInfo", 0.02, 0.05, 1.7, ex + 0.03, 2.43, 0);
  p.decal(label, 0.6, ex + 0.03, 1.85, -0.58, { ry: Math.PI / 2 });

  /* -x end: thermal management unit */
  p.slab("graphite", 0.55, 2.0, 2.2, -L / 2 - 0.2, 0.18, 0, { c: 0.04 });
  p.push(-L / 2 - 0.475, 0.18, 0, -Math.PI / 2);
  louvre(p, 0, 1.0, 0, 1.7, 1.3);
  p.pop();

  /* roof: sky-facing radiator on short legs, fed from the thermal unit */
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) p.box("frame", 0.06, 0.34, 0.06, sx * 1.6, top + 0.23, sz * 0.9);
  p.box("radiator", 3.5, 0.05, 2.0, 0, top + 0.42, 0);
  p.rod("alu", 0.05, [-1.78, top + 0.42, -1.0], [-1.78, top + 0.42, 1.0], 8);
  if (p.detail) p.pipe("alu", 0.04, [[-1.78, top + 0.42, 0.6], [-2.3, top + 0.42, 0.6], [-2.3, 2.0, 0.6]]);

  /* junction box + cable drops on the trench side */
  const jz = conn * (hw - 0.02);
  p.box("graphite", 0.9, 0.85, 0.26, -1.3, 1.05, jz + conn * 0.13, { c: 0.03 });
  p.decal("hv", 0.26, -1.3, 1.2, jz + conn * 0.262, { ry: conn > 0 ? 0 : Math.PI });
  for (const dz of [-0.2, 0.2]) {
    p.rod("cable", 0.045, [-1.3 + dz, 0.62, jz + conn * 0.2], [-1.3 + dz, -0.2, jz + conn * 0.45], 6);
  }
  // side vent for the battery-room pressure relief
  p.push(1.2, 0, conn * hw, conn > 0 ? 0 : Math.PI);
  louvre(p, 0, 1.9, 0, 0.7, 0.4);
  p.pop();
}
