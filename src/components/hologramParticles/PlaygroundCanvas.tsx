"use client";

import { useEffect, useState } from "react";
import { Leva } from "leva";
import { LEVA_THEME } from "@/components/shared/theme";
import HologramScene from "./HologramScene";
import OverlayButtons from "@/components/overlay/components/OverlayButtons/OverlayButtons";
import ModelSelector from "@/components/overlay/components/ModelSelector/ModelSelector";
import OverlayHeader from "@/components/overlay/components/OverlayHeader/OverlayHeader";
import BrandInfoPanel from "@/components/brandPortal/BrandInfoPanel";
import LatestNews from "@/components/brandPortal/LatestNews";
import { BRAND_BRANCHES } from "@/components/brandPortal/brands";
import { useHologramControls } from "./utils/useHologramControls";
import { PRESETS, type PresetId } from "./utils/presets";

const MODEL_SHOWCASE_COLOR = "#2ebcfe";
const MODEL_Y_DESKTOP = -0.9;
const MODEL_Y_COMPACT = -0.78;

export default function PlaygroundCanvas({
  initialPreset,
}: {
  initialPreset?: PresetId;
} = {}) {
  const [hideLeva, setHideLeva] = useState(true);
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [replayTrigger, setReplayTrigger] = useState(0);
  const [activePreset, setActivePreset] = useState<PresetId>(initialPreset ?? "dark");

  useEffect(() => {
    if (initialPreset) setActivePreset(initialPreset);
  }, [initialPreset]);
  const [rendererUnavailable, setRendererUnavailable] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const activeBranch = BRAND_BRANCHES[activeModelIndex];
  const isSphereModel = activeBranch.url === "procedural:sphere";
  const isLogoModel =
    activeBranch.url === "procedural:spirit-logo" ||
    activeBranch.url === "procedural:power-labs-logo";
  const isTerrainModel = activeBranch.url === "procedural:terrain";

  const leva = useHologramControls(() => {
    setReplayTrigger((t) => t + 1);
    setHeaderVisible(true);
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px), (pointer: coarse)");
    const update = () => setIsCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <>
      <Leva
        theme={LEVA_THEME}
        titleBar={{ title: "CONTROLS" }}
        collapsed={false}
        flat={false}
        oneLineLabels={false}
        hidden={hideLeva}
      />
      <OverlayHeader visible={headerVisible || rendererUnavailable} />
      <div style={{ position: "fixed", inset: 0 }}>
        <HologramScene
          url={activeBranch.url}
          preloadUrls={BRAND_BRANCHES.map((m) => m.url)}
          onTransitionComplete={() => {
            setRendererUnavailable(false);
            setHeaderVisible(true);
          }}
          onUnavailable={() => {
            setRendererUnavailable(true);
            setHeaderVisible(true);
          }}
          replayTrigger={replayTrigger}
          {...leva}
          {...PRESETS[activePreset]}
          color={MODEL_SHOWCASE_COLOR}
          breathAmp={isSphereModel ? 0.065 : 0}
          floatAmp={
            isSphereModel
              ? 0.025
              : isTerrainModel
                ? 0.006
                : isLogoModel
                  ? 0.008
                  : leva.floatAmp
          }
          maskContrast={
            isSphereModel
              ? 2.2
              : isTerrainModel
                ? 1.8
                : isLogoModel
                  ? 2.3
                  : leva.maskContrast
          }
          noiseAmp={
            isSphereModel
              ? 0.12
              : isTerrainModel
                ? 0.035
                : isLogoModel
                  ? 0.018
                  : leva.noiseAmp
          }
          noiseScale={
            isSphereModel
              ? 1.15
              : isTerrainModel
                ? 0.85
                : isLogoModel
                  ? 0.95
                  : leva.noiseScale
          }
          particleCount={isCompact ? Math.min(leva.particleCount, 36000) : leva.particleCount}
          modelY={isCompact ? MODEL_Y_COMPACT : MODEL_Y_DESKTOP}
          mouseRadius={isCompact ? Math.max(leva.mouseRadius, 2.35) : leva.mouseRadius}
          mouseStrength={isCompact ? Math.max(leva.mouseStrength, 4.4) : leva.mouseStrength}
          pushStrength={isCompact ? Math.max(leva.pushStrength, 2.8) : leva.pushStrength}
          bloomStrength={isLogoModel ? 0.54 : leva.bloomStrength}
          ringBrightness={isLogoModel ? 4.4 : leva.ringBrightness}
        />
      </div>

      <BrandInfoPanel branch={activeBranch} visible />
      <LatestNews />

      {!rendererUnavailable && (
        <>
          <OverlayButtons
            hideLeva={hideLeva}
            onToggleLeva={() => setHideLeva((v) => !v)}
            activePreset={activePreset}
            onTogglePreset={() =>
              setActivePreset((p) => (p === "light" ? "dark" : "light"))
            }
          />
        </>
      )}
      <ModelSelector
        models={BRAND_BRANCHES}
        activeIndex={activeModelIndex}
        onChange={setActiveModelIndex}
      />
    </>
  );
}
