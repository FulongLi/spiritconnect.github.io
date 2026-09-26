import { assetPath } from "@/components/shared/assetPath";
import type { GeometryData } from "../../types";
import { createBreathingSphereGeometry, seededFract } from "./procedural";

/* Particles sampled from the blue pixels of a logo image. */

export async function createLogoGeometry(
  particleCount: number,
  imagePath = "/assets/spirit-connect-logo.png",
): Promise<GeometryData> {
  const image = await loadImage(assetPath(imagePath));
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return createBreathingSphereGeometry(particleCount);

  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const pixels: Array<[number, number, number]> = [];
  const step = 2;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      const blueLogoPixel = a > 32 && b > 130 && g > 110 && r < 90;
      if (blueLogoPixel) pixels.push([x, y, a / 255]);
    }
  }

  if (pixels.length === 0) return createBreathingSphereGeometry(particleCount);

  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);
  const widthWorld = 2.9;
  const heightWorld = widthWorld * (height / width);

  for (let i = 0; i < particleCount; i++) {
    const pick = Math.floor(
      seededFract(Math.sin((i + 1) * 91.917) * 47453.5453) * pixels.length,
    );
    const [px, py, alpha] = pixels[pick];
    const jitterX = seededFract(Math.sin((i + 3) * 12.9898) * 43758.5453) - 0.5;
    const jitterY = seededFract(Math.sin((i + 7) * 78.233) * 43758.5453) - 0.5;
    const jitterZ = seededFract(Math.sin((i + 11) * 39.425) * 43758.5453) - 0.5;
    const x = ((px + jitterX * step) / width - 0.5) * widthWorld;
    const y = (0.5 - (py + jitterY * step) / height) * heightWorld + 1.05;
    const z =
      jitterZ * (0.1 + alpha * 0.08) +
      Math.sin(x * 3.4 + y * 2.1) * 0.018;
    const base = i * 3;

    positions[base] = x;
    positions[base + 1] = y;
    positions[base + 2] = z;
    normals[base] = 0;
    normals[base + 1] = 0;
    normals[base + 2] = 1;
  }

  return { positions, normals };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${url}`));
    image.src = url;
  });
}
