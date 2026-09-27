import * as THREE from "three";
import { CONDUIT_ROUTES } from "../scene/conduits";
import { yawFacing } from "../scene/habitatSite";
import { terrainHeight } from "../scene/terrain";
import type { GroundPainter } from "../scene/surfaceTextures";
import { handrail, louvre, stairs } from "./components";
import type { InfraContext } from "./context";
import type { PadDome } from "./habitat";
import { Parts, placement } from "./parts";

/* ------------------------------------------------------------------ */
/* Mobility: where the energy system enters the physical world.        */
/*                                                                     */
/* One mobility-energy system in the same industrial language as the   */
/* rest of the base:                                                   */
/*  - landing pads: a segmented off-white ceramic deck around a dark   */
/*    blast plate, inset navigation lights, a steel kerb and perimeter */
/*    rail, a sintered foundation and berm sunk into the regolith, a   */
/*    walkway with stairs, and a charging umbilical tower beside the   */
/*    point where the conduit enters the pad                            */
/*  - a lander on the west pad, plugged into its tower                 */
/*  - rover charging rows at the end of each branch: a distribution    */
/*    cabinet and three charger posts on the conduit, painted bays,    */
/*    cable ducts back to the trench                                   */
/*  - small utility rovers charging in two of the bays                 */
/* Everything is merged per material (pads, rows) or instanced         */
/* (charger posts, rovers): a handful of draw calls for the district.  */
/* ------------------------------------------------------------------ */

type PadNode = { x: number; z: number; r: number; kind?: "pad" | "dome" };

/** the pad chain along the charger branches (dome nodes carry a small habitat dome) */
const NODES: PadNode[] = [
  { x: -42, z: -8, r: 5.2 },
  { x: -58, z: -12, r: 6.4, kind: "dome" },
  { x: -74, z: -16, r: 5.8 },
  { x: -92, z: -20, r: 5.8 }, // the lander's pad
  { x: -94, z: 4, r: 5.8 },
  { x: -36, z: 20, r: 5.2 },
  { x: -58, z: 40, r: 6.4, kind: "dome" },
  { x: -80, z: 60, r: 5.8 },
  { x: -100, z: 64, r: 5.8 },
  { x: -80, z: 82, r: 5.8 },
];
const LANDER_PAD = 3;

/** rover charging rows: where each branch's conduit ends */
const ROWS: { start: [number, number]; toward: [number, number]; rovers: number[] }[] = [
  { start: [-106, -22.6], toward: [-128, -27], rovers: [1] },
  { start: [-106, 5.1], toward: [-128, 7], rovers: [] },
  { start: [-112, 66.8], toward: [-128, 70], rovers: [] },
  { start: [-66, 84.3], toward: [-44, 88], rovers: [0] },
];

/** bay layout along a row (metres) */
const BAY = {
  /** first post's distance from the row start, and the pitch between posts */
  first: 4.4,
  pitch: 5.2,
  /** posts stand this far to the side of the conduit */
  post: 1.8,
  /** painted bay: starts this far in front of the post, width x depth */
  gap: 0.9,
  width: 3.8,
  depth: 5,
};

const SECTORS = 16;

export type Mobility = {
  padDomes: PadDome[];
  /** pad and pad-dome platforms, including their berms */
  footprints: { x: number; z: number; r: number }[];
  /** keep boulders away from these */
  keepClear: { x: number; z: number; r: number }[];
};

type V2 = [number, number];

