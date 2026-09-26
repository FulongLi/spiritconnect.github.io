import { TIMELINE } from "@/content/journey";

/**
 * Rendering lifecycle of the homepage experience.
 *
 *   LUNAR       lunar WebGL scene renders; Presence renderer not mounted
 *   TRANSITION  Presence mounted + warmed (pipelines compiled) while the
 *               lunar scene keeps rendering until the blackout fully hides it
 *   PRESENCE    Presence renders; lunar loop stopped and its large GPU
 *               buffers (post-processing targets, shadow map) released
 *
 * Thresholds come from the journey TIMELINE and use hysteresis so scrolling
 * back and forth around a boundary does not thrash mount / unmount.
 */
export type ExperienceState = "LUNAR" | "TRANSITION" | "PRESENCE";

export type RenderPlan = {
  state: ExperienceState;
  lunarActive: boolean;
  /** lunar GPU memory may be released (it re-allocates lazily on resume) */
  lunarSuspended: boolean;
  presenceMounted: boolean;
  presenceActive: boolean;
};

export function nextExperienceState(prev: ExperienceState, p: number): ExperienceState {
  const enterPresence = p >= TIMELINE.presenceEnter;
  switch (prev) {
    case "LUNAR":
      if (enterPresence) return "PRESENCE";
      return p >= TIMELINE.presenceWarm ? "TRANSITION" : "LUNAR";
    case "TRANSITION":
      if (enterPresence) return "PRESENCE";
      return p < TIMELINE.presenceRelease ? "LUNAR" : "TRANSITION";
    case "PRESENCE":
      if (p < TIMELINE.presenceRelease) return "LUNAR";
      return p < TIMELINE.presenceEnter - 0.02 ? "TRANSITION" : "PRESENCE";
  }
}

export function planRendering(state: ExperienceState, p: number): RenderPlan {
  // once the blackout layer is fully opaque the lunar canvas is invisible
  const lunarHidden = p >= TIMELINE.blackoutEnd;
  return {
    state,
    lunarActive: state === "LUNAR" || (state === "TRANSITION" && !lunarHidden),
    lunarSuspended: state === "PRESENCE",
    presenceMounted: state !== "LUNAR",
    presenceActive:
      state === "PRESENCE" || (state === "TRANSITION" && p >= TIMELINE.presenceActivate),
  };
}

export function samePlan(a: RenderPlan, b: RenderPlan) {
  return (
    a.state === b.state &&
    a.lunarActive === b.lunarActive &&
    a.lunarSuspended === b.lunarSuspended &&
    a.presenceMounted === b.presenceMounted &&
    a.presenceActive === b.presenceActive
  );
}
