import { PRESENCE_SCREEN as C } from "@/content/workspace";
import {
  INK,
  drawBackdrop,
  drawButton,
  drawEyebrow,
  drawHoverFrame,
  drawTitle,
  roundRectPath,
  spacedText,
  type ScreenPainter,
} from "./canvasKit";

/* ------------------------------------------------------------------ */
/* Presence monitor — the AI / interface side. A portal, not a website: */
/* the name, one line, three words, the particle entity, one CTA.       */
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
    const size = (0.9 + depth * 2) * (r / 200);
    ctx.fillStyle = `rgba(${220 + depth * 30}, ${224 + depth * 28}, ${232 + depth * 22}, ${0.12 + depth * 0.55})`;
    ctx.fillRect(cx + x * rr * r - size / 2, cy + y2 * rr * r - size / 2, size, size);
  }
}

/** a quiet voice line beneath the entity */
function drawWaveform(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number, s: number) {
  const bars = 33;
  const step = width / bars;
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    const env = Math.sin(t * Math.PI);
    const h = (8 + env * (22 + Math.abs(Math.sin(i * 1.7)) * 30)) * s;
    ctx.fillStyle = `rgba(230, 233, 238, ${0.22 + env * 0.5})`;
    roundRectPath(ctx, cx - width / 2 + i * step, y - h / 2, step * 0.45, h, step * 0.22);
    ctx.fill();
  }
}

export const paintPresenceScreen: ScreenPainter = (ctx, w, h, opts) => {
  const s = w / 1600;
  const entity = { x: 1245 * s, y: 395 * s, r: 185 * s };
  drawBackdrop(ctx, w, h, entity.x, entity.y);
  drawEyebrow(ctx, s, opts, C.eyebrow);

  drawEntity(ctx, entity.x, entity.y, entity.r, 2200);
  drawWaveform(ctx, entity.x, entity.y + entity.r + 95 * s, 300 * s, s);

  drawTitle(ctx, s, opts, C.title, 372 * s);
  const left = 110 * s;
  ctx.fillStyle = INK.soft;
  ctx.font = `400 ${48 * s}px ${opts.fonts.sans}`;
  spacedText(ctx, C.tagline, left, 452 * s, 5 * s);
  ctx.fillStyle = INK.dim;
  ctx.font = `300 ${38 * s}px ${opts.fonts.sans}`;
  ctx.fillText(C.body, left, 522 * s);

  // three words: voice · visual · agents
  ctx.font = `400 ${26 * s}px ${opts.fonts.mono}`;
  ctx.textBaseline = "middle";
  let x = left;
  C.concepts.forEach((word, i) => {
    if (i > 0) {
      ctx.fillStyle = INK.faint;
      ctx.beginPath();
      ctx.arc(x + 22 * s, 590 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      x += 44 * s;
    }
    ctx.fillStyle = INK.soft;
    x += spacedText(ctx, word.toUpperCase(), x, 591 * s, 6 * s);
  });

  drawButton(ctx, 668 * s, C.cta.toUpperCase(), "→", s, opts);
  drawHoverFrame(ctx, w, h, s, opts.hover);
};
