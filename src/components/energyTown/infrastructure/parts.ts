import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { NO_SHADOW, OWN_UV, type IndustrialKit, type MatKey } from "../scene/materials";
import type { DecalName } from "../scene/surfaceTextures";

/* ------------------------------------------------------------------ */
/* Parts: a small modelling kit for engineered structures.             */
/*                                                                     */
/* A structure is authored as many primitives in local metres, then    */
/* merged into ONE mesh per material — a detailed SST costs about as   */
/* many draw calls as a plain box did. Every part gets metric UVs      */
/* (box-projected in its own frame, or unwrapped for round parts), so  */
/* the shared cladding / rib / louvre textures keep a constant physical */
/* scale on every structure.                                           */
/* ------------------------------------------------------------------ */

export type Track = <T extends { dispose: () => void }>(o: T) => T;

type Xform = {
  rx?: number;
  ry?: number;
  rz?: number;
};

type BoxOpts = Xform & {
  /** edge chamfer in metres (0 = sharp box) */
  c?: number;
  /** rotate the texture 90° on the faces (horizontal ribs / slats) */
  uvTurn?: boolean;
  /** one uniform patch of the surface texture: no panel joints (doors, small parts) */
  plain?: boolean;
};

type CylOpts = Xform & { seg?: number; open?: boolean };

const V = new THREE.Vector3();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

/* geometry templates are shared between calls (every add() clones) */
const templates = new Map<string, THREE.BufferGeometry>();
function template(key: string, make: () => THREE.BufferGeometry) {
  let g = templates.get(key);
  if (!g) {
    g = make();
    templates.set(key, g);
  }
  return g;
}

/** box with all 12 edges chamfered (flat-shaded convex hull, ~44 tris) */
function chamferBox(w: number, h: number, d: number, c: number) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const pts: THREE.Vector3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        pts.push(new THREE.Vector3(sx * x, sy * (y - c), sz * (z - c)));
        pts.push(new THREE.Vector3(sx * (x - c), sy * y, sz * (z - c)));
        pts.push(new THREE.Vector3(sx * (x - c), sy * (y - c), sz * z));
      }
  return new ConvexGeometry(pts);
}

/** metric box-projected UVs from part-local positions and normals */
function boxUV(g: THREE.BufferGeometry, turn: boolean, plain = false) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else if (ax >= az) {
      u = pos.getZ(i) * Math.sign(nor.getX(i) || 1);
      v = pos.getY(i);
    } else {
      u = -pos.getX(i) * Math.sign(nor.getZ(i) || 1);
      v = pos.getY(i);
    }
    if (plain) {
      // centre of a cladding sheet, away from every joint
      uv[i * 2] = 1 + u * 0.01;
      uv[i * 2 + 1] = 0.5 + v * 0.01;
      continue;
    }
    // offset so a part's centre falls mid-sheet: joints land symmetrically
    uv[i * 2] = (turn ? v : u) + 1;
    uv[i * 2 + 1] = (turn ? u : v) + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** keep position / normal / uv only, non-indexed, so everything merges */
function normalise(src: THREE.BufferGeometry) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

export class Parts {
  private readonly buckets = new Map<MatKey, THREE.BufferGeometry[]>();
  private readonly stack: THREE.Matrix4[] = [new THREE.Matrix4()];

  constructor(
    readonly kit: IndustrialKit,
    /** false on the low-quality profile: skip small hardware */
    readonly detail: boolean,
  ) {}

  private get frame() {
    return this.stack[this.stack.length - 1];
  }

