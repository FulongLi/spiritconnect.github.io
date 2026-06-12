# Spirit Connect — Lunar Micro-Grid Journey & Brand Portal

The Spirit Connect homepage is a two-layer 3D experience.

**Layer 1 — The Journey (outer).** A scroll-driven cinematic flight across a
futuristic lunar settlement, presenting a complete micro-grid the way Spirit
Connect thinks about energy systems:

1. **PV Array** — photovoltaic fields harvesting the two-week lunar day
2. **Energy Storage** — battery banks that hold the light
3. **Solid-State Transformer (SST)** — AI-designed power conversion and
   routing, the craft of Spirit Connect AIPE Labs
4. **Data Center** — where clean energy becomes intelligence
5. **The Core** — a reactor that carries the outpost through the lunar night
6. **The Habitat** — domes, capsule modules, connecting tubes, landing pad,
   comms tower, and a lunar rover

Energy flows as glowing particles along the conduits that link every module.

**Layer 2 — The Portal (inner).** The final shot dives through the main dome's
hull. Inside is the Spirit Connect holographic brand portal — the WebGPU
particle stage, branch panels, and news ticker — presenting the ecosystem.

Public site: [https://spiritconnect.co.uk](https://spiritconnect.co.uk)

## Experience

- Scroll drives the camera along a fixed flight path; chapter copy fades in per zone
- `◑ LUNAR DAY / ◐ LUNAR NIGHT` toggle (top right); the portal inherits the same
  theme so inside and outside stay consistent
- Desktop: mouse-parallax camera, soft shadows, MSAA, bloom post-processing
- Compact / touch devices automatically run a reduced-quality profile
- The lunar scene is fully procedural (no external 3D assets); higher-fidelity
  models and textures (e.g. NASA CGI Moon Kit maps) can be dropped in later

## Current Branches (portal)

1. **Spirit Connect** - the parent brand and main portal.
2. **Spirit Connect AIPE Labs** - AI-powered power electronics engineering and design automation.
   [https://fulongli.github.io/Spirit-Connect-AIPE-Labs/](https://fulongli.github.io/Spirit-Connect-AIPE-Labs/)
3. **Spirit Connect AI Labs** - AI agents, research workflows, and creative automation.
4. **Spirit Connect Fantasy** - future imagination, storytelling, digital art, and interactive worlds.
   [https://fulongli.github.io/Spirit-Connect-Fantasy/](https://fulongli.github.io/Spirit-Connect-Fantasy/)

## Tech Stack

- Next.js 16, React 19, TypeScript
- Three.js — WebGL journey scene (PBR, EffectComposer + UnrealBloom)
- Three.js / WebGPU — hologram portal with particle model transitions
- Leva controls, Tailwind CSS
- GitHub Pages (static export)

## Local Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run dev -- -p 3003   # if port 3000 is taken
npm run lint
npm run build        # static export to out/
```

## Deployment

Pushes to `main`/`master` trigger `.github/workflows/deploy-main-site.yml`:

1. Installs dependencies with `npm ci`
2. Builds the static site with `npm run build`
3. Uploads `out/` to GitHub Pages

GitHub Pages source must be set to `GitHub Actions`; the custom domain is
`spiritconnect.co.uk` (via `public/CNAME`). **Build artifacts are not committed
to the repository** — `out/` and `.next/` are gitignored and generated fresh on
every deployment.

## Project Structure

```text
src/app/page.tsx                   Homepage = the lunar journey
src/app/journey/                   Alias route for the same experience
src/app/branches/[id]/             Static branch detail pages
src/components/energyTown/         Lunar journey (outer layer)
  townBuilder.ts                     procedural moon + micro-grid construction
  TownCanvas.tsx                     renderer, camera path, post-processing
  JourneyExperience.tsx              scroll container, chapters, portal handoff
src/components/hologramParticles/  WebGPU hologram portal (inner layer)
src/components/brandPortal/        Branch data, branch panel, latest news
src/components/overlay/            Header, footer, controls, model selector
src/components/shared/             Fonts, theme, asset path helpers
public/assets/                     Logos and visual textures
public/glb/                        Local GLB model assets
public/CNAME                       Custom domain for GitHub Pages
```

## Updating Content

- Portal branch content: `src/components/brandPortal/brands.ts` (`BRAND_BRANCHES`)
- Journey chapters & pacing: `CHAPTERS` in
  `src/components/energyTown/JourneyExperience.tsx`
- Camera flight path: `CAM_POSITIONS` / `CAM_TARGETS` in
  `src/components/energyTown/TownCanvas.tsx`
- Scene layout (modules, conduits, palettes): `src/components/energyTown/townBuilder.ts`

## Notes

- The main site is the Spirit Connect brand portal, not a standalone AIPE Labs site.
- AIPE Labs remains one branch inside the wider Spirit Connect ecosystem.
