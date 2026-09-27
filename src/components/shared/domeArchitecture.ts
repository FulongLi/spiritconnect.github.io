import { BufferGeometry, Float32BufferAttribute, Matrix4, Shape, Vector2, Vector3 } from "three";

/* ------------------------------------------------------------------ */
/* The Spirit Connect Dome, as one architectural specification shared  */
/* by the lunar exterior (energyTown) and the workspace interior. Both  */
/* scenes build the SAME building from it: shell proportions, rib      */
/* count and rhythm, panoramic openings, oculus and entrance.          */
/*                                                                     */
/* Dome-local metres: floor centre at the origin, the entrance on +z.  */
/* The shell is a flattened spheroid (a low, calm silhouette rather    */
/* than a hemisphere), parametrised by                                 */
/*   t    elevation angle, 0 at the floor → π/2 at the apex            */
/*   phi  azimuth, 0 on +z (the entrance), increasing towards +x        */
/* ------------------------------------------------------------------ */

export type DomeOpening = {
  /** centre azimuth */
  phi: number;
  /** half the angular width */
  half: number;
  /** sill and head heights (m) */
  sill: number;
  head: number;
};

export type DomeEntrance = {
  /** clear opening */
  width: number;
  height: number;
  corner: number;
  /** vestibule body */
  outerWidth: number;
  outerHeight: number;
  outerCorner: number;
  /** vestibule runs along +z from z0 (inside the shell: the portal) to z1 (the pressure door) */
  z0: number;
  z1: number;
};

export type DomeSpec = {
  radius: number;
  height: number;
  ribs: number;
  ribWidth: number;
  /** horizontal radius of the crown opening */
  oculus: number;
  /** structural base ring height */
  baseRing: number;
  openings: DomeOpening[];
  entrance: DomeEntrance | null;
};

/**
 * The main Dome. Six major ribs at ±30°, ±90°, ±150° — where the six
 * habitat corridors join the shell — so the entrance (phi = 0), the two
 * flanking windows and the rear panorama (phi = π, behind the
 * workstation) each sit in a clear bay.
 */
export const MAIN_DOME: DomeSpec = {
  radius: 14,
  height: 9.6,
  ribs: 6,
  ribWidth: 0.5,
  oculus: 2.3,
  baseRing: 0.55,
  openings: [
    // the panorama behind the workstation: a long, low slot
    { phi: Math.PI, half: 0.3, sill: 1.3, head: 3.6 },
    // flanking the entrance, read on the approach
    { phi: Math.PI / 3, half: 0.24, sill: 1.1, head: 3.2 },
    { phi: -Math.PI / 3, half: 0.24, sill: 1.1, head: 3.2 },
  ],
  entrance: {
    width: 2.5,
    height: 2.75,
    corner: 0.55,
    outerWidth: 3.7,
    outerHeight: 3.45,
    outerCorner: 1.35,
    z0: 12.55,
    z1: 18.4,
  },
};

/** interior shell: the main Dome less its wall build-up */
export const MAIN_DOME_INTERIOR = { radius: 13.6, height: 9.2 } as const;

/**
 * Smaller habitat domes around the ring: the same language at a smaller
 * scale. Dome-local +z faces away from the main Dome; corridors join at
 * 120°, 180° and 240° (bay centres), the windows take the other bays.
 */
export function satelliteDome(radius: number): DomeSpec {
  return {
    radius,
    height: radius * (MAIN_DOME.height / MAIN_DOME.radius),
    ribs: 6,
    ribWidth: MAIN_DOME.ribWidth * 0.7,
    oculus: radius * 0.16,
    baseRing: 0.4,
    openings: [0, Math.PI / 3, -Math.PI / 3].map((phi) => ({
      phi,
      half: 0.3,
      sill: 0.8,
      head: radius * 0.34,
    })),
    entrance: null,
  };
}

/** rib azimuths: between the bays */
export function ribAngles(spec: Pick<DomeSpec, "ribs">) {
  return Array.from({ length: spec.ribs }, (_, i) => ((i + 0.5) / spec.ribs) * Math.PI * 2);
}

/* ---------------- spheroid ---------------- */

export type Spheroid = { R: number; H: number };

export const elevationAt = (s: Spheroid, y: number) => Math.asin(Math.min(1, Math.max(0, y / s.H)));
/** elevation where the shell's horizontal radius is `r` */
export const elevationForRadius = (s: Spheroid, r: number) => Math.acos(Math.min(1, r / s.R));
/** horizontal radius of the shell at height y */
export const radiusAtHeight = (s: Spheroid, y: number) => s.R * Math.cos(elevationAt(s, y));

