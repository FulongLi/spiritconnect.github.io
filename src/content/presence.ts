import { FOUNDING_PRICE_LABEL, PLANNED_RETAIL_PRICE_LABEL, PRESENCE_PRICING } from "./pricing";

/* ------------------------------------------------------------------ */
/* Presence product content                                            */
/* ------------------------------------------------------------------ */

export const PRESENCE_HERO = {
  eyebrow: "SPIRIT CONNECT · PRESENCE",
  title: "PRESENCE",
  tagline: "AI, WITH A PRESENCE.",
  primaryCta: "Watch Demo",
  secondaryCta: "Register Your Interest",
} as const;

export const PRESENCE_INTRO = {
  kicker: "WHAT IS PRESENCE",
  title: "A visual + voice interface for AI.",
  body: "Presence is the interface between people and intelligent systems. No chat window, no dashboard — a living visual form you talk to, that answers in its own voice and shows you what matters.",
  pillars: [
    { title: "Talk naturally.", body: "Speak the way you would to a person. Presence listens, thinks and answers." },
    { title: "See information appear.", body: "Answers take visual shape — images, places, numbers, ideas — then return to the sphere." },
    { title: "Connect to intelligent systems.", body: "AI agents, tools and engineering workflows, reached through one interface." },
  ],
} as const;

export const PRESENCE_IN_ACTION = {
  kicker: "PRESENCE IN ACTION",
  title: "See it listen, think and speak.",
  caption: "Presence app demonstration.",
} as const;

export const PRESENCE_USE_CASES = {
  kicker: "WORK + EVERYDAY",
  title: "One interface. Both sides of life.",
  columns: [
    {
      id: "work",
      label: "Work",
      items: ["Engineering", "Research", "AI agents", "Tools", "Productivity", "Information"],
    },
    {
      id: "everyday",
      label: "Everyday",
      items: ["Conversation", "General AI", "Information", "Entertainment", "Personal assistance", "Ambient interaction"],
    },
  ],
  note: "In engineering, Presence can act as the human interface to AIPE — the Spirit Connect engineering division.",
} as const;

export const PRESENCE_HARDWARE = {
  kicker: "PRESENCE HARDWARE",
  status: "Early product concept",
  title: "A home for Presence.",
  body: "We are exploring a dedicated device that gives Presence a physical place in the room — shaped together with our first supporters.",
  // conceptual capabilities only — no specifications until they are confirmed
  capabilities: [
    "Visual Presence interface",
    "Speaker",
    "Microphone system",
    "Voice interaction",
    "Device + cloud connectivity",
    "Ambient AI interaction",
  ],
  disclaimer:
    "Concept stage. Design, capabilities, specifications and availability are not final and may change. Presence hardware is not yet available to buy.",
} as const;

export const PRESENCE_FOUNDING = {
  kicker: "FOUNDING 100",
  priceLabel: FOUNDING_PRICE_LABEL,
  allocationLine: `For the first ${PRESENCE_PRICING.foundingAllocation} Presence units.`,
  body: `The first ${PRESENCE_PRICING.foundingAllocation} Presence units are planned to be offered at ${FOUNDING_PRICE_LABEL} to early supporters who help shape the product.`,
  retailLine: `Planned future retail price: ${PLANNED_RETAIL_PRICE_LABEL}.`,
  finePrint:
    "Registering interest is free and does not commit you to buy. No payment is taken. Pricing is planned and may change before launch.",
  cta: "Join the Founding 100",
} as const;

/* ---------------- Register Your Interest form ---------------- */

export const INTEREST_LEVELS = [
  { value: "just-following", label: "Just following" },
  { value: "interested", label: "Interested" },
  { value: "very-interested", label: "Very interested" },
  { value: "would-consider-buying", label: "I would consider buying" },
] as const;

export const PRIMARY_USES = [
  { value: "ai-conversation", label: "AI conversation" },
  { value: "work-productivity", label: "Work / productivity" },
  { value: "engineering", label: "Engineering" },
  { value: "smart-home-ambient", label: "Smart home / ambient AI" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
] as const;

export const PURCHASE_INTENTS = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "not-yet", label: "Not yet" },
] as const;

