"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createLunarRenderer, type LunarRenderer } from "./engine/lunarRenderer";

type Props = {
  /** smoothed story progress, 0..1 — written by the page, read every frame */
  progressRef: MutableRefObject<number>;
  /** theme target, 0 = day, 1 = night */
  themeRef: MutableRefObject<number>;
  /** AI → energy feedback loop target, 0..1 */
  loopRef: MutableRefObject<number>;
  /** render frames (false while the scene is fully covered) */
  active: boolean;
  /** scene is not needed for a while — release large GPU buffers */
  suspended: boolean;
  reducedMotion: boolean;
};

export default function TownCanvas({
  progressRef,
  themeRef,
  loopRef,
  active,
  suspended,
  reducedMotion,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LunarRenderer | null>(null);
  const [failed, setFailed] = useState(false);
  const initialReducedMotion = useRef(reducedMotion);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let engine: LunarRenderer;
    try {
      engine = createLunarRenderer(
        mount,
        {
          progress: () => progressRef.current,
          theme: () => themeRef.current,
          loop: () => loopRef.current,
        },
        { reducedMotion: initialReducedMotion.current },
      );
    } catch (error) {
      console.error("Unable to start the lunar WebGL scene", error);
      // report asynchronously: the failure comes from an external system
      queueMicrotask(() => setFailed(true));
      return;
    }
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      engine.dispose();
    };
  }, [progressRef, themeRef, loopRef]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (active) engine.start();
    else engine.stop();
  }, [active, failed]);

  useEffect(() => {
    if (suspended && !active) engineRef.current?.releaseGpuMemory();
  }, [suspended, active]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label="A lunar horizon under a dark sky"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse 140% 60% at 50% 118%, #6d737c 0%, #2b3038 38%, rgba(10,12,16,0) 62%), radial-gradient(circle at 50% 30%, #0b1220 0%, #050608 60%)",
        }}
      >
        <p
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 58,
            margin: 0,
            textAlign: "center",
            padding: "0 24px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "rgba(230, 230, 226, 0.55)",
          }}
        >
          3D VIEW UNAVAILABLE ON THIS DEVICE — THE JOURNEY CONTINUES IN TEXT
        </p>
      </div>
    );
  }

  return <div ref={mountRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}
