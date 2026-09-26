"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import HologramScene, { type HologramBackend } from "@/components/hologramParticles/HologramScene";
import { MODEL_URLS } from "@/components/hologramParticles/engine/geometry";
import { HOLOGRAM_DEFAULTS } from "@/components/hologramParticles/utils/hologramDefaults";
import {
  LAB_MODELS,
  MODEL_TUNING,
  PRESETS,
  STAGE_LAYOUT,
  STAGE_MODEL_COLOR,
} from "@/components/hologramParticles/utils/presets";
import type { HologramDebugState } from "@/components/hologramParticles/debug/HologramDebugPanel";
import { useIsCompact, useMediaQuery, useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useDebugFlags } from "@/lib/hooks/useDebugFlags";
import PresenceOrb from "./PresenceOrb";

// development tooling — only fetched when a debug flag is on
const HologramDebugPanel = dynamic(
  () => import("@/components/hologramParticles/debug/HologramDebugPanel"),
  { ssr: false },
);

type Props = {
  night: boolean;
  /** render frames (false = warmed up but paused) */
  active: boolean;
  /** increment to replay the "particles assemble" entrance */
  replayTrigger: number;
  onBackendChange?: (backend: HologramBackend) => void;
};

/**
 * The Presence particle entity on the central stage of the Spirit Connect
 * interior.
 */
export default function PresenceStage({ night, active, replayTrigger, onBackendChange }: Props) {
  const compact = useIsCompact();
  const wide = useMediaQuery(STAGE_LAYOUT.wideQuery);
  const reducedMotion = useReducedMotion();
  const debug = useDebugFlags();
  const [debugState, setDebugState] = useState<HologramDebugState | null>(null);
  const [labReplay, setLabReplay] = useState(0);
  const onLabReplay = useCallback(() => setLabReplay((n) => n + 1), []);

  const base = debugState?.controls ?? HOLOGRAM_DEFAULTS;
  const modelUrl = debugState?.modelUrl ?? MODEL_URLS.sphere;

  const stageProps = useMemo(() => {
    const tuning = LAB_MODELS.find((m) => m.url === modelUrl)?.tuning ?? MODEL_TUNING.sphere;
    const motion = reducedMotion
      ? {
          autoRotateSpeed: Math.min(base.autoRotateSpeed, 0.6),
          noiseSpeed: base.noiseSpeed * 0.35,
          maskSpeed: base.maskSpeed * 0.35,
          cylNoiseSpeed: base.cylNoiseSpeed * 0.35,
          cylPulseSpeed: base.cylPulseSpeed * 0.35,
          gridWaveSpeed: base.gridWaveSpeed * 0.35,
          breathAmp: 0,
        }
      : {};
    return {
      ...base,
      ...PRESETS[night ? "dark" : "light"],
      color: STAGE_MODEL_COLOR,
      // the stage keeps the tuned bloom / ring brightness unless a shape overrides them
      bloomStrength: base.bloomStrength,
      ringBrightness: base.ringBrightness,
      ...tuning,
      particleCount: compact
        ? Math.min(base.particleCount, STAGE_LAYOUT.compactMaxParticles)
        : base.particleCount,
      modelY: compact ? STAGE_LAYOUT.modelYCompact : STAGE_LAYOUT.modelYDesktop,
      initialModelScale: compact ? STAGE_LAYOUT.compactModelScale : undefined,
      // leave room for the Presence title on the left of wide screens
      modelX: wide && !compact ? STAGE_LAYOUT.modelXWide : 0,
      mouseRadius: compact ? Math.max(base.mouseRadius, 2.35) : base.mouseRadius,
      mouseStrength: compact ? Math.max(base.mouseStrength, 4.4) : base.mouseStrength,
      pushStrength: compact ? Math.max(base.pushStrength, 2.8) : base.pushStrength,
      ...motion,
    };
  }, [base, modelUrl, night, compact, wide, reducedMotion]);

  const preset = PRESETS[night ? "dark" : "light"];

  return (
    <>
      {debug.hologramControls && (
        <HologramDebugPanel
          onChange={setDebugState}
          onReplay={onLabReplay}
          collapsed={!debug.hologramControlsExpanded}
        />
      )}
      <HologramScene
        url={modelUrl}
        preloadUrls={debug.hologramControls ? LAB_MODELS.map((m) => m.url) : undefined}
        active={active}
        replayTrigger={replayTrigger + labReplay}
        enableZoom={false}
        touchAction="pan-y"
        backendOverride={debug.hologramBackend}
        onBackendChange={onBackendChange}
        {...stageProps}
        fallback={
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at 48% 45%, ${preset.bgColorCenter} 0%, ${preset.bgColorMid} 36%, ${preset.bgColorEdge} 100%)`,
            }}
          >
            <PresenceOrb
              assemble
              scale={compact ? 0.2 : 0.13}
              style={{ transform: "translateY(5%)" }}
            />
          </div>
        }
      />
    </>
  );
}
