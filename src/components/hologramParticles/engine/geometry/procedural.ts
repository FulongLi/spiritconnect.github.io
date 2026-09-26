import { Vector2, Vector3 } from "three";
import type { GeometryData } from "../../types";

/* ------------------------------------------------------------------ */
/* Procedural particle models. Each returns `particleCount` surface     */
/* points + normals in model space (roughly a 3-unit bounding box,      */
/* resting on y = 0 inside the holographic cylinder).                   */
/* ------------------------------------------------------------------ */


export function createBreathingSphereGeometry(particleCount: number): GeometryData {
  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < particleCount; i++) {
    const t = particleCount > 1 ? i / (particleCount - 1) : 0;
    const y = 1 - t * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * goldenAngle;
    const nx = Math.cos(theta) * radiusAtY;
    const nz = Math.sin(theta) * radiusAtY;
    const volumeSeed = seededFract(Math.sin((i + 1) * 78.233) * 43758.5453);
    const fillRadius = Math.pow(volumeSeed, 1 / 3);
    const shellRipple = 1 + Math.sin(theta * 3.0 + y * 5.5) * 0.004;
    const radius = 0.9 * fillRadius * shellRipple;
    const base = i * 3;

    positions[base] = nx * radius;
    positions[base + 1] = y * radius + 1.05;
    positions[base + 2] = nz * radius;
    normals[base] = nx;
    normals[base + 1] = y;
    normals[base + 2] = nz;
  }

  return { positions, normals };
}

export function createTerrainGeometry(particleCount: number): GeometryData {
  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);
  const width = 3.8;
  const depth = 2.45;
  const eps = 0.012;

  for (let i = 0; i < particleCount; i++) {
    const u = seededFract(i * 0.754877666 + 0.137);
    const v = seededFract(i * 0.569840296 + 0.421);
    const jitterX = seededFract(Math.sin((i + 5) * 12.9898) * 43758.5453) - 0.5;
    const jitterZ = seededFract(Math.sin((i + 9) * 78.233) * 43758.5453) - 0.5;
    const x = (u - 0.5) * width + jitterX * 0.012;
    const z = (v - 0.5) * depth + jitterZ * 0.012;
    const y = terrainHeight(x, z) + 0.72;
    const base = i * 3;

    positions[base] = x;
    positions[base + 1] = y;
    positions[base + 2] = z;

    const hL = terrainHeight(x - eps, z);
    const hR = terrainHeight(x + eps, z);
    const hD = terrainHeight(x, z - eps);
    const hU = terrainHeight(x, z + eps);
    const normal = new Vector3(hL - hR, eps * 2, hD - hU).normalize();
    normals[base] = normal.x;
    normals[base + 1] = normal.y;
    normals[base + 2] = normal.z;
  }

  return { positions, normals };
}

function terrainHeight(x: number, z: number) {
  const gaussian = (
    cx: number,
    cz: number,
    sx: number,
    sz: number,
    amp: number,
  ) => {
    const dx = (x - cx) / sx;
    const dz = (z - cz) / sz;
    return Math.exp(-(dx * dx + dz * dz)) * amp;
  };

  const mountains =
    gaussian(-0.95, -0.18, 0.48, 0.38, 0.78) +
    gaussian(0.95, 0.38, 0.62, 0.42, 0.58) +
    gaussian(0.12, -0.78, 0.5, 0.28, 0.34);
  const basins =
    gaussian(0.02, 0.08, 0.72, 0.44, -0.42) +
    gaussian(1.32, -0.48, 0.38, 0.3, -0.26);
  const ridges =
    Math.sin(x * 3.1 + z * 1.7) * 0.07 +
    Math.sin((x - z) * 5.2) * 0.035 +
    Math.sin((x * 1.8 + z * 6.1)) * 0.025;
  const edgeX = Math.abs(x) / 1.9;
  const edgeZ = Math.abs(z) / 1.225;
  const edgeDrop = Math.pow(Math.max(edgeX, edgeZ), 3.2) * 0.34;

  return mountains + basins + ridges - edgeDrop;
}

