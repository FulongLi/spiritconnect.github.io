/* ------------------------------------------------------------------ */
/* Journey content + timeline                                          */
/*                                                                     */
/* All values are in STORY progress (0..1). The camera flight, chapter */
/* windows, the AI loop and the Dome hand-off are tuned in this space. */
/* Raw scroll position is mapped onto story progress by a pacing       */
/* curve (`scrollToStory`) that gives the turning point and the        */
/* closing sequence more scroll length, with no abrupt speed changes.  */
/*                                                                     */
/* One causal story, told in seven chapters:                           */
/*   energy is generated → made continuous → stored → shaped →         */
/*   converted into computation → enters the physical world →          */
/*   becomes data and intelligence → AI redesigns the energy system.   */
/* ------------------------------------------------------------------ */

export type Chapter = {
  id: string;
  start: number;
  end: number;
  kicker: string;
  title: string;
  /** one short line of copy under the title (kicker → title → sub: three levels) */
  sub?: string;
  /** a short row of mono labels under the copy */
  tags?: string[];
  align: "left" | "right" | "center";
  /**
   * The chapter's closing statement: it replaces the chapter copy in
   * place (same chapter, no new number) before the camera turns to the Dome.
   */
  coda?: { start: number; end: number; kicker: string; title: string; sub?: string; align: "left" | "right" | "center" };
};

export const CHAPTERS: Chapter[] = [
  {
    id: "hero",
    start: 0.0,
    end: 0.06,
    kicker: "SPIRIT CONNECT",
    title: "ENERGY POWERS AI. AI DESIGNS ENERGY.",
    align: "center",
  },
  /* ---- ACT I — ENERGY ---- */
  {
    id: "solar",
    start: 0.075,
    end: 0.165,
    kicker: "01 / SOLAR",
    title: "ENERGY BEGINS HERE.",
    sub: "Sunlight becomes electricity — the first input to an intelligent energy system.",
    align: "left",
  },
  {
    id: "nuclear",
    start: 0.18,
    end: 0.26,
    kicker: "02 / NUCLEAR",
    title: "POWER WHEN THE SUN CANNOT.",
    sub: "Solar gives energy. Nuclear gives continuity — a steady foundation for always-on infrastructure.",
    align: "right",
  },
  {
    id: "storage",
    start: 0.275,
    end: 0.35,
    kicker: "03 / STORAGE",
    title: "ENERGY NEEDS MEMORY.",
    sub: "Storage absorbs time — holding energy when generation and demand do not align.",
    align: "left",
  },
  /* ---- ACT II — ENGINEERING ---- */
  {
    id: "power-electronics",
    start: 0.365,
    end: 0.445,
    kicker: "04 / POWER ELECTRONICS",
    title: "POWER MUST BE SHAPED.",
    sub: "Voltage, current and power flow — actively controlled.",
    tags: ["DEVICES", "MAGNETICS", "CONTROL", "PROTECTION"],
    align: "right",
  },
  /* ---- ACT III — INTELLIGENCE + PHYSICAL ACTION ---- */
  {
    // the turning point: until here the camera follows the physical
    // energy system; from here on it starts to read it as information
    id: "data-centre",
    start: 0.46,
    end: 0.555,
    kicker: "05 / DATA CENTRE",
    title: "ENERGY BECOMES INTELLIGENCE.",
    sub: "Power becomes computation. Computation becomes intelligence.",
    align: "left",
  },
  {
    id: "mobility",
    start: 0.575,
    end: 0.65,
    kicker: "06 / MOBILITY",
    title: "ENERGY ENTERS THE PHYSICAL WORLD.",
    sub: "Power reaches vehicles, machines and infrastructure — wherever the system needs to act.",
    align: "left",
  },
  /* ---- ACT IV — SYSTEM / FEEDBACK ---- */
  {
    id: "intelligent-engineering",
    start: 0.67,
    end: 0.745,
    kicker: "07 / INTELLIGENT ENGINEERING",
    title: "AI DESIGNS THE NEXT SYSTEM.",
    sub: "The physical system becomes data. AI learns from it — then returns to redesign the energy system.",
    align: "left",
    coda: {
      start: 0.752,
      end: 0.805,
      kicker: "SPIRIT CONNECT",
      title: "ENERGY POWERS AI. AI DESIGNS ENERGY.",
      align: "center",
    },
  },
];

