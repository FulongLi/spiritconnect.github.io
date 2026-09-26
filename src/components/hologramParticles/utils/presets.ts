import type { PresetId, HologramPreset, HologramParams } from "../types";
import { MODEL_URLS } from "../engine/geometry";

export type { PresetId, HologramPreset };

export const PRESETS: Record<PresetId, HologramPreset> = {
  light: {
    color: "#99a5b7",
    ambient: 0.2,
    wrap: 0.35,
    volumeStrength: 0.67,
    mouseGlowColor: "#ffada7",
    light1Color: "#ffffff",
    light1Intensity: 1.5,
    light2Color: "#f2e0e0",
    light2Intensity: 1.1,
    cylColor: "#ffffff",
    gridColor: "#c8d4de",
    gridBaseOpacity: 0.31,
    ringColor: "#ffffff",
    ringThickness: 0.03,
    ringBrightness: 3.0,
    ringOpacity: 0.9,
    bgColorCenter: "#495155",
    bgColorMid: "#495258",
    bgColorEdge: "#305269",
  },
  dark: {
    color: "#d1e3ff",
    ambient: 0.08,
    wrap: 0.31,
    volumeStrength: 0.98,
    mouseGlowColor: "#ffffff",
    light1Color: "#8bb4d5",
    light1Intensity: 1.75,
    light2Color: "#8bb4d5",
    light2Intensity: 1.35,
    cylColor: "#99c4f0",
    gridColor: "#c8d4de",
    gridBaseOpacity: 0.06,
    ringColor: "#809fde",
    ringThickness: 0.035,
    ringBrightness: 4.8,
    ringOpacity: 0.47,
    bgColorCenter: "#010407",
    bgColorMid: "#010408",
    bgColorEdge: "#000000",
  },
};

/** brand blue used for every model shown on the stage */
export const STAGE_MODEL_COLOR = "#2ebcfe";

/** layout / device adjustments for the central stage */
export const STAGE_LAYOUT = {
  modelYDesktop: -0.9,
  modelYCompact: -0.78,
  /** shift the stage right on wide screens where the interior title sits left */
  modelXWide: 0.32,
  wideQuery: "(min-width: 1100px)",
  compactMaxParticles: 36000,
  /** smaller stage rig on phones so the halo rings clear the copy */
  compactModelScale: 0.5,
  /** the WebGL 2 fallback backend gets a lighter particle budget */
  webglMaxParticles: 30000,
} as const;

type Tuning = Partial<HologramParams>;

/** Per-shape tuning (formerly inlined in the branch playground). */
export const MODEL_TUNING = {
  /** the Presence entity */
  sphere: {
    breathAmp: 0.065,
    floatAmp: 0.025,
    maskContrast: 2.2,
    noiseAmp: 0.12,
    noiseScale: 1.15,
  },
  terrain: {
    breathAmp: 0,
    floatAmp: 0.006,
    maskContrast: 1.8,
    noiseAmp: 0.035,
    noiseScale: 0.85,
  },
  logo: {
    breathAmp: 0,
    floatAmp: 0.008,
    maskContrast: 2.3,
    noiseAmp: 0.018,
    noiseScale: 0.95,
    bloomStrength: 0.54,
    ringBrightness: 4.4,
  },
  generic: { breathAmp: 0 },
} satisfies Record<string, Tuning>;

/**
 * Models reachable from the debug lab (?debug=1). Only the Presence sphere
 * is shown to visitors; the rest are kept for development and future use.
 */
export const LAB_MODELS: { label: string; url: string; tuning: Tuning }[] = [
  { label: "Presence sphere", url: MODEL_URLS.sphere, tuning: MODEL_TUNING.sphere },
  { label: "Spirit Connect logo", url: MODEL_URLS.spiritLogo, tuning: MODEL_TUNING.logo },
  { label: "AIPE logo", url: MODEL_URLS.powerLabsLogo, tuning: MODEL_TUNING.logo },
  { label: "Terrain", url: MODEL_URLS.terrain, tuning: MODEL_TUNING.terrain },
  { label: "Brush (Fantasy)", url: MODEL_URLS.brush, tuning: MODEL_TUNING.generic },
  { label: "Crystal", url: MODEL_URLS.crystal, tuning: MODEL_TUNING.generic },
  { label: "Pyramid", url: MODEL_URLS.pyramid, tuning: MODEL_TUNING.generic },
  { label: "Boat", url: MODEL_URLS.boat, tuning: MODEL_TUNING.generic },
  { label: "Gamepad", url: MODEL_URLS.gamepad, tuning: MODEL_TUNING.generic },
];
