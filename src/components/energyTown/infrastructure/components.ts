import type { MatKey } from "../scene/materials";
import type { Parts } from "./parts";

/* ------------------------------------------------------------------ */
/* Reusable engineered components shared by every installation, so     */
/* doors, insulators, radiators and rails look the same everywhere.    */
/* Coordinates are in the caller's current Parts frame.                */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number];

/**
 * Porcelain HV insulator / bushing: metal end fittings, a ceramic core
 * and alternating large / small sheds. `axis` is the direction it points.
 */
export function insulator(p: Parts, base: V3, length: number, r: number, axis: "y" | "x" | "z" = "y") {
  const [x, y, z] = base;
  const rot = axis === "y" ? {} : axis === "x" ? { rz: -Math.PI / 2 } : { rx: Math.PI / 2 };
  const at = (t: number): V3 =>
    axis === "y" ? [x, y + t, z] : axis === "x" ? [x + t, y, z] : [x, y, z + t];
  const cap = Math.min(0.1, length * 0.12);
  p.cyl("frame", r * 0.62, r * 0.7, cap, ...at(cap / 2), rot);
  p.cyl("frame", r * 0.5, r * 0.62, cap, ...at(length - cap / 2), rot);
  p.cyl("ceramic", r * 0.42, r * 0.42, length - cap * 2, ...at(length / 2), { ...rot, seg: 10 });
  if (!p.detail) {
    p.cyl("ceramic", r * 0.85, r * 0.85, (length - cap * 2) * 0.8, ...at(length / 2), { ...rot, seg: 12 });
    return;
  }
  const n = Math.max(3, Math.floor((length - cap * 2) / (r * 0.75)));
  for (let i = 0; i < n; i++) {
    const t = cap + ((i + 0.5) / n) * (length - cap * 2);
    const big = i % 2 === 0;
    p.cyl("ceramic", big ? r * 0.7 : r * 0.62, big ? r : r * 0.8, r * 0.16, ...at(t), { ...rot, seg: 14 });
  }
}

/**
 * Hinged service door on a wall facing +z of the current frame:
 * recessed frame, plain leaf, handle, small viewport and a lamp above.
 */
export function serviceDoor(
  p: Parts,
  x: number,
  y: number,
  z: number,
  w = 1.0,
  h = 2.1,
  opts: { lamp?: MatKey; window?: boolean } = {},
) {
  p.box("graphite", w + 0.2, h + 0.12, 0.08, x, y + (h + 0.12) / 2, z + 0.04, { plain: true });
  p.box("alu", w, h, 0.05, x, y + h / 2, z + 0.09, { c: 0.015, plain: true });
  if (p.detail) {
    p.box("frame", 0.05, 0.3, 0.05, x + w / 2 - 0.14, y + h * 0.48, z + 0.14);
    // kick plate
    p.box("graphite", w * 0.92, 0.22, 0.02, x, y + 0.15, z + 0.12, { plain: true });
  }
  if (opts.window) p.box("glass", w * 0.36, 0.34, 0.02, x, y + h * 0.74, z + 0.12);
  if (opts.lamp) {
    p.box("graphite", w * 0.6, 0.08, 0.16, x, y + h + 0.24, z + 0.1, { plain: true });
    p.box(opts.lamp, w * 0.44, 0.04, 0.06, x, y + h + 0.18, z + 0.12);
  }
}

/** louvred vent panel with a thin bezel, facing +z */
export function louvre(p: Parts, x: number, y: number, z: number, w: number, h: number) {
  p.box("graphite", w + 0.08, h + 0.08, 0.04, x, y, z + 0.02, { plain: true });
  p.box("vent", w, h, 0.03, x, y, z + 0.05);
}

/**
 * Heat-rejection panel standing in the x-y plane: tube-and-fin sheet,
 * top and bottom header pipes, edge stiffeners.
 */
export function radiatorPanel(p: Parts, x: number, y: number, z: number, w: number, h: number) {
  p.box("radiator", w, h, 0.07, x, y + h / 2, z);
  p.rod("alu", 0.07, [x - w / 2 - 0.05, y + h + 0.02, z], [x + w / 2 + 0.05, y + h + 0.02, z]);
  p.rod("alu", 0.07, [x - w / 2 - 0.05, y - 0.02, z], [x + w / 2 + 0.05, y - 0.02, z]);
  p.box("frame", 0.06, h, 0.1, x - w / 2 - 0.03, y + h / 2, z);
  p.box("frame", 0.06, h, 0.1, x + w / 2 + 0.03, y + h / 2, z);
}

/** handrail along a polyline at height h above each point */
export function handrail(p: Parts, pts: [number, number][], y: number, h = 1.05, spacing = 1.4) {
  if (!p.detail) return;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / spacing));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      p.rod("frame", 0.03, [px, y, pz], [px, y + h, pz], 6);
    }
    p.rod("alu", 0.028, [ax, y + h, az], [bx, y + h, bz], 6);
    p.rod("frame", 0.02, [ax, y + h * 0.5, az], [bx, y + h * 0.5, bz], 6);
  }
}

/** row of flat hazard-stripe decals on the deck, running along x or z */
export function hazardStrip(p: Parts, a0: number, a1: number, y: number, at: number, axis: "x" | "z" = "x", h = 0.16) {
  const len = Math.abs(a1 - a0);
  const n = Math.max(1, Math.round(len / (h * 8)));
  const w = len / n;
  for (let i = 0; i < n; i++) {
    const t = Math.min(a0, a1) + w * (i + 0.5);
    if (axis === "x") p.decal("hazard", w, t, y, at, { rx: -Math.PI / 2, h });
    else p.decal("hazard", w, at, y, t, { rx: -Math.PI / 2, ry: Math.PI / 2, h });
  }
}

/**
 * Stepped access stair from a deck at y = 0 down to the ground at y = ground,
 * running toward -z from the deck edge at z0.
 */
export function stairs(p: Parts, x: number, z0: number, ground: number, w = 1.4) {
  const drop = -ground;
  const n = Math.max(2, Math.round(drop / 0.2));
  const rise = drop / n;
  for (let k = 0; k < n - 1; k++) {
    const top = -rise * (k + 1);
    const bottom = ground - 0.25;
    p.slab("foundation", w, top - bottom, 0.34, x, bottom, z0 - 0.17 - 0.34 * k, { c: 0.02 });
  }
  if (!p.detail) return;
  const run = 0.34 * (n - 1);
  for (const side of [-1, 1]) {
    const sx = x + (side * w) / 2 - side * 0.05;
    const top: V3 = [sx, 0.95, z0 - 0.1];
    const low: V3 = [sx, -rise * (n - 1) + 0.95, z0 - run + 0.1];
    p.rod("frame", 0.03, [sx, 0, z0 - 0.1], top, 6);
    p.rod("frame", 0.03, [sx, low[1] - 0.95, low[2]], low, 6);
    p.rod("alu", 0.028, top, low, 6);
  }
}
