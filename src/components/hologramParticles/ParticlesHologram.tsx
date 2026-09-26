"use client";

import { useEffect, useRef } from "react";
import type { ParticlesHologramProps } from "./types";
import { resolveParams } from "./engine/defaults";
import { createHologramEngine, preloadGeometry, type HologramEngine } from "./engine/hologramEngine";

/* ------------------------------------------------------------------ */
/* React wrapper around the hologram engine (./engine).                */
/*                                                                     */
/*  - resolves props into one parameter object read by the engine       */
/*  - creates / disposes the engine (re-created when the particle count */
/*    or backend changes)                                               */
/*  - forwards model changes, entrance replays, geometry rebuilds and   */
/*    the `active` flag                                                 */
/* ------------------------------------------------------------------ */

export default function ParticlesHologram(props: ParticlesHologramProps) {
  const {
    url,
    onLoaded,
    onTransitionComplete,
    onUnavailable,
    preloadUrls,
    replayTrigger = 0,
    active = true,
    enableZoom = true,
    touchAction = "none",
    forceWebGL = false,
    maxPixelRatio = 2,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HologramEngine | null>(null);

  // latest parameters + callbacks, read by the engine outside React renders
  const params = resolveParams(props);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const callbacksRef = useRef({ onLoaded, onTransitionComplete, onUnavailable });
  callbacksRef.current = { onLoaded, onTransitionComplete, onUnavailable };
  const activeRef = useRef(active);
  activeRef.current = active;
  const urlRef = useRef(url);
  urlRef.current = url;

  // ── Engine lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = createHologramEngine({
      container,
      url: urlRef.current,
      params: () => paramsRef.current,
      forceWebGL,
      maxPixelRatio,
      enableZoom,
      active: activeRef.current,
      onLoaded: () => callbacksRef.current.onLoaded?.(),
      onTransitionComplete: () => callbacksRef.current.onTransitionComplete?.(),
      onUnavailable: () => callbacksRef.current.onUnavailable?.(),
    });
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      engine.dispose();
    };
  }, [params.particleCount, forceWebGL, maxPixelRatio, enableZoom]);

  // ── Model transition on url change ────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.setModel(url);
  }, [url]);

  // ── Render only while needed ──────────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.setActive(active);
  }, [active]);

  // ── Background preload ────────────────────────────────────────────────────
  const preloadKey = (preloadUrls ?? []).join("|");
  useEffect(() => {
    if (preloadKey) preloadGeometry(preloadKey.split("|"), params.particleCount);
  }, [preloadKey, params.particleCount]);

  // ── Uniform sync — runs after every render ────────────────────────────────
  useEffect(() => {
    engineRef.current?.syncParams();
  });

  // ── Replay entrance animation (not on mount — the first entrance is automatic)
  const lastReplayRef = useRef(replayTrigger);
  useEffect(() => {
    if (lastReplayRef.current === replayTrigger) return;
    lastReplayRef.current = replayTrigger;
    engineRef.current?.replayEntrance();
  }, [replayTrigger]);

  // ── Geometry rebuilds ─────────────────────────────────────────────────────
  const { cylRadius, cylHeight, cylY, ringRadius, ringThickness, ringGap } = params;
  const cylMountedRef = useRef(false);
  useEffect(() => {
    if (!cylMountedRef.current) {
      cylMountedRef.current = true;
      return;
    }
    engineRef.current?.rebuildCylinder();
  }, [cylRadius, cylHeight, cylY]);

  const ringsMountedRef = useRef(false);
  useEffect(() => {
    if (!ringsMountedRef.current) {
      ringsMountedRef.current = true;
      return;
    }
    engineRef.current?.rebuildRings();
  }, [ringRadius, ringThickness, ringGap]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        touchAction,
        overscrollBehavior: "none",
      }}
    />
  );
}
