import type { HologramParams } from "../types";
import type { ParticleAttributes, ParticleUniforms } from "./scene/particleField";

/* ------------------------------------------------------------------ */
/* Model transition state machine                                       */
/*                                                                     */
/*   idle → deform-out → morphing → deform-in → idle                    */
/*                                                                     */
/* deform-out: the current shape destabilises (maskContrast drops)      */
/* morphing:   particles flow source → target on the GPU                */
/* deform-in:  the new shape re-stabilises                              */
/*                                                                     */
/* The entrance is a morph from the origin (all-zero source positions)  */
/* into the first model — "particles assemble".                         */
/* ------------------------------------------------------------------ */

export type TransitionState = "idle" | "deform-out" | "morphing" | "deform-in";

const smoothstep = (p: number) => p * p * (3 - 2 * p);

export function createTransitionController(
  u: ParticleUniforms,
  attrs: ParticleAttributes,
  params: () => HologramParams,
  onComplete: () => void,
) {
  // the first frame starts the entrance morph
  let state: TransitionState = "morphing";
  let elapsed = 0;
  let isEntrance = true;

  function step(delta: number) {
    const p = params();
    if (state === "deform-out") {
      elapsed += delta;
      const k = Math.min(elapsed / p.transitionDeformDur, 1);
      const tmc = p.transitionMaskContrast;
      u.maskContrast.value = p.maskContrast + (tmc - p.maskContrast) * smoothstep(k);
      if (k >= 1) {
        u.maskContrast.value = tmc;
        elapsed = 0;
        state = "morphing";
      }
    } else if (state === "morphing") {
      elapsed += delta;
      const morphDur = isEntrance ? p.entranceMorphDur : p.transitionMorphDur;
      const k = Math.min(elapsed / morphDur, 1);
      u.transitionProgress.value = smoothstep(k);
      if (k >= 1) {
        (attrs.pos.array as Float32Array).set(attrs.posTarget.array as Float32Array);
        (attrs.norm.array as Float32Array).set(attrs.normTarget.array as Float32Array);
        attrs.pos.needsUpdate = true;
        attrs.norm.needsUpdate = true;
        u.transitionProgress.value = 0;
        elapsed = 0;
        state = "deform-in";
      }
    } else if (state === "deform-in") {
      elapsed += delta;
      const reformDur = isEntrance ? p.entranceReformDur : p.transitionReformDur;
      const k = Math.min(elapsed / reformDur, 1);
      const tmc = p.transitionMaskContrast;
      u.maskContrast.value = tmc + (p.maskContrast - tmc) * smoothstep(k);
      if (isEntrance) {
        u.entranceGlow.value = 1 - smoothstep(k);
      }
      if (k >= 1) {
        u.maskContrast.value = p.maskContrast;
        state = "idle";
        u.color.value.set(p.color);
        if (isEntrance) isEntrance = false;
        onComplete();
      }
    }
  }

  /** start flowing into a new shape (interrupting a running transition if needed) */
  function morphTo(positions: Float32Array, normals: Float32Array) {
    const wasIdle = state === "idle";
    const srcPos = attrs.pos.array as Float32Array;
    const tgtPos = attrs.posTarget.array as Float32Array;
    const srcNorm = attrs.norm.array as Float32Array;
    const tgtNorm = attrs.normTarget.array as Float32Array;

    // freeze an in-flight morph where it is, so the next one starts there
    const prog = u.transitionProgress.value as number;
    if (prog > 0) {
      for (let i = 0; i < srcPos.length; i++) {
        srcPos[i] = srcPos[i] * (1 - prog) + tgtPos[i] * prog;
        srcNorm[i] = srcNorm[i] * (1 - prog) + tgtNorm[i] * prog;
      }
      attrs.pos.needsUpdate = true;
      attrs.norm.needsUpdate = true;
      u.transitionProgress.value = 0;
    }

    tgtPos.set(positions);
    tgtNorm.set(normals);
    attrs.posTarget.needsUpdate = true;
    attrs.normTarget.needsUpdate = true;
    elapsed = 0;

    if (wasIdle) {
      state = "deform-out";
    } else {
      u.maskContrast.value = params().transitionMaskContrast;
      state = "morphing";
    }
  }

  /** collapse to the origin and assemble the current shape again */
  function replayEntrance() {
    (attrs.pos.array as Float32Array).fill(0);
    (attrs.norm.array as Float32Array).fill(0);
    attrs.pos.needsUpdate = true;
    attrs.norm.needsUpdate = true;
    u.transitionProgress.value = 0;
    u.maskContrast.value = params().transitionMaskContrast;
    u.entranceGlow.value = 1;
    isEntrance = true;
    state = "morphing";
    elapsed = 0;
  }

  return {
    step,
    morphTo,
    replayEntrance,
    get idle() {
      return state === "idle";
    },
    get isEntrance() {
      return isEntrance;
    },
  };
}

export type TransitionController = ReturnType<typeof createTransitionController>;