export function buildMobility(ctx: InfraContext): Mobility {
  const { kit, detail, track, shadows, group, ground } = ctx;
  const site = new Parts(kit, detail);
  const padDomes: PadDome[] = [];
  const keepClear: Mobility["keepClear"] = [];
  const footprints = NODES.map((n) => ({ x: n.x, z: n.z, r: n.r + 1.2 }));
  const sectorGeos = new Map<string, THREE.BufferGeometry>();

  const rows = ROWS.map((row) => {
    const dx = row.toward[0] - row.start[0];
    const dz = row.toward[1] - row.start[1];
    const L = Math.hypot(dx, dz);
    const dir: V2 = [dx / L, dz / L];
    // the bays open on the row's -z side (toward the camera's side of the base)
    const side: V2 = [dir[1], -dir[0]];
    if (side[1] > 0) {
      side[0] = -side[0];
      side[1] = -side[1];
    }
    const at = (along: number, out: number): V2 => [
      row.start[0] + dir[0] * along + side[0] * out,
      row.start[1] + dir[1] * along + side[1] * out,
    ];
    // yaw that turns a post's local -z (its bay) toward `side`
    const yaw = Math.atan2(-side[0], -side[1]);
    const posts = [0, 1, 2].map((k) => at(BAY.first + k * BAY.pitch, BAY.post));
    return { ...row, dir, side, at, yaw, posts };
  });

  /* ================= landing pads ================= */
  const padSpots: { x: number; z: number; r: number; top: number; tower: number }[] = [];
  for (let pi = 0; pi < NODES.length; pi++) {
    const pd = NODES[pi];
    // sample the rim so the deck always clears the local terrain
    let maxEdge = -1e9;
    let minEdge = 1e9;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      for (const rr of [pd.r, pd.r + 2.6]) {
        const h = terrainHeight(pd.x + Math.cos(a) * rr, pd.z + Math.sin(a) * rr);
        if (rr === pd.r) maxEdge = Math.max(maxEdge, h);
        minEdge = Math.min(minEdge, h);
      }
    }
    const top = maxEdge + 0.22;
    keepClear.push({ x: pd.x, z: pd.z, r: pd.r + 5 });
    site.push(pd.x, top, pd.z);
    foundation(site, pd.r, minEdge - top);

    if (pd.kind === "dome") {
      // a small habitat dome stands on this platform (see buildHabitat)
      site.prism("deck", pd.r, 0.14, 48, 0, -0.07, 0);
      site.pop();
      ground.disc(pd.x, pd.z, pd.r + 2.4);
      padDomes.push({ x: pd.x, z: pd.z, radius: pd.r * 0.9, floor: top + 0.02, facing: Math.atan2(-pd.z, -pd.x) });
      continue;
    }

    /* where conduits enter, the umbilical tower, the walkway */
    const feeds = feedAngles(pd.x, pd.z, pd.r + 1.8);
    const nearestRow = rows.reduce((best, r) =>
      dist2(r.start, [pd.x, pd.z]) < dist2(best.start, [pd.x, pd.z]) ? r : best,
    );
    const toward = Math.atan2(nearestRow.start[1] - pd.z, nearestRow.start[0] - pd.x);
    const feed = feeds.length
      ? feeds.reduce((b, a) => (angleDiff(a, toward) < angleDiff(b, toward) ? a : b))
      : toward;
    const tower = [feed + 0.45, feed - 0.45].reduce((b, a) =>
      Math.min(...feeds.map((f) => angleDiff(a, f))) > Math.min(...feeds.map((f) => angleDiff(b, f))) ? a : b,
    );
    const busy = [...feeds, tower];
    let access = tower + Math.PI;
    for (const step of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
      const a = tower + Math.PI + step;
      if (Math.min(...busy.map((f) => angleDiff(a, f))) > 0.7) {
        access = a;
        break;
      }
    }

    deck(site, pd.r, sectorGeos, tower);
    for (const a of feeds) conduitEntry(site, pd.x, pd.z, top, pd.r, a);
    umbilicalTower(site, pd.x, pd.z, top, pd.r, tower, pi === LANDER_PAD);
    walkway(site, pd.x, pd.z, top, pd.r, access);
    perimeterRail(site, pd.r, [
      ...feeds.map((a) => [a, 0.3] as V2),
      [tower, 0.26],
      [access, 0.9 / pd.r + 0.08],
    ]);
    if (pi === LANDER_PAD) {
      site.push(0, 0, 0, yawFacing(tower));
      lander(site);
      site.pop();
    }
    site.pop();

    ground.padMarking(pd.x, top - 0.005, pd.z, pd.r * 0.6, -tower);
    padSpots.push({ x: pd.x, z: pd.z, r: pd.r, top, tower });
  }

  /* ================= charging rows ================= */
  const postMatrices: THREE.Matrix4[] = [];
  const roverMatrices: THREE.Matrix4[] = [];
  for (const row of rows) {
    for (const [x, z] of row.posts) postMatrices.push(placement(x, terrainHeight(x, z), z, row.yaw));
    for (const k of row.rovers) {
      const [px, pz] = row.posts[k];
      const x = px + row.side[0] * 3;
      const z = pz + row.side[1] * 3;
      roverMatrices.push(placement(x, terrainHeight(x, z), z, row.yaw));
    }
    // distribution cabinet at the head of the row, on the conduit side
    const [cx, cz] = row.at(0.4, BAY.post);
    site.push(cx, terrainHeight(cx, cz), cz, row.yaw);
    distributionCabinet(site);
    site.pop();
    const [kx, kz] = row.at(9, 4);
    keepClear.push({ x: kx, z: kz, r: 13 });
  }

  for (const g of sectorGeos.values()) g.dispose();
  group.add(site.build(track, shadows, "mobility"));

  const posts = new Parts(kit, detail);
  chargerPost(posts);
  group.add(posts.instanced(track, shadows, postMatrices));

  if (roverMatrices.length) {
    const rover = new Parts(kit, detail);
    utilityRover(rover);
    group.add(rover.instanced(track, shadows, roverMatrices));
  }

  /* ================= ground: aprons, bays, trenches, tracks ================= */
  const paintDistrict = (g: GroundPainter, ox: number, oz: number, w: number, d: number) => {
    const inside = (x: number, z: number, m: number) =>
      Math.abs(x - ox) < w / 2 + m && Math.abs(z - oz) < d / 2 + m;
    for (const pad of padSpots) {
      if (!inside(pad.x, pad.z, pad.r * 2)) continue;
      g.padApron(pad.x - ox, pad.z - oz, pad.r);
    }
    for (const row of rows) {
      if (!inside(row.start[0], row.start[1], 0)) continue;
      const local = ([x, z]: V2): V2 => [x - ox, z - oz];
      // service track along the open end of the bays
      g.tracks([row.at(-8, 8.4), row.at(0, 8.6), row.at(BAY.first + 2 * BAY.pitch + 5, 8.6)].map(local), 1.7, 0.3);
      // conduit trench under the row, stubs to every post and the cabinet
      g.trench([row.at(-3, 0), row.at(BAY.first + 2 * BAY.pitch + 2, 0)].map(local), 0.8);
      for (const along of [0.4, ...[0, 1, 2].map((k) => BAY.first + k * BAY.pitch)]) {
        g.trench([row.at(along, BAY.post), row.at(along, 0)].map(local), 0.36);
      }
      const [cx, cz] = local(row.at(0.4, BAY.post));
      g.contact(cx, cz, 2.4, 1.6, row.yaw, 0.55, 0.5);
      row.posts.forEach((p, k) => {
        const [px, pz] = local(p);
        g.contact(px, pz, 1.9, 1.5, row.yaw, 0.5, 0.45);
        const out = BAY.gap + BAY.depth / 2;
        g.bay(px + row.side[0] * out, pz + row.side[1] * out, BAY.width, BAY.depth, row.yaw);
        if (row.rovers.includes(k)) {
          const [rx, rz] = [px + row.side[0] * 3, pz + row.side[1] * 3];
          g.contact(rx, rz, 1.7, 2.7, row.yaw, 0.45, 0.4);
        }
      });
    }
  };
  const district = (ox: number, oz: number, w: number, d: number, seed: number, resScale: number) =>
    ground.site(ox, oz, 0, w, d, seed, (g) => paintDistrict(g, ox, oz, w, d), resScale);
  district(-100, -8, 72, 52, 7101, 2); // west pads + both west charger rows
  district(-86, 72, 100, 46, 7102, 2); // north-west pads + their rows
  district(-42, -9, 30, 30, 7103, 1); // the pads nearest the habitat
  district(-36, 21, 26, 26, 7104, 1);

  return { padDomes, footprints, keepClear };
}

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

