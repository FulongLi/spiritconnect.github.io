/* ------------------------------------------------------------------ */
/* Small 2D-canvas toolkit shared by the monitor screen painters.      */
/* Screens are portals, not websites: large type, one motif, one CTA.  */
/* Layout units are a 1600 × 900 reference screen, scaled by `s`.       */
/*                                                                     */
/* Type is sized for the FINAL projection: in the desktop frame each   */
/* display is ~400 CSS px wide (≈ 0.25 px per canvas unit), so nothing */
/* meant to be read is set below ~40 units.                            */
/* ------------------------------------------------------------------ */

/** the Spirit Connect type roles: display (Bebas Neue), body (Barlow Condensed), mono (IBM Plex Mono) */
export type CanvasFonts = { display: string; body: string; mono: string };

/** the site's type stacks (the :root role variables), readable by canvas text */
function readCanvasFonts(): CanvasFonts {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    display: read("--font-display", '"Arial Narrow", sans-serif'),
    body: read("--font-body", '"Arial Narrow", sans-serif'),
    mono: read("--font-mono", "monospace"),
  };
}

/**
 * The type stacks, once the web fonts the screens use have loaded — a
 * canvas paints with whatever is available at that moment and never
 * repaints on its own when a font arrives.
 */
export async function loadCanvasFonts(): Promise<CanvasFonts> {
  const fonts = readCanvasFonts();
  if (document.fonts) {
    await Promise.all(
      [`400 64px ${fonts.display}`, `400 64px ${fonts.body}`, `500 64px ${fonts.body}`, `500 64px ${fonts.mono}`].map(
        (font) => document.fonts.load(font).catch(() => []),
      ),
    );
  }
  return fonts;
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
  soft: "rgba(230, 232, 236, 0.86)",
  dim: "rgba(230, 232, 236, 0.64)",
  faint: "rgba(230, 232, 236, 0.22)",
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

/** left margin of every screen */
export const MARGIN = 100;

/** Spirit Connect mark + one line of context, top left */
export function drawEyebrow(ctx: CanvasRenderingContext2D, s: number, opts: ScreenPaintOptions, label: string) {
  const x = MARGIN * s;
  const y = 112 * s;
  ctx.textBaseline = "middle";
  const markW = drawMark(ctx, opts.logo, x, y - 24 * s, 48 * s, INK.bright);
  ctx.fillStyle = INK.dim;
  ctx.font = `500 ${42 * s}px ${opts.fonts.mono}`;
  spacedText(ctx, label, x + (markW ? markW + 26 * s : 0), y + 1, 4 * s);
}

/** the big title, in the brand display face */
export function drawTitle(ctx: CanvasRenderingContext2D, s: number, opts: ScreenPaintOptions, title: string, y: number) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK.bright;
  ctx.font = `400 ${196 * s}px ${opts.fonts.display}`;
  spacedText(ctx, title, (MARGIN - 6) * s, y, 6 * s);
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
  const x = MARGIN * s;
  const h = 124 * s;
  ctx.font = `500 ${46 * s}px ${opts.fonts.mono}`;
  const textW = measureSpaced(ctx, label, 5 * s);
  const w = textW + 210 * s;
  roundRectPath(ctx, x, y, w, h, h / 2);
  // hover: a slightly brighter pill (still below the bloom threshold)
  ctx.fillStyle = opts.hover ? "#eaecef" : "#dfe1e5";
  ctx.fill();
  ctx.fillStyle = "#0c0d0f";
  ctx.textBaseline = "middle";
  spacedText(ctx, label, x + 64 * s, y + h / 2 + 2, 5 * s);
  ctx.font = `500 ${50 * s}px ${opts.fonts.body}`;
  // the arrow leans forward on hover / focus
  ctx.fillText(arrow, x + w - (opts.hover ? 78 : 92) * s, y + h / 2 + 2);
  return y + h;
}

/** hovered / focused: a restrained hairline just inside the screen edge */
export function drawHoverFrame(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, hover: boolean) {
  if (!hover) return;
  const inset = 8 * s;
  roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, 12 * s);
  ctx.strokeStyle = "rgba(236, 238, 242, 0.16)";
  ctx.lineWidth = 2 * s;
  ctx.stroke();
}
