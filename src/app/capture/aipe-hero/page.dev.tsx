"use client";

import { useEffect, useRef, useState } from "react";
import type { StillOptions } from "./renderStill";

/* ------------------------------------------------------------------ */
/* /capture/aipe-hero — renders the /aipe hero stills from the lunar   */
/* scene. A development-only route: the ".dev.tsx" page extension is   */
/* only registered by `next dev` (see next.config.ts), so this page is */
/* never built or exported. How to regenerate the images:              */
/* docs/aipe-hero-image.md                                             */
/*                                                                     */
/* Query: ?shot=wide|standard|portrait picks a preset; any of w, h, cam=x,y,z, */
/* tgt=x,y,z, fov, shift=x,y, dim, loop, time, samples overrides it.   */
/* ?save=<url> POSTs the PNG to that url (a local receiver) as well.   */
/* ------------------------------------------------------------------ */

/**
 * The composed shots, one per hero aspect (the page picks one with
 * <picture> media queries). Each is Chapter 07's "whole system" moment
 * — loop fully engaged, the sunlit world dimmed toward night so the
 * energy and data lines read — seen from the south-west, low over the
 * regolith: nuclear core, battery banks, PV field, SST, data centre and
 * the habitat ring in one chain, with the dark sky left free for type.
 * The lens shift keeps the perspective while moving the system right
 * (desktop) or down (portrait).
 */
const systemView = (shot: Partial<StillOptions>): StillOptions => ({
  width: 3840,
  height: 1920,
  cam: [-78, 64, -150],
  tgt: [48, 0, 4],
  fov: 32,
  shift: [0, 0],
  dim: 0.62,
  loop: 1,
  time: 7.4,
  samples: 8,
  ...shot,
});

const SHOTS: Record<string, StillOptions> = {
  // ≥ 16:9 desktop and ultrawide
  wide: systemView({ width: 3840, height: 1920, fov: 32, shift: [-0.16, -0.03] }),
  // 16:10 laptops, landscape tablets
  standard: systemView({ width: 2880, height: 1800, fov: 41, shift: [-0.17, -0.05] }),
  // phones and portrait tablets: closer in, the system in the lower third
  portrait: systemView({ width: 1620, height: 2880, cam: [-53, 51, -119], fov: 64, shift: [0.04, -0.2] }),
};

function readOptions(q: URLSearchParams): { name: string; options: StillOptions } {
  const name = q.get("shot") ?? "wide";
  const o: StillOptions = structuredClone(SHOTS[name] ?? SHOTS.wide);
  const nums = (key: string) => q.get(key)?.split(",").map(Number);
  const num = (key: string) => (q.has(key) ? Number(q.get(key)) : undefined);
  o.width = num("w") ?? o.width;
  o.height = num("h") ?? o.height;
  o.cam = (nums("cam") as StillOptions["cam"]) ?? o.cam;
  o.tgt = (nums("tgt") as StillOptions["tgt"]) ?? o.tgt;
  o.fov = num("fov") ?? o.fov;
  o.shift = (nums("shift") as StillOptions["shift"]) ?? o.shift;
  o.dim = num("dim") ?? o.dim;
  o.loop = num("loop") ?? o.loop;
  o.time = num("time") ?? o.time;
  o.samples = num("samples") ?? o.samples;
  return { name, options: o };
}

export default function CaptureAipeHero() {
  const holder = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("rendering…");
  const [download, setDownload] = useState<{ href: string; file: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams(window.location.search);
    const { name, options } = readOptions(q);
    const file = `aipe-hero-${name}.png`;
    (async () => {
      const { renderStill } = await import("./renderStill");
      const t0 = performance.now();
      const canvas = await renderStill(options);
      if (cancelled) return;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      canvas.style.display = "block";
      holder.current?.replaceChildren(canvas);
      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
      setDownload({ href: URL.createObjectURL(blob), file });
      let saved = "";
      const save = q.get("save");
      if (save) {
        const res = await fetch(`${save.replace(/\/$/, "")}/${file}`, { method: "POST", body: blob });
        saved = res.ok ? ` · saved ${file}` : ` · save failed (${res.status})`;
      }
      const ms = Math.round(performance.now() - t0);
      setStatus(`${options.width}×${options.height} in ${ms} ms${saved}`);
      document.title = `done: ${file}`;
    })().catch((err) => setStatus(`failed: ${err}`));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#aaa", font: "12px monospace" }}>
      <div ref={holder} />
      <p id="capture-status" style={{ padding: 12 }}>
        {status}{" "}
        {download && (
          <a href={download.href} download={download.file} style={{ color: "#fff" }}>
            download {download.file}
          </a>
        )}
      </p>
    </main>
  );
}
