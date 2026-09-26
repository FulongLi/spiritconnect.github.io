"use client";

import { useEffect, useRef } from "react";
import { createRenderLoop } from "@/lib/render/renderLoop";
import { REDUCED_MOTION_QUERY } from "@/lib/hooks/useMediaQuery";

/**
 * Lightweight 2D-canvas rendition of the Presence particle sphere.
 * Used where the WebGPU / WebGL stage is unavailable, and as ambient
 * decoration on content pages. Pauses when off-screen or in a hidden tab,
 * and draws a single still frame under prefers-reduced-motion.
 */
type Props = {
  /** sphere radius as a fraction of the smaller canvas side */
  scale?: number;
  /** overall brightness multiplier */
  intensity?: number;
  /** particles fly in from the centre on mount */
  assemble?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

type Particle = { x: number; y: number; z: number; r: number; seed: number };

function makeParticles(count: number): Particle[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * golden;
    const seed = (Math.sin((i + 1) * 78.233) * 43758.5453) % 1;
    const s = Math.abs(seed);
    // a dense, slightly ragged shell over a filled volume — as in the app
    const r = s < 0.6 ? 0.9 + s * 0.16 : Math.cbrt(s) * 0.92;
    list.push({ x: Math.cos(theta) * radial, y, z: Math.sin(theta) * radial, r, seed: s });
  }
  return list;
}

function makeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  // cool silver-white, sampled from the Presence app animation: crisp
  // particles with a short falloff rather than a wide cyan bloom
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(240, 243, 247, 1)");
  g.addColorStop(0.3, "rgba(206, 212, 220, 0.8)");
  g.addColorStop(0.62, "rgba(170, 180, 194, 0.16)");
  g.addColorStop(1, "rgba(150, 162, 178, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return c;
}

export default function PresenceOrb({
  scale = 0.34,
  intensity = 1,
  assemble = false,
  className,
  style,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const compact = window.matchMedia("(max-width: 720px)").matches;
    const particles = makeParticles(compact ? 900 : 1800);
    const sprite = makeSprite();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    let smoothX = 0;
    let smoothY = 0;
    const start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    resize();

    const draw = (now: number) => {
      const t = reduced ? 0 : now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      smoothX += (pointerX - smoothX) * 0.04;
      smoothY += (pointerY - smoothY) * 0.04;
      const rotY = t * 0.00011 + smoothX * 0.3;
      const tilt = 0.32 + smoothY * 0.2;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(tilt);
      const sinX = Math.sin(tilt);
      const breathe = 1 + Math.sin(t * 0.0007) * 0.018;
      const gather = assemble && !reduced ? Math.min(1, t / 1800) : 1;
      const eased = 1 - Math.pow(1 - gather, 3);
      const radius = Math.min(width, height) * scale * breathe;
      const cx = width / 2;
      const cy = height / 2;

      for (const p of particles) {
        const wobble = 1 + Math.sin(t * 0.0012 + p.seed * 40) * 0.014;
        const r = p.r * wobble * (0.15 + 0.85 * eased);
        // rotate around Y, then tilt around X
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const depth = (z2 + 1) / 2; // 0 back … 1 front
        const persp = 1 / (1.35 - z2 * 0.35);
        const sx = cx + x1 * r * radius * persp;
        const sy = cy + y2 * r * radius * persp;
        const size = (0.9 + depth * 1.7) * (compact ? 0.9 : 1);
        ctx.globalAlpha = Math.min(1, (0.1 + depth * 0.5) * intensity * (0.4 + 0.6 * eased));
        ctx.drawImage(sprite, sx - size, sy - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = createRenderLoop(draw);
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced) loop.start();
      else loop.stop();
    });
    observer.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => {
      resize();
      if (reduced || !visible) draw(performance.now());
    };
    window.addEventListener("resize", onResize);
    if (!reduced && !compact) window.addEventListener("pointermove", onPointer);

    draw(performance.now());
    if (!reduced) loop.start();

    return () => {
      loop.dispose();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [scale, intensity, assemble]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
