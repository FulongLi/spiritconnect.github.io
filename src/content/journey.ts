import { DIVISIONS } from "./site";

/* ------------------------------------------------------------------ */
/* Journey content + timeline                                          */
/*                                                                     */
/* All values are in STORY progress (0..1). The camera flight, chapter */
/* windows, mist, blackout and portal hand-off are tuned in this space. */
/* Raw scroll position is mapped onto story progress by                */
/* `scrollToStory`, which gives the closing AI-loop narrative extra    */
/* scroll length without re-tuning anything else.                      */
/* ------------------------------------------------------------------ */

export type ChapterLink = { label: string; href: string; external?: boolean };

export type Chapter = {
  id: string;
  start: number;
  end: number;
  kicker: string;
  title: string;
  sub?: string;
  body: string;
  align: "left" | "right" | "center";
  link?: ChapterLink;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "hero",
    start: 0.0,
    end: 0.085,
    kicker: "SPIRIT CONNECT",
    title: "ENERGY POWERS AI. AI DESIGNS ENERGY.",
    body: "",
    align: "center",
  },
  {
    id: "solar",
    start: 0.1,
    end: 0.21,
    kicker: "01 / SOLAR FIELD",
    title: "HARVEST THE SUN",
    sub: "Solar energy begins the loop.",
    body: "Photovoltaic fields capture the first source of power for future habitats, data centres, and intelligent energy systems.",
    align: "left",
  },
  {
    id: "nuclear",
    start: 0.235,
    end: 0.305,
    kicker: "02 / NUCLEAR POWER CORE",
    title: "POWER BEYOND THE SUN",
    sub: "Some missions cannot depend on sunlight alone.",
    body: "Nuclear power cores provide long-duration, high-reliability energy for deep-space operation, shadowed regions, and always-on infrastructure.",
    align: "right",
  },
  {
    id: "storage",
    start: 0.32,
    end: 0.4,
    kicker: "03 / ENERGY STORAGE",
    title: "STORE THE LIGHT",
    sub: "Storage gives energy continuity.",
    body: "Battery systems absorb fluctuation, bridge darkness, and turn intermittent generation into dependable power for mission-critical operation.",
    align: "left",
  },
  {
    id: "sst",
    start: 0.415,
    end: 0.495,
    kicker: "04 / SOLID-STATE TRANSFORMER",
    title: "SHAPE THE GRID",
    sub: "Solid-state transformers form the backbone of advanced energy networks.",
    body: "Wide-bandgap devices, high-frequency magnetics, control, protection, thermal design, and power routing are integrated into one intelligent conversion hub.",
    align: "left",
  },
  {
    // the turning point: from here the story runs back toward the grid
    id: "data-centre",
    start: 0.505,
    end: 0.585,
    kicker: "05 / DATA CENTRE",
    title: "ENERGY BECOMES INTELLIGENCE",
    sub: "Inside the data centre, energy becomes computation.",
    body: "Digital twins, converter simulations, device databases, magnetic models and AI design agents learn from the power system that feeds them. This is where the loop turns.",
    align: "left",
  },
  {
    id: "charging",
    start: 0.598,
    end: 0.642,
    kicker: "06 / CHARGING & LANDING",
    title: "POWER ON THE MOVE",
    sub: "Every vehicle docks into the same grid.",
    body: "Landing pads and charging stations extend the micro-grid to rovers, landers, and future mobility — energy delivered wherever the mission goes.",
    align: "right",
  },
  {
    id: "ai-engineering",
    start: 0.648,
    end: 0.69,
    kicker: "07 / AI ENGINEERING",
    title: "DESIGN THE NEXT SYSTEM",
    sub: "The system becomes data. The data becomes intelligence.",
    body: "The intelligence returns to redesign the system that powers it.",
    align: "left",
  },
  {
    id: "aipe",
    start: 0.696,
    end: 0.728,
    kicker: "08 / AIPE — ENGINEERING DIVISION",
    title: "ENGINEERING INTELLIGENCE",
    sub: "AIPE turns engineering knowledge into AI that designs energy.",
    body: "Devices, converters, magnetics, thermal behaviour and system validation — the Spirit Connect engineering division builds the tools that let AI take part in real power-electronics design.",
    align: "right",
    link: { label: "Explore AIPE", href: DIVISIONS.aipe.href, external: true },
  },
  {
    id: "loop",
    start: 0.733,
    end: 0.762,
    kicker: "09 / THE LOOP CLOSES",
    title: "ENERGY POWERS AI. AI DESIGNS ENERGY.",
    sub: "Every redesign returns new data. The loop keeps learning.",
    body: "",
    align: "center",
  },
];

