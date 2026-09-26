import { Vector2, type Camera, type Scene } from "three";
import { PostProcessing, type WebGPURenderer } from "three/webgpu";
import { pass, uniform } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import type { HologramParams } from "../types";

/** scene → bloom → chromatic aberration (optional) */
export function createPostProcessing(
  renderer: WebGPURenderer,
  scene: Scene,
  camera: Camera,
  p: HologramParams,
  { chromatic = true }: { chromatic?: boolean } = {},
) {
  const pp = new PostProcessing(renderer);
  const scenePass = pass(scene, camera);
  const sceneColor = (scenePass as any).getTextureNode("output");

  const bloomPass = bloom(sceneColor, p.bloomStrength, p.bloomRadius, p.bloomThreshold) as any;

  const caStrength = uniform(p.chromaticStr);
  const combined = sceneColor.add(bloomPass);
  pp.outputNode = chromatic
    ? chromaticAberration(combined, caStrength, new Vector2(0.5, 0.5))
    : combined;

  return {
    render: () => pp.render(),
    sync(params: HologramParams) {
      bloomPass.strength.value = params.bloomStrength;
      bloomPass.radius.value = params.bloomRadius;
      bloomPass.threshold.value = params.bloomThreshold;
      caStrength.value = params.chromaticStr;
    },
    dispose() {
      pp.dispose();
    },
  };
}
