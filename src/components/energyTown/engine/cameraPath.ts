import * as THREE from "three";

/* Camera flight path: positions and look-at targets, sampled by progress */
// Closely-spaced waypoints inside the energy district make the camera
// linger there; the flight ends by diving INTO the main dome — the
// Presence interior then reads as the dome's inside.
// Narrative order follows the energy flow:
// inputs (PV + reactor) → storage (BESS) → processing (SST, with the
// landing pad / charging area beside it) → loads (data centre, habitat)
// → rising over the whole grid for the AI-loop chapters → into the dome.
// Paired waypoints at every module make the camera linger there (slow,
// steady dwell) instead of sweeping past. Targets barely move during a
// dwell, which keeps the framing stable and avoids motion sickness.
// Simple, steady camera language: one continuous sweep with gentle turns
// and NO direction reversals. The west leg flies past the pads and then
// keeps moving forward (east) straight into the main dome.
// One continuous north-to-south arc down the input fan (PV -> reactor ->
// BESS), then a broad S-curve through SST, data centre, pads, and into
// the main dome. Waypoints stay a little farther back so each subject
// reads as a complete installation beside the chapter copy.
export const CAM_POSITIONS: [number, number, number][] = [
  [0, 150, 235], // 0 opening: dark space, the Moon filling the lower half
  [42, 62, 138], // 1 descending toward the input fan
  [78, 26, 112], // 2 arriving over the PV rows
  [91, 24, 96], // 3 PV dwell, pulled back enough to see the whole field
  [103, 19, 68], // 4 leaving PV in the same southbound sweep
  [108, 14, 24], // 5 down the fan to the reactor
  [104, 12, 10], // 6 reactor dwell
  [99, 12, -12], // 7 continuing down to the battery banks
  [87, 10, -29], // 8 BESS dwell
  [68, 11, -22], // 9 broad turn toward the SST hub
  [56, 10, -11], // 10 SST dwell
  [38, 10, -32], // 11 on toward the data centre
  [19, 8, -51], // 12 DC dwell
  [-20, 13, -56], // 13 gliding west, pads coming into view
  [-108, 34, -96], // 14 pad / charging dwell, high enough to read both branch layouts
  [-58, 16, -32], // 15 leaving the pad branch, beginning the climb
  [-22, 34, -18], // 16 rising above the habitat ring — the whole grid, AI loop engaging
  [0, 58, 3], // 17 top-down dome view
  [0, 34, 3], // 18 descending from the overhead view
  [-5, 8, 6], // 19 crossing the hull, softened by the mist transition
  [0, 4.8, 2], // 20 inside the dome
];

export const CAM_TARGETS: [number, number, number][] = [
  [0, 38, -20], // the Moon takes at least half the frame
  [70, 4, 42],
  [76, 3, 40],
  [76, 2.5, 38], // PV
  [82, 2.8, 22],
  [90, 4, 0],
  [90, 4, 0], // reactor
  [78, 2.7, -25],
  [74, 2.3, -32], // BESS
  [50, 3.8, -4],
  [44, 3.5, 0], // SST hub
  [22, 2.7, -36],
  [16, 2.2, -42], // data centre
  [-48, 2.7, -32],
  [-66, 2.4, 6], // pads / chargers / vehicles
  [-20, 4.5, -6], // dome ahead, same forward direction
  [0, 6, 0],
  [0, 1.2, 0], // straight down at the crown of the central dome
  [0, 3.5, 0],
  [0, 4, 0],
  [0, 4.5, -2],
];

export function createCameraPath() {
  const posCurve = new THREE.CatmullRomCurve3(
    CAM_POSITIONS.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal"
  );
  const tgtCurve = new THREE.CatmullRomCurve3(
    CAM_TARGETS.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal"
  );
  return {
    /** t: 0..1 along the flight */
    sample(t: number, position: THREE.Vector3, target: THREE.Vector3) {
      posCurve.getPoint(t, position);
      tgtCurve.getPoint(t, target);
    },
  };
}
