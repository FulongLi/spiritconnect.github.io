import {
  BackSide,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  FrontSide,
  Group,
  LatheGeometry,
  Mesh,
  PlaneGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Side,
} from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { abs, dot, float, normalView, positionViewDirection, pow, smoothstep, vec3 } from "three/tsl";
import type { WorkspaceMaterials } from "./materials";
import { roundedRectShape } from "./workspaceMonitor";

/* ------------------------------------------------------------------ */
/* The Presence device on the desk (see the hardware concept):          */
/*                                                                     */
/*   cap        graphite, softly domed                                 */
/*   chamber    clear glass cylinder — the particle entity lives here   */
/*   speaker    graphite body, perforated grille band                   */
/*   tray       integrated charging base with a thin warm light line    */
/*                                                                     */
/* Metres, at scale 1. `entityMount` receives the particle entity: its  */
/* model space (a 0.9-radius sphere centred at y = 1.05) is scaled to   */
/* sit in the middle of the chamber.                                    */
/* ------------------------------------------------------------------ */

const R = 0.056; // chamber radius
const SPEAKER_TOP = 0.098;
const CHAMBER_HEIGHT = 0.15;
const CAP_BOTTOM = SPEAKER_TOP + CHAMBER_HEIGHT;
const TRAY = { width: 0.16, depth: 0.2, lower: 0.009, line: 0.0022, upper: 0.007, bodyZ: -0.034 };
const TRAY_TOP = TRAY.lower + TRAY.line + TRAY.upper;

/** radius of the particle sphere inside the chamber */
export const ENTITY_RADIUS = 0.043;
const MODEL_RADIUS = 0.9;
const MODEL_CENTRE_Y = 1.05;

/** fresnel glass: clear in the middle, bright at grazing angles, one soft streak */
function createGlassMaterial(side: Side, strength: number) {
  const mat = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side });
  const facing = abs(dot(normalView, positionViewDirection));
  const rim = pow(float(1).sub(facing), 2.4);
  const streak = smoothstep(0.1, 0.0, abs(normalView.x.add(0.52))).mul(0.3);
  mat.colorNode = vec3(0.93, 0.94, 0.96);
  mat.opacityNode = rim.mul(0.5).add(streak).add(0.03).mul(strength);
  return mat;
}

export type PresenceDevice = ReturnType<typeof createPresenceDevice>;

export function createPresenceDevice(materials: WorkspaceMaterials, compact: boolean) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const add = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);
  const radial = compact ? 40 : 72;

  // ── Charging tray ─────────────────────────────────────────────────────────
  const plate = (inset: number, depth: number) => {
    const g = add(
      new ExtrudeGeometry(roundedRectShape(TRAY.width - inset, TRAY.depth - inset, 0.022 - inset / 2), {
        depth,
        bevelEnabled: false,
        curveSegments: compact ? 4 : 8,
      }),
    );
    g.rotateX(-Math.PI / 2);
    return g;
  };
  const lower = new Mesh(plate(0, TRAY.lower), materials.graphite);
  const line = new Mesh(plate(0.003, TRAY.line), materials.trayLight);
  line.position.y = TRAY.lower;
  const upper = new Mesh(plate(0.001, TRAY.upper), materials.graphite);
  upper.position.y = TRAY.lower + TRAY.line;
  group.add(lower, line, upper);

  const shadow = new Mesh(add(new PlaneGeometry(TRAY.width * 1.9, TRAY.depth * 1.6)), materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.0012;
  group.add(shadow);

  // ── Body (on the back of the tray) ────────────────────────────────────────
  const body = new Group();
  body.position.set(0, TRAY_TOP, TRAY.bodyZ);
  group.add(body);

  // speaker body: flared foot → straight wall
  const speakerProfile = [
    [0, 0],
    [R + 0.014, 0],
    [R + 0.012, 0.006],
    [R + 0.006, 0.018],
    [R + 0.002, 0.03],
    [R + 0.002, SPEAKER_TOP - 0.004],
    [R + 0.001, SPEAKER_TOP],
    [0, SPEAKER_TOP],
  ].map(([x, y]) => new Vector2(x, y));
  const speaker = new Mesh(add(new LatheGeometry(speakerProfile, radial)), materials.graphite);
  body.add(speaker);

  const grille = new Mesh(add(new CylinderGeometry(R + 0.0026, R + 0.0026, 0.05, radial, 1, true)), materials.grille);
  grille.position.y = 0.036 + 0.025;
  body.add(grille);

  // chamber floor: dark disc + silver seating ring
  const floor = new Mesh(add(new CircleGeometry(R - 0.002, radial)), materials.graphiteMatte);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = SPEAKER_TOP + 0.0008;
  body.add(floor);
  const seat = new Mesh(add(new TorusGeometry(R - 0.001, 0.0016, 6, radial)), materials.silver);
  seat.rotation.x = Math.PI / 2;
  seat.position.y = SPEAKER_TOP + 0.001;
  body.add(seat);

  // cap
  const capProfile = [
    [R + 0.002, 0],
    [R + 0.0025, 0.022],
    [R + 0.001, 0.03],
    [R - 0.006, 0.036],
    [R - 0.02, 0.0395],
    [0, 0.041],
  ].map(([x, y]) => new Vector2(x, y));
  const cap = new Mesh(add(new LatheGeometry(capProfile, radial)), materials.graphite);
  cap.position.y = CAP_BOTTOM;
  body.add(cap);
  const capSeam = new Mesh(add(new TorusGeometry(R + 0.0015, 0.0011, 6, radial)), materials.silver);
  capSeam.rotation.x = Math.PI / 2;
  capSeam.position.y = CAP_BOTTOM + 0.0005;
  body.add(capSeam);

  // ── Particle entity mount (centre of the chamber) ─────────────────────────
  const entityMount = new Group();
  const scale = ENTITY_RADIUS / MODEL_RADIUS;
  entityMount.scale.setScalar(scale);
  entityMount.position.y = SPEAKER_TOP + CHAMBER_HEIGHT / 2 + 0.004 - MODEL_CENTRE_Y * scale;
  body.add(entityMount);

  // ── Glass (after the particles: transparent, back face then front) ────────
  const glassGeo = add(new CylinderGeometry(R, R, CHAMBER_HEIGHT, radial, 1, true));
  const glassBack = new Mesh(glassGeo, createGlassMaterial(BackSide, 0.55));
  const glassFront = new Mesh(glassGeo, createGlassMaterial(FrontSide, 1));
  for (const glass of [glassBack, glassFront]) {
    glass.position.y = SPEAKER_TOP + CHAMBER_HEIGHT / 2;
    body.add(glass);
  }
  glassBack.renderOrder = 1;
  glassFront.renderOrder = 2;
  const glassMats = [glassBack.material, glassFront.material];

  return {
    group,
    entityMount,
    /** world-space height of the chamber centre above the desk, for framing */
    chamberCentreY: TRAY_TOP + SPEAKER_TOP + CHAMBER_HEIGHT / 2,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of glassMats) m.dispose();
    },
  };
}
