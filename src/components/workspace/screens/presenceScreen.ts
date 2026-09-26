import { PRESENCE_SCREEN as C } from "@/content/workspace";
import {
  drawButton,
  drawTopBar,
  measureSpaced,
  roundRectPath,
  spacedText,
  toScreenRect,
  type ScreenPainter,
} from "./canvasKit";

/* ------------------------------------------------------------------ */
/* Presence monitor: the AI / interface side. Spatial and visual — the  */
/* particle entity, a voice waveform and a conversation line, beside    */
/* the Presence identity.                                              */
/* ------------------------------------------------------------------ */

/** silver particle sphere, as in the Presence app */
function drawEntity(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, count: number) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, "rgba(214, 220, 228, 0.16)");
  glow.addColorStop(1, "rgba(214, 220, 228, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);

  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radial = Math.sqrt(1 - y * y);
    const theta = i * golden;
    const seed = Math.abs((Math.sin((i + 1) * 78.233) * 43758.5453) % 1);
    const rr = seed < 0.62 ? 0.92 + seed * 0.12 : Math.cbrt(seed) * 0.9;
    const x = Math.cos(theta) * radial;
    const z = Math.sin(theta) * radial;
    // tilt towards the viewer
    const y2 = y * 0.94 - z * 0.34;
    const z2 = y * 0.34 + z * 0.94;
    const depth = (z2 + 1) / 2;
    const size = 0.8 + depth * 1.7;
    ctx.fillStyle = `rgba(${220 + depth * 30}, ${224 + depth * 28}, ${232 + depth * 22}, ${0.12 + depth * 0.55})`;
    ctx.fillRect(cx + x * rr * r - size / 2, cy + y2 * rr * r - size / 2, size, size);
  }
}

function drawWaveform(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number, s: number) {
  const bars = 41;
  const step = width / bars;
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    const env = Math.sin(t * Math.PI);
    const h = (6 + env * (18 + Math.abs(Math.sin(i * 1.7)) * 26)) * s;
    ctx.fillStyle = `rgba(230, 233, 238, ${0.25 + env * 0.55})`;
    roundRectPath(ctx, cx - width / 2 + i * step, y - h / 2, step * 0.42, h, step * 0.21);
    ctx.fill();
  }
}

export const paintPresenceScreen: ScreenPainter = (ctx, w, h, opts) => {
  const s = w / 1600;
  const { fonts, compact } = opts;

  // graphite glass with a soft pool of light behind the entity
  ctx.fillStyle = "#0a0b0d";
  ctx.fillRect(0, 0, w, h);
  const pool = ctx.createRadialGradient(w * 0.7, h * 0.46, 0, w * 0.7, h * 0.46, w * 0.55);
  pool.addColorStop(0, "#23262b");
  pool.addColorStop(1, "rgba(10, 11, 13, 0)");
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);

  drawTopBar(ctx, w, s, opts, "PRESENCE", compact ? "" : `●  ${C.status.toUpperCase()}`);

  const left = 96 * s;
  const entity = compact
    ? { x: w * 0.74, y: h * 0.47, r: 190 * s }
    : { x: w * 0.72, y: h * 0.44, r: 205 * s };
  drawEntity(ctx, entity.x, entity.y, entity.r, compact ? 1400 : 2600);

  ctx.textBaseline = "alphabetic";
  let y: number;
  if (compact) {
    ctx.fillStyle = "#f3f4f6";
    ctx.font = `300 ${176 * s}px ${fonts.sans}`;
    spacedText(ctx, C.title, left - 6 * s, 380 * s, 10 * s);
    ctx.fillStyle = "rgba(226, 229, 234, 0.8)";
    ctx.font = `400 ${46 * s}px ${fonts.sans}`;
    spacedText(ctx, C.tagline, left, 470 * s, 5 * s);
    y = 560 * s;
  } else {
    ctx.fillStyle = "rgba(226, 229, 234, 0.5)";
    ctx.font = `400 ${16 * s}px ${fonts.mono}`;
    spacedText(ctx, "AI / INTERFACE", left, 212 * s, 4.5 * s);
    ctx.fillStyle = "#f3f4f6";
    ctx.font = `300 ${148 * s}px ${fonts.sans}`;
    spacedText(ctx, C.title, left - 6 * s, 372 * s, 9 * s);
    ctx.fillStyle = "rgba(226, 229, 234, 0.82)";
    ctx.font = `400 ${34 * s}px ${fonts.sans}`;
    spacedText(ctx, C.tagline, left, 440 * s, 4 * s);
    ctx.fillStyle = "rgba(226, 229, 234, 0.55)";
    ctx.font = `300 ${27 * s}px ${fonts.sans}`;
    ctx.fillText(C.body, left, 498 * s);

    // interaction modes
    ctx.font = `400 ${15 * s}px ${fonts.mono}`;
    let x = left;
    const chipY = 548 * s;
    for (const mode of C.modes) {
      const label = mode.toUpperCase();
      const cw = measureSpaced(ctx, label, 2.4 * s) + 36 * s;
      roundRectPath(ctx, x, chipY, cw, 40 * s, 20 * s);
      ctx.strokeStyle = "rgba(226, 229, 234, 0.24)";
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();
      ctx.fillStyle = "rgba(226, 229, 234, 0.7)";
      ctx.textBaseline = "middle";
      spacedText(ctx, label, x + 18 * s, chipY + 21 * s, 2.4 * s);
      x += cw + 12 * s;
      if (x > w * 0.5) break;
    }
    ctx.textBaseline = "alphabetic";
    y = 660 * s;
  }

  // voice + conversation beneath the entity
  drawWaveform(ctx, entity.x, entity.y + entity.r + 72 * s, (compact ? 300 : 340) * s, s);
  if (!compact) {
    ctx.fillStyle = "rgba(226, 229, 234, 0.62)";
    ctx.font = `300 ${24 * s}px ${fonts.sans}`;
    ctx.textAlign = "center";
    ctx.fillText("“Show me what matters today.”", entity.x, entity.y + entity.r + 148 * s);
    ctx.textAlign = "left";
  }

  const primary = drawButton(ctx, left, y, C.cta.toUpperCase(), "→", compact ? s * 1.3 : s, opts);

  // secondary: the Founding 100
  const secY = primary[3] + (compact ? 64 : 62) * s;
  ctx.font = `400 ${(compact ? 21 : 16) * s}px ${fonts.mono}`;
  ctx.fillStyle = "rgba(226, 229, 234, 0.72)";
  ctx.textBaseline = "middle";
  const secW = spacedText(ctx, C.secondaryCta.toUpperCase(), left, secY, 3.6 * s);
  ctx.fillStyle = "rgba(226, 229, 234, 0.32)";
  ctx.fillRect(left, secY + 18 * s, secW, 1.5 * s);

  return {
    primary: [0, 0, 1, 1],
    secondary: toScreenRect([left - 12 * s, secY - 26 * s, left + secW + 12 * s, secY + 30 * s], w, h),
  };
};
