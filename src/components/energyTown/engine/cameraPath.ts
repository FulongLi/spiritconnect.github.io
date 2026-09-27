import * as THREE from "three";
import { mainDomeToWorld } from "../scene/habitatSite";

/* Camera flight path: positions and look-at targets, sampled by progress */
// Closely-spaced waypoints inside the energy district make the camera
// linger there; the flight ends by flying through the main Dome's
// airlock — the workspace interior is the same building's inside.
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
// The arrival (19-23) swings down from the overhead view to a low,
// frontal approach and flies through the main Dome's airlock: the
// workspace scene takes over inside the vestibule, on the same axis.
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
  // 19-23: the arrival, authored in main-Dome space (see APPROACH)
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
];

/**
 * The arrival in main-Dome-local metres (x lateral, y above the Dome
 * floor, z out along the entrance axis): pull out and down on a gentle
 * arc from the left, square up to the entrance, then one steady push
 * through the pressure door into the vestibule.
 */
const APPROACH: { pos: [number, number, number]; tgt: [number, number, number] }[] = [
  { pos: [-3, 18, 30], tgt: [0, 3, 2] }, // 19 the Dome below, the airlock side turning towards us
  { pos: [-5, 7.5, 38], tgt: [0, 3.2, 12] }, // 20 low over the entrance court, the whole Dome ahead
  { pos: [-2.2, 3.4, 29], tgt: [0, 2.2, 14] }, // 21 the airlock becomes the subject
  { pos: [0, 1.85, 20.6], tgt: [0, 1.7, 12] }, // 22 at the pressure door
  { pos: [0, 1.75, 15.9], tgt: [0, 1.6, 8] }, // 23 inside the vestibule: the workspace takes over
];

for (const a of APPROACH) {
  CAM_POSITIONS.push(mainDomeToWorld(...a.pos).toArray() as [number, number, number]);
  CAM_TARGETS.push(mainDomeToWorld(...a.tgt).toArray() as [number, number, number]);
}

/**
 * Story progress at each waypoint. 0-18 keep the original even spacing
 * (0.042 per waypoint); the arrival is paced on its own and decelerates
 * into the vestibule.
 */
export const FLIGHT_KNOTS: number[] = [
  ...Array.from({ length: 19 }, (_, i) => +(0.042 * i).toFixed(3)),
  0.79,
  0.818,
  0.843,
  0.866,
  0.89,
];

/** the camera flight ends here (inside the airlock) */
export const FLIGHT_END = FLIGHT_KNOTS[FLIGHT_KNOTS.length - 1];

/**
 * Story progress → curve parameter (waypoint index), monotone cubic
 * (Fritsch–Carlson) through the knots: no speed jumps at the knots.
 */
function createKnotMap(knots: number[]) {
  const n = knots.length;
  const slopes = knots.slice(0, -1).map((k, i) => 1 / (knots[i + 1] - k));
  const m = knots.map((_, i) => (i === 0 ? slopes[0] : i === n - 1 ? slopes[n - 2] : 0));
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1];
    const b = slopes[i];
    m[i] = (2 * a * b) / (a + b); // harmonic mean: monotone
  }
  return (p: number) => {
    if (p <= knots[0]) return 0;
    if (p >= knots[n - 1]) return n - 1;
    let i = 0;
    while (p > knots[i + 1]) i++;
    const h = knots[i + 1] - knots[i];
    const t = (p - knots[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * i +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * (i + 1) +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

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
  const toWaypoint = createKnotMap(FLIGHT_KNOTS);
  const last = CAM_POSITIONS.length - 1;
  return {
    /** story progress → camera position + look-at target */
    sample(progress: number, position: THREE.Vector3, target: THREE.Vector3) {
      const t = Math.min(1, toWaypoint(progress) / last);
      posCurve.getPoint(t, position);
      tgtCurve.getPoint(t, target);
    },
  };
}
