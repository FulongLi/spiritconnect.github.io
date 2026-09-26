/**
 * GPU backend selection for the three.js WebGPURenderer scenes:
 *
 *   webgpu   → WebGPURenderer on WebGPU
 *   webgl    → WebGPURenderer on its WebGL 2 backend (lighter budgets)
 *   fallback → no 3D; the caller renders a static / 2D alternative
 */
export type GpuBackend = "webgpu" | "webgl" | "fallback";

export async function detectGpuBackend(): Promise<GpuBackend> {
  const gpu = (navigator as Navigator & {
    gpu?: { requestAdapter?: () => Promise<unknown> };
  }).gpu;
  if (gpu?.requestAdapter) {
    try {
      if (await gpu.requestAdapter()) return "webgpu";
    } catch {
      /* fall through to WebGL */
    }
  }
  return hasWebGL2() ? "webgl" : "fallback";
}

export function hasWebGL2() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}
