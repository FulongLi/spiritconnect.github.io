import {
  BoxGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { MONITOR, RING } from "./layout";
import type { WorkspaceMaterials } from "./materials";
import type { CanvasFonts, ScreenPainter } from "../screens/canvasKit";

/* ------------------------------------------------------------------ */
/* A studio-class display: one thin satin-aluminium slab, a black glass */
/* front with a slim even border, and a folded aluminium stand (foot +  */
/* inclined upright). Workspace scale — larger than a desk monitor, the */
/* same restraint. The screen is painted into a canvas texture.        */
/* Geometry is shared by both monitors: identical hardware for Presence */
/* and AIPE.                                                            */
/* ------------------------------------------------------------------ */

export function roundedRectShape(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const STAND = { width: 0.27, foot: 0.25, plate: 0.009 };

/** glass sheen opacity at rest, and what hover / focus adds */
const SHEEN_REST = 0.07;
const SHEEN_HOVER = 0.035;

/** geometry shared by every monitor */
export function createMonitorKit(compact: boolean) {
  const W = MONITOR.bodyWidth;
  const H = MONITOR.bodyHeight;
  const D = MONITOR.depth;
  const curve = compact ? 4 : 8;

  // the slab: front face at z = 0
  const body = new ExtrudeGeometry(roundedRectShape(W - 0.006, H - 0.006, 0.018), {
    depth: D - 0.006,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 3,
    curveSegments: curve,
  });
  body.translate(0, 0, -D + 0.003);
  const glass = new ShapeGeometry(roundedRectShape(W - 0.005, H - 0.005, 0.017), curve);
  const screen = new PlaneGeometry(MONITOR.screenWidth, MONITOR.screenHeight);
  const plate = new BoxGeometry(STAND.width, 1, STAND.plate);
  const foot = new ExtrudeGeometry(roundedRectShape(STAND.width, STAND.foot, 0.02), {
    depth: STAND.plate - 0.002,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.001,
    bevelSegments: 2,
    curveSegments: curve,
  });
  foot.rotateX(-Math.PI / 2);
  const flat = new PlaneGeometry(1, 1);
  flat.rotateX(-Math.PI / 2);

  const all: BufferGeometry[] = [body, glass, screen, plate, foot, flat];
  return {
    body,
    glass,
    screen,
    plate,
    foot,
    flat,
    dispose() {
      for (const g of all) g.dispose();
    },
  };
}

export type MonitorKit = ReturnType<typeof createMonitorKit>;

export type WorkspaceMonitor = ReturnType<typeof createWorkspaceMonitor>;

export function createWorkspaceMonitor({
  kit,
  materials,
  painter,
  fonts,
  logo,
  compact,
  maxAnisotropy,
  stand,
}: {
  kit: MonitorKit;
  materials: WorkspaceMaterials;
  painter: ScreenPainter;
  fonts: CanvasFonts;
  logo: HTMLImageElement | null;
  compact: boolean;
  maxAnisotropy: number;
  /** "desk": own stand on the riser. "arm": clamps to a shared pole (stacked layout) */
  stand: "desk" | "arm";
}) {
  const group = new Group();
  const W = MONITOR.screenWidth;
  const H = MONITOR.screenHeight;

  group.add(new Mesh(kit.body, materials.aluminium));
  const glass = new Mesh(kit.glass, materials.bezel);
  glass.position.z = 0.0004;
  group.add(glass);

  // ── Screen ────────────────────────────────────────────────────────────────
  const cw = compact ? MONITOR.canvasWidthCompact : MONITOR.canvasWidth;
  const ch = Math.round(cw * (H / W));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.minFilter = LinearMipmapLinearFilter;

  let hover = false;
  const paint = () => {
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);
    painter(ctx, cw, ch, { fonts, logo, hover });
    ctx.restore();
    texture.needsUpdate = true;
  };
  paint();

  const screenMat = new MeshBasicMaterial({ map: texture, toneMapped: false });
  const screen = new Mesh(kit.screen, screenMat);
  screen.position.z = 0.0009;
  group.add(screen);

  // glass sheen (own copy of the shared material: it responds to hover)
  const sheenMat = materials.sheen.clone();
  const sheen = new Mesh(kit.screen, sheenMat);
  sheen.position.z = 0.0014;
  group.add(sheen);

  // ── Stand ────────────────────────────────────────────────────────────────
  const standParts = new Group();
  group.add(standParts);
  function placeStand() {
    standParts.clear();
    if (stand === "arm") {
      const arm = new Mesh(kit.plate, materials.aluminium);
      arm.scale.set(0.35, 0.06, 7);
      arm.position.set(0, 0, -MONITOR.depth - 0.03);
      standParts.add(arm);
      return;
    }
    // folded plate: a foot on the riser, an inclined upright to a hinge
    // behind the display centre
    const surfaceY = RING.riserTop - group.position.y;
    const footZ = -0.05;
    const foot = new Mesh(kit.foot, materials.aluminium);
    foot.position.set(0, surfaceY + 0.001, footZ);
    standParts.add(foot);
    const a = new Vector3(0, surfaceY + STAND.plate, footZ - STAND.foot / 2 + STAND.plate);
    const b = new Vector3(0, -0.06, -MONITOR.depth - 0.016);
    const upright = new Mesh(kit.plate, materials.aluminium);
    upright.scale.y = a.distanceTo(b);
    upright.position.copy(a).add(b).multiplyScalar(0.5);
    upright.rotation.x = Math.atan2(b.z - a.z, b.y - a.y);
    standParts.add(upright);
    const shadow = new Mesh(kit.flat, materials.contactShadow);
    shadow.scale.set(0.46, 1, 0.4);
    shadow.position.set(0, surfaceY + 0.0012, footZ);
    standParts.add(shadow);
    // light spill from the panel onto the lower level in front
    const spill = new Mesh(kit.flat, materials.screenGlow);
    spill.scale.set(W * 1.3, 1, 0.62);
    spill.position.set(0, RING.height - group.position.y + 0.0018, 0.55);
    standParts.add(spill);
  }

  // ── Animation state ───────────────────────────────────────────────────────
  let hoverAmount = 0;
  let power = 1;
  let powerDelay = 0;

  return {
    group,
    screen,
    /** place in the room (x, y = display centre, z) and re-seat the stand */
    place(position: Vector3, yaw: number) {
      group.position.copy(position);
      group.rotation.set(0, yaw, 0);
      placeStand();
    },
    setHover(next: boolean) {
      if (next === hover) return;
      hover = next;
      paint();
    },
    /** screens "wake" when the visitor arrives */
    powerOn(delay: number) {
      power = 0;
      powerDelay = delay;
    },
    update(delta: number) {
      if (powerDelay > 0) powerDelay -= delta;
      else power += (1 - power) * (1 - Math.exp(-3.2 * delta));
      hoverAmount += ((hover ? 1 : 0) - hoverAmount) * (1 - Math.exp(-9 * delta));
      // hover / focus: the panel lifts a touch — kept under the bloom
      // threshold, so nothing glows around or behind the display
      screenMat.color.setScalar(power * (0.86 + hoverAmount * 0.04));
      // the glass catches a little more light
      sheenMat.opacity = SHEEN_REST + hoverAmount * SHEEN_HOVER;
    },
    /** world-space corners of the screen (top-left, top-right, bottom-right, bottom-left) */
    screenCorners(out: Vector3[]) {
      out[0].set(-W / 2, H / 2, 0);
      out[1].set(W / 2, H / 2, 0);
      out[2].set(W / 2, -H / 2, 0);
      out[3].set(-W / 2, -H / 2, 0);
      for (const c of out) screen.localToWorld(c);
      return out;
    },
    dispose() {
      texture.dispose();
      screenMat.dispose();
      sheenMat.dispose();
    },
  };
}
