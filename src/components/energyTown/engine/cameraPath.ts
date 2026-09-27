import * as THREE from "three";
import { mainDomeToWorld } from "../scene/habitatSite";

/* ------------------------------------------------------------------ */
/* Camera flight: one continuous shot, sampled by story progress.      */
/*                                                                     */
/* The camera is motivated by the system itself — it travels the way   */
/* energy travels, then rises until the whole system is legible:       */
/*                                                                     */
/*  ACT I   ENERGY       down the input fan: PV → reactor → storage    */
/*  ACT II  ENGINEERING  behind the battery bank, along the conduit    */
/*                       where power converges on the SST, then along  */
/*                       the distribution route to the data centre     */
/*  ACT III INTELLIGENCE the data centre is the turning point: the     */
/*                       camera starts to gain altitude and carries    */
/*                       the energy west to the landers and chargers   */
/*  ACT IV  SYSTEM       it pulls up and back until every installation */
/*                       reads as one network, holds while the loop    */
/*                       closes, then descends along the main Dome's   */
/*                       entrance axis into the airlock — the          */
/*                       workspace scene takes over in the vestibule.  */
/*                                                                     */
/* Targets barely move during a dwell, which keeps framing stable and  */
/* avoids motion sickness; the only change of direction is the slow    */
/* hold at the top of the system view.                                 */
/* ------------------------------------------------------------------ */

type Waypoint = {
  /** story progress at which the camera passes this waypoint */
  at: number;
  pos: [number, number, number];
  tgt: [number, number, number];
};

const FLIGHT: Waypoint[] = [
  // hero: dark space, the Moon filling the lower half
  { at: 0, pos: [0, 150, 235], tgt: [0, 38, -20] },
  /* ---- ACT I — ENERGY ---- */
  { at: 0.045, pos: [42, 62, 138], tgt: [70, 4, 42] }, // descending toward the input fan
  { at: 0.085, pos: [80, 27, 112], tgt: [76, 3, 40] }, // arriving over the PV rows
  { at: 0.125, pos: [93, 23, 94], tgt: [77, 2.5, 37] }, // 01 solar: the whole field
  { at: 0.165, pos: [104, 19, 64], tgt: [86, 3, 18] }, // south along the fan, the reactor ahead
  { at: 0.2, pos: [108, 14, 24], tgt: [92.5, 4, -2] }, // 02 nuclear (reactor left of the copy)
  { at: 0.228, pos: [104, 12, 8], tgt: [92.5, 4, -4] },
  { at: 0.26, pos: [99, 12, -12], tgt: [78, 2.7, -25] }, // on down to the battery banks
  { at: 0.3, pos: [88, 10, -30], tgt: [73, 2.3, -31] }, // 03 storage
  /* ---- ACT II — ENGINEERING ---- */
  { at: 0.335, pos: [82, 9, -41], tgt: [58, 3, -14] }, // behind the bank: the conduit leads to the SST
  { at: 0.37, pos: [67, 8, -25], tgt: [46, 3.2, -2] }, // following the converging power
  { at: 0.405, pos: [58, 10, -13], tgt: [41.6, 3.5, -2.6] }, // 04 power electronics (SST left of the copy)
  { at: 0.435, pos: [54, 10.5, -18], tgt: [39.6, 3.2, -6.6] },
  { at: 0.47, pos: [42, 9, -17], tgt: [24, 2.5, -36] }, // along the distribution route
  /* ---- ACT III — INTELLIGENCE + PHYSICAL ACTION ---- */
  { at: 0.5, pos: [38, 11, -25], tgt: [16, -1, -43] }, // 05 data centre: the lines converge on it
  { at: 0.53, pos: [32, 6.5, -62], tgt: [21, 0, -41] }, // the turning point: looking back at the base it serves
  { at: 0.565, pos: [8, 15, -66], tgt: [-22, -2.5, -38] }, // gaining altitude, turning west
  // the ground falls away to the west (pads ≈ -7 m, charger rows ≈ -11 m)
  { at: 0.6, pos: [-44, 9, -60], tgt: [-86, -7, -24] }, // past the rover toward the pads
  { at: 0.63, pos: [-78, 9.5, -44], tgt: [-99.5, -11, -4.5] }, // 06 mobility: lander, chargers, rovers
  { at: 0.655, pos: [-81, 10, -40], tgt: [-98.5, -11, -1] },
  /* ---- ACT IV — SYSTEM / FEEDBACK ---- */
  { at: 0.7, pos: [-98, 46, -74], tgt: [-44, 2, -10] }, // pulling up and back: the system assembles
  { at: 0.745, pos: [-128, 88, -104], tgt: [6, 0, 8] }, // 07 the whole system, on the Dome's axis
  // the Dome approach (authored in main-Dome space, see APPROACH)
];

/**
 * The approach in main-Dome-local metres (x lateral, y above the Dome
 * floor, z out along the entrance axis): the loop closes over the whole
 * system, then one long descent down the entrance axis squares up to the
 * airlock and pushes through the pressure door into the vestibule.
 */
const APPROACH: Waypoint[] = [
  { at: 0.785, pos: [0, 64, 132], tgt: [0, 2, 0] }, // the loop closes: attention turns to the Dome
  { at: 0.812, pos: [-4, 24, 66], tgt: [0, 3, 4] }, // descending along the entrance axis
  { at: 0.832, pos: [-4, 9, 41], tgt: [0, 3.2, 12] }, // low over the entrance court
  { at: 0.85, pos: [-2.2, 3.4, 29], tgt: [0, 2.2, 14] }, // the airlock becomes the subject
  { at: 0.869, pos: [0, 1.85, 20.6], tgt: [0, 1.7, 12] }, // at the pressure door
  { at: 0.89, pos: [0, 1.75, 15.9], tgt: [0, 1.6, 8] }, // inside the vestibule: the workspace takes over
];

for (const a of APPROACH) {
  FLIGHT.push({
    at: a.at,
    pos: mainDomeToWorld(...a.pos).toArray() as [number, number, number],
    tgt: mainDomeToWorld(...a.tgt).toArray() as [number, number, number],
  });
}

export const CAM_POSITIONS = FLIGHT.map((w) => w.pos);
export const CAM_TARGETS = FLIGHT.map((w) => w.tgt);
/** story progress at each waypoint */
export const FLIGHT_KNOTS = FLIGHT.map((w) => w.at);

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
