import { AIPE_SCREEN as C } from "@/content/workspace";
import { drawButton, drawTopBar, spacedText, wrapLines, type ScreenPainter } from "./canvasKit";

/* ------------------------------------------------------------------ */
/* AIPE monitor: the energy / engineering side. Structured and          */
/* technical — a drawing grid, the device → converter → system          */
/* hierarchy with schematic glyphs — mirroring aipel.co.uk.             */
/* ------------------------------------------------------------------ */

type Glyph = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void;

/** inductor: a winding between two leads */
const inductor: Glyph = (ctx, x, y, size) => {
  const loops = 4;
  const r = size / (loops * 2 + 2);
  ctx.beginPath();
  ctx.moveTo(x - size / 2, y);
  ctx.lineTo(x - size / 2 + r, y);
  for (let i = 0; i < loops; i++) {
    const cx = x - size / 2 + r * 2 + i * r * 2;
    ctx.arc(cx, y, r, Math.PI, 0, false);
  }
  ctx.lineTo(x + size / 2, y);
  ctx.stroke();
  // magnetic core
  ctx.beginPath();
  ctx.moveTo(x - size / 2 + r, y - r * 1.8);
  ctx.lineTo(x + size / 2 - r, y - r * 1.8);
  ctx.moveTo(x - size / 2 + r, y - r * 2.4);
  ctx.lineTo(x + size / 2 - r, y - r * 2.4);
  ctx.stroke();
};

/** converter block: DC in, AC out */
const converter: Glyph = (ctx, x, y, size) => {
  const h = size * 0.62;
  ctx.strokeRect(x - h / 2, y - h / 2, h, h);
  ctx.beginPath();
  ctx.moveTo(x - h / 2, y + h / 2);
  ctx.lineTo(x + h / 2, y - h / 2);
  // "=" top-left
  ctx.moveTo(x - h * 0.36, y - h * 0.24);
  ctx.lineTo(x - h * 0.1, y - h * 0.24);
  ctx.moveTo(x - h * 0.36, y - h * 0.14);
  ctx.lineTo(x - h * 0.1, y - h * 0.14);
  // leads
  ctx.moveTo(x - size / 2, y);
  ctx.lineTo(x - h / 2, y);
  ctx.moveTo(x + h / 2, y);
  ctx.lineTo(x + size / 2, y);
  ctx.stroke();
  // "~" bottom-right
  ctx.beginPath();
  const sx = x + h * 0.1;
  const sy = y + h * 0.22;
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(sx + h * 0.08, sy - h * 0.1, sx + h * 0.14, sy + h * 0.1, sx + h * 0.26, sy);
  ctx.stroke();
};

/** microgrid: sources and loads on a DC bus */
const microgrid: Glyph = (ctx, x, y, size) => {
  const bus = y + size * 0.04;
  ctx.beginPath();
  ctx.moveTo(x - size / 2, bus);
  ctx.lineTo(x + size / 2, bus);
  const nodes = [-0.4, -0.13, 0.13, 0.4];
  nodes.forEach((n, i) => {
    const nx = x + n * size;
    const ny = i % 2 ? bus + size * 0.22 : bus - size * 0.22;
    ctx.moveTo(nx, bus);
    ctx.lineTo(nx, ny);
  });
  ctx.stroke();
  nodes.forEach((n, i) => {
    const nx = x + n * size;
    const ny = i % 2 ? bus + size * 0.22 : bus - size * 0.22;
    ctx.beginPath();
    ctx.arc(nx, ny, size * 0.05, 0, Math.PI * 2);
    ctx.stroke();
  });
};

const GLYPHS = [inductor, converter, microgrid];

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, s: number) {
  const minor = 40 * s;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(226, 229, 234, 0.035)";
  ctx.beginPath();
  for (let x = 0; x <= w; x += minor) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += minor) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(226, 229, 234, 0.065)";
  ctx.beginPath();
  for (let x = 0; x <= w; x += minor * 5) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += minor * 5) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