export function surfacePoint(s: Spheroid, t: number, phi: number, offset = 0, out = new Vector3()) {
  const ct = Math.cos(t);
  out.set(s.R * ct * Math.sin(phi), s.H * Math.sin(t), s.R * ct * Math.cos(phi));
  if (offset) out.addScaledVector(surfaceNormal(s, t, phi, N), offset);
  return out;
}

const N = new Vector3();

/** outward unit normal */
export function surfaceNormal(s: Spheroid, t: number, phi: number, out = new Vector3()) {
  const ct = Math.cos(t);
  return out.set(s.H * ct * Math.sin(phi), s.R * Math.sin(t), s.H * ct * Math.cos(phi)).normalize();
}

/** unit tangent towards the apex */
function tangentUp(s: Spheroid, t: number, phi: number, out: Vector3) {
  const st = Math.sin(t);
  return out.set(-s.R * st * Math.sin(phi), s.H * Math.cos(t), -s.R * st * Math.cos(phi)).normalize();
}

/** unit tangent towards increasing phi */
function tangentAround(phi: number, out: Vector3) {
  return out.set(Math.cos(phi), 0, -Math.sin(phi));
}

/* ---------------- a small non-indexed mesh writer ---------------- */

class MeshWriter {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  private readonly e1 = new Vector3();
  private readonly e2 = new Vector3();
  private readonly fn = new Vector3();

  /** triangle, wound so its face normal agrees with `facing` */
  tri(a: Vector3, b: Vector3, c: Vector3, facing: Vector3, na?: Vector3, nb?: Vector3, nc?: Vector3) {
    this.fn.crossVectors(this.e1.subVectors(b, a), this.e2.subVectors(c, a));
    const flip = this.fn.dot(facing) < 0;
    const [p, q] = flip ? [c, b] : [b, c];
    const [np, nq] = flip ? [nc, nb] : [nb, nc];
    this.fn.normalize();
    if (this.fn.dot(facing) < 0) this.fn.negate();
    for (const [v, n] of [
      [a, na],
      [p, np],
      [q, nq],
    ] as const) {
      this.pos.push(v.x, v.y, v.z);
      const nn = n ?? this.fn;
      this.nor.push(nn.x, nn.y, nn.z);
      this.uv.push(0, 0);
    }
  }

  quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, facing: Vector3) {
    this.tri(a, b, c, facing);
    this.tri(a, c, d, facing);
  }

  build() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

/* ---------------- shell with openings ---------------- */

export type ShellHole = { phi0: number; phi1: number; t0: number; t1: number };

const TAU = Math.PI * 2;
const wrap = (a: number) => ((a % TAU) + TAU) % TAU;

/** the openings (and the entrance) as holes in a given shell */
export function shellHoles(spec: DomeSpec, s: Spheroid): ShellHole[] {
  const holes: ShellHole[] = spec.openings.map((o) => ({
    phi0: o.phi - o.half,
    phi1: o.phi + o.half,
    t0: elevationAt(s, o.sill),
    t1: elevationAt(s, o.head),
  }));
  const e = spec.entrance;
  if (e) {
    const half = Math.asin(e.width / 2 / radiusAtHeight(s, e.height));
    holes.push({ phi0: -half, phi1: half, t0: 0, t1: elevationAt(s, e.height) });
  }
  return holes;
}

function inHole(holes: ShellHole[], phi: number, t: number) {
  for (const h of holes) {
    if (t <= h.t0 || t >= h.t1) continue;
    const d = wrap(phi - h.phi0);
    if (d < h.phi1 - h.phi0) return true;
  }
  return false;
}

/**
 * The shell surface from the floor to the oculus, with rectangular
 * (phi × height) openings. Grid lines are inserted at every opening edge
 * so the openings are clean. UVs: u = azimuth / 2π, v = elevation / (π/2).
 */
