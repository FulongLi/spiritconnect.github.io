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
    label: "SPIRIT CONNECT",
    url: "procedural:spirit-logo",
    title: "Spirit Connect",
    eyebrow: "Core brand",
    summary: "A connected technology and creativity ecosystem.",
    detail:
      "The central portal for Spirit Connect: a place where AI, games, fantasy, and engineering branches can be explored as one living system.",
    status: "Active",
    href: "/branches/spirit-connect",
    accent: "#32b8f2",
    keywords: ["technology", "creativity", "systems"],
  },
  {
    id: "power-labs",
    label: "AIPE LABS",
    url: "procedural:power-labs-logo",
    title: "Spirit Connect AIPE Labs",
    eyebrow: "Energy intelligence",
    summary: "AI-assisted power electronics research and design workflows.",
    detail:
      "The AIPE Labs branch for devices, converters, magnetics, and microgrids, connecting power electronics research with intelligent design systems.",
    status: "Active",
    href: "https://fulongli.github.io/Spirit-Connect-AIPE-Labs/",
    accent: "#0f5f3d",
    keywords: ["power electronics", "converters", "microgrids"],
  },
  {
    id: "ai",
    label: "AI LABS",
    url: "procedural:sphere",
    title: "Spirit Connect AI Labs",
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
    label: "FANTASY",
    url: "procedural:brush",
    title: "Spirit Connect Fantasy",
    eyebrow: "Interactive worlds",
    summary: "Playable worlds, future imagination, and interactive stories.",
    detail:
      "A branch for games and real-time experiences where mechanics, worldbuilding, fantasy storytelling, and creative technology meet.",
    status: "Concept stage",
    href: "https://fulongli.github.io/Spirit-Connect-Fantasy/",
    accent: "#a7f06a",
    keywords: ["fantasy", "games", "worlds"],
  },
];

export function getBrandBranch(id: string) {
  return BRAND_BRANCHES.find((branch) => branch.id === id);
}
