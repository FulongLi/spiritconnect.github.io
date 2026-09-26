import * as THREE from "three";
import { mulberry32 } from "./random";

/* ---------------- procedural canvas textures ---------------- */
export function makeRegolithTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(256, 256);
  const rng = mulberry32(13579);
  for (let i = 0; i < 256 * 256; i++) {
    const g = 110 + rng() * 70;
    img.data[i * 4] = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 60; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = 6 + rng() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rng() > 0.5 ? "255,255,255" : "0,0,0";
    g.addColorStop(0, `rgba(${tone},0.10)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  return tex;
}

export function makeSolarCellTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#b9c2cc";
  ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = "#0d2c55";
  ctx.fillRect(6, 6, 244, 180);
  const cols = 8;
  const rows = 5;
  const cw = 244 / cols;
  const ch = 180 / rows;
  const rng = mulberry32(24680);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const px = 6 + x * cw;
      const py = 6 + y * ch;
      const tone = 0.85 + rng() * 0.3;
      const g = ctx.createLinearGradient(px, py, px + cw, py + ch);
      g.addColorStop(0, `rgba(${Math.round(31 * tone)}, ${Math.round(95 * tone)}, ${Math.round(186 * tone)}, 1)`);
      g.addColorStop(0.5, `rgba(${Math.round(20 * tone)}, ${Math.round(64 * tone)}, ${Math.round(140 * tone)}, 1)`);
      g.addColorStop(1, `rgba(${Math.round(26 * tone)}, ${Math.round(82 * tone)}, ${Math.round(168 * tone)}, 1)`);
      ctx.fillStyle = g;
      ctx.fillRect(px + 1.5, py + 1.5, cw - 3, ch - 3);
      ctx.strokeStyle = "rgba(190, 215, 240, 0.5)";
      ctx.lineWidth = 0.8;
      for (let b = 1; b <= 3; b++) {
        ctx.beginPath();
        ctx.moveTo(px + (b * cw) / 4, py + 2);
        ctx.lineTo(px + (b * cw) / 4, py + ch - 2);
        ctx.stroke();
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
