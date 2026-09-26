import { resolveParams } from "@/components/hologramParticles/engine/defaults";
import { MODEL_TUNING } from "@/components/hologramParticles/utils/presets";
import type { HologramParams } from "@/components/hologramParticles/types";

/* ------------------------------------------------------------------ */
/* The Presence particle entity as it lives inside the desk device.     */
/* Same renderer as the former stage (particle field, transition,       */
/* interaction) retuned to the Presence identity: silver / white /      */
/* soft grey, restrained bloom, no cyan.                                */
/* ------------------------------------------------------------------ */

export type EntityQuality = "webgpu" | "webgl" | "compact";

/** the entity is ~9 cm across: a few thousand particles read as a dense sphere */
const PARTICLES: Record<EntityQuality, number> = {
  webgpu: 14000,
  webgl: 10000,
  compact: 7000,
};

export function entityParams(quality: EntityQuality, reducedMotion: boolean): HologramParams {
  const motion = reducedMotion
    ? { autoRotateSpeed: 0.4, noiseSpeed: 0.3, maskSpeed: 0.18, breathAmp: 0, floatAmp: 0.01, camIntensity: 0 }
    : {};
  return resolveParams({
    ...MODEL_TUNING.sphere,
    particleCount: PARTICLES[quality],
    // silver-white body, neutral light, a whisper of cool highlight
    color: "#dde1e6",
    ambient: 0.1,
    wrap: 0.32,
    volumeStrength: 0.8,
    light1X: -1.5,
    light1Y: 5,
    light1Z: 3,
    light1Color: "#ffffff",
    light1Intensity: 1.35,
    light2X: 1,
    light2Y: -4,
    light2Z: -2,
    light2Color: "#dfe6f0",
    light2Intensity: 0.55,
    // fine grain; slightly coarser where there are fewer particles
    sphereSize: quality === "webgpu" ? 0.0135 : 0.016,
    autoRotateSpeed: 1.1,
    noiseSpeed: 0.8,
    maskScale: 0.95,
    maskSpeed: 0.45,
    noiseGain: 0.6,
    // the cursor stirs the entity when it comes close to the device
    mouseRadius: 1.9,
    mouseStrength: 3.2,
    pushStrength: 2.4,
    springStiffness: 38,
    springDamping: 18,
    mouseScatter: 0.9,
    mouseLerp: 2.4,
    mouseGlowColor: "#ffffff",
    mouseGlowPassive: 1.2,
    mouseGlowActive: 4,
    mouseGlowDecay: 0.45,
    mouseGlowPow: 4,
    // restrained, soft bloom (scene-wide: only the brightest values glow)
    bloomStrength: 0.32,
    bloomRadius: 0.5,
    bloomThreshold: 0.74,
    chromaticStr: 0,
    transitionMaskContrast: 1.65,
    transitionGlowScale: 0.8,
    entranceMorphDur: 2.4,
    entranceReformDur: 1.2,
    // gentle head parallax (metres ≈ camIntensity × 0.05)
    camIntensity: 0.5,
    camStiffness: 2.6,
    camDamping: 3.6,
    ...motion,
  });
}
