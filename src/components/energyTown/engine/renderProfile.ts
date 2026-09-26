/* ------------------------------------------------------------------ */
/* Rendering profile for the lunar scene. Quality is chosen from the   */
/* number of pixels the GPU actually has to fill (CSS pixels × DPR²),  */
/* not just "desktop vs. mobile": a 5K/6K Retina display at DPR 2 is   */
/* 4× the work of the same layout at DPR 1, and every frame goes       */
/* through MSAA + bloom render targets at that size.                   */
/* ------------------------------------------------------------------ */

export type LunarQuality = "high" | "low";

export type RenderProfile = {
  tier: "compact" | "standard" | "retina" | "retina-xl";
  /** scene detail passed to the town builder / model loader */
  quality: LunarQuality;
  /** pixel ratio actually used for the canvas and composer */
  dpr: number;
  /** MSAA samples on the composer's render targets */
  samples: number;
  /** bloom resolution relative to the render resolution (≤ 1) */
  bloomScale: number;
  shadows: boolean;
  /** CSS px × native DPR² (what an uncapped renderer would fill) */
  nativePixels: number;
  /** CSS px × dpr² (what we actually fill) */
  renderPixels: number;
};

export type RenderOverrides = {
  dpr?: number | null;
  samples?: number | null;
};

/** ~4K UHD: the most we render per frame on any display */
const PIXEL_BUDGET = 3840 * 2160;
/** above this (after the DPR cap) MSAA and bloom are scaled down further */
const XL_PIXELS = 6_000_000;
/** below this a desktop display is treated as "standard" (no DPR cap needed) */
const RETINA_PIXELS = 4_200_000;

export function computeRenderProfile(
  width: number,
  height: number,
  deviceDpr: number,
  compact: boolean,
  overrides: RenderOverrides = {},
): RenderProfile {
  const cssPixels = Math.max(1, width * height);
  const nativeDpr = Math.max(1, deviceDpr || 1);
  const nativePixels = cssPixels * nativeDpr * nativeDpr;

  let tier: RenderProfile["tier"];
  let dprCap: number;
  if (compact) {
    tier = "compact";
    dprCap = 1.5;
  } else if (nativeDpr < 1.75 && nativePixels <= RETINA_PIXELS) {
    tier = "standard";
    dprCap = 2;
  } else {
    tier = "retina";
    dprCap = 1.5;
  }

  // keep the filled pixel count within budget (never below DPR 1)
  const budgetDpr = Math.max(1, Math.sqrt(PIXEL_BUDGET / cssPixels));
  let dpr = Math.min(nativeDpr, dprCap, budgetDpr);
  if (overrides.dpr) dpr = Math.min(Math.max(overrides.dpr, 0.5), 3);
  dpr = Math.round(dpr * 100) / 100;

  const renderPixels = cssPixels * dpr * dpr;
  if (tier === "retina" && renderPixels > XL_PIXELS) tier = "retina-xl";

  let samples = compact ? 2 : tier === "retina-xl" ? 2 : 4;
  if (overrides.samples != null) samples = Math.min(Math.max(Math.round(overrides.samples), 0), 8);

  return {
    tier,
    quality: compact ? "low" : "high",
    dpr,
    samples,
    bloomScale: tier === "retina-xl" ? 0.75 : 1,
    shadows: !compact,
    nativePixels,
    renderPixels,
  };
}
