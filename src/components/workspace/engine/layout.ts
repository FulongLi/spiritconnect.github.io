import { Vector3 } from "three";

/* ------------------------------------------------------------------ */
/* Workspace layout, in metres. The desk sits on the central axis       */
/* (x = 0), its top at DESK.height. The camera is the visitor, seated   */
/* in front of the desk — there is no chair.                            */
/*                                                                      */
/*   landscape  monitors side by side, device front-left, keyboard      */
/*              centred, mouse right                                    */
/*   portrait   monitors stacked on one arm, device in front, no        */
/*              keyboard / mouse (the concept, not a shrunken desktop)  */
/* ------------------------------------------------------------------ */

export type LayoutMode = "landscape" | "portrait";

export const PORTRAIT_MAX_ASPECT = 0.82;

export function layoutModeFor(aspect: number): LayoutMode {
  return aspect < PORTRAIT_MAX_ASPECT ? "portrait" : "landscape";
}

export const DESK = {
  height: 0.74,
  thickness: 0.032,
  /** centre of curvature, behind the visitor: the desk gently wraps around them */
  curveCenterZ: 2.6,
  /** front edge crosses the axis here */
  frontZ: 0.16,
  depth: 0.8,
  /** half the angular span of the desk (radians) */
  halfAngle: 0.5,
} as const;

/** 16:10 panels, identical for both monitors */
export const MONITOR = {
  screenWidth: 0.6,
  screenHeight: 0.375,
  bezel: 0.0065,
  depth: 0.012,
  /** screen-space canvas resolution (width; height follows 16:10) */
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
  /** the visitor "sits down": the camera eases in from this offset on arrival */
  arrivalOffset: Vector3;
  presenceMonitor: MonitorPlacement;
  aipeMonitor: MonitorPlacement;
  stand: "pair" | "stacked";
  device: { position: Vector3; scale: number; yaw: number };
  keyboard: { position: Vector3 } | null;
  mouse: { position: Vector3; yaw: number } | null;
};

const SCREEN_Y = DESK.height + 0.2 + MONITOR.screenHeight / 2;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Camera distance so that a half-width `halfWidth` at depth `z` fills the
 * frame horizontally (with the given vertical FOV and aspect).
 */
function fitDistance(halfWidth: number, z: number, fov: number, aspect: number) {
  const halfH = Math.atan(Math.tan(toRad(fov) / 2) * aspect);
  return z + halfWidth / Math.tan(halfH);
}

function landscape(aspect: number): WorkspaceLayout {
  const gap = 0.018;
  const toeIn = 0.16;
  const z = -0.44;
  const half = MONITOR.screenWidth / 2 + MONITOR.bezel;
  // inner edges meet on the axis; outer edges swing towards the visitor
  const cx = gap / 2 + half * Math.cos(toeIn);
  const cz = z + half * Math.sin(toeIn);
  // frame the device (left) to the mouse / right monitor edge; narrower
  // windows widen the lens a little, then step back
  const fov = aspect >= 1.6 ? 42 : 42 + (1.6 - Math.max(aspect, PORTRAIT_MAX_ASPECT)) * 11;
  const camZ = Math.max(1.0, fitDistance(0.98, -0.1, fov, aspect));
  return {
    mode: "landscape",
    camera: {
      position: new Vector3(0, 1.24 + (camZ - 1.2) * 0.12, camZ),
      target: new Vector3(0, SCREEN_Y - 0.07, -0.5),
      fov,
    },
    arrivalOffset: new Vector3(0, 0.07, 0.42),
    presenceMonitor: { position: new Vector3(-cx, SCREEN_Y, cz), yaw: toeIn },
    aipeMonitor: { position: new Vector3(cx, SCREEN_Y, cz), yaw: -toeIn },
    stand: "pair",
    device: { position: new Vector3(-0.8, DESK.height, -0.1), scale: 1, yaw: 0.34 },
    keyboard: { position: new Vector3(0, DESK.height, -0.04) },
    mouse: { position: new Vector3(0.34, DESK.height, -0.02), yaw: -0.08 },
  };
}

function portrait(aspect: number): WorkspaceLayout {
  const z = -0.36;
  const fov = 64;
  // phones fit the panel width; wider portrait windows (tablets) are
  // shorter relative to their width, so step back to keep the stack clear
  // of the header
  const camZ = Math.max(fitDistance(0.36, z, fov, aspect), 0.9 + Math.max(0, aspect - 0.46) * 1.1);
  const lowerY = DESK.height + 0.3 + MONITOR.screenHeight / 2;
  const upperY = lowerY + MONITOR.screenHeight + MONITOR.bezel * 2 + 0.02;
  return {
    mode: "portrait",
    camera: {
      position: new Vector3(0, 1.3, camZ),
      // monitors in the upper two thirds, device + desk edge below
      target: new Vector3(0, (lowerY + upperY) / 2 - 0.3, -0.4),
      fov,
    },
    arrivalOffset: new Vector3(0, 0.08, 0.5),
    presenceMonitor: { position: new Vector3(0, upperY, z), yaw: 0 },
    aipeMonitor: { position: new Vector3(0, lowerY, z), yaw: 0 },
    stand: "stacked",
    device: { position: new Vector3(-0.17, DESK.height, -0.16), scale: 0.85, yaw: 0.2 },
    keyboard: null,
    mouse: null,
  };
}

export function createLayout(aspect: number): WorkspaceLayout {
  return layoutModeFor(aspect) === "portrait" ? portrait(aspect) : landscape(aspect);
}
