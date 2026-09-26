# Presence media assets

The Presence page (`/presence`) has three media slots. Until an asset is
configured, each slot shows a labelled "coming soon" placeholder (and, in
`npm run dev` only, the exact file path it expects). Nothing pretends to be
final product footage.

| Slot | Where it appears | Behaviour | Expected files |
| --- | --- | --- | --- |
| `heroAnimation` | Hero — the dominant element, first thing visitors see | autoplay, muted, loop, with a *Sound on* control (paused under reduced motion) | `public/presence/presence-app-hero.mp4` (1080p) + `presence-app-hero-720.mp4` (phones) + poster |
| `demoVideo` | "Presence in action" (`#demo`) — started by **Watch Demo** | user-started, with controls | `public/presence/presence-demo.webm` + `.mp4` + poster |
| `hardwareConcept` | Presence Hardware section | still image, 3:4 | `public/presence/presence-hardware-concept.png` |

## Adding an asset

1. Put the files in `public/presence/`.
2. List them in `src/content/presence.ts` → `PRESENCE_MEDIA.<slot>.sources`
   (the commented-out lines show the exact entries), and set `poster`.
3. `npm run build` — paths get the site base path automatically.

## Encoding

Keep web copies small; GitHub rejects files over 100 MB and large videos
slow the page. Aim for roughly 5–15 MB for the hero loop.

The current Presence promo render
(`SCF-Presence-Realtime/output/scf-presence-promo-1080p-no-dialogue.mp4`,
≈283 MB, not committed anywhere) is far too large to ship as-is. If it is
approved for the site, a web copy can be made with ffmpeg, for example:

```bash
# H.264 MP4, 1080p, no audio for the autoplaying hero
ffmpeg -i input.mp4 -an -vf "scale=1920:-2" -c:v libx264 -preset slow -crf 26 \
  -pix_fmt yuv420p -movflags +faststart public/presence/presence-app-hero.mp4

# VP9 WebM (smaller, preferred by most browsers)
ffmpeg -i input.mp4 -an -vf "scale=1920:-2" -c:v libvpx-vp9 -b:v 0 -crf 36 \
  -row-mt 1 public/presence/presence-app-hero.webm

# poster frame
ffmpeg -ss 2 -i input.mp4 -frames:v 1 -q:v 3 public/presence/presence-app-hero-poster.jpg
```

For the user-started demo video keep the audio track (drop `-an`).

## Current hero encodes

Source: `SCF-Presence-Realtime/output/scf-presence-promo-1080p.mp4`
(1920×1080, 60 fps, ~37 Mbps H.264, 320 kb/s AAC with dialogue — not committed).

| File | Encode | Size |
| --- | --- | --- |
| `presence-app-hero.mp4` | 1920×1080, 60 fps, H.264 High, 4:2:0, BT.709, constant quality 0.36 (~11.6 Mbps), faststart, original AAC track copied | 91.6 MB |
| `presence-app-hero-720.mp4` | same, scaled to 1280×720 (~4.8 Mbps) — served to screens ≤ 640 px via `<source media>` | 37.9 MB |
| `presence-app-hero-poster.jpg` | frame at 29.6 s, 1920×1080 | 0.26 MB |

These were encoded with Apple VideoToolbox (constant-quality mode, the
nearest equivalent to x264 CRF) because ffmpeg wasn't installed. The dense
60 fps particle field is very expensive to compress: quality 0.38+ exceeds
GitHub's 100 MB per-file limit, so 0.36 is the highest setting that fits.
With ffmpeg available, an x264 encode is roughly 20–30% more efficient:

```bash
ffmpeg -i scf-presence-promo-1080p.mp4 -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -movflags +faststart -c:a copy presence-app-hero.mp4
```

(check the size stays under 100 MB before committing — raise the CRF if not).
