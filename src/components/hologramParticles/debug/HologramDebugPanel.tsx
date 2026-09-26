"use client";

import { useEffect, useMemo } from "react";
import { Leva, useControls } from "leva";
import { LEVA_THEME } from "@/components/shared/theme";
import { useHologramControls } from "../utils/useHologramControls";
import type { HologramControlValues } from "../utils/hologramDefaults";
import { LAB_MODELS } from "../utils/presets";

export type HologramDebugState = {
  controls: HologramControlValues;
  modelUrl: string;
};

/**
 * Development-only hologram lab: Leva controls + model switcher.
 * Loaded with next/dynamic only when debug flags are on, so Leva is never
 * part of the default production download.
 */
export default function HologramDebugPanel({
  onChange,
  onReplay,
  collapsed,
}: {
  onChange: (state: HologramDebugState) => void;
  onReplay: () => void;
  collapsed: boolean;
}) {
  const controls = useHologramControls(onReplay);
  const modelOptions = useMemo(
    () => Object.fromEntries(LAB_MODELS.map((m) => [m.label, m.url])),
    [],
  );
  const { model } = useControls("Lab", {
    model: { options: modelOptions, value: LAB_MODELS[0].url, label: "Model" },
  });

  // Leva returns a fresh object every render; only report real changes
  const key = JSON.stringify(controls);
  useEffect(() => {
    onChange({ controls: JSON.parse(key) as HologramControlValues, modelUrl: model });
  }, [key, model, onChange]);

  return (
    <Leva
      theme={LEVA_THEME}
      titleBar={{ title: "HOLOGRAM LAB" }}
      collapsed={collapsed}
      flat={false}
      oneLineLabels={false}
    />
  );
}
