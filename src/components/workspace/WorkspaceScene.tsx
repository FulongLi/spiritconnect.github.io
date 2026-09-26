"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AIPE_SCREEN, PRESENCE_SCREEN, WORKSPACE, type WorkspaceScreenId } from "@/content/workspace";
import { useIsCompact, useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useDebugFlags } from "@/lib/hooks/useDebugFlags";
import { detectGpuBackend, hasWebGL2, type GpuBackend } from "@/lib/render/backend";
import { createWorkspaceEngine, type WorkspaceEngine } from "./engine/workspaceEngine";
import WorkspaceFallback from "./WorkspaceFallback";
import styles from "./WorkspaceScene.module.css";

type Props = {
  night: boolean;
  /** render frames (false = warmed up but paused) */
  active: boolean;
  /** increments each time the Dome is entered → the arrival replays */
  entranceKey: number;
  /** links become interactive once the fog has cleared */
  revealed: boolean;
};

/**
 * The Spirit Connect workspace: the visitor's own workstation inside the
 * Dome. The 3D scene is one WebGPU / WebGL 2 canvas; the monitors are
 * made clickable by real links projected over their screens.
 */
export default function WorkspaceScene({ night, active, entranceKey, revealed }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<HTMLAnchorElement>(null);
  const aipeRef = useRef<HTMLAnchorElement>(null);
  const engineRef = useRef<WorkspaceEngine | null>(null);

  const compact = useIsCompact();
  const reducedMotion = useReducedMotion();
  const { hologramBackend } = useDebugFlags();
  const [backend, setBackend] = useState<GpuBackend | "checking">("checking");
  const [ready, setReady] = useState(false);

  // latest values for the engine factory (not dependencies of it)
  const stateRef = useRef({ night, active });
  useEffect(() => {
    stateRef.current = { night, active };
  }, [night, active]);

  useEffect(() => {
    let cancelled = false;
    const pick: Promise<GpuBackend> =
      hologramBackend === "2d"
        ? Promise.resolve("fallback")
        : hologramBackend === "webgl"
          ? Promise.resolve(hasWebGL2() ? "webgl" : "fallback")
          : detectGpuBackend();
    pick.then((next) => !cancelled && setBackend(next));
    return () => {
      cancelled = true;
    };
  }, [hologramBackend]);

  // ── engine lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    const container = canvasRef.current;
    const root = rootRef.current;
    if (!container || !root || (backend !== "webgpu" && backend !== "webgl")) return;
    const engine = createWorkspaceEngine({
      container,
      eventTarget: root,
      forceWebGL: backend === "webgl",
      compact,
      reducedMotion,
      night: stateRef.current.night,
      active: stateRef.current.active,
      onReady: () => setReady(true),
      onUnavailable: () => setBackend((b) => (b === "webgpu" && hasWebGL2() ? "webgl" : "fallback")),
    });
    engineRef.current = engine;
    const bindings = [
      { el: presenceRef.current, screen: "presence" },
      { el: aipeRef.current, screen: "aipe" },
    ] as const;
    engine.bindHotspots(bindings.flatMap((b) => (b.el ? [{ el: b.el, screen: b.screen }] : [])));
    return () => {
      engineRef.current = null;
      setReady(false);
      engine.dispose();
    };
  }, [backend, compact, reducedMotion]);

  useEffect(() => {
    engineRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    engineRef.current?.setNight(night);
  }, [night]);

  const lastEntrance = useRef(entranceKey);
  useEffect(() => {
    if (lastEntrance.current === entranceKey) return;
    lastEntrance.current = entranceKey;
    engineRef.current?.replayEntrance();
  }, [entranceKey]);

  // ── hover / focus → the monitor responds ─────────────────────────────────
  const hover = useCallback((screen: WorkspaceScreenId | null) => engineRef.current?.setHover(screen), []);
  const hoverProps = (screen: WorkspaceScreenId) => ({
    onPointerEnter: () => hover(screen),
    onPointerLeave: () => hover(null),
    onFocus: () => hover(screen),
    onBlur: () => hover(null),
  });

  const tabIndex = revealed ? undefined : -1;

  return (
    <section
      ref={rootRef}
      className={styles.root}
      data-revealed={revealed}
      data-ready={ready}
      aria-label={WORKSPACE.label}
      aria-hidden={!revealed}
    >
      <h2 className="sr-only">{WORKSPACE.label}</h2>
      <p className="sr-only">{WORKSPACE.loop}</p>

      {backend === "fallback" ? (
        <WorkspaceFallback tabIndex={tabIndex} />
      ) : (
        <>
          <div ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <Link
            ref={presenceRef}
            className={styles.hotspot}
            href={PRESENCE_SCREEN.href}
            aria-label={PRESENCE_SCREEN.linkLabel}
            tabIndex={tabIndex}
            {...hoverProps("presence")}
          />
          <a
            ref={aipeRef}
            className={styles.hotspot}
            href={AIPE_SCREEN.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${AIPE_SCREEN.linkLabel} (opens external site)`}
            tabIndex={tabIndex}
            {...hoverProps("aipe")}
          />
        </>
      )}
    </section>
  );
}