function dist2(a: V2, b: V2) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function angleDiff(a: number, b: number) {
  const d = Math.abs(((a - b) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/** angles (around x, z) where the conduit routes cross a circle of radius R */
function feedAngles(x: number, z: number, R: number) {
  const out: number[] = [];
  for (const route of CONDUIT_ROUTES) {
    for (let i = 0; i < route.length - 1; i++) {
      const [ax, az] = route[i];
      const [bx, bz] = route[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const fx = ax - x;
      const fz = az - z;
      const A = dx * dx + dz * dz;
      const B = 2 * (fx * dx + fz * dz);
      const C = fx * fx + fz * fz - R * R;
      const disc = B * B - 4 * A * C;
      if (disc < 0) continue;
      for (const sgn of [-1, 1]) {
        const t = (-B + sgn * Math.sqrt(disc)) / (2 * A);
        if (t < 0 || t > 1) continue;
        const a = Math.atan2(az + dz * t - z, ax + dx * t - x);
        if (!out.some((o) => angleDiff(o, a) < 0.35)) out.push(a);
      }
    }
  }
  return out;
}

/** a point at angle a, radius r around the current frame's origin, y up */
function polar(a: number, r: number, y: number): [number, number, number] {
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

/** Parts yaw that turns local +x toward the xz angle a */
function radial(a: number) {
  return -a;
}

/**
 * Sintered foundation + sloped berm under a deck of radius r (frame: deck
 * top at y = 0). `low` is the lowest terrain around, relative to the deck.
 */
function foundation(p: Parts, r: number, low: number) {
  // dark sub-deck band, the structural ring's edge
  p.cyl("graphite", r + 0.02, r + 0.1, 0.34, 0, -0.31, 0, { seg: 40 });
  // skirt down into the regolith
  const skirtTop = -0.48;
  const skirtBottom = low - 0.4;
  p.cyl("foundation", r + 0.14, r + 0.34, skirtTop - skirtBottom, 0, (skirtTop + skirtBottom) / 2, 0, { seg: 40 });
  // compacted, sintered berm feathering into the terrain
  const bermTop = -0.55;
  const bermBottom = low - 0.15;
  if (bermTop - bermBottom > 0.05) {
    p.cyl("foundation", r + 0.4, r + 2.6, bermTop - bermBottom, 0, (bermTop + bermBottom) / 2, 0, { seg: 40, open: true });
  }
}

/** segmented annular sector, top at y = 0, centred on +x */
function sectorGeometry(rIn: number, rOut: number, span: number, h: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, -span / 2, span / 2, false);
  s.absarc(0, 0, rIn, span / 2, -span / 2, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 5 });
  g.rotateX(-Math.PI / 2); // shape plane → xz, extrusion → +y
  g.translate(0, -h, 0);
  return g;
}

/** the landing deck: segmented ceramic ring, blast plate, kerb, lights, hatches */
function deck(p: Parts, r: number, cache: Map<string, THREE.BufferGeometry>, tower: number) {
  const rIn = r * 0.6;
  const rMid = (rIn + r) / 2;
  const gap = 0.07 / rMid;
  const span = (Math.PI * 2) / SECTORS - gap;
  const key = `${r}`;
  let geo = cache.get(key);
  if (!geo) {
    geo = sectorGeometry(rIn + 0.03, r - 0.02, span, 0.16);
    cache.set(key, geo);
  }
  const m = new THREE.Matrix4();
  for (let i = 0; i < SECTORS; i++) {
    const a = tower + ((i + 0.5) / SECTORS) * Math.PI * 2;
    p.addGeometry("deck", geo, m.makeRotationY(radial(a)));
  }
  // dark ceramic blast plate (the markings are painted onto it)
  p.prism("graphite", rIn, 0.16, 32, 0, -0.085, 0);
  // structural joint between plate and ring, and the steel edge kerb
  p.torus("frame", rIn + 0.015, 0.03, 0, -0.01, 0, { seg: 32 });
  p.torus("frame", r - 0.02, 0.055, 0, 0.0, 0, { seg: 40 });

  // inset navigation lights: cool on the sector joints, amber on the tower axis
  for (let i = 0; i < 8; i++) {
    const a = tower + (i / 8) * Math.PI * 2;
    const amber = i === 0;
    p.box("graphite", 0.42, 0.02, 0.18, ...polar(a, r * 0.93, 0.0), { ry: radial(a) + Math.PI / 2, plain: true });
    p.box(amber ? "lightAmber" : "lightCool", 0.32, 0.03, 0.08, ...polar(a, r * 0.93, 0.005), { ry: radial(a) + Math.PI / 2 });
  }
  // touchdown-zone edge lights on the blast plate
  for (let i = 0; i < 4; i++) {
    const a = tower + Math.PI / 4 + (i / 4) * Math.PI * 2;
    p.cyl("lightCool", 0.07, 0.07, 0.02, ...polar(a, rIn - 0.2, 0.0), { seg: 8 });
  }
  // flush service hatches in the ring
  if (p.detail) {
    for (const off of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const a = tower + off + Math.PI / SECTORS;
      p.box("graphite", 0.55, 0.02, 0.8, ...polar(a, rMid, 0.004), { ry: radial(a), plain: true });
      p.box("frame", 0.08, 0.02, 0.14, ...polar(a + 0.05, rMid + 0.2, 0.012), { ry: radial(a) });
    }
  }
}

/** a conduit rising out of the regolith into the deck edge, with its junction box */
function conduitEntry(p: Parts, x: number, z: number, top: number, r: number, a: number) {
  const [fx, , fz] = polar(a, r + 2.9, 0);
  const foot: [number, number, number] = [fx, terrainHeight(x + fx, z + fz) - top + 0.12, fz];
  const head = polar(a, r + 0.55, -0.42);
  p.rod("cable", 0.2, foot, head, 10);
  // entry collar at the ground and a clamp half-way
  p.cyl("frame", 0.27, 0.3, 0.2, foot[0], foot[1] + 0.02, foot[2], { seg: 12 });
  const mid = foot.map((v, i) => (v + head[i]) / 2) as [number, number, number];
  p.box("frame", 0.5, 0.12, 0.12, mid[0], mid[1] + 0.18, mid[2], { ry: radial(a) + Math.PI / 2 });
  // junction box against the deck edge
  p.box("graphite", 0.8, 0.5, 0.55, ...polar(a, r + 0.3, -0.34), { ry: radial(a) + Math.PI / 2, c: 0.03 });
  if (p.detail) p.decal("hv", 0.2, ...polar(a, r + 0.585, -0.3), { ry: Math.PI / 2 - a });
}

/**
 * Charging umbilical tower at the deck edge (angle a). With a lander on the
 * pad the two-segment boom reaches its port; otherwise it is parked.
 */
function umbilicalTower(p: Parts, x: number, z: number, top: number, r: number, a: number, docked: boolean) {
  const R = r + 1.05;
  const [tx, , tz] = polar(a, R, 0);
  // local -z points at the pad centre
  p.push(tx, 0, tz, Math.atan2(Math.cos(a), Math.sin(a)));
  const bottom = terrainHeight(x + tx, z + tz) - top - 0.35;
  p.slab("foundation", 1.3, -bottom, 1.3, 0, bottom, 0, { c: 0.05 });
  p.slab("graphite", 0.52, 2.9, 0.52, 0, 0, 0, { c: 0.03 });
  p.box("alu", 0.44, 2.3, 0.04, 0, 1.35, -0.27, { c: 0.008, plain: true });
  for (const s of [-1, 1]) p.slab("alu", 0.04, 2.7, 0.46, s * 0.28, 0.1, 0, { plain: true });
  p.box("lightInfo", 0.05, 0.9, 0.02, 0.15, 1.75, -0.295);
  p.slab("alu", 0.9, 0.3, 0.9, 0, 2.9, 0, { c: 0.03 });
  p.cyl("lightAmber", 0.06, 0.06, 0.1, 0, 3.25, 0.25, { seg: 8 });
  if (p.detail) p.decal("hv", 0.26, 0, 0.75, -0.3, { ry: Math.PI });
  // boom
  const root: [number, number, number] = [0, 3.05, -0.35];
  if (docked) {
    // the lander's port is 1.52 m from the pad centre, 1.55 m above the deck
    const reach = R - 1.62;
    const elbow: [number, number, number] = [0, 3.6, -reach * 0.45];
    const tip: [number, number, number] = [0, 1.7, -reach];
    p.pipe("frame", 0.07, [root, elbow, tip]);
    p.rod("cable", 0.035, [0.1, 3.0, -0.3], [0.1, 3.52, -reach * 0.45], 6);
    p.rod("cable", 0.035, [0.1, 3.52, -reach * 0.45], [0.1, 1.8, -reach + 0.1], 6);
    p.box("graphite", 0.26, 0.26, 0.34, tip[0], tip[1] - 0.1, tip[2] + 0.12, { c: 0.02 });
    p.box("lightInfo", 0.12, 0.03, 0.02, tip[0], tip[1] + 0.05, tip[2] + 0.3);
  } else {
    const tip: [number, number, number] = [0, 3.35, -1.5];
    p.pipe("frame", 0.07, [root, [0, 3.45, -0.9], tip]);
    p.box("graphite", 0.24, 0.3, 0.24, tip[0], tip[1] - 0.2, tip[2], { c: 0.02 });
  }
  p.pop();
}

/** grated walkway off the deck edge at angle a, with stairs to the regolith */
function walkway(p: Parts, x: number, z: number, top: number, r: number, a: number) {
  const [ex, , ez] = polar(a, r - 0.05, 0);
  // local -z points outward
  p.push(ex, 0, ez, Math.atan2(-Math.cos(a), -Math.sin(a)));
  const len = 2.2;
  p.slab("vent", 1.5, 0.08, len, 0, -0.08, -len / 2);
  for (const s of [-1, 1]) p.box("frame", 0.06, 0.14, len, s * 0.75, -0.07, -len / 2);
  const [fx, , fz] = polar(a, r + len + 1.2, 0);
  const ground = Math.min(-0.3, terrainHeight(x + fx, z + fz) - top);
  for (const s of [-1, 1]) {
    p.rod("frame", 0.05, [s * 0.68, -0.1, -len + 0.15], [s * 0.68, ground - 0.2, -len + 0.15], 6);
  }
  stairs(p, 0, -len, ground, 1.4);
  handrail(p, [[0.74, -0.2], [0.74, -len]], 0, 1.0, 1.1);
  handrail(p, [[-0.74, -0.2], [-0.74, -len]], 0, 1.0, 1.1);
  p.pop();
}

/** low perimeter rail around the deck, open at the given [angle, half-width] gaps */
function perimeterRail(p: Parts, r: number, gaps: V2[]) {
  if (!p.detail) return;
  const R = r - 0.14;
  const step = 2.2 / R;
  const open = (a: number) => gaps.some(([g, w]) => angleDiff(a, g) < w);
  let run: [number, number][] = [];
  const flush = () => {
    if (run.length > 1) handrail(p, run, 0, 0.7, 2.2);
    run = [];
  };
  const n = Math.ceil((Math.PI * 2) / step);
  const start = gaps.length ? gaps[0][0] : 0;
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    if (open(a)) {
      flush();
      continue;
    }
    run.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  flush();
}

/* ------------------------------------------------------------------ */
/* the lander: descent stage, crew / cargo module, four legs           */
/* frame: deck top at y = 0, the umbilical port on +z                  */
/* ------------------------------------------------------------------ */

function lander(p: Parts) {
  const legA = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  /* descent stage: foil-wrapped octagon between two structural decks */
  p.prism("foil", 1.5, 1.05, 8, 0, 1.55, 0, { ry: Math.PI / 8 });
  p.prism("alu", 1.42, 0.08, 8, 0, 1.0, 0, { ry: Math.PI / 8 });
  p.prism("graphite", 1.6, 0.1, 8, 0, 2.12, 0, { ry: Math.PI / 8 });
  // main engine: mount, bell, and the heat shield ring around it
  p.cyl("frame", 0.34, 0.38, 0.22, 0, 0.88, 0, { seg: 16 });
  p.cyl("graphite", 0.3, 0.56, 0.62, 0, 0.47, 0, { seg: 20, open: true });
  p.cyl("copper", 0.29, 0.3, 0.06, 0, 0.76, 0, { seg: 16 });
  p.cyl("alu", 0.95, 0.95, 0.04, 0, 0.97, 0, { seg: 24 });
  // umbilical port on +z, lit while the tower's boom is connected
  p.box("graphite", 0.46, 0.4, 0.14, 0, 1.55, 1.45, { c: 0.02 });
  p.box("lightInfo", 0.2, 0.03, 0.02, 0, 1.8, 1.52);
  // RCS quads on the upper deck corners
  for (const a of legA) {
    const [x, , z] = polar(a, 1.48, 0);
    p.box("graphite", 0.24, 0.2, 0.24, x, 2.28, z, { ry: -a, c: 0.02 });
    if (p.detail) {
      for (const s of [-1, 1]) p.cyl("frame", 0.03, 0.05, 0.1, ...polar(a + s * 0.09, 1.62, 2.28), { rz: Math.PI / 2, ry: -a, seg: 6 });
    }
  }

  /* legs: primary strut with shock absorber, two secondary struts, footpad */
  for (const a of legA) {
    const foot = polar(a, 2.6, 0.12);
    const hard = polar(a, 1.45, 1.95);
    p.rod("alu", 0.07, hard, foot, 8);
    // shock absorber on the upper half
    const sa = hard.map((v, i) => v + (foot[i] - v) * 0.08) as [number, number, number];
    const sb = hard.map((v, i) => v + (foot[i] - v) * 0.5) as [number, number, number];
    p.rod("frame", 0.11, sa, sb, 10);
    for (const s of [-1, 1]) {
      p.rod("frame", 0.04, polar(a + s * 0.42, 1.34, 1.02), polar(a, 2.38, 0.34), 6);
    }
    // footpad: shallow dish on a ball joint, resting on the deck
    p.cyl("alu", 0.3, 0.4, 0.1, foot[0], 0.05, foot[2], { seg: 14 });
    p.sphere("frame", 0.09, foot[0], 0.15, foot[2]);
  }

  /* crew / cargo module on the upper deck */
  p.cyl("deck", 1.02, 1.08, 1.65, 0, 2.99, 0, { seg: 20 });
  p.sphere("deck", 1.02, 0, 3.8, 0, { cap: true });
  p.torus("graphite", 1.06, 0.05, 0, 2.2, 0, { seg: 32 });
  p.torus("graphite", 1.03, 0.04, 0, 3.8, 0, { seg: 32 });
  // forward windows (+z), hatch on -x, radiator on +x
  for (const s of [-1, 1]) {
    p.box("glass", 0.28, 0.22, 0.05, s * 0.26, 3.35, 1.03, { ry: s * -0.25 });
  }
  p.push(-1.05, 2.2, 0, -Math.PI / 2);
  p.box("graphite", 0.78, 1.25, 0.06, 0, 0.72, 0.02, { c: 0.03, plain: true });
  p.box("alu", 0.64, 1.1, 0.04, 0, 0.72, 0.05, { c: 0.02, plain: true });
  p.box("frame", 0.05, 0.28, 0.05, 0.22, 0.72, 0.09);
  p.pop();
  p.push(1.08, 2.25, 0, Math.PI / 2);
  p.box("radiator", 1.0, 1.2, 0.05, 0, 0.75, 0.02);
  p.pop();
  // ladder from the hatch down between two legs
  if (p.detail) {
    const rails: [number, number][] = [[-0.26, 0], [0.26, 0]];
    for (const [dz] of rails) p.rod("frame", 0.025, [-1.62, 2.1, dz], [-2.25, 0.02, dz], 6);
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      const lx = -1.62 + (-2.25 + 1.62) * t;
      const ly = 2.1 + (0.02 - 2.1) * t;
      p.rod("frame", 0.02, [lx, ly, -0.26], [lx, ly, 0.26], 5);
    }
  }
  // antenna mast and a small dish
  p.rod("frame", 0.035, [0.45, 4.1, -0.35], [0.45, 4.85, -0.35], 6);
  p.cyl("alu", 0.34, 0.06, 0.1, 0.45, 4.95, -0.35, { rx: -0.5, seg: 14 });
}

/* ------------------------------------------------------------------ */
/* rover charging: posts (instanced), cabinet, utility rover           */
/* ------------------------------------------------------------------ */

/** charger post; frame: terrain at y = 0, the bay toward -z, the conduit toward +z */
function chargerPost(p: Parts) {
  p.slab("foundation", 1.9, 0.5, 1.5, 0, -0.35, 0.1, { c: 0.04 });
  // graphite cabinet between aluminium fins, aluminium canopy
  p.slab("graphite", 0.78, 1.95, 0.56, 0, 0.15, 0.05, { c: 0.03 });
  p.box("alu", 0.7, 1.45, 0.04, 0, 1.0, -0.25, { c: 0.008, plain: true });
  for (const s of [-1, 1]) p.slab("alu", 0.05, 1.86, 0.52, s * 0.415, 0.15, 0.05, { plain: true });
  p.slab("alu", 1.05, 0.09, 0.84, 0, 2.1, -0.04, { c: 0.02 });
  // operator screen and status
  p.box("glass", 0.46, 0.32, 0.02, 0, 1.42, -0.28);
  p.box("lightInfo", 0.46, 0.035, 0.02, 0, 1.66, -0.275);
  p.box("lightAmber", 0.05, 0.05, 0.02, 0.28, 1.66, -0.275);
  // connector holster and a coiled cable on the bay side
  p.box("graphite", 0.16, 0.24, 0.16, 0.3, 1.12, -0.33, { c: 0.02 });
  p.torus("cable", 0.17, 0.03, -0.16, 0.7, -0.3, { rx: -Math.PI / 2, seg: 16 });
  // cable duct back to the conduit trench
  p.slab("cable", 0.3, 0.14, 1.5, 0, 0, 1.05);
  // wheel stop and bollards
  p.slab("foundation", 1.7, 0.14, 0.24, 0, 0, -1.55, { c: 0.03 });
  for (const s of [-1, 1]) {
    p.cyl("frame", 0.07, 0.07, 0.85, s * 1.05, 0.425, -0.75, { seg: 10 });
    p.cyl("lightAmber", 0.075, 0.075, 0.04, s * 1.05, 0.78, -0.75, { seg: 10 });
  }
  if (p.detail) p.decal("EV-CHG", 0.46, 0.446, 1.78, 0.05, { ry: Math.PI / 2 });
}

/** distribution cabinet at the head of a charging row (frame like a post) */
function distributionCabinet(p: Parts) {
  p.slab("foundation", 2.4, 0.5, 1.6, 0, -0.35, 0, { c: 0.05 });
  p.slab("alu", 1.9, 1.7, 1.0, 0, 0.15, 0, { c: 0.04 });
  p.slab("graphite", 2.0, 0.1, 1.1, 0, 1.85, 0, { c: 0.02 });
  p.push(0, 0.15, -0.5, Math.PI);
  louvre(p, -0.45, 0.85, 0, 0.6, 0.9);
  louvre(p, 0.45, 0.85, 0, 0.6, 0.9);
  p.pop();
  p.box("lightInfo", 1.2, 0.035, 0.02, 0, 1.72, -0.51);
  if (p.detail) p.decal("hv", 0.28, 0, 1.45, -0.515, { ry: Math.PI });
  p.slab("cable", 0.36, 0.14, 1.4, 0, 0, 1.2);
}

/** compact six-wheel utility rover charging nose-in; frame: ground at y = 0, nose on +z */
function utilityRover(p: Parts) {
  // chassis, wheels and hubs
  p.slab("graphite", 1.3, 0.3, 2.5, 0, 0.42, 0, { c: 0.04 });
  for (const z of [-0.88, 0, 0.88]) {
    for (const s of [-1, 1]) {
      p.cyl("cable", 0.36, 0.36, 0.26, s * 0.82, 0.36, z, { rz: Math.PI / 2, seg: 14 });
      p.cyl("alu", 0.16, 0.16, 0.28, s * 0.82, 0.36, z, { rz: Math.PI / 2, seg: 10 });
    }
  }
  // off-white body, dark visor at the front
  p.slab("deck", 1.2, 0.62, 1.7, 0, 0.72, -0.25, { c: 0.08 });
  p.slab("deck", 1.1, 0.32, 0.6, 0, 0.72, 0.85, { c: 0.06 });
  p.box("glass", 0.9, 0.2, 0.04, 0, 1.12, 0.61);
  p.box("radiator", 1.05, 0.04, 1.2, 0, 1.37, -0.35);
  // mast with a camera head
  p.rod("frame", 0.03, [0.42, 1.36, 0.4], [0.42, 1.95, 0.4], 6);
  p.box("alu", 0.26, 0.14, 0.14, 0.42, 2.0, 0.42, { c: 0.02 });
  // charge port on the nose and the cable to the post's holster
  p.box("graphite", 0.2, 0.16, 0.06, 0.2, 0.84, 1.16);
  p.box("lightInfo", 0.12, 0.025, 0.02, 0.2, 0.95, 1.19);
  p.pipe("cable", 0.035, [
    [0.22, 0.84, 1.2],
    [0.26, 0.3, 1.8],
    [0.3, 0.55, 2.45],
    [0.3, 1.0, 2.66],
  ]);
}
