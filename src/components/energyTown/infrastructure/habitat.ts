import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  MAIN_DOME,
  archOutline,
  elevationAt,
  elevationForRadius,
  glassGeometry,
  radiusAtHeight,
  revealGeometry,
  ribGeometry,
  ribMatrices,
  satelliteDome,
  shellGeometry,
  shellHoles,
  sweepOutline,
  type DomeEntrance,
  type DomeSpec,
} from "@/components/shared/domeArchitecture";
import { terrainHeight } from "../scene/terrain";
import { ENTRANCE_ANGLE, domeFloorY, hexNodes, mainDomeFloorY, yawFacing } from "../scene/habitatSite";
import type { InfraContext } from "./context";

/* ------------------------------------------------------------------ */
/* The habitat: the main Dome (home of the Spirit Connect workspace),  */
/* six satellite domes on the hexagon, the corridors between them and  */
/* the small domes at the landing pads.                                */
/*                                                                     */
/* One architectural language (see shared/domeArchitecture), the same  */
/* one the workspace interior is built from:                           */
/*   off-white ceramic shell panels   · a few strong silver ribs        */
/*   a structural base ring on a sintered-regolith plinth               */
/*   recessed dark-glass openings     · a glazed oculus in a crown ring */
/*   an airlock vestibule with a pressure-door frame                    */
/*   warm functional lighting only where people are                     */
/* Everything merges into one mesh per material.                        */
/* ------------------------------------------------------------------ */

type Key = "shell" | "ceramic" | "rib" | "joint" | "glass" | "lining" | "light" | "portal" | "foundation";

