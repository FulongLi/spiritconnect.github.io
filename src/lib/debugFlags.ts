/**
 * Developer switches, read from the URL so they work on the static site:
 *
 *   ?debug=1          show the Leva hologram controls + model lab
 *   ?hologram=webgl   force the hologram's WebGL 2 backend
 *   ?hologram=2d      force the 2D canvas fallback
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
};

export const DEFAULT_DEBUG_FLAGS: DebugFlags = {
  hologramControls: false,
  hologramControlsExpanded: false,
  hologramBackend: "auto",
};

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
  };
}

let cached: DebugFlags | null = null;

/** stable snapshot for useSyncExternalStore (flags never change after load) */
export function getDebugFlags(): DebugFlags {
  cached ??= readDebugFlags();
  return cached;
}