  /** enter a local frame: translate, then yaw */
  push(x = 0, y = 0, z = 0, ry = 0) {
    const m = new THREE.Matrix4().compose(
      V.set(x, y, z),
      Q.setFromEuler(E.set(0, ry, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this.stack.push(this.frame.clone().multiply(m));
    return this;
  }

  pop() {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }

  /** add a prepared geometry (cloned) with a local transform */
  addGeometry(key: MatKey, geo: THREE.BufferGeometry, local: THREE.Matrix4) {
    const g = normalise(geo);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(this.frame, local));
    let list = this.buckets.get(key);
    if (!list) {
      list = [];
      this.buckets.set(key, list);
    }
    list.push(g);
  }

  private place(key: MatKey, geo: THREE.BufferGeometry, x: number, y: number, z: number, o: Xform) {
    const m = new THREE.Matrix4().compose(
      V.set(x, y, z),
      Q.setFromEuler(E.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ")),
      new THREE.Vector3(1, 1, 1),
    );
    this.addGeometry(key, geo, m);
  }

  box(key: MatKey, w: number, h: number, d: number, x: number, y: number, z: number, o: BoxOpts = {}) {
    const c = Math.min(o.c ?? 0, w / 2.2, h / 2.2, d / 2.2);
    const turn = !!o.uvTurn;
    const plain = !!o.plain;
    const geo = template(`b${w}|${h}|${d}|${c}|${turn}|${plain}`, () => {
      const g = c > 0.004 ? chamferBox(w, h, d, c) : normalise(new THREE.BoxGeometry(w, h, d));
      boxUV(g, turn, plain);
      return g;
    });
    this.place(key, geo, x, y, z, o);
  }

  /** box whose bottom face sits at y */
  slab(key: MatKey, w: number, h: number, d: number, x: number, y: number, z: number, o: BoxOpts = {}) {
    this.box(key, w, h, d, x, y + h / 2, z, o);
  }

  /** vertical cylinder centred at (x, y, z); UVs unwrapped in metres */
  cyl(key: MatKey, rTop: number, rBot: number, h: number, x: number, y: number, z: number, o: CylOpts = {}) {
    const seg = o.seg ?? 16;
    const open = !!o.open;
    const geo = template(`c${rTop}|${rBot}|${h}|${seg}|${open}`, () => {
      const g = normalise(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open));
      const uv = g.attributes.uv as THREE.BufferAttribute;
      const circ = Math.PI * (rTop + rBot);
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
      return g;
    });
    this.place(key, geo, x, y, z, o);
  }

  /** cylinder spanning two local points */
  rod(key: MatKey, r: number, a: [number, number, number], b: [number, number, number], seg = 8) {
    const A = new THREE.Vector3(...a);
    const dir = new THREE.Vector3(...b).sub(A);
    const len = dir.length();
    if (len < 1e-4) return;
    const geo = template(`r${r}|${len.toFixed(3)}|${seg}`, () => {
      const g = normalise(new THREE.CylinderGeometry(r, r, len, seg, 1, false));
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r, uv.getY(i) * len);
      return g;
    });
    const m = new THREE.Matrix4().compose(
      A.addScaledVector(dir, 0.5),
      new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
      new THREE.Vector3(1, 1, 1),
    );
    this.addGeometry(key, geo, m);
  }

  /** polyline of rods with small joint spheres (pipes, rails, busbars) */
  pipe(key: MatKey, r: number, pts: [number, number, number][], joints = true) {
    for (let i = 0; i < pts.length - 1; i++) this.rod(key, r, pts[i], pts[i + 1]);
    if (joints) for (let i = 1; i < pts.length - 1; i++) this.sphere(key, r * 1.02, ...pts[i]);
  }

  sphere(key: MatKey, r: number, x: number, y: number, z: number, o: Xform & { cap?: boolean } = {}) {
    const cap = !!o.cap;
    // small spheres (pipe joints, lamps) need far fewer facets
    const seg = r < 0.2 ? 8 : 16;
    const geo = template(`s${r}|${cap}|${seg}`, () =>
      normalise(
        new THREE.SphereGeometry(r, seg, cap ? seg / 2 - 2 : seg / 2 + 2, 0, Math.PI * 2, 0, cap ? Math.PI / 2 : Math.PI),
      ),
    );
    this.place(key, geo, x, y, z, o);
  }

  torus(key: MatKey, R: number, r: number, x: number, y: number, z: number, o: Xform & { seg?: number } = {}) {
    const seg = o.seg ?? 32;
    const geo = template(`t${R}|${r}|${seg}`, () => normalise(new THREE.TorusGeometry(R, r, 6, seg)));
    // tori lie flat by default
    this.place(key, geo, x, y, z, { rx: (o.rx ?? 0) + Math.PI / 2, ry: o.ry, rz: o.rz });
  }

  /** vertical prism with n sides (octagonal plinths, shield walls) */
  prism(key: MatKey, r: number, h: number, sides: number, x: number, y: number, z: number, o: Xform = {}) {
    const geo = template(`p${r}|${h}|${sides}`, () => {
      const g = normalise(new THREE.CylinderGeometry(r, r, h, sides, 1));
      g.computeVertexNormals(); // non-indexed → flat facets
      boxUV(g, false);
      return g;
    });
    this.place(key, geo, x, y, z, { ...o, ry: (o.ry ?? 0) + Math.PI / sides });
  }

  /** flat decal quad from the shared atlas, facing +z of its rotation */
  decal(name: DecalName, w: number, x: number, y: number, z: number, o: Xform & { h?: number } = {}) {
    const cell = this.kit.decalCells.get(name);
    if (!cell) return;
    const h = o.h ?? w / cell.aspect;
    const geo = template(`d${name}|${w}|${h}`, () => {
      const g = normalise(new THREE.PlaneGeometry(w, h));
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(
          i,
          cell.u0 + uv.getX(i) * (cell.u1 - cell.u0),
          cell.v0 + uv.getY(i) * (cell.v1 - cell.v0),
        );
      }
      return g;
    });
    this.place("decal", geo, x, y, z, o);
  }

