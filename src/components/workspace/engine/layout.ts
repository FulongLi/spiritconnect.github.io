import { Vector3 } from "three";
import { MAIN_DOME } from "@/components/shared/domeArchitecture";

/* ------------------------------------------------------------------ */
/* Workspace layout, in metres, in the Dome's own frame: floor centre  */
/* at the origin, the airlock on +z (see shared/domeArchitecture).      */
/*                                                                     */
/* The workstation is a RING at the centre of the Dome. The visitor has */
/* walked in through the gap in the ring and stands inside it, looking  */
/* at one section: the working surface sweeps across the whole frame   */
/* and on out of it on both sides. Two levels, one geometry:           */
/*   lower level   keyboard, mouse, a clear work surface               */
/*   raised level  Presence device, Presence + AIPE displays           */
/*                                                                     */
/*   landscape  displays side by side, device to their left            */
/*   portrait   displays stacked on one arm, device in front, no       */
/*              keyboard / mouse (the concept, not a shrunken desktop) */
/* ------------------------------------------------------------------ */

export type LayoutMode = "landscape" | "portrait";

export const PORTRAIT_MAX_ASPECT = 0.82;

export function layoutModeFor(aspect: number): LayoutMode {
  return aspect < PORTRAIT_MAX_ASPECT ? "portrait" : "landscape";
}

/** the ring workstation (radii from the Dome centre) */
export const RING = {
  /** the working edge, facing the visitor */
  inner: 2.75,
  /** the lower level runs to the step up */
  step: 3.4,
  /** the outer skin */
  outer: 3.98,
  /** lower level: top + slab thickness */
  height: 0.74,
  thickness: 0.035,
  /** the recessed plinth under the lower level (knee space in front of it) */
  plinth: 3.12,
  /** raised level: top + slab thickness */
  riserTop: 0.9,
  riserThickness: 0.028,
  /** half-angle of the access gap towards the airlock (+z) */
  gapHalf: 0.33,
} as const;

/**
 * A point on the ring: `radius` from the Dome centre, `angle` from the
 * visitor's axis (0 = straight ahead, −z; positive towards +x).
 */
export function ringPoint(radius: number, angle: number, y: number, target = new Vector3()) {
  return target.set(Math.sin(angle) * radius, y, -Math.cos(angle) * radius);
}

/**
 * Studio-display proportions (16:9, thin aluminium body, black glass
 * front with a slim even border) at workspace scale. Identical for both.
 */
export const MONITOR = {
  bodyWidth: 1.3,
  bodyHeight: 0.746,
  depth: 0.027,
  screenWidth: 1.266,
  screenHeight: 0.712,
  /** display bottom edge above the surface it stands on */
  standClearance: 0.12,
  /** canvas resolution (width; height follows the panel's aspect) */
  canvasWidth: 1600,
  canvasWidthCompact: 1152,
} as const;

/** the displays' front faces sit on this radius, mid-riser */
const MONITOR_RADIUS = 3.66;

export type MonitorPlacement = {
  position: Vector3;
  /** rotation about Y (faces the ring centre) */
  yaw: number;
};

export type CameraPose = { position: Vector3; target: Vector3; fov: number };

