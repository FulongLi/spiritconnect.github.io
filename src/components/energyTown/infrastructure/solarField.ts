import * as THREE from "three";
import { mulberry32, R } from "../scene/random";
import { terrainHeight } from "../scene/terrain";
import { louvre, radiatorPanel } from "./components";
import type { InfraContext } from "./context";
import { siteLevel } from "./ground";
import { Parts, placement } from "./parts";

/* ------------------------------------------------------------------ */
/* Solar field: 30 fixed-tilt tables, instanced. Each table is an      */
/* aluminium-framed glass laminate on purlins (tilted template) over a */
/* torque tube, two driven posts, bearings and sintered footings       */
/* (upright template). Row combiner boxes and a collection skid tie    */
/* the field into the conduit toward the SST.                          */
/* ------------------------------------------------------------------ */

const PANEL_W = 6.6;
const PANEL_D = 5.0;
const PIVOT = 1.5;

export function buildSolarField(ctx: InfraContext, cx: number, cz: number) {
  const { kit, detail, track, shadows, group } = ctx;
  const yaw = Math.atan2(150 - cx, 90 - cz);
  const tilt = 0.55;
  const tilted: THREE.Matrix4[] = [];
  const upright: THREE.Matrix4[] = [];
  const tints: THREE.Color[] = [];
  const jitter = mulberry32(5150);
  const rowEnds: { x: number; z: number }[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      // same shared-stream calls as the original layout, in the same order
      const px = cx - 19 + col * 7.6 + R(-0.2, 0.2);
      const pz = cz - 14 + row * 7.0 + R(-0.2, 0.2);
      const gy = terrainHeight(px, pz);
      tilted.push(placement(px, gy + PIVOT, pz, yaw, tilt + (jitter() - 0.5) * 0.012));
      upright.push(placement(px, gy, pz, yaw));
      const k = 0.94 + jitter() * 0.1;
      tints.push(new THREE.Color(k, k, k * (0.98 + jitter() * 0.04)));
      if (col === 0) rowEnds.push({ x: px, z: pz });
    }
  }

  /* tilted template: laminate, backsheet, frame, purlins */
  const t = new Parts(kit, detail);
  const glass = new THREE.PlaneGeometry(PANEL_W - 0.1, PANEL_D - 0.1);
  glass.rotateX(-Math.PI / 2);
  t.addGeometry("solar", glass, new THREE.Matrix4().makeTranslation(0, 0.012, 0));
  glass.dispose();
  t.box("graphite", PANEL_W - 0.1, 0.03, PANEL_D - 0.1, 0, -0.01, 0, { plain: true });
  for (const s of [-1, 1]) {
    t.box("alu", PANEL_W, 0.07, 0.06, 0, 0, s * (PANEL_D / 2 - 0.03), { plain: true });
    t.box("alu", 0.06, 0.07, PANEL_D - 0.12, s * (PANEL_W / 2 - 0.03), 0, 0, { plain: true });
    t.box("frame", PANEL_W - 0.4, 0.1, 0.08, 0, -0.1, s * 1.3);
  }
  t.box("alu", 0.05, 0.06, PANEL_D - 0.2, 0, -0.005, 0, { plain: true }); // module split
  group.add(t.instanced(track, shadows, tilted, { solar: tints }));

  /* upright template: torque tube, posts, bearings, footings */
  const u = new Parts(kit, detail);
  u.rod("frame", 0.08, [-PANEL_W / 2 + 0.3, PIVOT - 0.16, 0], [PANEL_W / 2 - 0.3, PIVOT - 0.16, 0], 10);
  for (const s of [-1, 1]) {
    const x = s * 2.3;
    u.box("frame", 0.14, PIVOT + 0.1, 0.14, x, (PIVOT - 0.4) / 2, 0);
    u.box("graphite", 0.26, 0.24, 0.26, x, PIVOT - 0.16, 0, { plain: true, c: 0.03 });
    u.box("foundation", 0.55, 0.4, 0.55, x, 0.02, 0, { c: 0.05 });
    if (detail) u.rod("frame", 0.035, [x, 0.25, 0], [x - s * 0.9, PIVOT - 0.22, 0], 6);
  }
  group.add(u.instanced(track, shadows, upright));

  /* combiner boxes at the west end of every row + the collection skid */
  const s = new Parts(kit, detail);
  for (const e of rowEnds) {
    const bx = e.x - 4.2;
    const bz = e.z + 0.8;
    const gy = terrainHeight(bx, bz);
    s.slab("frame", 0.1, 1.1, 0.1, bx - cx, gy, bz - cz);
    s.slab("graphite", 0.55, 0.7, 0.3, bx - cx, gy + 0.55, bz - cz + 0.2, { c: 0.03 });
    s.box("lightCool", 0.2, 0.03, 0.02, bx - cx, gy + 1.15, bz - cz + 0.36);
  }
  {
    const kx = 63.5;
    const kz = 21.5;
    const lvl = siteLevel(kx, kz, 4.6, 3, 0);
    const top = lvl.max + 0.25;
    const sk = top - (lvl.min - 0.3);
    s.push(kx - cx, top, kz - cz, 0);
    s.slab("foundation", 4.6, sk, 3.0, 0, -sk, 0, { c: 0.06 });
    s.slab("graphite", 2.2, 2.0, 1.4, -0.9, 0, 0, { c: 0.05 });
    s.slab("graphite", 2.3, 0.1, 1.5, -0.9, 2.0, 0, { c: 0.03 });
    s.push(-0.9, 0, 0.7, 0);
    louvre(s, -0.5, 1.1, 0, 0.8, 1.2);
    s.pop();
    s.decal("PV-01", 0.85, -0.9 + 0.55, 1.35, 0.712);
    s.slab("alu", 1.0, 1.3, 1.1, 1.2, 0, 0, { c: 0.05 });
    for (const zz of [-1, 1]) {
      s.push(1.2, 0.15, zz * 0.6, 0);
      radiatorPanel(s, 0, 0, 0, 0.8, 0.9);
      s.pop();
    }
    for (const x of [0.95, 1.2, 1.45]) s.cyl("ceramic", 0.05, 0.07, 0.4, x, 1.5, 0, { seg: 10 });
    s.pop();
  }
  const skid = s.build(track, shadows, "solar-collection");
  skid.position.set(cx, 0, cz);
  group.add(skid);

  ctx.ground.site(cx, cz, 0, 52, 44, 4405, (g) => {
    g.apron(0, 0, 46, 38, 4, 0.32);
    for (let i = 0; i < upright.length; i++) {
      const pos = new THREE.Vector3().setFromMatrixPosition(upright[i]);
      for (const sgn of [-1, 1]) {
        const lx = pos.x - cx + Math.cos(yaw) * 2.3 * sgn;
        const lz = pos.z - cz - Math.sin(yaw) * 2.3 * sgn;
        g.disc(lx, lz, 0.4, 0.5, 0.35);
      }
      // the table's shade band is left to the real shadow map; add only a
      // faint drip line of disturbed regolith under the low edge
      g.contact(pos.x - cx + Math.sin(yaw) * 2.0, pos.z - cz + Math.cos(yaw) * 2.0, PANEL_W, 0.5, yaw, 0.18, 0.4);
    }
    g.contact(63.5 - cx, 21.5 - cz, 4.6, 3.0, 0, 0.62, 0.6);
    g.trench(
      [
        [-23.5, 11],
        [-23.2, -6],
        [-21.5, -14],
        [-17, -16.5],
        [-12.5, -16.5],
      ],
      0.55,
    );
    g.tracks([
      [-26, 20],
      [-25.5, 4],
      [-24.6, -12],
      [-19, -19.8],
      [-4, -20.4],
      [12, -20.2],
      [26, -19],
    ]);
  });
}
