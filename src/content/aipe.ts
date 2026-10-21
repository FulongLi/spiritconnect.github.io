import { AIPE_VISION, DIVISIONS, type Statement } from "./site";

/* ------------------------------------------------------------------ */
/* /aipe — AIPE introduced at the Spirit Connect brand level.          */
/*                                                                     */
/* Three movements: the vision (over a still of the lunar micro-grid   */
/* from Chapter 07 of the journey), how AIPE connects the engineering  */
/* scales, and the way into the platform. Tools, documentation,        */
/* research and the Academy live on the standalone platform            */
/* (DIVISIONS.aipe.platformUrl) and are not repeated here.             */
/* ------------------------------------------------------------------ */

const PLATFORM_URL = DIVISIONS.aipe.platformUrl!;

export const AIPE_PLATFORM = {
  url: PLATFORM_URL,
  /** the bare domain, for the "opens another website" hint */
  host: new URL(PLATFORM_URL).host,
  cta: "Explore AIPE",
} as const;

export const AIPE_HERO = {
  eyebrow: "SPIRIT CONNECT / AIPE",
  title: "AIPE",
  statement: AIPE_VISION,
  tagline: "Intelligent engineering for power and energy systems.",
  body: "AIPE is Spirit Connect's intelligent engineering platform for power electronics and energy systems.",
} as const;

/**
 * The hero still: rendered from the journey's own lunar scene (see
 * docs/aipe-hero-image.md), one composition per aspect.
 */
export const AIPE_HERO_IMAGE = {
  alt: "The Spirit Connect lunar micro-grid: a nuclear core, battery storage, a solar array, the solid-state transformer, a data centre and the habitat, linked by lines of energy and data.",
  caption: "Lunar micro-grid · 07 / Intelligent engineering",
} as const;

export const AIPE_INTELLIGENCE = {
  kicker: "02 / ENGINEERING INTELLIGENCE",
  title: ["FROM DEVICES", "TO SYSTEMS."] as Statement,
  body: "AIPE connects engineering knowledge, data and tools across every scale of power electronics — what is learned at the device carries into the converter, and from the converter into the system.",
  scales: [
    { id: "devices", label: "Devices", detail: "Semiconductor switches" },
    { id: "magnetics", label: "Magnetics", detail: "Inductors and transformers" },
    { id: "converters", label: "Converters", detail: "Topology, control, protection" },
    { id: "systems", label: "Systems", detail: "Grids, storage, data centres" },
  ],
  workflowLabel: "The workflow",
  /** read as one sequence that returns to its start */
  workflow: ["Engineering data", "AI-assisted design", "Simulation and evaluation", "Improved engineering systems"],
} as const;

export const AIPE_ENTER = {
  kicker: "03 / ENTER AIPE",
  title: ["ENTER AIPE."] as Statement,
  body: "Explore the tools, data and intelligent workflows behind the next generation of power and energy engineering.",
} as const;
