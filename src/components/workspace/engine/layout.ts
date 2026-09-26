import { Vector3 } from "three";

/* ------------------------------------------------------------------ */
/* Workspace layout, in metres. The workstation sits on the central     */
/* axis (x = 0) near the middle of the Dome. The camera is the visitor,  */
/* standing a short distance in front of the desk — there is no chair.   */
/*                                                                      */
/* The desk has two levels: the main working surface (keyboard, mouse)  */
/* and a raised rear riser following the same curve (Presence device,   */
/* both monitors).                                                      */
/*                                                                      */
/*   landscape  monitors side by side, device on the riser's left,      */
/*              keyboard centred, mouse right                           */
/*   portrait   monitors stacked on one arm, device in front, no        */
/*              keyboard / mouse (the concept, not a shrunken desktop)  */
/* ------------------------------------------------------------------ */

export type LayoutMode = "landscape" | "portrait";

export const PORTRAIT_MAX_ASPECT = 0.82;

export function layoutModeFor(aspect: number): LayoutMode {
  return aspect < PORTRAIT_MAX_ASPECT ? "portrait" : "landscape";
}

export const DESK = {
  /** main working surface */
  height: 0.74,
  thickness: 0.03,
  /** centre of curvature, behind the visitor: a gentle, wide arc */
  curveCenterZ: 3.0,
  /** front edge crosses the axis here */
  frontZ: 0.2,
  depth: 0.74,
  /** half the angular span of the desk (radians) */
  halfAngle: 0.32,
  riser: {
    /** the riser starts this far behind the front edge */
    inset: 0.38,
    /** gap left at the back edge */
    backInset: 0.02,
    /** top of the riser above the main surface */
    lift: 0.12,
    thickness: 0.022,
  },
} as const;

export const FRONT_RADIUS = DESK.curveCenterZ - DESK.frontZ;
export const BACK_RADIUS = FRONT_RADIUS + DESK.depth;
export const RISER_FRONT_RADIUS = FRONT_RADIUS + DESK.riser.inset;
export const RISER_BACK_RADIUS = BACK_RADIUS - DESK.riser.backInset;
export const RISER_TOP = DESK.height + DESK.riser.lift;

/** a point on the desk arc: `radius` from the centre of curvature, `angle` from the axis */
export function deskPoint(radius: number, angle: number, y: number, target = new Vector3()) {
  return target.set(Math.sin(angle) * radius, y, DESK.curveCenterZ - Math.cos(angle) * radius);
}

/**
 * Studio-display proportions (16:9, thin aluminium body, black glass
 * front with a slim even border). Identical for both monitors.
 */
export const MONITOR = {
  bodyWidth: 0.623,
  bodyHeight: 0.362,
  depth: 0.02,
  screenWidth: 0.597,
  screenHeight: 0.336,
  /** display bottom edge above the surface it stands on */
  standClearance: 0.105,
  /** canvas resolution (width; height follows the panel's aspect) */
  canvasWidth: 1600,
  canvasWidthCompact: 1152,
} as const;

export type MonitorPlacement = {
  position: Vector3;
  /** rotation about Y (toe-in towards the visitor) */
  yaw: number;
};