export function shellGeometry(
  s: Spheroid,
  opts: { cols: number; rows: number; tTop: number; holes: ShellHole[]; tBottom?: number },
) {
  const { cols, rows, tTop, holes } = opts;
  const tBottom = opts.tBottom ?? 0;
  const phis = new Set<number>();
  for (let i = 0; i <= cols; i++) phis.add(+((i / cols) * TAU).toFixed(6));
  const ts = new Set<number>();
  for (let i = 0; i <= rows; i++) ts.add(+(tBottom + (i / rows) * (tTop - tBottom)).toFixed(6));
  for (const h of holes) {
    phis.add(+wrap(h.phi0).toFixed(6));
    phis.add(+wrap(h.phi1).toFixed(6));
    if (h.t0 > tBottom && h.t0 < tTop) ts.add(+h.t0.toFixed(6));
    if (h.t1 > tBottom && h.t1 < tTop) ts.add(+h.t1.toFixed(6));
  }
  const dedupe = (values: number[]) =>
    values.sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-4);
  const P = dedupe([...phis]);
  const T = dedupe([...ts]);
  if (P[P.length - 1] < TAU - 1e-4) P.push(TAU);

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const v = new Vector3();
  const n = new Vector3();
  for (const t of T) {
    for (const phi of P) {
      surfacePoint(s, t, phi, 0, v);
      surfaceNormal(s, t, phi, n);
      pos.push(v.x, v.y, v.z);
      nor.push(n.x, n.y, n.z);
      uv.push(phi / TAU, t / (Math.PI / 2));
    }
  }
  const index: number[] = [];
  const w = P.length;
  for (let i = 0; i < T.length - 1; i++) {
    for (let j = 0; j < w - 1; j++) {
      if (inHole(holes, (P[j] + P[j + 1]) / 2, (T[i] + T[i + 1]) / 2)) continue;
      const a = i * w + j;
      const b = a + 1;
      const c = a + w + 1;
      const d = a + w;
      // counter-clockwise seen from outside
      index.push(a, b, c, a, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

/* ---------------- ribs ---------------- */

/**
 * One meridian rib at phi = 0, from t0 to t1: a constant-width fin
 * standing between `base` and `face` offsets along the shell normal
 * (face > base: an exterior rib; face < base: an interior rib).
 * Rotate copies with `ribMatrices`.
 */
export function ribGeometry(s: Spheroid, t0: number, t1: number, width: number, base: number, face: number, samples = 28) {
  const m = new MeshWriter();
  const out = face > base ? 1 : -1;
  const p = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const q = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const np = new Vector3();
  const nq = new Vector3();
  const side = new Vector3(1, 0, 0);
  const left = new Vector3(-1, 0, 0);
  const facing = new Vector3();
  const nrm = new Vector3();
  const corners = (t: number, into: Vector3[], n: Vector3) => {
    surfaceNormal(s, t, 0, nrm);
    const c = surfacePoint(s, t, 0);
    // base-left, face-left, face-right, base-right
    into[0].copy(c).addScaledVector(nrm, base).addScaledVector(side, -width / 2);
    into[1].copy(c).addScaledVector(nrm, face).addScaledVector(side, -width / 2);
    into[2].copy(c).addScaledVector(nrm, face).addScaledVector(side, width / 2);
    into[3].copy(c).addScaledVector(nrm, base).addScaledVector(side, width / 2);
    n.copy(nrm).multiplyScalar(out);
  };
  corners(t0, p, np);
  for (let i = 1; i <= samples; i++) {
    const t = t0 + ((t1 - t0) * i) / samples;
    corners(t, q, nq);
    // the face is shaded smoothly along the rib (no banding between samples)
    facing.addVectors(np, nq);
    m.tri(p[1], p[2], q[2], facing, np, np, nq);
    m.tri(p[1], q[2], q[1], facing, np, nq, nq);
    m.quad(p[0], p[1], q[1], q[0], left);
    m.quad(p[3], p[2], q[2], q[3], side);
    for (let k = 0; k < 4; k++) p[k].copy(q[k]);
    np.copy(nq);
  }
  return m.build();
}

export function ribMatrices(spec: Pick<DomeSpec, "ribs">) {
  return ribAngles(spec).map((a) => new Matrix4().makeRotationY(a));
}

/* ---------------- opening reveals + glass ---------------- */

/** reveal of an opening (sill, head, two jambs) between offsets o0 and o1 along the shell normal */
export function revealGeometry(s: Spheroid, hole: ShellHole, o0: number, o1: number, steps = 16) {
  const m = new MeshWriter();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const d = new Vector3();
  const f = new Vector3();
  const span = hole.phi1 - hole.phi0;
  // sill (faces up) and head (faces down)
  for (const [t, sign] of [
    [hole.t0, 1],
    [hole.t1, -1],
  ] as const) {
    for (let i = 0; i < steps; i++) {
      const p0 = hole.phi0 + (span * i) / steps;
      const p1 = hole.phi0 + (span * (i + 1)) / steps;
      surfacePoint(s, t, p0, o0, a);
      surfacePoint(s, t, p1, o0, b);
      surfacePoint(s, t, p1, o1, c);
      surfacePoint(s, t, p0, o1, d);
      tangentUp(s, t, (p0 + p1) / 2, f).multiplyScalar(sign);
      m.quad(a, b, c, d, f);
    }
  }
  // jambs (face the opening centre)
  const tSteps = 8;
  for (const [phi, sign] of [
    [hole.phi0, 1],
    [hole.phi1, -1],
  ] as const) {
    tangentAround(phi, f).multiplyScalar(sign);
    for (let i = 0; i < tSteps; i++) {
      const t0 = hole.t0 + ((hole.t1 - hole.t0) * i) / tSteps;
      const t1 = hole.t0 + ((hole.t1 - hole.t0) * (i + 1)) / tSteps;
      surfacePoint(s, t0, phi, o0, a);
      surfacePoint(s, t1, phi, o0, b);
      surfacePoint(s, t1, phi, o1, c);
      surfacePoint(s, t0, phi, o1, d);
      m.quad(a, b, c, d, f);
    }
  }
  return m.build();
}

/** the glazing of an opening at offset `o`, facing out (+1) or in (−1) */
export function glassGeometry(s: Spheroid, hole: ShellHole, o: number, facing: 1 | -1, steps = 16) {
  const m = new MeshWriter();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const d = new Vector3();
  const f = new Vector3();
  const span = hole.phi1 - hole.phi0;
  const tSteps = 6;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < tSteps; j++) {
      const p0 = hole.phi0 + (span * i) / steps;
      const p1 = hole.phi0 + (span * (i + 1)) / steps;
      const t0 = hole.t0 + ((hole.t1 - hole.t0) * j) / tSteps;
      const t1 = hole.t0 + ((hole.t1 - hole.t0) * (j + 1)) / tSteps;
      surfacePoint(s, t0, p0, o, a);
      surfacePoint(s, t0, p1, o, b);
      surfacePoint(s, t1, p1, o, c);
      surfacePoint(s, t1, p0, o, d);
      surfaceNormal(s, (t0 + t1) / 2, (p0 + p1) / 2, f).multiplyScalar(facing);
      m.quad(a, b, c, d, f);
    }
  }
  const g = m.build();
  // glazing gets real UVs (u across, v up) for reflections / tints
  const pos = g.getAttribute("position");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    const phi = Math.atan2(pos.getX(i), pos.getZ(i));
    const du = wrap(phi - hole.phi0 + Math.PI) - Math.PI;
    uv.setXY(i, du / span, pos.getY(i));
  }
  return g;
}

