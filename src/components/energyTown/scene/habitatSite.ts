import * as THREE from "three";
import { terrainHeight } from "./terrain";

/* ------------------------------------------------------------------ */
/* Where the habitat sits: the main Dome at the origin, six satellite  */
/* domes on a hexagon around it. The main Dome's entrance faces the     */
/* gap between hexagon nodes 3 and 4 — the side the camera arrives     */
/* from — so the approach, the airlock and the interior share one axis. */
/* ------------------------------------------------------------------ */

export const HEX = { radius: 26, offset: 0.18 } as const;

export function hexNodes() {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 + HEX.offset;
    return { x: Math.cos(angle) * HEX.radius, z: Math.sin(angle) * HEX.radius, angle };
  });
}

/** world direction (xz angle: cos, sin) of the main Dome's entrance axis */
export const ENTRANCE_ANGLE = HEX.offset + 3.5 * (Math.PI / 3);

/** the Dome floor stands this far above the terrain at its centre */
const FLOOR_LIFT = 0.3;

export function mainDomeFloorY() {
  return terrainHeight(0, 0) + FLOOR_LIFT;
}

export function domeFloorY(x: number, z: number) {
  return terrainHeight(x, z) + FLOOR_LIFT;
}

/** Object3D yaw that turns dome-local +z towards the world direction `angle` */
export function yawFacing(angle: number) {
  return Math.atan2(Math.cos(angle), Math.sin(angle));
}

const MAIN_YAW = yawFacing(ENTRANCE_ANGLE);

/** main-Dome-local metres (floor centre at the origin, entrance on +z) → world */
export function mainDomeToWorld(x: number, y: number, z: number, out = new THREE.Vector3()) {
  const c = Math.cos(MAIN_YAW);
  const s = Math.sin(MAIN_YAW);
  return out.set(x * c + z * s, mainDomeFloorY() + y, -x * s + z * c);
}

export function mainDomeTransform() {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(0, mainDomeFloorY(), 0),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), MAIN_YAW),
    new THREE.Vector3(1, 1, 1),
  );
}
