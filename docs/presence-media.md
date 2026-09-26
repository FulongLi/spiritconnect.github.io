# Presence media assets

The Presence page (`/presence`) has three media slots. Until an asset is
configured, each slot shows a labelled "coming soon" placeholder (and, in
`npm run dev` only, the exact file path it expects). Nothing pretends to be
final product footage.

| Slot | Where it appears | Behaviour | Expected files |
| --- | --- | --- | --- |
| `heroAnimation` | Hero — the dominant element, first thing visitors see | autoplay, muted, loop (paused under reduced motion) | `public/presence/presence-app-hero.webm` + `.mp4` + poster |
| `demoVideo` | "Presence in action" (`#demo`) — started by **Watch Demo** | user-started, with controls | `public/presence/presence-demo.webm` + `.mp4` + poster |
| `hardwareConcept` | Presence Hardware section | still image, 4:5 | `public/presence/presence-hardware-concept.webp` |

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