/* ---------------- entrance vestibule ---------------- */

/** rounded-top outline (floor flat), counter-clockwise, as points */
export function archOutline(width: number, height: number, corner: number, bottom = 0, segments = 10) {
  const s = new Shape();
  const x = width / 2;
  s.moveTo(-x, bottom);
  s.lineTo(x, bottom);
  s.lineTo(x, bottom + height - corner);
  s.quadraticCurveTo(x, bottom + height, x - corner, bottom + height);
  s.lineTo(-x + corner, bottom + height);
  s.quadraticCurveTo(-x, bottom + height, -x, bottom + height - corner);
  s.closePath();
  return { shape: s, points: s.getPoints(segments) };
}

/**
 * Sweep a closed outline along z. Normals face out of the outline
 * (`inward` = false, an exterior skin) or into it (a lining). Smooth
 * across the rounded corners, crisp at the floor corners.
 */
export function sweepOutline(points: Vector2[], z0: number, z1: number, inward: boolean) {
  const pts = points.slice();
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  const n = pts.length;
  const segNormal = (i: number) => {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    // CCW outline: outward normal is (dy, −dx)
    const nx = b.y - a.y;
    const ny = -(b.x - a.x);
    const l = Math.hypot(nx, ny) || 1;
    return new Vector2((nx / l) * (inward ? -1 : 1), (ny / l) * (inward ? -1 : 1));
  };
  const normals = pts.map((_, i) => segNormal(i));
  const vertexNormal = (seg: number, end: 0 | 1) => {
    const own = normals[seg];
    const other = normals[end === 0 ? (seg - 1 + n) % n : (seg + 1) % n];
    // soften only across gentle bends
    return own.dot(other) > 0.8 ? own.clone().add(other).normalize() : own;
  };
  const m = new MeshWriter();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const d = new Vector3();
  const f = new Vector3();
  const na = new Vector3();
  const nb = new Vector3();
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const n0 = vertexNormal(i, 0);
    const n1 = vertexNormal(i, 1);
    a.set(p.x, p.y, z0);
    b.set(q.x, q.y, z0);
    c.set(q.x, q.y, z1);
    d.set(p.x, p.y, z1);
    f.set(normals[i].x, normals[i].y, 0);
    na.set(n0.x, n0.y, 0);
    nb.set(n1.x, n1.y, 0);
    m.tri(a, b, c, f, na, nb, nb);
    m.tri(a, c, d, f, na, nb, na);
  }
  return m.build();
}
