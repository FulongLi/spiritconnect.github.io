"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { ParticlesHologramProps } from "./types";
import type { HologramBackendOverride } from "@/lib/debugFlags";
import { STAGE_LAYOUT } from "./utils/presets";
import { detectGpuBackend as detectBackend, hasWebGL2 } from "@/lib/render/backend";

const ParticlesHologram = dynamic(() => import("./ParticlesHologram"), { ssr: false });

/**
 * Picks the best available renderer for the particle stage:
 *
 *   webgpu  → WebGPURenderer on WebGPU
 *   webgl   → WebGPURenderer on its WebGL 2 backend (lighter particle budget)
 *   fallback→ the caller's `fallback` (e.g. the 2D canvas Presence orb)
 *
 * A backend that fails to initialise falls through to the next one.
 */
export type HologramBackend = "checking" | "webgpu" | "webgl" | "fallback";

type Props = ParticlesHologramProps & {
  fallback: ReactNode;
  backendOverride?: HologramBackendOverride;
  onBackendChange?: (backend: HologramBackend) => void;
};

export default function HologramScene({
  fallback,
  backendOverride = "auto",
  onBackendChange,
  onUnavailable,
  ...props
}: Props) {
  const [backend, setBackend] = useState<HologramBackend>("checking");

  useEffect(() => {
    let cancelled = false;
    const pick =
      backendOverride === "2d"
        ? Promise.resolve("fallback" as const)
        : backendOverride === "webgl"
          ? Promise.resolve(hasWebGL2() ? ("webgl" as const) : ("fallback" as const))
          : detectBackend();
    pick.then((next) => {
      if (!cancelled) setBackend(next);
    });
    return () => {
      cancelled = true;
    };
  }, [backendOverride]);

  useEffect(() => {
    onBackendChange?.(backend);
    if (backend === "fallback") onUnavailable?.();
  }, [backend, onBackendChange, onUnavailable]);

  const handleUnavailable = useCallback(() => {
    setBackend((current) => (current === "webgpu" && hasWebGL2() ? "webgl" : "fallback"));
  }, []);

  if (backend === "checking") return null;
  if (backend === "fallback") return <>{fallback}</>;

  const webgl = backend === "webgl";
  return (
    <ParticlesHologram
      key={backend}
      {...props}
      forceWebGL={webgl}
      maxPixelRatio={webgl ? Math.min(props.maxPixelRatio ?? 2, 1.5) : props.maxPixelRatio}
      particleCount={
        webgl
          ? Math.min(props.particleCount ?? STAGE_LAYOUT.webglMaxParticles, STAGE_LAYOUT.webglMaxParticles)
          : props.particleCount
      }
      onUnavailable={handleUnavailable}
    />
  );
}
