# AIPE hero image

The `/aipe` hero is a still of the journey's own lunar micro-grid. It isn't
stock art or a separate model. It is rendered from the same `buildTown()`
scene, NASA GLBs, lights, fog, environment and bloom as the homepage
(`src/components/energyTown/engine/lunarRenderer.ts`). The page ships only
the encoded stills, so no Three.js runs on `/aipe`.

The moment is Chapter 07, *Intelligent engineering*: the AI → energy loop
is fully engaged and the sunlit world is dimmed part-way toward night, so
the energy and data lines read. The camera looks from the south-west, low
over the regolith, across the nuclear core, battery banks, PV field, SST,
data centre and habitat ring. Dark sky is left free for the type.

| Shot | Used for (`<picture>` media) | Render | Encoded widths |
| --- | --- | --- | --- |
| `wide` | landscape wider than 16:9 | 3840 × 1920 | 3840, 2560, 1920 |
| `standard` | landscape up to 16:9 (laptops, landscape tablets) | 2880 × 1800 | 2880, 1440 |
| `portrait` | `orientation: portrait` (phones, portrait tablets) | 1620 × 2880 | 1620, 1170, 750 |

Each width ships as AVIF and WebP. `hero-wide-1920.jpg` is the `<img src>`
fallback for browsers that support neither. The files live in
`public/aipe/hero-<shot>-<width>.<ext>`.

## Regenerating

You need this when the lunar scene changes, or to reframe a shot.

1. `npm run dev`, then open `/capture/aipe-hero?shot=wide` (likewise
   `standard`, `portrait`). The page renders the still at full size and
   shows a **download** link for `aipe-hero-<shot>.png`. Save all three
   PNGs into one folder.
2. `node scripts/encode-aipe-hero.mjs <that folder>` writes the AIPE
   variants into `public/aipe/`. It uses `sharp`, which Next.js already
   installs.
3. Check `/aipe` at desktop, 4:3 landscape, tablet portrait and phone
   sizes. The battery banks should stay clear of the copy, and on
   portrait the installations should sit below the button.

The capture route is development-only. Its page is `page.dev.tsx`, and
`next.config.ts` registers the `dev.tsx` page extension only for
`next dev`. A production build therefore never builds or exports it.

### Reframing

Each preset is in `SHOTS` in `src/app/capture/aipe-hero/page.dev.tsx`. You
can override any field from the URL to try a framing before you edit the
preset:

```
/capture/aipe-hero?shot=wide&w=1600&h=800&samples=4&cam=-78,64,-150&tgt=48,0,4&fov=32&shift=-0.16,-0.03
```

- `cam` / `tgt`: camera position and look-at, in world metres. They match
  the waypoints in `src/components/energyTown/engine/cameraPath.ts`. Chapter 07 there
  is `cam=-128,88,-104&tgt=6,0,8&fov=60`.
- `shift`: lens shift as a fraction of the frame. Negative x moves the
  system right and negative y moves it down, without changing the
  perspective.
- `dim` (day → night palette, 0..1), `loop` (feedback strength, 0..1),
  `time` (scene clock, for where the conduit waves are), `samples`
  (MSAA).
- `save=<url>` also POSTs the PNG to `<url>/aipe-hero-<shot>.png`. This
  is handy with a small local receiver when scripting renders.

The renderer is in `src/app/capture/aipe-hero/renderStill.ts`. Keep its
lighting block in step with `lunarRenderer.ts`. It also hides the
drifting regolith dust, because in a frozen frame the dust reads as square
specks.
