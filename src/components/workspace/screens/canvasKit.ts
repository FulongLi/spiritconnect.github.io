/* ------------------------------------------------------------------ */
/* Small 2D-canvas toolkit shared by the monitor screen painters.      */
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

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
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

/** a normalised rectangle on the screen: [u0, v0, u1, v1], v from the top */
export type ScreenRect = [number, number, number, number];
/** a rectangle in canvas pixels: [x0, y0, x1, y1] */
export type PixelRect = [number, number, number, number];

export function toScreenRect([x0, y0, x1, y1]: PixelRect, w: number, h: number): ScreenRect {
  return [x0 / w, y0 / h, x1 / w, y1 / h];
}

export type ScreenPaintOptions = {
  fonts: CanvasFonts;
  logo: HTMLImageElement | null;
  hover: boolean;
  /** larger type, fewer elements (small viewports) */
  compact: boolean;
};

/** where the painter drew its interactive parts (for DOM hotspots) */
export type ScreenHotspots = {
  primary: ScreenRect;
  secondary?: ScreenRect;
};

export type ScreenPainter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: ScreenPaintOptions,
) => ScreenHotspots;

/** shared top bar: Spirit Connect mark + wordmark, product name, right label */
export function drawTopBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  s: number,
  opts: ScreenPaintOptions,
  product: string,
  right: string,
) {
  const y = 56 * s;
  const pad = 64 * s;
  ctx.textBaseline = "middle";
  const markW = drawMark(ctx, opts.logo, pad, y - 13 * s, 26 * s, "#eef0f3");
  ctx.fillStyle = "rgba(238, 240, 243, 0.86)";
  ctx.font = `400 ${15 * s}px ${opts.fonts.mono}`;
  const wx = pad + (markW ? markW + 16 * s : 0);
  const ww = spacedText(ctx, "SPIRIT CONNECT", wx, y, 4.2 * s);
  ctx.fillStyle = "rgba(238, 240, 243, 0.28)";
  ctx.fillRect(wx + ww + 22 * s, y - 11 * s, 1.5 * s, 22 * s);
  ctx.fillStyle = "rgba(238, 240, 243, 0.62)";
  spacedText(ctx, product, wx + ww + 44 * s, y, 4.2 * s);
  ctx.fillStyle = "rgba(238, 240, 243, 0.5)";
  spacedText(ctx, right, w - pad, y, 3.4 * s, "right");
  ctx.fillStyle = "rgba(238, 240, 243, 0.08)";
  ctx.fillRect(pad, 100 * s, w - pad * 2, 1.5 * s);
}

/** the primary call to action, identical on both screens */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  arrow: string,
  s: number,
  opts: ScreenPaintOptions,
): PixelRect {
  const h = 66 * s;
  ctx.font = `500 ${17 * s}px ${opts.fonts.mono}`;
  const textW = measureSpaced(ctx, label, 4 * s);
  const w = textW + 110 * s;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = opts.hover ? "#ffffff" : "#e3e5e9";
  ctx.fill();
  ctx.fillStyle = "#0c0d0f";
  ctx.textBaseline = "middle";
  spacedText(ctx, label, x + 38 * s, y + h / 2 + 1, 4 * s);
  ctx.font = `400 ${22 * s}px ${opts.fonts.sans}`;
  ctx.fillText(arrow, x + w - (opts.hover ? 40 : 46) * s, y + h / 2 + 1);
  return [x, y, x + w, y + h];
}
