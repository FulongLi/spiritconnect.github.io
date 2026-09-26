import * as THREE from "three";
import { mulberry32 } from "./random";

/* ---------------- procedural canvas textures ---------------- */
export function makeRegolithTexture() {
  // 512² tile: multi-scale grain, pebbles and tiny impact pits give the
  // ground close-range detail without adding geometry
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  const rng = mulberry32(13579);
  // tileable value noise at a few octaves
  const octave = (cells: number) => {
    const grid = new Float32Array(cells * cells).map(() => rng());
    return (x: number, y: number) => {
      const fx = (x / S) * cells;
      const fy = (y / S) * cells;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const g = (a: number, b: number) => grid[(((b % cells) + cells) % cells) * cells + (((a % cells) + cells) % cells)];
      const top = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx;
      const bot = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx;
      return top + (bot - top) * sy;
    };
  };
  const n1 = octave(8);
  const n2 = octave(32);
  const n3 = octave(128);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = 0.3 * n1(x, y) + 0.3 * n2(x, y) + 0.2 * n3(x, y) + 0.2 * rng();
      const g = 96 + v * 100;
      const i = (y * S + x) * 4;
      img.data[i] = g;
      img.data[i + 1] = g;
      img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // micro-craters: dark bowl with a bright raised rim (drawn wrapped)
  const pit = (x: number, y: number, r: number) => {
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        const cx = x + ox;
        const cy = y + oy;
        if (cx < -r * 2 || cx > S + r * 2 || cy < -r * 2 || cy > S + r * 2) continue;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
        g.addColorStop(0, "rgba(0,0,0,0.32)");
        g.addColorStop(0.55, "rgba(0,0,0,0.12)");
        g.addColorStop(0.68, "rgba(255,255,255,0.22)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);
      }
    }
  };
  for (let i = 0; i < 70; i++) pit(rng() * S, rng() * S, 2 + Math.pow(rng(), 3) * 14);
  // pebbles
  for (let i = 0; i < 260; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 0.8 + rng() * 1.8;
    ctx.fillStyle = `rgba(255,255,255,${0.12 + rng() * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 60; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 6 + rng() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rng() > 0.5 ? "255,255,255" : "0,0,0";
    g.addColorStop(0, `rgba(${tone},0.08)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Solar table: 2 × 2 modules of monocrystalline cells (pseudo-square
 * corners show the pale backsheet), faint silver busbars.
 */
export function makeSolarCellTexture() {
  const W = 512;
  const H = 384;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8f9aa6"; // backsheet between modules / cells
  ctx.fillRect(0, 0, W, H);
  const rng = mulberry32(24680);
  const modCols = 2;
  const modRows = 2;
  const cellCols = 8;
  const cellRows = 6;
  const gap = 5;
  const mw = (W - gap * (modCols + 1)) / modCols;
  const mh = (H - gap * (modRows + 1)) / modRows;
  for (let my = 0; my < modRows; my++) {
    for (let mx = 0; mx < modCols; mx++) {
      const ox = gap + mx * (mw + gap);
      const oy = gap + my * (mh + gap);
      ctx.fillStyle = "#b9c3cd";
      ctx.fillRect(ox, oy, mw, mh);
      const cw = mw / cellCols;
      const ch = mh / cellRows;
      const modTone = 0.94 + rng() * 0.1;
      for (let cx = 0; cx < cellCols; cx++) {
        for (let cy = 0; cy < cellRows; cy++) {
          const px = ox + cx * cw + 1;
          const py = oy + cy * ch + 1;
          const w = cw - 2;
          const h = ch - 2;
          const k = modTone * (0.92 + rng() * 0.12);
          const g = ctx.createLinearGradient(px, py, px + w, py + h);
          g.addColorStop(0, `rgb(${Math.round(20 * k)},${Math.round(40 * k)},${Math.round(74 * k)})`);
          g.addColorStop(1, `rgb(${Math.round(14 * k)},${Math.round(30 * k)},${Math.round(58 * k)})`);
          ctx.fillStyle = g;
          const cut = Math.min(w, h) * 0.14; // pseudo-square corners
          ctx.beginPath();
          ctx.moveTo(px + cut, py);
          ctx.lineTo(px + w - cut, py);
          ctx.lineTo(px + w, py + cut);
          ctx.lineTo(px + w, py + h - cut);
          ctx.lineTo(px + w - cut, py + h);
          ctx.lineTo(px + cut, py + h);
          ctx.lineTo(px, py + h - cut);
          ctx.lineTo(px, py + cut);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(190,205,222,0.28)";
          ctx.lineWidth = 0.9;
          for (let b = 1; b <= 3; b++) {
            ctx.beginPath();
            ctx.moveTo(px + (b * w) / 4, py + 1);
            ctx.lineTo(px + (b * w) / 4, py + h - 1);
            ctx.stroke();
          }
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** soft radial glow sprite texture */
export function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(160,210,255,0.9)");
  g.addColorStop(0.4, "rgba(110,170,255,0.32)");
  g.addColorStop(1, "rgba(80,140,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** round point sprite for the energy dots */
export function makeDotTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.9)");
  g.addColorStop(0.7, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
