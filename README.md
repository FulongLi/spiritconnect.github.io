# Spirit Connect Brand Portal

Spirit Connect Brand Portal is the main 3D showcase for the Spirit Connect ecosystem. It presents the parent brand and its current branches through an interactive WebGPU hologram stage, a branch information panel, and a compact news ticker.

Public site:

[https://spiritconnect.co.uk](https://spiritconnect.co.uk)

## Current Branches

The homepage currently presents four branches in this order:

1. **Spirit Connect** - the parent brand and main portal.
2. **Spirit Connect AIPE Labs** - AI-powered power electronics engineering and design automation.
   [https://fulongli.github.io/Spirit-Connect-AIPE-Labs/](https://fulongli.github.io/Spirit-Connect-AIPE-Labs/)
3. **Spirit Connect AI Labs** - AI agents, research workflows, and creative automation.
4. **Spirit Connect Fantasy** - future imagination, storytelling, digital art, and interactive worlds.
   [https://fulongli.github.io/Spirit-Connect-Fantasy/](https://fulongli.github.io/Spirit-Connect-Fantasy/)

## Experience

- Full-screen WebGPU / Three.js hologram stage
- Particle-based model transitions for each branch
- Spirit Connect and AIPE Labs logo-based particle models
- Procedural sphere model for AI Labs
- Procedural brush model for Fantasy
- Right-side branch panel with summary, status, keywords, and branch links
- Left-side brand statement and latest news ticker
- Dark futuristic visual style with a light/dark preset toggle
- Static export support for GitHub Pages

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Three.js / WebGPU
- Leva controls
- Tailwind CSS
- GitHub Pages

## Local Development

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

If port 3000 is already in use:

```bash
npm run dev -- -p 3003
```

## Build

Run lint:

```bash
npm run lint
```

Create a production static export:

```bash
npm run build
```

The static site is generated in:

```text
out/
```

## Deployment

This repository includes a GitHub Pages workflow:

```text
.github/workflows/deploy-main-site.yml
```

The workflow:

1. Installs dependencies with `npm ci`.
2. Builds the static site with `npm run build`.
3. Uploads `out/` to GitHub Pages.

To publish:

1. Push to `main` or `master`, or run the workflow manually.
2. In GitHub repository settings, set Pages source to `GitHub Actions`.
3. Keep the custom domain configured as `spiritconnect.co.uk`.

## Project Structure

```text
src/app/                          Next.js app entry and static branch pages
src/components/brandPortal/        Branch data, branch panel, and latest news
src/components/hologramParticles/  WebGPU particle renderer and procedural models
src/components/overlay/            Header, footer, controls, and model selector
src/components/shared/             Fonts, theme, and asset path helpers
public/assets/                     Logos and visual textures
public/glb/                        Local GLB model assets
public/CNAME                       Custom domain for GitHub Pages
out/                               Generated static export
```

## Updating Branches

Branch content is configured in:

```text
src/components/brandPortal/brands.ts
```

To add or update a branch, edit the `BRAND_BRANCHES` array. Each branch defines:

- `label`
- `url`
- `title`
- `eyebrow`
- `summary`
- `detail`
- `status`
- `href`
- `keywords`

Procedural particle models are implemented in:

```text
src/components/hologramParticles/ParticlesHologram.tsx
```

## Notes

- The main site is the Spirit Connect brand portal, not a standalone AIPE Labs site.
- AIPE Labs remains one branch inside the wider Spirit Connect ecosystem.
- The exported root files such as `index.html`, `_next/`, and `branches/` are generated deployment artifacts. Update them from `out/` after a build if serving the repository root directly.
