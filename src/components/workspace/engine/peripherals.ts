import {
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector3,
  BoxGeometry,
  type BufferGeometry,
} from "three";
import type { WorkspaceMaterials } from "./materials";
import { roundedRectShape } from "./workspaceMonitor";

/* ------------------------------------------------------------------ */
/* Keyboard and mouse in the same language as the displays: satin       */
/* aluminium, slim, quiet. The keys are one instanced mesh (one draw    */
/* call).                                                               */
/* ------------------------------------------------------------------ */

const KB = { width: 0.279, depth: 0.115, front: 0.004, back: 0.0109, corner: 0.006 };
const UNIT = 0.0176;
/** key widths in units per row (every row spans 15 units) */
const ROWS: number[][] = [
  [1.5, ...Array(12).fill(1), 1.5],
  [...Array(13).fill(1), 2],
  [1.5, ...Array(12).fill(1), 1.5],
  [1.75, ...Array(11).fill(1), 2.25],
  [2.25, ...Array(10).fill(1), 2.75],
  [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
];

/** thin wedge body: low at the front, rising to the back */
function wedgeGeometry() {
  const d = KB.depth;
  const s = new Shape();
  // side profile in (z-from-front, y); extruded across the width
  const c = KB.corner * 0.5;
  s.moveTo(-d / 2 + c, 0);
  s.lineTo(d / 2 - c, 0);
  s.quadraticCurveTo(d / 2, 0, d / 2, c);
  s.lineTo(d / 2, KB.back - c);
  s.quadraticCurveTo(d / 2, KB.back, d / 2 - c, KB.back);
  s.lineTo(-d / 2 + c, KB.front);
  s.quadraticCurveTo(-d / 2, KB.front, -d / 2, KB.front - c);
  s.lineTo(-d / 2, c);
  s.quadraticCurveTo(-d / 2, 0, -d / 2 + c, 0);
  const g = new ExtrudeGeometry(s, {
    depth: KB.width - 0.004,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0008,
    bevelSegments: 2,
    curveSegments: 3,
  });
  // shape x → −z (front at +z, towards the visitor), extrusion → x
  g.rotateY(Math.PI / 2);
  g.translate(-KB.width / 2 + 0.002, 0, 0);
  return g;
}

export function createKeyboard(materials: WorkspaceMaterials) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];

  const bodyGeo = wedgeGeometry();
  geometries.push(bodyGeo);
  group.add(new Mesh(bodyGeo, materials.aluminium));

  // low-profile keys on the sloping top
  const slope = Math.atan2(KB.back - KB.front, KB.depth);
  const deck = new Group();
  deck.position.y = (KB.front + KB.back) / 2;
  deck.rotation.x = slope;
  group.add(deck);

  const keyGeo = new BoxGeometry(1, 1, 1);
  geometries.push(keyGeo);
  const count = ROWS.reduce((n, row) => n + row.length, 0);
  const keys = new InstancedMesh(keyGeo, materials.keycap, count);
  const m = new Matrix4();
  const q = new Quaternion();
  const gap = 0.0024;
  const rowsDepth = UNIT * 5.5;
  let i = 0;
  ROWS.forEach((row, r) => {
    const fnRow = r === 0;
    const rowDepth = fnRow ? UNIT * 0.5 : UNIT;
    // back row first (−z), function row half height
    const z = -rowsDepth / 2 + (fnRow ? rowDepth / 2 : UNIT * 0.5 + (r - 0.5) * UNIT);
    let x = -(UNIT * 15) / 2;
    for (const units of row) {
      const w = units * UNIT;
      m.compose(new Vector3(x + w / 2, 0.0006, z), q, new Vector3(w - gap, 0.0011, rowDepth - gap));
      keys.setMatrixAt(i++, m);
      x += w;
    }
  });
  keys.instanceMatrix.needsUpdate = true;
  deck.add(keys);

  const shadowGeo = new PlaneGeometry(KB.width * 1.2, KB.depth * 1.7);
  shadowGeo.rotateX(-Math.PI / 2);
  geometries.push(shadowGeo);
  const shadow = new Mesh(shadowGeo, materials.contactShadow);
  shadow.position.y = 0.0012;
  group.add(shadow);

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose();
      keys.dispose();
    },
  };
}

export function createMouse(materials: WorkspaceMaterials) {
  const group = new Group();
  // thin aluminium base
  const baseGeo = new ExtrudeGeometry(roundedRectShape(0.057, 0.113, 0.0275), {
    depth: 0.0022,
    bevelEnabled: true,
    bevelThickness: 0.0006,
    bevelSize: 0.0006,
    bevelSegments: 2,
    curveSegments: 10,
  });
  baseGeo.rotateX(-Math.PI / 2);
  const base = new Mesh(baseGeo, materials.aluminium);
  base.position.y = 0.0006;
  group.add(base);

  // one smooth, unified upper shell
  const shellGeo = new SphereGeometry(1, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const shell = new Mesh(shellGeo, materials.mouseShell);
  shell.scale.set(0.0278, 0.0185, 0.0555);
  shell.position.y = 0.0028;
  group.add(shell);

  const shadowGeo = new PlaneGeometry(0.1, 0.17);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new Mesh(shadowGeo, materials.contactShadow);
  shadow.position.y = 0.0012;
  group.add(shadow);

  return {
    group,
    dispose() {
      baseGeo.dispose();
      shellGeo.dispose();
      shadowGeo.dispose();
    },
  };
}