/* ---------------- scroll layout ---------------- */

/** total scroll length = SCROLL_SECTIONS * 100vh */
export const SCROLL_SECTIONS = 14;

/**
 * Scroll density along the story: [story progress, relative scroll length].
 * Linear in between, so the pace eases rather than steps. The data centre
 * (the turning point) lingers a little; Chapter 07, the loop closing and
 * the Dome approach — the climax — receive the most scroll.
 */
const PACE: [number, number][] = [
  [0, 1],
  [0.44, 1],
  [0.47, 1.18],
  [0.55, 1.18],
  [0.575, 1],
  [0.64, 1],
  [0.675, 1.5],
  [0.8, 1.5],
  [0.83, 1.3],
  [0.88, 1.3],
  [0.92, 1],
  [1, 1],
];

/** cumulative scroll (0..1) at evenly spaced story samples */
const PACE_TABLE = (() => {
  const n = 1000;
  const density = (s: number) => {
    let i = 0;
    while (i < PACE.length - 2 && s > PACE[i + 1][0]) i++;
    const [s0, d0] = PACE[i];
    const [s1, d1] = PACE[i + 1];
    return d0 + ((d1 - d0) * (s - s0)) / (s1 - s0);
  };
  const cum = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) {
    cum[i] = cum[i - 1] + density((i - 0.5) / n) / n;
  }
  const total = cum[n];
  for (let i = 0; i <= n; i++) cum[i] /= total;
  return cum;
})();

/** story progress (0..1) → raw scroll fraction (0..1) */
export function storyToScroll(p: number) {
  const n = PACE_TABLE.length - 1;
  const f = Math.min(1, Math.max(0, p)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  return PACE_TABLE[i] + (PACE_TABLE[i + 1] - PACE_TABLE[i]) * (f - i);
}

/** raw scroll fraction (0..1) → story progress (0..1) */
export function scrollToStory(r: number) {
  const x = Math.min(1, Math.max(0, r));
  const n = PACE_TABLE.length - 1;
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (PACE_TABLE[mid] <= x) lo = mid;
    else hi = mid;
  }
  const span = PACE_TABLE[hi] - PACE_TABLE[lo];
  return (lo + (span > 0 ? (x - PACE_TABLE[lo]) / span : 0)) / n;
}

/* ---------------- cinematic timeline (story progress) ---------------- */

/*
 * The ending of Chapter 07: the camera has risen over the whole system,
 * the loop closes, and the view descends along the main Dome's entrance
 * axis into the airlock (camera path knots end at 0.89). Inside the
 * vestibule the workspace scene — built on the same Dome geometry and the
 * same entrance axis — cross-fades in and its camera carries on through
 * the Dome to the workstation. Everything from here on is driven by the
 * page's smoothed progress, so camera and hand-off stay in step.
 */
export const TIMELINE = {
  /** mount + warm the workspace renderer (TRANSITION begins) */
  presenceWarm: 0.74,
  /** unmount the workspace renderer again when scrolling back above this */
  presenceRelease: 0.68,
  /** the Dome approach begins: the skip control steps aside */
  arrivalStart: 0.79,
  /** ENTER caption while the airlock approaches */
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
 * Wakes at the data centre (the turning point: information lights, the
 * data network brightens), then fully engages as Chapter 07 reveals the
 * whole system — above 0.3 the feedback waves start to leave the data
 * centre and travel back through the network to the sources. Once the
 * loop has closed it settles back while the camera descends to the Dome.
 */
export function loopIntensity(p: number) {
  return 0.3 * smoothstep(0.47, 0.54, p) + 0.7 * smoothstep(0.685, 0.74, p) * (1 - smoothstep(0.805, 0.845, p));
}

/**
 * Chapter 07's information view (0..1): while the whole system is read as
 * one network, the sunlit world recedes part-way toward the night palette
 * so the energy and data lines — and the feedback waves — can be read.
 * Daylight returns as the camera descends to the Dome.
 */
export function insightIntensity(p: number) {
  return smoothstep(0.665, 0.72, p) * (1 - smoothstep(0.8, 0.845, p));
}