export const INTEREST_FORM_COPY = {
  kicker: "REGISTER YOUR INTEREST",
  title: "Help shape Presence.",
  body: "Tell us how you would use Presence. It takes under a minute and helps us decide what to build first.",
  purchaseQuestion: `Would you consider purchasing Presence at ${FOUNDING_PRICE_LABEL}?`,
  consentLabel: "I agree that Spirit Connect may email me about Presence and the Founding 100. I can unsubscribe at any time.",
  submit: "Register interest",
  success: {
    title: "You're on the list.",
    body: "Thank you for helping shape Presence. We'll be in touch with Founding 100 updates.",
  },
  notConfigured: {
    title: "Registration opens soon.",
    body: "We're connecting our registration service and couldn't record your answers yet. Nothing was sent. Please check back shortly.",
  },
  error: {
    title: "Something went wrong.",
    body: "Your registration couldn't be sent. Please check your connection and try again.",
  },
} as const;

/* ---------------- media slots ---------------- */

export type MediaSource = {
  src: string;
  type: string;
  /** video only: media query for this source (e.g. a lighter encode for phones); the first match is used */
  media?: string;
};

export type MediaSlotConfig = {
  id: string;
  /** "animation": autoplays muted + loops (hero). "video": user-started with controls. "image": still. */
  kind: "animation" | "video" | "image";
  /** empty until the final asset is added — the slot then shows its placeholder */
  sources: MediaSource[];
  poster?: string;
  /** the asset carries a sound track: the muted hero offers a "Sound on" control */
  hasAudio?: boolean;
  alt: string;
  aspectRatio: string;
  placeholder: string;
  /** where the asset should go — shown to developers when the slot is empty */
  assetHint: string;
};

/**
 * Presence media. Add final assets under `public/presence/` and list them in
 * `sources` (paths are relative to the site root; the base path is applied
 * automatically). Prefer WebM (VP9/AV1) + MP4 (H.264) pairs and a poster
 * frame. See docs/presence-media.md.
 */
export const PRESENCE_MEDIA: Record<"heroAnimation" | "demoVideo" | "hardwareConcept", MediaSlotConfig> = {
  heroAnimation: {
    id: "presence-hero-animation",
    kind: "animation",
    // 1920×1080 60 fps for larger screens; a 1280×720 encode for phones, whose
    // layout shows the centre square of the frame. MediaSlot picks the first
    // source whose `media` matches, on the client (see MediaSlot.tsx for why)
    sources: [
      { src: "/presence/presence-app-hero.mp4", type: "video/mp4", media: "(min-width: 641px)" },
      { src: "/presence/presence-app-hero-720.mp4", type: "video/mp4" },
    ],
    poster: "/presence/presence-app-hero-poster.jpg",
    hasAudio: true,
    alt: "Presence app demonstration animation",
    aspectRatio: "16 / 9",
    placeholder: "Presence app animation — coming soon",
    assetHint: "public/presence/presence-app-hero.{webm,mp4} + poster, then list them in src/content/presence.ts → PRESENCE_MEDIA.heroAnimation",
  },
  demoVideo: {
    id: "presence-demo-video",
    kind: "video",
    sources: [
      // { src: "/presence/presence-demo.webm", type: "video/webm" },
      // { src: "/presence/presence-demo.mp4", type: "video/mp4" },
    ],
    // poster: "/presence/presence-demo-poster.jpg",
    alt: "Presence demo video",
    aspectRatio: "16 / 9",
    placeholder: "Presence demo video — coming soon",
    assetHint: "public/presence/presence-demo.{webm,mp4} + poster, then list them in src/content/presence.ts → PRESENCE_MEDIA.demoVideo",
  },
  hardwareConcept: {
    id: "presence-hardware-concept",
    kind: "image",
    sources: [{ src: "/presence/presence-hardware-concept.png", type: "image/png" }],
    alt: "Presence hardware concept: a particle sphere floating inside a glass cylinder above a speaker base, with a phone resting on its charging tray",
    // the concept render is 3:4 — shown whole, nothing cropped
    aspectRatio: "3 / 4",
    placeholder: "Hardware concept imagery — in development",
    assetHint: "public/presence/presence-hardware-concept.png, then list it in src/content/presence.ts → PRESENCE_MEDIA.hardwareConcept",
  },
};
