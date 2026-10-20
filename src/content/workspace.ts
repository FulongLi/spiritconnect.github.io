import { COMPANY, DIVISIONS, statementText } from "./site";

/* ------------------------------------------------------------------ */
/* The Spirit Connect workspace — final destination of the lunar      */
/* journey. Two equal monitors (Presence, AIPE) and the Presence       */
/* device on the desk. Screen copy is painted into the 3D monitors and */
/* mirrored in the accessible link labels.                             */
/* ------------------------------------------------------------------ */

export type WorkspaceScreenId = "presence" | "aipe";

export const WORKSPACE = {
  /** section label for assistive technology */
  label: "The Spirit Connect workspace",
  /** the master-brand statement: the journey ends inside the company */
  statement: statementText(COMPANY.tagline),
} as const;

export const PRESENCE_SCREEN = {
  id: "presence",
  href: DIVISIONS.presence.href,
  external: false,
  eyebrow: "SPIRIT CONNECT · AI / INTERFACE",
  title: "PRESENCE",
  tagline: "AI, WITH A PRESENCE.",
  body: "Visual + voice interface for AI.",
  concepts: ["Voice", "Visual", "Agents"],
  cta: "Explore Presence",
  linkLabel: "Presence — AI, with a presence. Explore Presence",
} as const;

/**
 * Mirrors the current AIPE site (aipel.co.uk). The monitor opens /aipe —
 * the Spirit Connect introduction to the division — which leads on to the
 * platform itself.
 */
export const AIPE_SCREEN = {
  id: "aipe",
  href: DIVISIONS.aipe.href,
  external: false,
  eyebrow: "SPIRIT CONNECT · ENERGY / ENGINEERING",
  title: "AIPE",
  headline: ["The AI that designs", "the power systems", "that power AI."],
  /** the engineering hierarchy, device → converter → system */
  scales: ["Device", "Converter", "System"],
  cta: "Explore AIPE",
  linkLabel: "AIPE — the AI that designs the power systems that power AI. Explore AIPE",
} as const;
