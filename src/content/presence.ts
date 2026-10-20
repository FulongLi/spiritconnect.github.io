import { CAMPAIGN_FIGURES as F } from "./campaign";
import { PRESENCE_RELEASE } from "./pricing";

const LAUNCH = PRESENCE_RELEASE.plannedLaunch;

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
  // watch it → try it: the live online experience (PRESENCE_RELEASE.experienceUrl)
  tryCta: "Try Presence",
  tryPending: "Online experience coming soon",
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
  status: `Founding ${F.targetLabel} · Planned release ${LAUNCH}`,
  title: "A home for Presence.",
  body: "Presence brings the visual and voice interface into a dedicated physical device — giving AI a place in the room.",
  progress: `The first production release depends on the Founding ${F.targetLabel} campaign: when ${F.targetLabel} people commit to Presence Hardware at ${F.priceLabel}, we move toward production.`,
  capabilitiesTitle: "Designed for",
  // what the device is for — no precise specifications until they are published
  capabilities: [
    "Visual Presence interface",
    "Speaker",
    "Microphone system",
    "Voice interaction",
    "Device + cloud connectivity",
    "Ambient AI interaction",
  ],
  disclaimer: "Final specifications and industrial design may evolve before release.",
} as const;

/* ---------------- Founding 1,000 — conditional launch campaign ---------------- */

export const PRESENCE_FOUNDING = {
  kicker: "BRING PRESENCE TO LIFE",
  title: `FOUNDING ${F.targetLabel}`,
  priceLabel: F.priceLabel,
  // the campaign's central message, one phrase per line
  statement: [`${F.targetLabel} PEOPLE.`, "ONE PHYSICAL HOME FOR PRESENCE."],
  body: `Help bring Presence into the physical world. When ${F.targetLabel} customers commit at ${F.priceLabel}, we can begin turning Presence Hardware into its first production release.`,
  facts: [
    { label: "Target", value: `${F.targetLabel} qualifying commitments` },
    { label: "Founding price", value: F.priceLabel },
    { label: "Planned retail", value: F.plannedRetailLabel },
    { label: "Planned release", value: `${LAUNCH}*` },
  ],
  backCta: `Back Presence — ${F.priceLabel}`,
  interestCta: "Register Interest",
  finePrint: [
    `*${LAUNCH} is a planned release window, conditional on the campaign reaching ${F.targetLabel} qualifying commitments and on production readiness. It is not guaranteed.`,
    `${F.targetLabel} commitments at ${F.priceLabel} is ${F.grossTargetLabel} gross, before payment fees, tax, manufacturing, fulfilment and other costs.`,
  ],
} as const;

/** the campaign progress block (see src/lib/campaign/progress.ts) */
export const CAMPAIGN_PROGRESS_COPY = {
  label: `FOUNDING ${F.targetLabel}`,
  preLaunchStatus: "Campaign opening soon",
  preLaunchNote: `Target: ${F.targetLabel} confirmed commitments. Progress will appear here once the campaign opens — counted from confirmed commitments only, never from registrations of interest.`,
  // live: "<count> / 1,000 confirmed commitments"
  liveUnit: `/ ${F.targetLabel} confirmed commitments`,
  liveValueText: (confirmed: string) => `${confirmed} of ${F.targetLabel} confirmed commitments`,
  asOf: (date: string) => `Updated ${date}`,
  unavailableStatus: "Progress unavailable",
  unavailableNote: `Target: ${F.targetLabel} confirmed commitments. The latest count couldn't be loaded — please check back shortly.`,
} as const;

/* ---------------- Back Presence (the campaign checkout) ---------------- */

export const PRESENCE_BACKING = {
  kicker: "BACK PRESENCE",
  title: "Commit to the first production run.",
  priceCaption: `Founding ${F.targetLabel}`,
  priceLabel: F.priceLabel,
  lines: [
    "A genuine intention to purchase Presence Hardware through the campaign checkout.",
    `Confirmed commitments count toward the ${F.targetLabel}.`,
  ],
  cta: "Back Presence",
  // shown while the campaign checkout is not open (src/content/campaign.ts)
  pending: "Campaign opening soon",
  beforeTitle: "Before you are asked to pay",
  // every one of these is set in campaign.ts → terms before the checkout opens
  before: [
    "Whether you are charged now, only if the target is reached, or a refundable deposit",
    "The campaign deadline",
    "Refund and cancellation terms",
    "Fulfilment conditions and delivery timing",
    "Customer support details",
  ],
  noPayment: "No payments or reservations are being taken yet.",
} as const;

/* ---------------- Register Your Interest form ---------------- */

export const INTEREST_LEVELS = [
  { value: "just-following", label: "Just following" },
  { value: "interested", label: "Interested" },
  { value: "very-interested", label: "Very interested" },
] as const;

export const PRIMARY_USES = [
  { value: "ai-conversation", label: "AI conversation" },
  { value: "work-productivity", label: "Work / productivity" },
  { value: "engineering", label: "Engineering" },
  { value: "smart-home-ambient", label: "Smart home / ambient AI" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
] as const;

export const INTEREST_FORM_COPY = {
  kicker: "REGISTER INTEREST",
  title: "Stay close to Presence.",
  body: `Free and non-binding. Receive Presence updates and news of the Founding ${F.targetLabel} campaign — without purchasing or reserving a unit.`,
  consentLabel: `I agree that Spirit Connect may email me about Presence, its launch and the Founding ${F.targetLabel} campaign. I can unsubscribe at any time.`,
  submit: "Register interest",
  note: `Registering interest is not a purchase, does not reserve a unit and does not count toward the ${F.targetLabel} commitments.`,
  success: {
    title: "You're on the list.",
    body: `We'll keep you updated on Presence, the online experience and the Founding ${F.targetLabel} campaign. This is not a commitment to buy.`,
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
    alt: "Presence hardware: a particle sphere floating inside a glass cylinder above a speaker base, with a phone resting on its charging tray",
    // the render is 3:4 — shown whole, nothing cropped
    aspectRatio: "3 / 4",
    placeholder: "Presence hardware imagery — coming soon",
    assetHint: "public/presence/presence-hardware-concept.png, then list it in src/content/presence.ts → PRESENCE_MEDIA.hardwareConcept",
  },
};