export function createPyramidGeometry(particleCount: number): GeometryData {
  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);
  const apex = new Vector3(0, 2.55, 0);
  const corners = [
    new Vector3(-1.35, 0.22, -1.35),
    new Vector3(1.35, 0.22, -1.35),
    new Vector3(1.35, 0.22, 1.35),
    new Vector3(-1.35, 0.22, 1.35),
  ];
  const faceNormals = corners.map((corner, i) => {
    const next = corners[(i + 1) % corners.length];
    return new Vector3()
      .subVectors(next, corner)
      .cross(new Vector3().subVectors(apex, corner))
      .normalize();
  });

  for (let i = 0; i < particleCount; i++) {
    const face = i % 5;
    const r1 = seededFract(Math.sin((i + 1) * 12.9898) * 43758.5453);
    const r2 = seededFract(Math.sin((i + 3) * 78.233) * 43758.5453);
    const base = i * 3;

    if (face === 4) {
      positions[base] = (r1 - 0.5) * 2.7;
      positions[base + 1] = 0.2;
      positions[base + 2] = (r2 - 0.5) * 2.7;
      normals[base] = 0;
      normals[base + 1] = -1;
      normals[base + 2] = 0;
      continue;
    }

    const sqrtR1 = Math.sqrt(r1);
    const wa = 1 - sqrtR1;
    const wb = sqrtR1 * (1 - r2);
    const wc = sqrtR1 * r2;
    const point = new Vector3()
      .addScaledVector(apex, wa)
      .addScaledVector(corners[face], wb)
      .addScaledVector(corners[(face + 1) % corners.length], wc);
    const normal = faceNormals[face];

    positions[base] = point.x;
    positions[base + 1] = point.y;
    positions[base + 2] = point.z;
    normals[base] = normal.x;
    normals[base + 1] = normal.y;
    normals[base + 2] = normal.z;
  }

  return { positions, normals };
}

export function createBoatGeometry(particleCount: number): GeometryData {
  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const r1 = seededFract(Math.sin((i + 1) * 12.9898) * 43758.5453);
    const r2 = seededFract(Math.sin((i + 5) * 78.233) * 43758.5453);
    const r3 = seededFract(Math.sin((i + 9) * 39.425) * 43758.5453);
    const base = i * 3;
    const section = r3 < 0.68 ? "hull" : r3 < 0.82 ? "mast" : "sail";

    if (section === "hull") {
      const x = (r1 - 0.5) * 3.3;
      const lengthTaper = 1 - Math.pow(Math.abs(x) / 1.65, 1.8);
      const width = Math.max(0.04, 0.62 * lengthTaper);
      const side = r2 < 0.5 ? -1 : 1;
      const v = r2 < 0.5 ? r2 * 2 : (r2 - 0.5) * 2;
      const z = side * width * (0.35 + v * 0.65);
      const y =
        1.13 -
        Math.pow(v, 1.6) * 0.62 -
        Math.pow(Math.abs(x) / 1.8, 2) * 0.1;
      const normal = new Vector3(-x * 0.08, 0.7, z).normalize();

      positions[base] = x;
      positions[base + 1] = y;
      positions[base + 2] = z;
      normals[base] = normal.x;
      normals[base + 1] = normal.y;
      normals[base + 2] = normal.z;
      continue;
    }

    if (section === "mast") {
      const angle = r1 * Math.PI * 2;
      const radius = 0.035;
      positions[base] = Math.cos(angle) * radius;
      positions[base + 1] = 0.62 + r2 * 1.65;
      positions[base + 2] = Math.sin(angle) * radius;
      normals[base] = Math.cos(angle);
      normals[base + 1] = 0;
      normals[base + 2] = Math.sin(angle);
      continue;
    }

    const side = r3 < 0.91 ? -1 : 1;
    const h = r1;
    const edge = 1 - h;
    const x = side * edge * 0.72 * r2;
    const y = 0.72 + h * 1.35;
    const z = 0.035 * side + Math.sin(h * Math.PI) * 0.08 * side;
    const normal = new Vector3(0.25 * side, 0.08, side).normalize();

    positions[base] = x;
    positions[base + 1] = y;
    positions[base + 2] = z;
    normals[base] = normal.x;
    normals[base + 1] = normal.y;
    normals[base + 2] = normal.z;
  }

  return { positions, normals };
}

