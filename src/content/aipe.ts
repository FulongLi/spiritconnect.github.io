import { AIPE_VISION, DIVISIONS, VISION_LOOP } from "./site";

/* ------------------------------------------------------------------ */
/* /aipe — AIPE introduced at the Spirit Connect brand level.          */
/*                                                                     */
/* Deliberately short: what AIPE is, the idea behind it, its scope,     */
/* and the way into the platform. Tools, documentation, research and   */
/* the Academy live on the standalone platform (DIVISIONS.aipe          */
/* .platformUrl) and are not repeated here.                             */
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
  body: "AIPE is Spirit Connect's intelligent engineering platform for power electronics and energy systems — connecting engineering knowledge, tools and data with AI-driven design.",
  secondaryCta: "About the vision",
} as const;

export const AIPE_IDEA = {
  kicker: "01 / THE IDEA",
  title: ["A LOOP,", "NOT A LINE."],
  body: [
    "Energy systems power computation. AI uses engineering knowledge and data to improve the devices, converters and systems that supply that energy.",
    "Every improved system returns new data — and the loop continues.",
  ],
  /** the loop's stages, shared with the diagram on /about */
  steps: VISION_LOOP.map((s) => s.label),
} as const;

export const AIPE_SCOPE = {
  kicker: "02 / FROM DEVICES TO SYSTEMS",
  title: ["ONE DISCIPLINE.", "EVERY SCALE."],
  scales: [
    { id: "devices", label: "Devices", detail: "The semiconductor switches where power conversion begins." },
    { id: "components", label: "Components / Magnetics", detail: "Inductors, transformers and passives that store and transfer energy." },
    { id: "converters", label: "Converters", detail: "Topology, control and protection, designed together." },
    { id: "systems", label: "Systems", detail: "Grids, storage, data centres and mobility — energy at scale." },
  ],
  workflow:
    "AI-assisted engineering workflows connect the scales: the same knowledge, tools and data carry a better device into a better converter, and a better converter into a better system.",
} as const;

export const AIPE_ENTER = {
  kicker: "03 / ENTER THE PLATFORM",
  title: ["THE WORK", "HAPPENS HERE."],
  body: "Tools, research and engineering resources for AI-driven power electronics live on the dedicated AIPE platform.",
} as const;