/** ceramic shell panels: u = azimuth, v = elevation; joints thin out towards the crown */
function makeShellPanelTexture() {
  const W = 2048;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const rows = 6;
  const columnsAt = (row: number) => (row < 3 ? 48 : row < 5 ? 24 : 12);
  // barely-there tonal variation per panel (fired ceramic is never uniform)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let r = 0; r < rows; r++) {
    const cols = columnsAt(r);
    const y1 = H - (r / rows) * H;
    const y0 = H - ((r + 1) / rows) * H;
    for (let i = 0; i < cols; i++) {
      const k = 238 + Math.round(rnd() * 5);
      ctx.fillStyle = `rgb(${k}, ${k - 1}, ${k - 3})`;
      ctx.fillRect((i / cols) * W, y0, W / cols, y1 - y0);
    }
  }
  // fine joints (also the bump map: slightly recessed)
  ctx.fillStyle = "rgba(120, 120, 122, 0.3)";
  for (let r = 0; r < rows; r++) {
    const cols = columnsAt(r);
    const y1 = H - (r / rows) * H;
    const y0 = H - ((r + 1) / rows) * H;
    ctx.fillRect(0, y0 - 1, W, 1.5);
    for (let i = 0; i < cols; i++) ctx.fillRect((i / cols) * W - 0.75, y0, 1.5, y1 - y0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** the lit Dome interior seen through the inner portal of the airlock */
function makePortalTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#fbf8f2");
  g.addColorStop(0.55, "#f1ede6");
  g.addColorStop(0.7, "#c9c5be");
  g.addColorStop(1, "#b3afa8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  // the workstation, far away, as a soft dark line
  const band = ctx.createLinearGradient(0, 150, 0, 178);
  band.addColorStop(0, "rgba(40, 40, 42, 0)");
  band.addColorStop(0.5, "rgba(40, 40, 42, 0.35)");
  band.addColorStop(1, "rgba(40, 40, 42, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 150, 128, 28);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type Habitat = {
  applyTheme: (mix: number) => void;
  /** world height of the main Dome's oculus cap (for the navigation light) */
  crownY: number;
};

export type PadDome = { x: number; z: number; radius: number; floor: number; facing: number };

export function buildHabitat(ctx: InfraContext, padDomes: PadDome[]): Habitat {
  const { kit, track, detail, shadows, group } = ctx;
  const shellTex = track(makeShellPanelTexture());
  const portalTex = track(makePortalTexture());
  const std = (p: THREE.MeshStandardMaterialParameters) => track(new THREE.MeshStandardMaterial(p));
  const mats: Record<Key, THREE.Material> = {
    shell: std({ color: "#e4e2dd", map: shellTex, bumpMap: shellTex, bumpScale: 0.5, roughness: 0.66, metalness: 0.04 }),
    ceramic: std({ color: "#dcdad5", roughness: 0.6, metalness: 0.05 }),
    rib: std({ color: "#bfc2c6", roughness: 0.38, metalness: 0.55 }),
    joint: kit.mats.graphite,
    glass: std({
      color: "#0b0d10",
      roughness: 0.07,
      metalness: 0.9,
      emissive: new THREE.Color("#ffd8ad"),
      emissiveIntensity: 0,
    }),
    lining: std({ color: "#6a6863", roughness: 0.8, metalness: 0.08 }),
    light: std({ color: "#1b1815", roughness: 0.4, emissive: new THREE.Color("#fff1dd"), emissiveIntensity: 1.5 }),
    portal: track(new THREE.MeshBasicMaterial({ map: portalTex, toneMapped: false })),
    foundation: kit.mats.foundation,
  };

  const buckets = new Map<Key, THREE.BufferGeometry[]>();
  const M = new THREE.Matrix4();
  /** add a copy of `geo` under each matrix; `geo` is disposed */
  function add(key: Key, geo: THREE.BufferGeometry, ...matrices: THREE.Matrix4[]) {
    let list = buckets.get(key);
    if (!list) buckets.set(key, (list = []));
    for (const m of matrices) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      for (const name of Object.keys(g.attributes)) {
        if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
      }
      g.clearGroups();
      g.applyMatrix4(m);
      list.push(g);
    }
    geo.dispose();
  }
  const at = (frame: THREE.Matrix4, x: number, y: number, z: number, ry = 0) =>
    frame.clone().multiply(M.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
  const box = (key: Key, frame: THREE.Matrix4, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) =>
    add(key, new THREE.BoxGeometry(w, h, d), at(frame, x, y, z, ry));
  const v2 = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

  /* ---------------- one dome ---------------- */
  function buildDome(spec: DomeSpec, frame: THREE.Matrix4, plinthDepth: number | null) {
    const s = { R: spec.radius, H: spec.height };
    const R = spec.radius;
    const main = spec === MAIN_DOME;
    const radial = main ? (detail ? 144 : 96) : detail ? 72 : 48;
    const tTop = elevationForRadius(s, spec.oculus);
    const holes = shellHoles(spec, s);
    add("shell", shellGeometry(s, { cols: radial, rows: main ? 26 : 14, tTop, holes }), frame);

    // a few strong ribs, proud of the shell
    const tBase = elevationAt(s, spec.baseRing);
    add(
      "rib",
      ribGeometry(s, tBase, tTop - 0.004, spec.ribWidth, -0.03, R * 0.013, main ? 32 : 18),
      ...ribMatrices(spec).map((m) => frame.clone().multiply(m)),
    );

    // structural base ring (open at the entrance)
    const gap = spec.entrance ? Math.asin((spec.entrance.outerWidth / 2 + 0.02) / R) : 0;
    const br = spec.baseRing;
    // lathe profiles run bottom → top so the surface faces outwards
    const ring = v2([
      [R + 0.28, -0.3],
      [R + 0.28, br - 0.08],
      [R + 0.2, br],
      [R - 0.06, br + 0.05],
    ]);
    add("rib", new THREE.LatheGeometry(ring, radial, gap, Math.PI * 2 - gap * 2), frame);

    // oculus: compression ring + a low glazed cap
    const yTop = s.H * Math.sin(tTop);
    const oc = spec.oculus;
    add(
      "rib",
      new THREE.LatheGeometry(
        v2([
          [oc + 0.36, yTop - 0.3],
          [oc + 0.34, yTop + 0.13],
          [oc + 0.08, yTop + 0.2],
          [oc - 0.03, yTop + 0.1],
        ]),
        radial,
      ),
      frame,
    );
    const cap: number[][] = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      cap.push([Math.cos(a) * (oc + 0.02), yTop + 0.14 + Math.sin(a) * oc * 0.24]);
    }
    add("glass", new THREE.LatheGeometry(v2(cap), radial), frame);

    // recessed dark-glass openings
    const depth = main ? 0.34 : 0.22;
    for (const hole of holes.slice(0, spec.openings.length)) {
      add("joint", revealGeometry(s, hole, 0, -depth), frame);
      add("glass", glassGeometry(s, hole, -depth, 1), frame);
    }

    // sintered-regolith plinth: a ledge beyond the base ring, skirting into the ground
    if (plinthDepth !== null) {
      // top just below the floor, so it never shows inside the vestibule
      const h = plinthDepth - 0.04;
      add("foundation", new THREE.CylinderGeometry(R + 0.44, R + 0.8, h, radial, 1), at(frame, 0, -h / 2 - 0.04, 0));
    }

    if (spec.entrance) buildVestibule(spec.entrance, frame);
  }

  /* ---------------- the airlock vestibule ---------------- */
  function buildVestibule(e: DomeEntrance, frame: THREE.Matrix4) {
    const L = e.z1 - e.z0;
    const mid = (e.z0 + e.z1) / 2;
    const outer = archOutline(e.outerWidth, e.outerHeight + 0.3, e.outerCorner, -0.3);
    const inner = archOutline(e.width, e.height, e.corner, 0);
    add("ceramic", sweepOutline(outer.points, e.z0, e.z1, false), frame);
    add("lining", sweepOutline(inner.points, e.z0, e.z1 + 0.16, true), frame);
    // segmented construction: two fine joints around the body
    const joint = archOutline(e.outerWidth + 0.03, e.outerHeight + 0.315, e.outerCorner + 0.015, -0.3);
    for (const z of [e.z1 - 1.5, e.z1 - 3]) add("joint", sweepOutline(joint.points, z - 0.04, z + 0.04, false), frame);

    const ringFace = (o: { points: THREE.Vector2[] }, i: { points: THREE.Vector2[] }) => {
      const shape = new THREE.Shape(o.points);
      shape.holes.push(new THREE.Path(i.points));
      return new THREE.ShapeGeometry(shape, 8);
    };
    // outer face (+z) and the portal face inside the Dome (−z)
    add("rib", ringFace(outer, inner).translate(0, 0, e.z1), frame);
    add("rib", ringFace(outer, inner).rotateY(Math.PI).translate(0, 0, e.z0), frame);

    // pressure-door frame, proud of the face
    const fo = archOutline(e.width + 0.36, e.height + 0.18, e.corner + 0.16, 0);
    add("rib", sweepOutline(fo.points, e.z1, e.z1 + 0.16, false), frame);
    add("rib", ringFace(fo, inner).translate(0, 0, e.z1 + 0.16), frame);
    box("joint", frame, e.width - 0.06, 0.03, 0.6, 0, 0.015, e.z1 - 0.15); // threshold plate

    // inside: two ceiling light lines and a floor wash, the rest in shade
    for (const side of [-1, 1]) {
      box("light", frame, 0.05, 0.022, L - 0.7, side * (e.width / 2 - 0.36), e.height - 0.07, mid);
      box("light", frame, 0.03, 0.012, L - 0.4, side * (e.width / 2 - 0.05), 0.006, mid);
    }
    // outside: a light bar over the door, a service interface on the flank
    box("light", frame, e.width * 0.6, 0.045, 0.05, 0, e.height + 0.32, e.z1 + 0.19);
    box("joint", frame, 0.1, 0.9, 0.56, e.outerWidth / 2 + 0.04, 1.25, e.z1 - 1.25);
    box("light", frame, 0.02, 0.05, 0.2, e.outerWidth / 2 + 0.1, 1.56, e.z1 - 1.25);

    // the lit Dome interior beyond the inner portal
    add("portal", new THREE.ShapeGeometry(inner.shape, 8).translate(0, 0, e.z0 - 0.03), frame);

    // plinth under the vestibule, a graphite threshold plate before the door
    box("foundation", frame, e.outerWidth + 0.5, 1.2, L + 0.4, 0, -0.62, mid);
    box("foundation", frame, e.outerWidth + 0.8, 1.2, 3.2, 0, -0.64, e.z1 + 1.6);
    box("joint", frame, e.width + 0.9, 0.06, 2.6, 0, -0.03, e.z1 + 1.4);
  }

  /* ---------------- corridors ---------------- */
  type Node = { x: number; z: number; floor: number; spec: DomeSpec };
  const tubeSeg = detail ? 24 : 14;
  function corridor(a: Node, b: Node) {
    const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    const inset = (n: Node) => radiusAtHeight({ R: n.spec.radius, H: n.spec.height }, 1.9) - 0.25;
    const A = new THREE.Vector3(a.x, a.floor + 1.1, a.z).addScaledVector(dir, inset(a));
    const B = new THREE.Vector3(b.x, b.floor + 1.1, b.z).addScaledVector(dir, -inset(b));
    const axis = new THREE.Vector3().subVectors(B, A);
    const len = axis.length();
    axis.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    const along = (d: number) =>
      new THREE.Matrix4().compose(A.clone().addScaledVector(axis, d), q, new THREE.Vector3(1, 1, 1));
    add("ceramic", new THREE.CylinderGeometry(0.8, 0.8, len, tubeSeg, 1, true), along(len / 2));
    // docking collars where the corridor meets each shell
    add("rib", new THREE.CylinderGeometry(1.0, 1.0, 0.6, tubeSeg, 1), along(0.2), along(len - 0.2));
    const n = Math.max(1, Math.round(len / 5.5));
    const joints: THREE.Matrix4[] = [];
    const feet: THREE.Matrix4[] = [];
    for (let i = 1; i < n; i++) {
      const d = (len * i) / n;
      joints.push(along(d));
      const p = A.clone().addScaledVector(axis, d);
      const ground = terrainHeight(p.x, p.z) - 0.3;
      const h = Math.max(0.2, p.y - 0.62 - ground);
      feet.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(p.x, ground + h / 2, p.z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dir.x, dir.z)),
          new THREE.Vector3(1, h, 1),
        ),
      );
    }
    if (joints.length) add("joint", new THREE.CylinderGeometry(0.84, 0.84, 0.12, tubeSeg, 1, true), ...joints);
    if (feet.length) add("foundation", new THREE.BoxGeometry(1.2, 1, 0.5), ...feet);
  }

  /* ---------------- assemble ---------------- */
  const plinth = (x: number, z: number, R: number, floor: number) => {
    let low = Infinity;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      low = Math.min(low, terrainHeight(x + Math.cos(a) * (R + 0.8), z + Math.sin(a) * (R + 0.8)));
    }
    ctx.ground.disc(x, z, R + 1.6);
    return floor - low + 0.5;
  };

  const mainFloor = mainDomeFloorY();
  const mainFrame = new THREE.Matrix4().compose(
    new THREE.Vector3(0, mainFloor, 0),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawFacing(ENTRANCE_ANGLE)),
    new THREE.Vector3(1, 1, 1),
  );
  buildDome(MAIN_DOME, mainFrame, plinth(0, 0, MAIN_DOME.radius, mainFloor));
  // paved approach to the airlock
  {
    const d = MAIN_DOME.entrance!.z1 + 6;
    ctx.ground.rect(Math.cos(ENTRANCE_ANGLE) * d, Math.sin(ENTRANCE_ANGLE) * d, 4.6, 10, yawFacing(ENTRANCE_ANGLE));
  }

  const hub: Node = { x: 0, z: 0, floor: mainFloor, spec: MAIN_DOME };
  const satellites: Node[] = hexNodes().map((n) => {
    const spec = satelliteDome(6.5);
    const floor = domeFloorY(n.x, n.z);
    const frame = new THREE.Matrix4().compose(
      new THREE.Vector3(n.x, floor, n.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawFacing(n.angle)),
      new THREE.Vector3(1, 1, 1),
    );
    buildDome(spec, frame, plinth(n.x, n.z, spec.radius, floor));
    return { x: n.x, z: n.z, floor, spec };
  });
  satellites.forEach((s, i) => {
    corridor(hub, s);
    // the ring stays open on the Dome's axis: an entrance court in front of
    // the airlock (3–4) and a view court behind the panorama (0–1)
    if (i !== 3 && i !== 0) corridor(s, satellites[(i + 1) % satellites.length]);
  });

  for (const pd of padDomes) {
    const frame = new THREE.Matrix4().compose(
      new THREE.Vector3(pd.x, pd.floor, pd.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawFacing(pd.facing)),
      new THREE.Vector3(1, 1, 1),
    );
    // stands on its landing-pad platform: no plinth of its own
    buildDome(satelliteDome(pd.radius), frame, null);
  }

  for (const [key, list] of buckets) {
    const merged = mergeGeometries(list, false);
    for (const g of list) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(track(merged), mats[key]);
    mesh.name = `habitat-${key}`;
    const lit = key === "light" || key === "portal";
    // the lining is always in the vestibule's own shade: it takes no part in
    // the sun's shadow map (which would only add acne at this scale)
    const sunlit = !lit && key !== "lining";
    mesh.castShadow = shadows && sunlit;
    mesh.receiveShadow = shadows && sunlit;
    group.add(mesh);
  }

  /* ---------------- theme ---------------- */
  const themed: [THREE.MeshStandardMaterial, THREE.Color, THREE.Color][] = (
    [
      ["shell", "#e4e2dd", "#3d4354"],
      ["ceramic", "#dcdad5", "#383f4f"],
      ["rib", "#bfc2c6", "#343b4a"],
      ["lining", "#6a6863", "#262b35"],
    ] as const
  ).map(([k, d, n]) => [mats[k] as THREE.MeshStandardMaterial, new THREE.Color(d), new THREE.Color(n)]);
  const glass = mats.glass as THREE.MeshStandardMaterial;
  const light = mats.light as THREE.MeshStandardMaterial;

  function applyTheme(mix: number) {
    for (const [mat, d, n] of themed) mat.color.copy(d).lerp(n, mix);
    // people live here: the windows glow warm at night
    glass.emissiveIntensity = 0.5 * mix;
    light.emissiveIntensity = 1.5 + 0.8 * mix;
  }
  applyTheme(0);

  const tTop = elevationForRadius({ R: MAIN_DOME.radius, H: MAIN_DOME.height }, MAIN_DOME.oculus);
  return {
    applyTheme,
    crownY: mainFloor + MAIN_DOME.height * Math.sin(tTop) + 0.14 + MAIN_DOME.oculus * 0.24,
  };
}
