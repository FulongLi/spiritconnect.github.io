# Spirit Connect

**ENERGY POWERS AI. AI DESIGNS ENERGY.**

Spirit Connect is the parent company and master brand. Its idea is a
self-improving loop: an energy system powers computation and AI; AI
understands and redesigns that energy system; the improved system returns new
data; and the loop continues.

Public site: [https://spiritconnect.co.uk](https://spiritconnect.co.uk)

## Brand architecture

| | Role on this site | Where |
| --- | --- | --- |
| **Spirit Connect** | the vision — futuristic, cinematic, immersive | `/` (lunar journey), `/about` |
| **Presence** | the interface between people and intelligent systems; the primary product promoted here | the journey's interior stage, `/presence` |
| **AIPE** | the engineering division that helps close the AI-energy loop; has its own independent, engineering-style website | workspace display → [aipel.co.uk](https://aipel.co.uk) ↗ |

Fantasy is kept on record (`DIVISIONS.fantasy`, `visibility: "archived"`) but
is not shown in navigation or the interior.

Navigation: **Vision** (`/`) · **Presence** (`/presence`) · **AIPE ↗** · **About** (`/about`).

## The experience

1. **Lunar journey** (`/`) — one continuous, scroll-driven shot across a lunar
   micro-grid, told in seven chapters: *01 Solar — energy begins here* →
   *02 Nuclear — power when the sun cannot* → *03 Storage — energy needs
   memory* → *04 Power electronics — power must be shaped* → *05 Data centre —
   energy becomes intelligence* (the turning point: the camera starts to gain
   altitude) → *06 Mobility — energy enters the physical world* (landing pads,
   lander, rover charging rows) → *07 Intelligent engineering — AI designs
   the next system*. In Chapter 07 the camera rises until the whole base
   reads as one network: the lit world recedes, **energy** (amber) flows out
   to the loads, **data** (blue) flows in to the data centre, and feedback
   waves travel from the data centre back through the network to the
   sources. The chapter closes on *Energy powers AI. AI designs energy.*
2. **Into the Dome** — the camera descends along the main Dome's entrance
   axis to the airlock (*Enter Spirit Connect*) and flies into the vestibule,
   where the workspace scene — the same building, from
   `shared/domeArchitecture` — cross-fades in and carries on through the Dome.
3. **The workspace** — a ring workstation at the centre of the Dome: the
   **Presence** device (the particle entity in its glass chamber) and two
   equal displays, **Presence** (`/presence`) and **AIPE** (aipel.co.uk).
4. **`/presence`** — app animation (hero), what Presence is, demo, work +
   everyday, hardware concept, **Founding 100 (£399)**, Register Your Interest.

## Editing content

All copy and numbers live in `src/content/`:

| File | Contains |
| --- | --- |
| `journey.ts` | chapters, scroll pacing, cinematic timeline, loop + information-view intensity |
| `presence.ts` | Presence page + interior copy, form options, media slots |
| `pricing.ts` | **founding price £399, planned retail £699, 100 units** (single source) |
| `site.ts` | company info, vision loop, divisions + links, main nav |
| `news.ts` | news list (About page) |

Presence media: see [docs/presence-media.md](docs/presence-media.md).
Interest form backend: see [docs/register-interest.md](docs/register-interest.md).

## Rendering architecture

```text
src/app/                         routes: /, /journey, /presence, /about, /branches/* (legacy redirects)
src/content/                     editable content + configuration
src/lib/render/                  renderLoop (rAF + tab-visibility pause), experienceState
src/lib/interest/                Register Interest submission pipeline
src/components/energyTown/       lunar journey (WebGL)
  JourneyExperience.tsx            scroll → story progress, chapters, transitions, lifecycle
  TownCanvas.tsx                   React wrapper (active / suspended / fallback)
  engine/lunarRenderer.ts          renderer, lights, post-processing, GPU release
  engine/cameraPath.ts             flight waypoints
  townBuilder.ts                   scene assembly (habitat, PV, reactor, BESS, SST, pads, DC)
  scene/                           terrain, textures, palette, atmosphere, conduits (+ AI loop), random
src/components/hologramParticles/ particle stage (WebGPU, WebGL 2 fallback)
  HologramScene.tsx                backend selection: WebGPU → WebGL 2 → caller fallback
  ParticlesHologram.tsx            React wrapper around the engine
  engine/hologramEngine.ts         renderer + render loop + lifecycle
  engine/geometry/                 procedural models, logo sampling, GLB sampling, cache
  engine/scene/                    particle field (TSL), stage rig (cylinder, rings), dot grid, background
  engine/interaction.ts            pointer physics, glow, parallax
  engine/transition.ts             morph / entrance state machine
  engine/postprocessing.ts         bloom + chromatic aberration
  debug/HologramDebugPanel.tsx     Leva lab (loaded only with debug flags)
src/components/presence/         interior stage, Presence page components, 2D orb fallback
src/components/site/             header / nav, legacy redirect
```

### Lifecycle: `LUNAR → TRANSITION → PRESENCE`

| State | Lunar (WebGL) | Presence (WebGPU) |
| --- | --- | --- |
| `LUNAR` | rendering | not mounted |
| `TRANSITION` (from the end of chapter 07) | rendering until the workspace has faded in over it, inside the airlock | mounted, pipelines warmed with a few frames, then paused; starts rendering just before it is revealed |
| `PRESENCE` | loop stopped; post-processing targets + shadow map released (re-created lazily if you scroll back) | rendering |

Both loops also pause while the browser tab is hidden. The interior code is
prefetched from the data-centre chapter onward (or on **Skip to the Dome**).

### Fallbacks & accessibility

- Particle stage: WebGPU → WebGPURenderer's WebGL 2 backend (lighter particle
  budget) → a 2D-canvas Presence orb.
- Lunar scene: if WebGL is unavailable, a static lunar backdrop — the chapters
  still play as text.
- `prefers-reduced-motion`: no camera drift / parallax, no travelling AI
  feedback waves, slower stage motion, no autoplaying hero video, CSS
  animations off.
- Keyboard: arrows / Page Up/Down / Space / Home / End scroll the journey;
  skip link to the interior; accessible mobile menu; screen-reader summary of
  the journey chapters.

### Debug switches (URL)

| Flag | Effect |
| --- | --- |
| `?debug=1` | Leva hologram controls + model lab (other procedural models) |
| `?hologram=webgl` | force the WebGL 2 backend |
| `?hologram=2d` | force the 2D-canvas fallback |

In `npm run dev` the Leva panel is available (collapsed) by default. Leva is
never downloaded in the default production experience.

## Tech stack

Next.js 16 (static export), React 19, TypeScript, Three.js r182 (WebGL +
WebGPU/TSL), Tailwind CSS 4, Leva (debug only).

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run build        # static export to out/
```

## Deployment

Pushes to `main`/`master` run `.github/workflows/deploy-main-site.yml`:
`npm ci` → `npm run build` → upload `out/` → deploy to GitHub Pages. The
custom domain is `spiritconnect.co.uk` (`public/CNAME`).

**Build output is never committed.** `out/` and `.next/` are gitignored, and
so are the root-level export folders that used to be checked in.

GitHub Pages must use **GitHub Actions** as its source (Settings → Pages →
Build and deployment → Source), not "Deploy from a branch".

Optional repository variable: `PRESENCE_INTEREST_ENDPOINT` — see
[docs/register-interest.md](docs/register-interest.md).
