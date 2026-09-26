import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import type { WorkspaceMaterials } from "./materials";
import { roundedRectShape } from "./workspaceMonitor";

/* ------------------------------------------------------------------ */
/* Keyboard and mouse: minimal, premium, low-poly. The keys are one      */
/* instanced mesh (a single draw call).                                 */
/* ------------------------------------------------------------------ */

const UNIT = 0.0188;
/** key widths in units per row (every row spans 15 units) */
const ROWS: number[][] = [
  [1.5, ...Array(12).fill(1), 1.5],
  [...Array(13).fill(1), 2],
  [1.5, ...Array(12).fill(1), 1.5],
  [1.75, ...Array(11).fill(1), 2.25],
  [2.25, ...Array(10).fill(1), 2.75],
  [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
];

export function createKeyboard(materials: WorkspaceMaterials) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const width = UNIT * 15 + 0.018;
  const depth = UNIT * 5.5 + 0.02;

  const baseGeo = new ExtrudeGeometry(roundedRectShape(width, depth, 0.008), {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0015,
    bevelSegments: 2,
    curveSegments: 4,
  });
  baseGeo.rotateX(-Math.PI / 2);
  geometries.push(baseGeo);
  const base = new Mesh(baseGeo, materials.silver);
  base.position.y = 0.0015;
  group.add(base);

  const keyGeo = new BoxGeometry(1, 1, 1);
  geometries.push(keyGeo);
  const count = ROWS.reduce((n, row) => n + row.length, 0);
  const keys = new InstancedMesh(keyGeo, materials.graphite, count);
  const m = new Matrix4();
  const q = new Quaternion();
  const gap = 0.0026;
  let i = 0;
  ROWS.forEach((row, r) => {
    const fnRow = r === 0;
    const rowDepth = fnRow ? UNIT * 0.5 : UNIT;
    // function row, a small gap, then five full rows
    const z = -depth / 2 + 0.01 + (fnRow ? rowDepth / 2 : UNIT * 0.5 + 0.004 + (r - 0.5) * UNIT);
    let x = -(UNIT * 15) / 2;
    for (const units of row) {
      const w = units * UNIT;
      m.compose(
        new Vector3(x + w / 2, 0.0095, z),
        q,
        new Vector3(w - gap, 0.0032, rowDepth - gap),
      );
      keys.setMatrixAt(i++, m);
      x += w;
    }
  });
  keys.instanceMatrix.needsUpdate = true;
  group.add(keys);

  const shadowGeo = new PlaneGeometry(width * 1.25, depth * 1.8);
  shadowGeo.rotateX(-Math.PI / 2);
  geometries.push(shadowGeo);
  const shadow = new Mesh(shadowGeo, materials.contactShadow);
  shadow.position.y = 0.0012;
  group.add(shadow);

  // the back edge rests slightly higher
  group.rotation.x = 0.025;

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
  const bodyGeo = new SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const body = new Mesh(bodyGeo, materials.silver);
  body.scale.set(0.031, 0.014, 0.056);
  body.position.y = 0.002;
  group.add(body);

  const soleGeo = new ExtrudeGeometry(roundedRectShape(0.058, 0.108, 0.026), {
    depth: 0.002,
    bevelEnabled: false,
    curveSegments: 8,
  });
  soleGeo.rotateX(-Math.PI / 2);
  const sole = new Mesh(soleGeo, materials.graphite);
  group.add(sole);

  const shadowGeo = new PlaneGeometry(0.1, 0.16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new Mesh(shadowGeo, materials.contactShadow);
  shadow.position.y = 0.0012;
  group.add(shadow);

  return {
    group,
    dispose() {
      bodyGeo.dispose();
      soleGeo.dispose();
      shadowGeo.dispose();
    },
  };
}
