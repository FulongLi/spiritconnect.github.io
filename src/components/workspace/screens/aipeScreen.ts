import { AIPE_SCREEN as C } from "@/content/workspace";
import {
  INK,
  drawBackdrop,
  drawButton,
  drawEyebrow,
  drawHoverFrame,
  drawTitle,
  spacedText,
  type ScreenPainter,
} from "./canvasKit";

/* ------------------------------------------------------------------ */
/* AIPE monitor — the energy / engineering side, after aipel.co.uk.     */
/* A portal, not a website: the name, the positioning line, the scale  */
/* hierarchy device → converter → system as one simple motif, one CTA. */
/* Structured and technical where Presence is spatial.                 */
/* ------------------------------------------------------------------ */

type Glyph = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void;

/** device: an inductor winding on its core */
const inductor: Glyph = (ctx, x, y, size) => {
  const loops = 4;
  const r = size / (loops * 2 + 2);
  ctx.beginPath();
  ctx.moveTo(x - size / 2, y);
  ctx.lineTo(x - size / 2 + r, y);
  for (let i = 0; i < loops; i++) ctx.arc(x - size / 2 + r * 2 + i * r * 2, y, r, Math.PI, 0, false);
  ctx.lineTo(x + size / 2, y);
  ctx.moveTo(x - size / 2 + r, y - r * 2);
  ctx.lineTo(x + size / 2 - r, y - r * 2);
  ctx.stroke();
};

/** converter: the DC → AC block */
const converter: Glyph = (ctx, x, y, size) => {
  const h = size * 0.6;
  ctx.strokeRect(x - h / 2, y - h / 2, h, h);
  ctx.beginPath();
  ctx.moveTo(x - h / 2, y + h / 2);
  ctx.lineTo(x + h / 2, y - h / 2);
  ctx.moveTo(x - h * 0.36, y - h * 0.22);
  ctx.lineTo(x - h * 0.1, y - h * 0.22);
  const sx = x + h * 0.1;
  const sy = y + h * 0.24;
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(sx + h * 0.08, sy - h * 0.12, sx + h * 0.14, sy + h * 0.12, sx + h * 0.26, sy);
  ctx.stroke();
};

/** system: sources and loads on a shared bus */
const microgrid: Glyph = (ctx, x, y, size) => {
  const nodes = [-0.4, -0.13, 0.13, 0.4];
  ctx.beginPath();
  ctx.moveTo(x - size / 2, y);
  ctx.lineTo(x + size / 2, y);
  nodes.forEach((n, i) => {
    const ny = i % 2 ? y + size * 0.24 : y - size * 0.24;
    ctx.moveTo(x + n * size, y);
    ctx.lineTo(x + n * size, ny);
  });
  ctx.stroke();
  nodes.forEach((n, i) => {
    const ny = i % 2 ? y + size * 0.24 : y - size * 0.24;
    ctx.beginPath();
    ctx.arc(x + n * size, ny, size * 0.055, 0, Math.PI * 2);
    ctx.stroke();
  });
};

const GLYPHS = [inductor, converter, microgrid];

/** a quiet engineering grid */
function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, s: number) {
  const step = 50 * s;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(226, 229, 234, 0.04)";
  ctx.beginPath();
  for (let x = 0; x <= w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

export const paintAipeScreen: ScreenPainter = (ctx, w, h, opts) => {
  const s = w / 1600;
  drawBackdrop(ctx, w, h, 1250 * s, 430 * s);
  drawGrid(ctx, w, h, s);
  drawEyebrow(ctx, s, opts, C.eyebrow);

  drawTitle(ctx, s, opts, C.title, 372 * s);
  const left = 110 * s;
  ctx.fillStyle = INK.soft;
  ctx.font = `400 ${40 * s}px ${opts.fonts.sans}`;
  C.headline.forEach((line, i) => spacedText(ctx, line.toUpperCase(), left, (452 + i * 56) * s, 4 * s));

  // device → converter → system
  const nodeX = 1080 * s;
  const rows = [262, 430, 598].map((y) => y * s);
  ctx.strokeStyle = INK.faint;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(nodeX, rows[0]);
  ctx.lineTo(nodeX, rows[2]);
  ctx.stroke();
  rows.forEach((y, i) => {
    ctx.fillStyle = "#0a0b0d";
    ctx.strokeStyle = INK.soft;
    ctx.beginPath();
    ctx.arc(nodeX, y, 12 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(236, 238, 242, 0.85)";
    ctx.lineWidth = 3 * s;
    GLYPHS[i](ctx, nodeX + 120 * s, y, 110 * s);
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = INK.bright;
    ctx.font = `400 ${30 * s}px ${opts.fonts.mono}`;
    ctx.textBaseline = "middle";
    spacedText(ctx, C.scales[i].toUpperCase(), nodeX + 210 * s, y + 1, 6 * s);
  });

  drawButton(ctx, 668 * s, C.cta.toUpperCase(), "↗", s, opts);
  drawHoverFrame(ctx, w, h, s, opts.hover);
};
