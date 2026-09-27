import * as THREE from "three";
import { mulberry32 } from "./random";

/* ------------------------------------------------------------------ */
/* Procedural surface textures for the lunar infrastructure.           */
/*                                                                     */
/* Surface maps are channel-packed so one texture drives several       */
/* material slots:                                                     */
/*   R = relief (bumpMap) and ambient occlusion (aoMap)                */
/*   G = roughness factor (roughnessMap)                               */
/* UVs are metres (see infrastructure/parts.ts), so `repeat` is 1/size */
/* of the physical area one tile covers.                               */
/* ------------------------------------------------------------------ */

function dataTexture(c: HTMLCanvasElement, metresU: number, metresV: number) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / metresU, 1 / metresV);
  tex.anisotropy = 4;
  return tex;
}

function hash2(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Cladding panels: 2 m × 1 m sheets with recessed joints, corner
 * fasteners, the odd access panel and a faint brushed grain.
 * One tile covers 4 m × 4 m.
 */
export function makeCladdingTexture() {
  const S = 512; // 128 px per metre
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  const PW = 256;
  const PH = 128;
  for (let y = 0; y < S; y++) {
    const py = y % PH;
    const row = Math.floor(y / PH);
    for (let x = 0; x < S; x++) {
      const px = x % PW;
      const col = Math.floor(x / PW);
      const panel = hash2(col, row);
      const d = Math.min(px, PW - px, py, PH - py);
      // recessed joint with a soft shoulder
      let h = d < 1.5 ? 70 : d < 4 ? 70 + ((d - 1.5) / 2.5) * 185 : 255;
      // corner fasteners
      for (const [fx, fy] of [
        [10, 10],
        [PW - 10, 10],
        [10, PH - 10],
        [PW - 10, PH - 10],
      ]) {
        const r = Math.hypot(px - fx, py - fy);
        if (r < 2.6) h = Math.min(h, 150 + r * 25);
      }
      // every few panels carries an inset access hatch
      if (panel > 0.72) {
        const ix = Math.min(Math.abs(px - 40), Math.abs(px - (PW - 40)));
        const iy = Math.min(Math.abs(py - 26), Math.abs(py - (PH - 26)));
        const insideX = px > 40 && px < PW - 40;
        const insideY = py > 26 && py < PH - 26;
        if ((ix < 1.2 && insideY) || (iy < 1.2 && insideX)) h = Math.min(h, 140);
      }
      // brushed grain: long horizontal streaks, different per sheet
      const streak = hash2(y * 7 + col * 131, row) - 0.5;
      const fine = hash2(x, y) - 0.5;
      // joints keep the sheet's roughness: they read through occlusion and
      // relief, not as bright matte lines
      const rough = 0.8 + panel * 0.14 + (d < 4 ? 0 : streak * 0.07 + fine * 0.03);
      const i = (y * S + x) * 4;
      img.data[i] = h;
      img.data[i + 1] = Math.max(0, Math.min(255, rough * 255));
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return dataTexture(c, 4, 4);
}

/**
 * Trapezoidal corrugation, varying along U. Used for container walls
 * (0.3 m pitch) and, with a tighter repeat, radiator tube-and-fin panels.
 */
export function makeRibTexture(pitchMetres: number) {
  const W = 256;
  const H = 8;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const period = W / 4;
  for (let x = 0; x < W; x++) {
    const t = (x % period) / period;
    // flat crest, ramp, flat trough, ramp
    let h: number;
    if (t < 0.35) h = 1;
    else if (t < 0.5) h = 1 - (t - 0.35) / 0.15;
    else if (t < 0.85) h = 0;
    else h = (t - 0.85) / 0.15;
    const v = 90 + h * 165;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = 215 + h * 25;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return dataTexture(c, pitchMetres * 4, 1);
}

/** Louvre slats, varying along V (horizontal blades). One tile = 0.25 m. */
export function makeLouvreTexture() {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  const period = S / 3;
  for (let y = 0; y < S; y++) {
    const t = (y % period) / period;
    // blade face ramps down into a dark gap
    const h = t < 0.78 ? 0.35 + (t / 0.78) * 0.65 : 0.05;
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      img.data[i] = h * 255;
      img.data[i + 1] = 235;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return dataTexture(c, 0.25, 0.25);
}

/* ---------------- decal atlas ---------------- */

export type DecalCell = { u0: number; v0: number; u1: number; v1: number; aspect: number };

export const DECAL_LABELS = [
  "SST-01",
  "PEC-A",
  "HV-IN",
  "MV-OUT",
  "B-01",
  "B-02",
  "B-03",
  "B-04",
  "B-05",
  "B-06",
  "PCS-01",
  "DC-A",
  "DC-B",
  "DC-C",
  "DC-PDU",
  "NPC-01",
  "PCU-1",
  "PCU-2",
  "PV-01",
  "EV-CHG",
] as const;

export type DecalName = (typeof DECAL_LABELS)[number] | "hazard" | "trefoil" | "hv" | "chevron";

/**
 * Equipment ID plates, hazard stripes and safety symbols in one atlas,
 * so every decal in a structure merges into a single draw call.
 */
export function makeDecalAtlas() {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const cells = new Map<DecalName, DecalCell>();
  const add = (name: DecalName, x: number, y: number, w: number, h: number) =>
    cells.set(name, { u0: x / W, u1: (x + w) / W, v0: 1 - (y + h) / H, v1: 1 - y / H, aspect: w / h });

  // ID plates: graphite plate, pale stencil lettering, a thin cyan tag
  const CW = 256;
  const CH = 64;
  DECAL_LABELS.forEach((label, i) => {
    const x = (i % 4) * CW;
    const y = Math.floor(i / 4) * CH;
    ctx.fillStyle = "#23282f";
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 6, CW - 8, CH - 12, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,212,226,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#5fc8ff";
    ctx.fillRect(x + 16, y + 18, 5, CH - 36);
    ctx.fillStyle = "#e6ecf2";
    ctx.font = "600 30px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 34, y + CH / 2 + 1);
    add(label, x, y, CW, CH);
  });

  // hazard stripes (muted amber / graphite, 45°)
  {
    const x = 0;
    const y = 320;
    const w = 512;
    const h = 64;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = "#1f2227";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#d99a2b";
    for (let s = -h; s < w + h; s += 64) {
      ctx.beginPath();
      ctx.moveTo(x + s, y + h);
      ctx.lineTo(x + s + 32, y + h);
      ctx.lineTo(x + s + 32 + h, y);
      ctx.lineTo(x + s + h, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    add("hazard", x, y, w, h);
  }

  // radiation trefoil on a muted amber disc
  {
    const x = 512;
    const y = 320;
    const s = 128;
    const cx = x + s / 2;
    const cy = y + s / 2;
    ctx.fillStyle = "#d99a2b";
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1e22";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - 0.52) * 14, cy + Math.sin(a - 0.52) * 14);
      ctx.arc(cx, cy, 50, a - 0.52, a + 0.52);
      ctx.arc(cx, cy, 14, a + 0.52, a - 0.52, true);
      ctx.closePath();
      ctx.fill();
    }
    add("trefoil", x, y, s, s);
  }

  // high-voltage warning triangle
  {
    const x = 640;
    const y = 320;
    const s = 128;
    ctx.fillStyle = "#d99a2b";
    ctx.strokeStyle = "#1c1e22";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + 10);
    ctx.lineTo(x + s - 8, y + s - 14);
    ctx.lineTo(x + 8, y + s - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1c1e22";
    ctx.beginPath();
    ctx.moveTo(x + 70, y + 38);
    ctx.lineTo(x + 50, y + 76);
    ctx.lineTo(x + 64, y + 76);
    ctx.lineTo(x + 56, y + 104);
    ctx.lineTo(x + 80, y + 64);
    ctx.lineTo(x + 66, y + 64);
    ctx.closePath();
    ctx.fill();
    add("hv", x, y, s, s);
  }

  // pale chevron (walkway / approach marking)
  {
    const x = 768;
    const y = 320;
    const s = 128;
    ctx.strokeStyle = "rgba(226,232,238,0.9)";
    ctx.lineWidth = 16;
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 30);
    ctx.lineTo(x + 64, y + 70);
    ctx.lineTo(x + 104, y + 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 70);
    ctx.lineTo(x + 64, y + 110);
    ctx.lineTo(x + 104, y + 70);
    ctx.stroke();
    add("chevron", x, y, s, s);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, cells };
}

/* ---------------- ground decals ---------------- */

/**
 * Contact shadow + disturbed-regolith halo for round footprints. The
 * footprint edge sits at 64% of the disc radius.
 */
export function makeRadialGroundTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const r = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
      // occlusion peaks right at the footprint edge, then falls away
      const ao = r < 0.64 ? 1 : 1 - smooth(0.64, 0.84, r);
      // faint ring of blown / compacted regolith beyond it
      const halo = smooth(0.7, 0.8, r) * (1 - smooth(0.86, 1, r));
      const aoA = ao * 0.55;
      const haloA = halo * 0.22;
      const a = Math.min(1, aoA + haloA);
      const tone = a > 0 ? (aoA * 18 + haloA * 214) / a : 0;
      const i = (y * S + x) * 4;
      img.data[i] = tone;
      img.data[i + 1] = tone;
      img.data[i + 2] = tone * 1.02;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft rectangular contact shadow. The footprint fills the middle 60% of
 * the texture on both axes.
 */
export function makeSoftRectTexture() {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const qx = Math.abs((x + 0.5) / S - 0.5) * 2; // 0 centre .. 1 edge
      const qy = Math.abs((y + 0.5) / S - 0.5) * 2;
      const dx = Math.max(0, qx - 0.6);
      const dy = Math.max(0, qy - 0.6);
      const d = Math.hypot(dx, dy) / 0.4;
      const a = Math.pow(Math.max(0, 1 - d), 2.2) * 0.6;
      const i = (y * S + x) * 4;
      img.data[i] = 16;
      img.data[i + 1] = 16;
      img.data[i + 2] = 18;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Landing-pad paint for the blast plate (the canvas spans the plate's
 * radius): a scorched centre, the touchdown ring, a dashed inner ring,
 * alignment bars, rim ticks and one amber approach chevron on +x.
 */
export function makePadMarkingTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const m = S / 2;
  const at = (a: number, r: number) => [m + Math.cos(a) * m * r, m + Math.sin(a) * m * r] as const;
  // exhaust scorch, strongest under the engine
  const g = ctx.createRadialGradient(m, m, 0, m, m, m * 0.72);
  g.addColorStop(0, "rgba(14,14,16,0.6)");
  g.addColorStop(0.45, "rgba(24,24,26,0.32)");
  g.addColorStop(1, "rgba(30,30,32,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const paint = "rgba(228,231,234,0.84)";
  ctx.strokeStyle = paint;
  // touchdown ring
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(m, m, m * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  // dashed inner ring
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 15]);
  ctx.beginPath();
  ctx.arc(m, m, m * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // alignment bars on the diagonals, centre ring
  ctx.lineWidth = 8;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(...at(a, 0.14));
    ctx.lineTo(...at(a, 0.32));
    ctx.stroke();
  }
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(m, m, m * 0.07, 0, Math.PI * 2);
  ctx.stroke();
  // rim ticks every 15°, longer on the quarters
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12;
    ctx.lineWidth = k % 6 === 0 ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(...at(a, k % 6 === 0 ? 0.87 : 0.9));
    ctx.lineTo(...at(a, 0.97));
    ctx.stroke();
  }
  // the approach chevron (limited amber)
  ctx.strokeStyle = "rgba(214,150,52,0.9)";
  ctx.lineWidth = 12;
  ctx.lineJoin = "miter";
  for (const r of [0.58, 0.67]) {
    ctx.beginPath();
    ctx.moveTo(...at(-0.16, r + 0.05));
    ctx.lineTo(...at(0, r));
    ctx.lineTo(...at(0.16, r + 0.05));
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ---------------- site ground painter ---------------- */

/**
 * Paints one installation's footprint onto a canvas in site-local metres:
 * compacted regolith apron, contact shadows, dust build-up, rover tracks
 * and cable trenches. Edges are feathered so the decal melts into the
 * terrain.
 */
export class GroundPainter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly k: number;
  private readonly rng: () => number;

  constructor(
    readonly w: number,
    readonly d: number,
    res: number,
    seed: number,
  ) {
    this.canvas = document.createElement("canvas");
    this.k = res / Math.max(w, d);
    this.canvas.width = Math.round(w * this.k);
    this.canvas.height = Math.round(d * this.k);
    this.ctx = this.canvas.getContext("2d")!;
    this.rng = mulberry32(seed);
  }

  private px(x: number) {
    return (x + this.w / 2) * this.k;
  }
  private pz(z: number) {
    return (z + this.d / 2) * this.k;
  }

  /** draw `shape` blurred (canvas shadows are the cheapest portable blur) */
  private blurred(blurM: number, color: string, shape: (ctx: CanvasRenderingContext2D) => void) {
    const ctx = this.ctx;
    const OFF = 10000;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0.5, blurM * this.k);
    ctx.shadowOffsetX = OFF;
    ctx.setTransform(1, 0, 0, 1, -OFF, 0);
    ctx.fillStyle = "#000";
    shape(ctx);
    ctx.restore();
  }

  /** compacted, graded ground around an installation */
  apron(x: number, z: number, w: number, d: number, radius: number, alpha = 0.5) {
    const k = this.k;
    this.blurred(radius * 0.7, `rgba(150,150,152,${alpha})`, (ctx) => {
      ctx.beginPath();
      ctx.roundRect(this.px(x - w / 2), this.pz(z - d / 2), w * k, d * k, radius * k);
      ctx.fill();
    });
    // grader passes: faint parallel streaks
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(this.px(x - w / 2), this.pz(z - d / 2), w * k, d * k, radius * k);
    ctx.clip();
    for (let s = -d / 2; s < d / 2; s += 0.35) {
      const a = 0.025 + this.rng() * 0.04;
      ctx.fillStyle = this.rng() > 0.5 ? `rgba(40,40,42,${a})` : `rgba(230,230,232,${a})`;
      ctx.fillRect(this.px(x - w / 2), this.pz(z + s), w * k, Math.max(1, 0.12 * k));
    }
    ctx.restore();
  }

  /** soft occlusion under and around a rectangular footprint */
  contact(x: number, z: number, w: number, d: number, rot = 0, strength = 0.6, spread = 0.7) {
    const k = this.k;
    this.blurred(spread, `rgba(10,10,12,${strength})`, (ctx) => {
      ctx.translate(this.px(x), this.pz(z));
      ctx.rotate(-rot);
      ctx.fillRect((-w / 2) * k, (-d / 2) * k, w * k, d * k);
    });
  }

  /** round footprint (tanks, posts, octagonal platforms) */
  disc(x: number, z: number, r: number, strength = 0.6, spread = 0.7) {
    this.blurred(spread, `rgba(10,10,12,${strength})`, (ctx) => {
      ctx.beginPath();
      ctx.arc(this.px(x), this.pz(z), r * this.k, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** a thin rim of settled dust just outside a footprint */
  dust(x: number, z: number, w: number, d: number, rot = 0, alpha = 0.18) {
    const k = this.k;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.px(x), this.pz(z));
    ctx.rotate(-rot);
    ctx.strokeStyle = `rgba(206,206,208,${alpha})`;
    ctx.lineWidth = Math.max(1, 0.35 * k);
    ctx.strokeRect((-w / 2 - 0.25) * k, (-d / 2 - 0.25) * k, (w + 0.5) * k, (d + 0.5) * k);
    ctx.restore();
  }

  private polyline(points: [number, number][], offset: number) {
    const out: [number, number][] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const L = Math.hypot(dx, dz) || 1;
      out.push([points[i][0] - (dz / L) * offset, points[i][1] + (dx / L) * offset]);
    }
    return out;
  }

  private stroke(points: [number, number][], widthM: number, style: string, dash?: number[]) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = style;
    ctx.lineWidth = Math.max(1, widthM * this.k);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (dash) ctx.setLineDash(dash.map((v) => v * this.k));
    ctx.beginPath();
    points.forEach(([x, z], i) => {
      if (i === 0) ctx.moveTo(this.px(x), this.pz(z));
      else ctx.lineTo(this.px(x), this.pz(z));
    });
    ctx.stroke();
    ctx.restore();
  }

  /** a pair of rover wheel ruts with tread marks and pushed-up berms */
  tracks(points: [number, number][], gauge = 1.9, alpha = 0.34) {
    for (const side of [-gauge / 2, gauge / 2]) {
      const p = this.polyline(points, side);
      this.stroke(p, 0.62, `rgba(214,214,216,${alpha * 0.35})`);
      this.stroke(p, 0.42, `rgba(38,38,40,${alpha})`);
      this.stroke(p, 0.34, `rgba(20,20,22,${alpha * 0.8})`, [0.09, 0.11]);
    }
  }

  /**
   * Landing-pad surroundings for a deck of radius r: a compacted apron,
   * a plume-scoured ring just outside the berm and fine ejecta rays.
   */
  padApron(x: number, z: number, r: number) {
    const k = this.k;
    const cx = this.px(x);
    const cz = this.pz(z);
    this.blurred(r * 0.3, "rgba(150,150,152,0.42)", (ctx) => {
      ctx.beginPath();
      ctx.arc(cx, cz, r * 1.6 * k, 0, Math.PI * 2);
      ctx.fill();
    });
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(38,38,40,0.14)";
    ctx.lineWidth = r * 0.4 * k;
    ctx.beginPath();
    ctx.arc(cx, cz, r * 1.62 * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "round";
    for (let i = 0; i < 110; i++) {
      const a = this.rng() * Math.PI * 2;
      const r0 = r * (1.45 + this.rng() * 0.25);
      const r1 = r * (1.95 + this.rng() * 1.3);
      const light = this.rng() > 0.4;
      const alpha = light ? 0.05 + this.rng() * 0.08 : 0.04 + this.rng() * 0.06;
      ctx.strokeStyle = light ? `rgba(226,226,228,${alpha})` : `rgba(28,28,30,${alpha})`;
      ctx.lineWidth = Math.max(1, (0.08 + this.rng() * 0.2) * k);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0 * k, cz + Math.sin(a) * r0 * k);
      ctx.lineTo(cx + Math.cos(a) * r1 * k, cz + Math.sin(a) * r1 * k);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Painted rover bay (w across, d deep), centred at x, z and turned like
   * the charger it belongs to: the charger stands at local +z, the bay
   * opens toward -z. Pale side lines and a limited amber stop bar.
   */
  bay(x: number, z: number, w: number, d: number, rot = 0) {
    const k = this.k;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.px(x), this.pz(z));
    ctx.rotate(-rot);
    // compacted, swept bay floor so the paint has something to read against
    ctx.fillStyle = "rgba(70,70,72,0.2)";
    ctx.fillRect((-w / 2) * k, (-d / 2) * k, w * k, d * k);
    ctx.strokeStyle = "rgba(236,238,240,0.8)";
    ctx.lineWidth = Math.max(1, 0.14 * k);
    ctx.beginPath();
    for (const sx of [-w / 2, w / 2]) {
      ctx.moveTo(sx * k, (-d / 2) * k);
      ctx.lineTo(sx * k, (d / 2) * k);
    }
    ctx.moveTo((-w / 2) * k, (d / 2) * k);
    ctx.lineTo((w / 2) * k, (d / 2) * k);
    ctx.stroke();
    ctx.fillStyle = "rgba(206,146,52,0.7)";
    ctx.fillRect((-w / 2 + 0.3) * k, (d / 2 - 0.85) * k, (w - 0.6) * k, 0.22 * k);
    ctx.restore();
  }

  /** covered cable trench: dark slot with pale edge lines */
  trench(points: [number, number][], width = 0.7) {
    this.stroke(points, width + 0.25, "rgba(200,200,202,0.28)");
    this.stroke(points, width, "rgba(52,54,58,0.7)");
    this.stroke(points, width * 0.25, "rgba(90,94,100,0.6)", [0.6, 0.15]);
  }

  /** feather the outer border so the decal has no visible edge */
  finish(featherM = 3) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const f = featherM * this.k;
    // speckle so the apron never reads as a flat fill
    const img = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (this.rng() - 0.5) * 18;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    const mask = document.createElement("canvas");
    mask.width = W;
    mask.height = H;
    const mctx = mask.getContext("2d")!;
    const OFF = 10000;
    mctx.shadowColor = "#000";
    mctx.shadowBlur = f;
    mctx.shadowOffsetX = OFF;
    mctx.fillStyle = "#000";
    mctx.beginPath();
    mctx.roundRect(f - OFF, f, W - 2 * f, H - 2 * f, f * 2);
    mctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0);
    ctx.restore();
    const tex = new THREE.CanvasTexture(this.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
}