export type WorkspaceLayout = {
  mode: LayoutMode;
  /** the observation point: where the arrival settles */
  camera: CameraPose;
  presenceMonitor: MonitorPlacement;
  aipeMonitor: MonitorPlacement;
  stand: "pair" | "stacked";
  device: { position: Vector3; scale: number; yaw: number };
  keyboard: { position: Vector3; yaw: number } | null;
  mouse: { position: Vector3; yaw: number } | null;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Camera z so that a half-width `halfWidth` at depth `z` fills the frame
 * horizontally (with the given vertical FOV and aspect).
 */
function fitDistance(halfWidth: number, z: number, fov: number, aspect: number) {
  const halfH = Math.atan(Math.tan(toRad(fov) / 2) * aspect);
  return z + halfWidth / Math.tan(halfH);
}

/** yaw that turns an object at (x, z) to face a point on the axis at `towardZ` */
function faceAxis(x: number, z: number, towardZ: number) {
  return Math.atan2(-x, towardZ - z);
}

const MONITOR_Y = RING.riserTop + MONITOR.standClearance + MONITOR.bodyHeight / 2;

function landscape(aspect: number): WorkspaceLayout {
  const gap = 0.04;
  const a = (MONITOR.bodyWidth / 2 + gap / 2) / MONITOR_RADIUS;

  // stand inside the ring, far enough back to take in the displays, the
  // device beside them and the arc running out of frame; narrower windows
  // widen the lens a little, then step back
  const fov = aspect >= 1.6 ? 40 : 40 + (1.6 - Math.max(aspect, PORTRAIT_MAX_ASPECT)) * 10;
  const camZ = Math.max(0.25, fitDistance(2.05, -MONITOR_RADIUS, fov, aspect));
  const camera = {
    position: new Vector3(0, 2.0 + (camZ - 0.25) * 0.12, camZ),
    // the working edge just above the bottom of the frame, the Dome above
    target: new Vector3(0, 1.5, -3.4),
    fov,
  };

  const device = ringPoint(MONITOR_RADIUS - 0.02, -(a * 2 + 0.09), RING.riserTop);
  const keyboard = ringPoint(3.02, 0, RING.height);
  const mouse = ringPoint(3.04, 0.108, RING.height);
  return {
    mode: "landscape",
    camera,
    presenceMonitor: { position: ringPoint(MONITOR_RADIUS, -a, MONITOR_Y), yaw: a },
    aipeMonitor: { position: ringPoint(MONITOR_RADIUS, a, MONITOR_Y), yaw: -a },
    stand: "pair",
    device: { position: device, scale: 1.85, yaw: faceAxis(device.x, device.z, camZ) },
    keyboard: { position: keyboard, yaw: 0 },
    mouse: { position: mouse, yaw: faceAxis(mouse.x, mouse.z, camZ) * 0.7 },
  };
}

function portrait(aspect: number): WorkspaceLayout {
  const lowerY = RING.riserTop + 0.1 + MONITOR.bodyHeight / 2;
  const upperY = lowerY + MONITOR.bodyHeight + 0.025;
  const fov = 62;
  // phones fit the panel width; wider portrait windows (tablets) are
  // shorter relative to their width, so step back to keep the stack clear
  // of the header
  const camZ = Math.max(
    fitDistance(0.92, -MONITOR_RADIUS, fov, aspect),
    -MONITOR_RADIUS + 2.3 + Math.max(0, aspect - 0.46) * 1.6,
  );
  const device = ringPoint(3.08, -0.115, RING.height);
  return {
    mode: "portrait",
    camera: {
      position: new Vector3(0, 1.72, camZ),
      // displays in the upper two thirds, device + working edge below
      target: new Vector3(0, (lowerY + upperY) / 2 - 0.34, -MONITOR_RADIUS),
      fov,
    },
    presenceMonitor: { position: new Vector3(0, upperY, -MONITOR_RADIUS), yaw: 0 },
    aipeMonitor: { position: new Vector3(0, lowerY, -MONITOR_RADIUS), yaw: 0 },
    stand: "stacked",
    device: { position: device, scale: 1.25, yaw: faceAxis(device.x, device.z, camZ) },
    keyboard: null,
    mouse: null,
  };
}

export function createLayout(aspect: number): WorkspaceLayout {
  return layoutModeFor(aspect) === "portrait" ? portrait(aspect) : landscape(aspect);
}

/**
 * The arrival: from inside the airlock vestibule (where the lunar flight
 * hands over, on the same axis and at the same eye height) through the
 * Dome, over the gap in the ring, to the observation point. The lens
 * starts at the lunar camera's 60° and settles to the layout's.
 */
export function arrivalPath(layout: WorkspaceLayout) {
  const e = MAIN_DOME.entrance!;
  const end = layout.camera;
  return {
    fovStart: 60,
    positions: [
      new Vector3(0, 1.78, e.z1 - 0.2),
      new Vector3(0, 1.8, e.z0 + 0.6),
      new Vector3(0, 1.92, 7.2),
      new Vector3(end.position.x, end.position.y - 0.02, end.position.z + 3.2),
      end.position.clone(),
    ],
    targets: [
      new Vector3(0, 1.62, 8.5),
      new Vector3(0, 1.45, 2.5),
      new Vector3(0, 1.22, -2.6),
      end.target.clone(),
    ],
  };
}