export function createCrystalGeometry(particleCount: number): GeometryData {
  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);
  const sides = 6;

  for (let i = 0; i < particleCount; i++) {
    const side = i % sides;
    const r1 = seededFract(Math.sin((i + 2) * 12.9898) * 43758.5453);
    const r2 = seededFract(Math.sin((i + 6) * 78.233) * 43758.5453);
    const upper = seededFract(Math.sin((i + 12) * 39.425) * 43758.5453) > 0.32;
    const angleA = (side / sides) * Math.PI * 2;
    const angleB = ((side + 1) / sides) * Math.PI * 2;
    const apex = new Vector3(0, upper ? 2.55 : 0.05, 0);
    const radius = upper ? 0.78 : 0.54;
    const a = new Vector3(
      Math.cos(angleA) * radius,
      0.65,
      Math.sin(angleA) * radius,
    );
    const b = new Vector3(
      Math.cos(angleB) * radius,
      0.65,
      Math.sin(angleB) * radius,
    );
    const sqrtR1 = Math.sqrt(r1);
    const point = new Vector3()
      .addScaledVector(apex, 1 - sqrtR1)
      .addScaledVector(a, sqrtR1 * (1 - r2))
      .addScaledVector(b, sqrtR1 * r2);
    const normal = new Vector3()
      .subVectors(b, a)
      .cross(new Vector3().subVectors(apex, a))
      .normalize();
    const base = i * 3;

    positions[base] = point.x;
    positions[base + 1] = point.y;
    positions[base + 2] = point.z;
    normals[base] = normal.x;
    normals[base + 1] = normal.y;
    normals[base + 2] = normal.z;
  }

  return { positions, normals };
}

export function createGamepadGeometry(particleCount: number): GeometryData {
  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const r1 = seededFract(Math.sin((i + 4) * 12.9898) * 43758.5453);
    const r2 = seededFract(Math.sin((i + 8) * 78.233) * 43758.5453);
    const r3 = seededFract(Math.sin((i + 13) * 39.425) * 43758.5453);
    const r4 = seededFract(Math.sin((i + 21) * 19.191) * 43758.5453);
    const base = i * 3;

    if (r3 < 0.48) {
      const theta = r1 * Math.PI * 2;
      const v = r2 * 2 - 1;
      const radial = Math.sqrt(Math.max(0, 1 - v * v));
      const rx = 1.42;
      const ry = 0.34;
      const rz = 0.33;
      const x = Math.cos(theta) * radial * rx;
      const y = 1.18 + v * ry;
      const z = Math.sin(theta) * radial * rz;
      const normal = new Vector3(x / rx, (y - 1.18) / ry, z / rz).normalize();

      positions[base] = x;
      positions[base + 1] = y;
      positions[base + 2] = z;
      normals[base] = normal.x;
      normals[base + 1] = normal.y;
      normals[base + 2] = normal.z;
      continue;
    }

    if (r3 < 0.72) {
      const side = r3 < 0.6 ? -1 : 1;
      const theta = r1 * Math.PI * 2;
      const v = r2 * 2 - 1;
      const radial = Math.sqrt(Math.max(0, 1 - v * v));
      const rx = 0.48;
      const ry = 0.48;
      const rz = 0.34;
      const cx = side * 0.96;
      const cy = 0.9;
      const x = cx + Math.cos(theta) * radial * rx;
      const y = cy + v * ry;
      const z = Math.sin(theta) * radial * rz;
      const normal = new Vector3((x - cx) / rx, (y - cy) / ry, z / rz).normalize();

      positions[base] = x;
      positions[base + 1] = y;
      positions[base + 2] = z;
      normals[base] = normal.x;
      normals[base + 1] = normal.y;
      normals[base + 2] = normal.z;
      continue;
    }

    if (r3 < 0.84) {
      const buttonIndex = Math.floor(r4 * 4);
      const centers = [
        new Vector2(0.68, 1.22),
        new Vector2(0.94, 1.22),
        new Vector2(0.81, 1.39),
        new Vector2(0.81, 1.05),
      ];
      const center = centers[buttonIndex] ?? centers[0];
      const angle = r1 * Math.PI * 2;
      const radius = Math.sqrt(r2) * 0.08;

      positions[base] = center.x + Math.cos(angle) * radius;
      positions[base + 1] = center.y + Math.sin(angle) * radius;
      positions[base + 2] = 0.42;
      normals[base] = 0;
      normals[base + 1] = 0;
      normals[base + 2] = 1;
      continue;
    }

    if (r3 < 0.93) {
      const horizontal = r4 < 0.5;
      const x = -0.82 + (horizontal ? (r1 - 0.5) * 0.48 : (r1 - 0.5) * 0.14);
      const y = 1.22 + (horizontal ? (r2 - 0.5) * 0.14 : (r2 - 0.5) * 0.48);

      positions[base] = x;
      positions[base + 1] = y;
      positions[base + 2] = 0.43;
      normals[base] = 0;
      normals[base + 1] = 0;
      normals[base + 2] = 1;
      continue;
    }

    const stickCenterX = r4 < 0.5 ? -0.42 : 0.34;
    const angle = r1 * Math.PI * 2;
    const ring = 0.11 + r2 * 0.045;
    positions[base] = stickCenterX + Math.cos(angle) * ring;
    positions[base + 1] = 0.92 + Math.sin(angle) * ring;
    positions[base + 2] = 0.45;
    normals[base] = 0;
    normals[base + 1] = 0;
    normals[base + 2] = 1;
  }

  return { positions, normals };
}

