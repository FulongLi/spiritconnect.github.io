// Encodes the /aipe hero stills (PNGs from the dev-only /capture/aipe-hero
// route) into the responsive AVIF / WebP / JPEG set in public/aipe/.
//
//   node scripts/encode-aipe-hero.mjs <dir containing aipe-hero-{wide,standard,portrait}.png>
//
// Uses sharp, which Next.js already installs; no extra dependency.
// See docs/aipe-hero-image.md for the whole procedure.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/encode-aipe-hero.mjs <png dir>");
  process.exit(1);
}

const out = path.join(import.meta.dirname, "..", "public", "aipe");

/** widths per shot, largest first; `jpeg` is the <img src> fallback for browsers without AVIF / WebP */
const SHOTS = {
  wide: { widths: [3840, 2560, 1920], jpeg: 1920 },
  standard: { widths: [2880, 1440] },
  portrait: { widths: [1620, 1170, 750] },
};

await mkdir(out, { recursive: true });

for (const [shot, { widths, jpeg }] of Object.entries(SHOTS)) {
  const input = path.join(src, `aipe-hero-${shot}.png`);
  for (const w of widths) {
    const base = path.join(out, `hero-${shot}-${w}`);
    const resized = () => sharp(input).resize({ width: w, kernel: "lanczos3" });
    await resized().avif({ quality: 62, effort: 7 }).toFile(`${base}.avif`);
    await resized().webp({ quality: 82, effort: 6 }).toFile(`${base}.webp`);
    if (w === jpeg) await resized().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(`${base}.jpg`);
    console.log(`hero-${shot}-${w}`);
  }
}
