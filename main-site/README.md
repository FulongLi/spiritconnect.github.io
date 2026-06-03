# Spirit Connect Brand Portal

Spirit Connect is a WebGPU holographic brand portal for exploring the connected branches of Spirit Connect.

The current experience includes:

- A full-screen hologram stage with particle model transitions
- Brand branches for Spirit Connect, AI, Gaming, Art, and Power Labs
- A right-side branch panel with summary, status, keywords, and branch links
- Bottom model navigation with mouse and keyboard controls
- Spirit Connect / 灵接科技 branding
- Static export support for GitHub Pages

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

If port 3000 is already in use, run another port:

```bash
npm run dev -- -p 3003
```

## Build

Create a production static export:

```bash
npm run build
```

The static site is generated in:

```text
out/
```

## GitHub Pages Deployment

This repository includes a GitHub Actions workflow at:

```text
.github/workflows/deploy-pages.yml
```

To publish the site:

1. Push the repository to GitHub.
2. Open the repository on GitHub.
3. Go to `Settings -> Pages`.
4. Set `Source` to `GitHub Actions`.
5. Push to `main` or run the workflow manually.

Public site:

[https://spiritconnect.co.uk](https://spiritconnect.co.uk)

## Project Structure

```text
src/app/                          Next.js app entry and static branch pages
src/components/brandPortal/        Brand branch data and branch information panel
src/components/hologramParticles/  WebGPU particle renderer and model switching
src/components/overlay/            Header, footer, controls, and model selector
src/components/shared/             Fonts, theme, and asset path helpers
public/glb/                        Local GLB model assets
public/assets/                     Local visual textures
```

## Notes

The parent repository keeps the previous Power Labs/Jekyll files intact. This app lives in `main-site/` and is built by the root GitHub Pages workflow.
