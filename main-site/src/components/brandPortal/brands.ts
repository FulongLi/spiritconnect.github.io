import { assetPath } from "@/components/shared/assetPath";
import type { ModelOption } from "@/components/overlay/components/ModelSelector/ModelSelector";

export type BrandStatus = "Active" | "In formation" | "Concept stage" | "Emerging";

export type BrandBranch = ModelOption & {
  title: string;
  eyebrow: string;
  summary: string;
  detail: string;
  status: BrandStatus;
  href: string;
  accent: string;
  keywords: string[];
};

export const BRAND_BRANCHES: BrandBranch[] = [
  {
    id: "spirit-connect",
    label: "SPIRIT",
    url: "procedural:spirit-logo",
    title: "Spirit Connect",
    eyebrow: "Core brand",
    summary: "A connected technology and creativity ecosystem.",
    detail:
      "The central portal for Spirit Connect: a place where AI, games, art, and engineering branches can be explored as one living system.",
    status: "Active",
    href: "/branches/spirit-connect",
    accent: "#32b8f2",
    keywords: ["technology", "creativity", "systems"],
  },
  {
    id: "ai",
    label: "AI",
    url: "procedural:sphere",
    title: "Spirit Connect AI",
    eyebrow: "Intelligence systems",
    summary: "AI agents, research workflows, and creative automation.",
    detail:
      "A branch for applied AI tools that transform specialist knowledge into useful assistants, design systems, and exploratory interfaces.",
    status: "In formation",
    href: "/branches/ai",
    accent: "#9efcff",
    keywords: ["agents", "automation", "research"],
  },
  {
    id: "gaming",
    label: "GAMING",
    url: assetPath("/glb/bb8.glb"),
    title: "Spirit Connect Gaming",
    eyebrow: "Interactive worlds",
    summary: "Playable systems, game prototypes, and interactive stories.",
    detail:
      "A branch for games and real-time experiences where mechanics, worldbuilding, simulation, and creative technology meet.",
    status: "Concept stage",
    href: "/branches/gaming",
    accent: "#a7f06a",
    keywords: ["play", "worlds", "simulation"],
  },
  {
    id: "art",
    label: "ART",
    url: "procedural:crystal",
    title: "Spirit Connect Art",
    eyebrow: "Creative expression",
    summary: "Digital art, generative visuals, and cultural experiments.",
    detail:
      "A branch for expressive work shaped by human taste and computational craft: visual systems, editions, installations, and experiments.",
    status: "Emerging",
    href: "/branches/art",
    accent: "#ff8ad8",
    keywords: ["generative", "visual", "culture"],
  },
  {
    id: "power-labs",
    label: "POWER",
    url: "procedural:terrain",
    title: "Spirit Connect Power Labs",
    eyebrow: "Energy intelligence",
    summary: "AI-assisted power electronics research and design workflows.",
    detail:
      "The engineering branch for devices, converters, magnetics, and microgrids, connecting power electronics research with intelligent design systems.",
    status: "Active",
    href: "/branches/power-labs",
    accent: "#ffcf7a",
    keywords: ["power electronics", "converters", "microgrids"],
  },
];

export function getBrandBranch(id: string) {
  return BRAND_BRANCHES.find((branch) => branch.id === id);
}
