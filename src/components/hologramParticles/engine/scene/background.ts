import { CanvasTexture } from "three";

/** Radial-gradient scene background drawn into a small canvas texture. */
export function createGradientBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const texture = new CanvasTexture(canvas);
  let last = "";

  function draw(center: string, mid: string, edge: string) {
    const key = `${center}|${mid}|${edge}`;
    if (key === last) return;
    last = key;
    const { width, height } = canvas;
    const grad = ctx.createRadialGradient(
      width * 0.48,
      height * 0.45,
      0,
      width * 0.5,
      height * 0.5,
      width * 0.8,
    );
    grad.addColorStop(0, center);
    grad.addColorStop(0.45, mid);
    grad.addColorStop(1, edge);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    texture.needsUpdate = true;
  }

  return { texture, draw, dispose: () => texture.dispose() };
}