export type WorkspaceLayout = {
  mode: LayoutMode;
  camera: { position: Vector3; target: Vector3; fov: number };
  /** the visitor arrives: the camera eases in from this offset */
  arrivalOffset: Vector3;
  presenceMonitor: MonitorPlacement;
  aipeMonitor: MonitorPlacement;
  stand: "pair" | "stacked";
  device: { position: Vector3; scale: number; yaw: number };
  keyboard: { position: Vector3 } | null;
  mouse: { position: Vector3; yaw: number } | null;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Camera distance so that a half-width `halfWidth` at depth `z` fills the
 * frame horizontally (with the given vertical FOV and aspect).
 */
function fitDistance(halfWidth: number, z: number, fov: number, aspect: number) {
  const halfH = Math.atan(Math.tan(toRad(fov) / 2) * aspect);
  return z + halfWidth / Math.tan(halfH);
}

/** yaw that turns an object at (x, z) to face a point on the axis at `towardZ` */
function faceAxis(x: number, z: number, towardZ: number) {
  return Math.atan2(-x, towardZ - z);
}

const MONITOR_Y = RISER_TOP + MONITOR.standClearance + MONITOR.bodyHeight / 2;
const RISER_MID = (RISER_FRONT_RADIUS + RISER_BACK_RADIUS) / 2;

function landscape(aspect: number): WorkspaceLayout {
  const gap = 0.022;
  const toeIn = 0.1;
  const z = DESK.curveCenterZ - RISER_MID - 0.03;
  const half = MONITOR.bodyWidth / 2;
  // inner edges meet on the axis; outer edges swing towards the visitor
  const cx = gap / 2 + half * Math.cos(toeIn);
  const cz = z + half * Math.sin(toeIn);

  // stand back far enough to take in the whole desk arc; narrower
  // windows widen the lens a little, then step back
  const fov = aspect >= 1.6 ? 38 : 38 + (1.6 - Math.max(aspect, PORTRAIT_MAX_ASPECT)) * 9;
  const camZ = Math.max(2.3, fitDistance(1.2, -0.2, fov, aspect));
  const camera = {
    position: new Vector3(0, 1.52 + (camZ - 2.3) * 0.15, camZ),
    // aimed a little above the riser: the Dome and its windows enter the frame
    target: new Vector3(0, 1.14, -0.35),
    fov,
  };

  // the device stands on the left of the riser, turned towards the visitor
  const device = deskPoint(RISER_MID - 0.03, -0.258, RISER_TOP);
  const mouse = deskPoint(FRONT_RADIUS + 0.19, 0.105, DESK.height);
  return {
    mode: "landscape",
    camera,
    arrivalOffset: new Vector3(0, 0.12, 0.6),
    presenceMonitor: { position: new Vector3(-cx, MONITOR_Y, cz), yaw: toeIn },
    aipeMonitor: { position: new Vector3(cx, MONITOR_Y, cz), yaw: -toeIn },
    stand: "pair",
    device: { position: device, scale: 1.5, yaw: faceAxis(device.x, device.z, camZ) },
    keyboard: { position: deskPoint(FRONT_RADIUS + 0.19, 0, DESK.height) },
    mouse: { position: mouse, yaw: faceAxis(mouse.x, mouse.z, camZ) * 0.6 },
  };
}

function portrait(aspect: number): WorkspaceLayout {
  const z = DESK.curveCenterZ - RISER_MID;
  const lowerY = RISER_TOP + 0.12 + MONITOR.bodyHeight / 2;
  const upperY = lowerY + MONITOR.bodyHeight + 0.02;
  const fov = 64;
  // phones fit the panel width; wider portrait windows (tablets) are
  // shorter relative to their width, so step back to keep the stack clear
  // of the header
  const camZ = Math.max(fitDistance(0.4, z, fov, aspect), 1.2 + Math.max(0, aspect - 0.46) * 1.1);
  const device = new Vector3(-0.22, DESK.height, -0.1);
  return {
    mode: "portrait",
    camera: {
      position: new Vector3(0, 1.48, camZ),
      // monitors in the upper two thirds, device + desk edge below
      target: new Vector3(0, (lowerY + upperY) / 2 - 0.3, -0.4),
      fov,
    },
    arrivalOffset: new Vector3(0, 0.08, 0.5),
    presenceMonitor: { position: new Vector3(0, upperY, z), yaw: 0 },
    aipeMonitor: { position: new Vector3(0, lowerY, z), yaw: 0 },
    stand: "stacked",
    device: { position: device, scale: 0.95, yaw: faceAxis(device.x, device.z, camZ) },
    keyboard: null,
    mouse: null,
  };
}

export function createLayout(aspect: number): WorkspaceLayout {
  return layoutModeFor(aspect) === "portrait" ? portrait(aspect) : landscape(aspect);
}
