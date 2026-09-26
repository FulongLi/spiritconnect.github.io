import type { GeometryData } from "../../types";
import { sampleGLBSurface } from "./glb";
import { createLogoGeometry } from "./logo";
import {
  createBoatGeometry,
  createBreathingSphereGeometry,
  createBrushGeometry,
  createCrystalGeometry,
  createGamepadGeometry,
  createPyramidGeometry,
  createTerrainGeometry,
} from "./procedural";

/* ------------------------------------------------------------------ */
/* Model registry. A model "url" is either a `procedural:*` id or a     */
/* GLB path. Sampled geometry is cached per (url, particleCount) at     */
/* module level so switching back to a model is instant.               */
/* ------------------------------------------------------------------ */

export const MODEL_URLS = {
  sphere: "procedural:sphere", // the Presence entity
  terrain: "procedural:terrain",
  spiritLogo: "procedural:spirit-logo",
  powerLabsLogo: "procedural:power-labs-logo",
  pyramid: "procedural:pyramid",
  boat: "procedural:boat",
  crystal: "procedural:crystal",
  gamepad: "procedural:gamepad",
  brush: "procedural:brush",
} as const;

const PROCEDURAL: Record<string, (count: number) => GeometryData> = {
  [MODEL_URLS.terrain]: createTerrainGeometry,
  [MODEL_URLS.pyramid]: createPyramidGeometry,
  [MODEL_URLS.boat]: createBoatGeometry,
  [MODEL_URLS.crystal]: createCrystalGeometry,
  [MODEL_URLS.gamepad]: createGamepadGeometry,
  [MODEL_URLS.brush]: createBrushGeometry,
};

const LOGO_IMAGES: Record<string, string> = {
  [MODEL_URLS.spiritLogo]: "/assets/spirit-connect-logo.png",
  [MODEL_URLS.powerLabsLogo]: "/assets/power-labs-logo.png",
};

const geometryCache = new Map<string, GeometryData>();
const geometryInflight = new Map<string, Promise<GeometryData>>();

function cacheKey(url: string, particleCount: number) {
  return `${url}:${particleCount}`;
}

function cachedAsync(key: string, load: () => Promise<GeometryData>) {
  if (geometryCache.has(key)) return Promise.resolve(geometryCache.get(key)!);
  if (geometryInflight.has(key)) return geometryInflight.get(key)!;
  const promise = load().then(
    (data) => {
      geometryCache.set(key, data);
      geometryInflight.delete(key);
      return data;
    },
    (error) => {
      geometryInflight.delete(key);
      throw error;
    },
  );
  geometryInflight.set(key, promise);
  return promise;
}

export async function sampleGeometry(url: string, particleCount: number): Promise<GeometryData> {
  // the sphere is cheap and intentionally not cached (fresh arrays each time)
  if (url === MODEL_URLS.sphere) return createBreathingSphereGeometry(particleCount);

  const key = cacheKey(url, particleCount);
  const procedural = PROCEDURAL[url];
  if (procedural) {
    if (!geometryCache.has(key)) geometryCache.set(key, procedural(particleCount));
    return geometryCache.get(key)!;
  }

  const logo = LOGO_IMAGES[url];
  if (logo) return cachedAsync(key, () => createLogoGeometry(particleCount, logo));

  return cachedAsync(key, () => sampleGLBSurface(url, particleCount));
}