export function createBrushGeometry(particleCount: number): GeometryData {
  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);
  const handleStart = new Vector3(-1.08, 0.4, -0.08);
  const handleEnd = new Vector3(0.76, 1.88, 0.08);
  const ferruleEnd = new Vector3(1.08, 2.12, 0.11);
  const tip = new Vector3(1.38, 2.36, 0.14);

  const writeCylinderPoint = (
    base: number,
    start: Vector3,
    end: Vector3,
    radius: number,
    t: number,
    angle: number,
  ) => {
    const axis = new Vector3().subVectors(end, start).normalize();
    const sideA = new Vector3(-axis.y, axis.x, 0).normalize();
    if (sideA.lengthSq() === 0) sideA.set(1, 0, 0);
    const sideB = new Vector3().crossVectors(axis, sideA).normalize();
    const radial = sideA
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(sideB, Math.sin(angle));
    const point = start
      .clone()
      .lerp(end, t)
      .addScaledVector(radial, radius);

    positions[base] = point.x;
    positions[base + 1] = point.y;
    positions[base + 2] = point.z;
    normals[base] = radial.x;
    normals[base + 1] = radial.y;
    normals[base + 2] = radial.z;
  };

  for (let i = 0; i < particleCount; i++) {
    const r1 = seededFract(Math.sin((i + 6) * 12.9898) * 43758.5453);
    const r2 = seededFract(Math.sin((i + 10) * 78.233) * 43758.5453);
    const r3 = seededFract(Math.sin((i + 15) * 39.425) * 43758.5453);
    const base = i * 3;
    const angle = r2 * Math.PI * 2;

    if (r3 < 0.68) {
      writeCylinderPoint(base, handleStart, handleEnd, 0.085, r1, angle);
      continue;
    }

    if (r3 < 0.84) {
      writeCylinderPoint(base, handleEnd, ferruleEnd, 0.18, r1, angle);
      continue;
    }

    const t = r1;
    const axis = new Vector3().subVectors(tip, ferruleEnd).normalize();
    const sideA = new Vector3(-axis.y, axis.x, 0).normalize();
    if (sideA.lengthSq() === 0) sideA.set(1, 0, 0);
    const sideB = new Vector3().crossVectors(axis, sideA).normalize();
    const radius = (1 - t) * 0.22 + 0.025;
    const radial = sideA
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(sideB, Math.sin(angle));
    const point = ferruleEnd
      .clone()
      .lerp(tip, t)
      .addScaledVector(radial, radius * Math.sqrt(r2));

    positions[base] = point.x;
    positions[base + 1] = point.y;
    positions[base + 2] = point.z;
    normals[base] = radial.x;
    normals[base + 1] = radial.y;
    normals[base + 2] = radial.z;
  }

  return { positions, normals };
}

export function seededFract(value: number) {
  return value - Math.floor(value);
}
