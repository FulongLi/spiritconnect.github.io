import { terrainHeight } from "../scene/terrain";
import { hazardStrip, louvre, radiatorPanel, serviceDoor, stairs } from "./components";
import type { InfraContext } from "./context";
import { siteLevel } from "./ground";
import { Parts } from "./parts";

/* ------------------------------------------------------------------ */
/* Lunar AI data centre: three pressurised compute modules held by     */
/* external graphite portal frames. Each module carries its own roof   */
/* cooling skid with vertical heat-rejection panels; power arrives at  */
/* a distribution cabinet on the east end, beside the crew airlock;    */
/* a covered cable / service corridor runs along the north wall.       */
/* Local frame: x along the hall, the camera sees the south (-z) face. */
/* ------------------------------------------------------------------ */

const W = 15;
const D = 9.6;
const MOD_X = [-3.6, 0, 3.6];
const MOD_W = 3.45;
const MOD_D = 6.2;
const IDS = ["DC-A", "DC-B", "DC-C"] as const;

export function buildDataCentre(ctx: InfraContext, cx: number, cz: number, rot: number) {
  const { kit, detail } = ctx;
  const lvl = siteLevel(cx, cz, W + 1, D + 1, rot);
  const deck = lvl.max + 0.5;
  const skirt = deck - (lvl.min - 0.35);
  const p = new Parts(kit, detail);

  /* ---- foundation ---- */
  p.slab("foundation", W, skirt, D, 0, -skirt, 0, { c: 0.1 });
  p.slab("graphite", W + 0.06, 0.2, D + 0.06, 0, -0.2, 0, { c: 0.03 });
  p.slab("graphite", W - 0.8, 0.05, D - 0.8, 0, 0, 0);
  const E = 0.05;
  const zs = -MOD_D / 2; // south wall

  /* ---- compute modules ---- */
  MOD_X.forEach((mx, i) => {
    p.slab("graphite", MOD_W + 0.05, 0.4, MOD_D + 0.05, mx, E, 0, { c: 0.04 });
    p.slab("alu", MOD_W, 3.4, MOD_D, mx, E + 0.4, 0, { c: 0.08 });
    p.slab("graphite", MOD_W + 0.1, 0.2, MOD_D + 0.1, mx, E + 3.8, 0, { c: 0.05 });
    // recessed information light under the eave (brightens with the AI loop)
    p.box("graphite", MOD_W - 0.3, 0.2, 0.06, mx, E + 3.6, zs - 0.03, { plain: true });
    p.box("lightInfo", MOD_W - 0.5, 0.05, 0.03, mx, E + 3.52, zs - 0.07);
    p.decal(IDS[i], 0.9, mx + 0.95, E + 3.05, zs - 0.012, { ry: Math.PI });
    // intake louvre column
    p.push(mx - 1.15, E, zs - 0.01, Math.PI);
    louvre(p, 0, 1.75, 0, 0.62, 2.1);
    p.pop();
    if (i === 1) {
      // equipment bay: roll-up door with bumper posts and a painted apron
      p.box("graphite", 2.3, 2.95, 0.1, mx + 0.35, E + 1.47, zs - 0.05, { plain: true });
      p.box("ribbed", 2.0, 2.7, 0.05, mx + 0.35, E + 1.37, zs - 0.12, { uvTurn: true });
      p.box("lightCool", 1.2, 0.04, 0.03, mx + 0.35, E + 2.84, zs - 0.12);
      for (const bx of [-0.95, 1.65]) {
        p.cyl("frame", 0.09, 0.09, 0.95, mx + bx, E + 0.47, zs - 0.45, { seg: 10 });
        p.cyl("lightAmber", 0.095, 0.095, 0.06, mx + bx, E + 0.85, zs - 0.45, { seg: 10 });
      }
      hazardStrip(p, mx - 0.8, mx + 1.5, 0.056, zs - 0.95, "x", 0.18);
    } else {
      p.push(mx + 0.45, E, zs, Math.PI);
      serviceDoor(p, 0, 0, 0, 0.95, 2.15, { lamp: "lightCool" });
      p.pop();
    }
    // north wall: small vents per module
    p.push(mx, E, -zs, 0);
    louvre(p, -0.9, 2.6, 0, 0.9, 0.5);
    louvre(p, 0.9, 2.6, 0, 0.9, 0.5);
    p.pop();

    /* roof cooling skid + heat-rejection panels */
    const roof = E + 4.0;
    p.slab("graphite", MOD_W - 0.6, 0.45, MOD_D - 0.9, mx, roof, 0, { c: 0.05 });
    p.slab("vent", MOD_W - 1.0, 0.02, MOD_D - 1.4, mx, roof + 0.45, 0, { uvTurn: true });
    for (const off of [-0.72, 0.72]) {
      p.push(mx + off, roof + 0.62, 0, Math.PI / 2);
      radiatorPanel(p, 0, 0, 0, MOD_D - 1.3, 1.45);
      p.pop();
      p.box("frame", 0.1, 0.2, MOD_D - 1.1, mx + off, roof + 0.52, 0);
    }
    if (detail) {
      p.pipe("alu", 0.05, [
        [mx - 0.72, roof + 2.1, MOD_D / 2 - 0.55],
        [mx - 0.72, roof + 2.1, MOD_D / 2 - 0.3],
        [mx + 0.72, roof + 2.1, MOD_D / 2 - 0.3],
        [mx + 0.72, roof + 2.1, MOD_D / 2 - 0.55],
      ]);
    }
  });

  /* ---- external portal frames (the structural rhythm) ---- */
  const frames = [-5.4, -1.8, 1.8, 5.4];
  for (const fx of frames) {
    for (const s of [-1, 1]) p.slab("graphite", 0.3, 4.3, 0.34, fx, E, s * (MOD_D / 2 + 0.17), { c: 0.04 });
    p.slab("graphite", 0.3, 0.32, MOD_D + 0.68, fx, E + 4.0, 0, { c: 0.04 });
    // anchor plates
    for (const s of [-1, 1]) p.slab("frame", 0.5, 0.06, 0.55, fx, E, s * (MOD_D / 2 + 0.17));
  }

  /* ---- east end: crew airlock + power distribution ---- */
  const ex = MOD_X[2] + MOD_W / 2; // east wall
  p.slab("graphite", 1.6, 2.9, 2.8, ex + 0.8, E, -1.0, { c: 0.06 });
  p.slab("alu", 1.75, 0.12, 3.0, ex + 0.85, E + 2.9, -1.0, { c: 0.03 });
  p.box("glass", 0.03, 0.42, 2.2, ex + 1.615, E + 2.4, -1.0);
  p.push(ex + 1.6, E, -1.25, Math.PI / 2);
  serviceDoor(p, 0, 0, 0, 1.0, 2.05, { lamp: "lightCool", window: true });
  p.pop();
  // canopy over the airlock door
  p.slab("alu", 1.0, 0.08, 1.7, ex + 2.1, E + 2.55, -1.25, { c: 0.02 });

  // power distribution cabinet (fed from the SST), cable tray into the hall
  p.slab("graphite", 1.3, 2.3, 2.0, ex + 0.75, E, 2.1, { c: 0.05 });
  p.slab("graphite", 1.4, 0.1, 2.1, ex + 0.75, E + 2.3, 2.1, { c: 0.03 });
  p.push(ex + 1.4, E, 2.1, Math.PI / 2);
  louvre(p, -0.45, 1.0, 0, 0.7, 1.1);
  louvre(p, 0.45, 1.0, 0, 0.7, 1.1);
  p.pop();
  p.decal("DC-PDU", 0.85, ex + 1.412, E + 2.0, 2.1, { ry: Math.PI / 2 });
  p.decal("hv", 0.3, ex + 1.412, E + 1.72, 2.72, { ry: Math.PI / 2 });
  p.slab("frame", 0.6, 0.03, 0.4, ex + 0.1, E + 2.7, 2.1);
  for (const s of [-1, 1]) p.slab("frame", 0.6, 0.1, 0.02, ex + 0.1, E + 2.7, 2.1 + s * 0.19);
  if (detail) p.rod("cable", 0.05, [ex + 0.4, E + 2.78, 2.1], [ex - 0.02, E + 2.78, 2.1], 6);

  /* ---- north service / cable corridor ---- */
  const cz0 = MOD_D / 2 + 0.34 + 0.45;
  p.slab("graphite", 11.4, 0.8, 0.85, 0, E, cz0, { c: 0.05 });
  for (let hx = -4.5; hx <= 4.6; hx += 1.8) {
    p.box("alu", 0.7, 0.03, 0.6, hx, E + 0.81, cz0, { plain: true, c: 0.01 });
  }

  /* ---- west end: comms (dish + whip) ---- */
  const roofTop = E + 4.32;
  const wx = MOD_X[0] - 1.1;
  p.cyl("frame", 0.06, 0.08, 1.6, wx, roofTop + 0.8, -2.35, { seg: 8 });
  // shallow dish tilted up toward the south sky
  p.cyl("alu", 0.58, 0.12, 0.22, wx, roofTop + 1.72, -2.4, { rx: -0.75, seg: 20 });
  if (detail) {
    p.rod("frame", 0.015, [wx, roofTop + 1.8, -2.5], [wx, roofTop + 2.15, -2.95], 4);
    p.cyl("frame", 0.015, 0.03, 2.6, wx, roofTop + 1.3, 2.4, { seg: 6 });
    p.sphere("lightCool", 0.05, wx, roofTop + 2.62, 2.4);
  }

  // stair up to the equipment bay apron
  const sx = MOD_X[1] + 0.35;
  const sz = -D / 2;
  const wxs = cx + sx * Math.cos(rot) + (sz - 0.8) * Math.sin(rot);
  const wzs = cz - sx * Math.sin(rot) + (sz - 0.8) * Math.cos(rot);
  stairs(p, sx, sz, terrainHeight(wxs, wzs) - deck, 2.4);

  const mesh = p.build(ctx.track, ctx.shadows, "data-centre");
  mesh.position.set(cx, deck, cz);
  mesh.rotation.y = rot;
  ctx.group.add(mesh);

  ctx.ground.site(cx, cz, rot, W + 13, D + 13, 4402, (g) => {
    g.apron(0, 0, W + 6, D + 6, 2.5, 0.5);
    g.contact(0, 0, W, D, 0, 0.72, 0.8);
    g.dust(0, 0, W, D);
    g.tracks([
      [0.35, -6],
      [0.8, -8.2],
      [3.5, -10],
      [9, -10.8],
      [14, -10.5],
    ]);
    g.tracks([
      [0.35, -6],
      [-0.4, -8.4],
      [-4, -10.2],
      [-10, -10.8],
      [-14, -10.4],
    ], 1.9, 0.26);
    g.trench([
      [7.2, 2.1],
      [9.5, 3.5],
      [12, 6.5],
    ]);
  });
}