/* ---------------- scroll layout ---------------- */

/** total scroll length = SCROLL_SECTIONS * 100vh */
export const SCROLL_SECTIONS = 14;

/**
 * Story range that receives extra scroll length: the charging → AI loop
 * sequence, where three short chapters play while the camera rises over the
 * habitat. Everything outside it keeps the original pacing.
 */
const STRETCH = { start: 0.595, end: 0.77, extraSections: 2 };

const SCROLL_UNITS = SCROLL_SECTIONS - 1;
const BASE_UNITS = SCROLL_UNITS - STRETCH.extraSections;
const U0 = STRETCH.start * BASE_UNITS;
const U1 = U0 + (STRETCH.end - STRETCH.start) * BASE_UNITS + STRETCH.extraSections;

/** raw scroll fraction (0..1) → story progress (0..1) */
export function scrollToStory(r: number) {
  const u = Math.min(1, Math.max(0, r)) * SCROLL_UNITS;
  if (u < U0) return u / BASE_UNITS;
  if (u < U1) return STRETCH.start + ((u - U0) / (U1 - U0)) * (STRETCH.end - STRETCH.start);
  return Math.min(1, STRETCH.end + (u - U1) / BASE_UNITS);
}

/** story progress (0..1) → raw scroll fraction (0..1) */
export function storyToScroll(p: number) {
  const s = Math.min(1, Math.max(0, p));
  let u: number;
  if (s < STRETCH.start) u = s * BASE_UNITS;
  else if (s < STRETCH.end)
    u = U0 + ((s - STRETCH.start) / (STRETCH.end - STRETCH.start)) * (U1 - U0);
  else u = U1 + (s - STRETCH.end) * BASE_UNITS;
  return u / SCROLL_UNITS;
}

/* ---------------- cinematic timeline (story progress) ---------------- */

/*
 * The arrival: the lunar camera swings down to the main Dome's airlock
 * and flies into the vestibule (camera path knots end at 0.89). Inside
 * the vestibule the workspace scene — built on the same Dome geometry and
 * the same entrance axis — cross-fades in and its camera carries on
 * through the Dome to the workstation. Everything from here on is driven
 * by the page's smoothed progress, so camera and hand-off stay in step.
 */
export const TIMELINE = {
  /** mount + warm the workspace renderer (TRANSITION begins) */
  presenceWarm: 0.74,
  /** unmount the workspace renderer again when scrolling back above this */
  presenceRelease: 0.68,
  /** the arrival begins: the skip control steps aside */
  arrivalStart: 0.79,
  /** WELCOME caption while the airlock approaches */
  captionIn: 0.845,
  captionOut: 0.9,
  /** the workspace starts rendering just before it becomes visible */
  presenceActivate: 0.855,
  /** hand-off inside the vestibule; once complete the lunar scene is hidden */
  portalFadeStart: 0.878,
  portalFadeEnd: 0.89,
  /** PRESENCE state: lunar rendering suspended, GPU memory released */
  presenceEnter: 0.9,
  /** the interior camera: vestibule → the observation point at the workstation */
  interiorStart: 0.878,
  interiorEnd: 0.985,
  /** the monitors become links as the camera settles */
  interiorReveal: 0.95,
} as const;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Strength of the AI → energy feedback loop in the lunar scene (0..1).
 * Hints at the data centre (the turning point), then fully lights the
 * returning data network during the AI-engineering chapters.
 */
export function loopIntensity(p: number) {
  return 0.3 * smoothstep(0.5, 0.58, p) + 0.7 * smoothstep(0.645, 0.7, p);
}