export const paintAipeScreen: ScreenPainter = (ctx, w, h, opts) => {
  const s = w / 1600;
  const { fonts, compact } = opts;

  ctx.fillStyle = "#0a0b0d";
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h, s);

  drawTopBar(ctx, w, s, opts, "AIPE", compact ? "" : `${C.domain.toUpperCase()} ↗`);

  const left = 96 * s;
  ctx.textBaseline = "alphabetic";

  // identity + positioning
  let headlineBottom: number;
  if (compact) {
    ctx.fillStyle = "#f3f4f6";
    ctx.font = `300 ${176 * s}px ${fonts.sans}`;
    spacedText(ctx, C.title, left - 6 * s, 380 * s, 10 * s);
    ctx.fillStyle = "rgba(226, 229, 234, 0.84)";
    ctx.font = `400 ${40 * s}px ${fonts.sans}`;
    const lines = wrapLines(ctx, C.headline, 660 * s);
    lines.forEach((line, i) => ctx.fillText(line, left, 458 * s + i * 52 * s));
    headlineBottom = 458 * s + (lines.length - 1) * 52 * s;
  } else {
    ctx.fillStyle = "rgba(226, 229, 234, 0.5)";
    ctx.font = `400 ${16 * s}px ${fonts.mono}`;
    spacedText(ctx, "ENERGY / ENGINEERING", left, 212 * s, 4.5 * s);
    ctx.fillStyle = "#f3f4f6";
    ctx.font = `300 ${148 * s}px ${fonts.sans}`;
    spacedText(ctx, C.title, left - 6 * s, 372 * s, 9 * s);
    ctx.fillStyle = "rgba(226, 229, 234, 0.84)";
    ctx.font = `400 ${33 * s}px ${fonts.sans}`;
    const lines = wrapLines(ctx, C.headline, 600 * s);
    lines.forEach((line, i) => ctx.fillText(line, left, 440 * s + i * 44 * s));
    headlineBottom = 440 * s + (lines.length - 1) * 44 * s;
  }

  // engineering hierarchy: component → converter → system
  const colX = compact ? w * 0.6 : w * 0.53;
  const colW = w - colX - 80 * s;
  const rowH = (compact ? 150 : 176) * s;
  const top = (compact ? 196 : 176) * s;
  ctx.lineWidth = 2 * s;
  C.levels.forEach((level, i) => {
    const y = top + i * (rowH + 18 * s);
    // row frame
    ctx.strokeStyle = "rgba(226, 229, 234, 0.2)";
    ctx.strokeRect(colX, y, colW, rowH);
    // index + scale
    ctx.fillStyle = "rgba(226, 229, 234, 0.5)";
    ctx.font = `400 ${(compact ? 20 : 15) * s}px ${fonts.mono}`;
    spacedText(ctx, `${level.index}  ${level.scale.toUpperCase()} LEVEL`, colX + 28 * s, y + 44 * s, 3.2 * s);
    // name
    ctx.fillStyle = "#eef0f3";
    ctx.font = `400 ${(compact ? 38 : 32) * s}px ${fonts.sans}`;
    ctx.fillText(level.name, colX + 28 * s, y + (compact ? 104 : 92) * s);
    if (!compact) {
      ctx.fillStyle = "rgba(226, 229, 234, 0.46)";
      ctx.font = `400 ${14 * s}px ${fonts.mono}`;
      ctx.fillText(level.detail.toUpperCase(), colX + 28 * s, y + 136 * s);
    }
    // schematic glyph
    ctx.strokeStyle = "rgba(236, 238, 242, 0.78)";
    GLYPHS[i](ctx, colX + colW - 96 * s, y + rowH / 2, 110 * s);
    // link to the next scale
    if (i < C.levels.length - 1) {
      ctx.strokeStyle = "rgba(226, 229, 234, 0.35)";
      ctx.beginPath();
      ctx.moveTo(colX + 44 * s, y + rowH);
      ctx.lineTo(colX + 44 * s, y + rowH + 18 * s);
      ctx.stroke();
    }
  });

  const btnY = Math.max(headlineBottom + (compact ? 90 : 92) * s, compact ? 560 * s : 600 * s);
  drawButton(ctx, left, btnY, C.cta.toUpperCase(), "↗", compact ? s * 1.3 : s, opts);

  if (!compact) {
    ctx.fillStyle = "rgba(226, 229, 234, 0.46)";
    ctx.font = `400 ${15 * s}px ${fonts.mono}`;
    ctx.textBaseline = "middle";
    spacedText(ctx, C.footer.toUpperCase(), left, btnY + 128 * s, 3.6 * s);
  }

  return { primary: [0, 0, 1, 1] };
};
