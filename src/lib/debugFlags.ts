/**
 * Developer switches, read from the URL so they work on the static site:
 *
 *   ?debug=1          show the Leva hologram controls + model lab
 *   ?hologram=webgl   force the hologram's WebGL 2 backend
 *   ?hologram=2d      force the 2D canvas fallback
 *
 * Lunar homepage render A/B switches (for chasing flicker on high-DPI Macs):
 *
 *   ?gldebug=1        log the render profile + WebGL context loss/restore
 *                     (always on in `next dev`)
 *   ?dpr=2            override the lunar scene's pixel ratio
 *   ?msaa=8           override the lunar scene's MSAA sample count
 *   ?grain=0          hide the full-screen film grain layer
 *
 * In `next dev` the Leva controls are available by default (collapsed).
 * None of the debug UI is downloaded unless one of these is active.
 */
export type HologramBackendOverride = "auto" | "webgl" | "2d";

export type DebugFlags = {
  hologramControls: boolean;
  /** panel starts expanded (explicit ?debug=1) rather than collapsed (dev default) */
  hologramControlsExpanded: boolean;
  hologramBackend: HologramBackendOverride;
  renderDiagnostics: boolean;
  lunarDpr: number | null;
  lunarMsaa: number | null;
  grain: boolean;
};

export const DEFAULT_DEBUG_FLAGS: DebugFlags = {
  hologramControls: false,
  hologramControlsExpanded: false,
  hologramBackend: "auto",
  renderDiagnostics: false,
  lunarDpr: null,
  lunarMsaa: null,
  grain: true,
};

function numberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function readDebugFlags(): DebugFlags {
  if (typeof window === "undefined") return DEFAULT_DEBUG_FLAGS;
  const params = new URLSearchParams(window.location.search);
  const backend = params.get("hologram");
  return {
    hologramControls:
      params.get("debug") === "1" ||
      (process.env.NODE_ENV === "development" && params.get("debug") !== "0"),
    hologramControlsExpanded: params.get("debug") === "1",
    hologramBackend: backend === "webgl" || backend === "2d" ? backend : "auto",
    renderDiagnostics:
      params.get("gldebug") === "1" ||
      (process.env.NODE_ENV === "development" && params.get("gldebug") !== "0"),
    lunarDpr: numberParam(params, "dpr"),
    lunarMsaa: numberParam(params, "msaa"),
    grain: params.get("grain") !== "0",
  };
}

let cached: DebugFlags | null = null;

/** stable snapshot for useSyncExternalStore (flags never change after load) */
export function getDebugFlags(): DebugFlags {
  cached ??= readDebugFlags();
  return cached;
}
