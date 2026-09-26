/* ------------------------------------------------------------------ */
/* Small 2D-canvas toolkit shared by the monitor screen painters.      */
/* Screens are portals, not websites: large type, one motif, one CTA.  */
/* Layout units are a 1600 × 900 reference screen, scaled by `s`.       */
/* ------------------------------------------------------------------ */

export type CanvasFonts = { sans: string; mono: string };

/** the site's type stacks (CSS variables), readable by canvas text */
export function readCanvasFonts(): CanvasFonts {
  const css = getComputedStyle(document.documentElement);
  const mono = css.getPropertyValue("--font-mono").trim() || "Menlo, monospace";
  return {
    // light, wide-tracked grotesk for the monitor UIs
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    mono,
  };
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** text with tracking, drawn glyph by glyph (canvas letterSpacing is not universal) */
export function spacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: "left" | "center" | "right" = "left",
) {
  const width = measureSpaced(ctx, text, tracking);
  let cx = align === "left" ? x : align === "center" ? x - width / 2 : x - width;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = prev;
  return width;
}

export function measureSpaced(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return Math.max(0, w - tracking);
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** draw the (single-colour) Spirit Connect mark tinted to `color` */
export function drawMark(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  x: number,
  y: number,
  height: number,
  color: string,
) {
  if (!logo) return 0;
  const width = height * (44 / 36);
  const off = document.createElement("canvas");
  off.width = Math.ceil(width * 2);
  off.height = Math.ceil(height * 2);
  const o = off.getContext("2d")!;
  o.drawImage(logo, 0, 0, off.width, off.height);
  o.globalCompositeOperation = "source-in";
  o.fillStyle = color;
  o.fillRect(0, 0, off.width, off.height);
  ctx.drawImage(off, x, y, width, height);
  return width;
}

export type ScreenPaintOptions = {
  fonts: CanvasFonts;
  logo: HTMLImageElement | null;
  /** the screen's link is hovered / focused */
  hover: boolean;
};

export type ScreenPainter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: ScreenPaintOptions,
) => void;

export const INK = {
  bright: "#f3f4f6",
  soft: "rgba(226, 229, 234, 0.8)",
  dim: "rgba(226, 229, 234, 0.52)",
  faint: "rgba(226, 229, 234, 0.2)",
};

/** graphite glass with a soft pool of light where the motif sits */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, poolX: number, poolY: number) {
  ctx.fillStyle = "#0a0b0d";
  ctx.fillRect(0, 0, w, h);
  const pool = ctx.createRadialGradient(poolX, poolY, 0, poolX, poolY, w * 0.5);
  pool.addColorStop(0, "#23262b");
  pool.addColorStop(1, "rgba(10, 11, 13, 0)");
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);
}

/** Spirit Connect mark + one line of context, top left */
export function drawEyebrow(ctx: CanvasRenderingContext2D, s: number, opts: ScreenPaintOptions, label: string) {
  const x = 110 * s;
  const y = 118 * s;
  ctx.textBaseline = "middle";
  const markW = drawMark(ctx, opts.logo, x, y - 17 * s, 34 * s, INK.bright);
  ctx.fillStyle = INK.dim;
  ctx.font = `400 ${24 * s}px ${opts.fonts.mono}`;
  spacedText(ctx, label, x + (markW ? markW + 20 * s : 0), y + 1, 5 * s);
}

/** the big title */
export function drawTitle(ctx: CanvasRenderingContext2D, s: number, opts: ScreenPaintOptions, title: string, y: number) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK.bright;
  ctx.font = `300 ${164 * s}px ${opts.fonts.sans}`;
  spacedText(ctx, title, 102 * s, y, 11 * s);
}

/** the call to action, identical on both screens; returns its bottom edge */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  y: number,
  label: string,
  arrow: string,
  s: number,
  opts: ScreenPaintOptions,
) {
  const x = 110 * s;
  const h = 100 * s;
  ctx.font = `500 ${29 * s}px ${opts.fonts.mono}`;
  const textW = measureSpaced(ctx, label, 6 * s);
  const w = textW + 170 * s;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = opts.hover ? "#ffffff" : "#e1e3e7";
  ctx.fill();
  ctx.fillStyle = "#0c0d0f";
  ctx.textBaseline = "middle";
  spacedText(ctx, label, x + 56 * s, y + h / 2 + 1, 6 * s);
  ctx.font = `400 ${36 * s}px ${opts.fonts.sans}`;
  ctx.fillText(arrow, x + w - (opts.hover ? 62 : 72) * s, y + h / 2 + 1);
  return y + h;
}

/** hovered / focused: a soft inner light around the screen edge */
export function drawHoverFrame(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, hover: boolean) {
  if (!hover) return;
  const inset = 10 * s;
  roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, 14 * s);
  ctx.strokeStyle = "rgba(236, 238, 242, 0.34)";
  ctx.lineWidth = 3 * s;
  ctx.stroke();
}