  /* ---------- merged output ---------- */

  /** one merged geometry per material */
  geometries(): Map<MatKey, THREE.BufferGeometry> {
    const out = new Map<MatKey, THREE.BufferGeometry>();
    for (const [key, list] of this.buckets) {
      if (!list.length) continue;
      if (!OWN_UV.has(key)) {
        // round parts arrive without metric UVs only if a caller built them
        // by hand; give them some so the merge stays uniform
        for (const g of list) if (!g.attributes.uv) boxUV(g, false);
      }
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      if (merged) {
        merged.computeBoundingSphere();
        out.set(key, merged);
      }
    }
    this.buckets.clear();
    return out;
  }

  /** merged meshes for a single structure */
  build(track: Track, shadows: boolean, name?: string) {
    const group = new THREE.Group();
    if (name) group.name = name;
    for (const [key, geo] of this.geometries()) {
      const mesh = new THREE.Mesh(track(geo), this.kit.mats[key]);
      mesh.castShadow = shadows && !NO_SHADOW.has(key);
      mesh.receiveShadow = shadows && key !== "decal";
      if (key === "decal") mesh.renderOrder = 1;
      group.add(mesh);
    }
    return group;
  }

  /** instanced meshes: the authored template repeated at each matrix */
  instanced(
    track: Track,
    shadows: boolean,
    matrices: THREE.Matrix4[],
    colors?: Partial<Record<MatKey, THREE.Color[]>>,
  ) {
    const group = new THREE.Group();
    for (const [key, geo] of this.geometries()) {
      const mesh = track(new THREE.InstancedMesh(track(geo), this.kit.mats[key], matrices.length));
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      const cols = colors?.[key];
      if (cols) cols.forEach((c, i) => mesh.setColorAt(i, c));
      mesh.computeBoundingSphere();
      mesh.castShadow = shadows && !NO_SHADOW.has(key);
      mesh.receiveShadow = shadows && key !== "decal";
      group.add(mesh);
    }
    return group;
  }
}

/** yaw-only placement matrix */
export function placement(x: number, y: number, z: number, ry = 0, rx = 0) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, "YXZ")),
    new THREE.Vector3(1, 1, 1),
  );
}
