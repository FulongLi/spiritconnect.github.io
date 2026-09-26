"use client";

import { useSyncExternalStore } from "react";

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}

/** SSR-safe media query subscription (false during static render). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const COMPACT_QUERY = "(max-width: 720px), (pointer: coarse)";

export function useReducedMotion() {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

export function useIsCompact() {
  return useMediaQuery(COMPACT_QUERY);
}
