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
  Vector3,
  type BufferGeometry,
} from "three";
import { DESK, MONITOR } from "./layout";
import type { WorkspaceMaterials } from "./materials";
import type {
  CanvasFonts,
  ScreenHotspots,
  ScreenPainter,
  ScreenRect,
} from "../screens/canvasKit";

/* ------------------------------------------------------------------ */
/* A physical monitor: thin black-glass bezel with a satin silver edge, */
/* a graphite rear housing, a silver stand, and a screen whose content  */
/* is painted into a canvas texture. Geometry is shared by both          */
/* monitors (identical panels = equal visual weight).                  */
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

/** geometry shared by every monitor */
export function createMonitorKit(compact: boolean) {
  const W = MONITOR.screenWidth;
  const H = MONITOR.screenHeight;
  const b = MONITOR.bezel;
  const curve = compact ? 3 : 6;

  const housing = new ExtrudeGeometry(roundedRectShape(W + b * 2, H + b * 2, 0.007), {
    depth: MONITOR.depth,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0015,
    bevelSegments: 2,
    curveSegments: curve,
  });
  housing.translate(0, 0, -MONITOR.depth);
  const rear = new ExtrudeGeometry(roundedRectShape(W * 0.62, H * 0.56, 0.03), {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: curve,
  });
  rear.translate(0, -H * 0.06, -MONITOR.depth - 0.024);
  const screen = new PlaneGeometry(W, H);
  const neck = new BoxGeometry(0.038, 1, 0.012);
  const base = new ExtrudeGeometry(roundedRectShape(0.24, 0.16, 0.03), {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
    curveSegments: curve,
  });
  base.rotateX(-Math.PI / 2);
  const shadow = new PlaneGeometry(1, 1);
  shadow.rotateX(-Math.PI / 2);

  const all: BufferGeometry[] = [housing, rear, screen, neck, base, shadow];
  return {
    housing,
    rear,
    screen,
    neck,
    base,
    shadow,
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
  /** "desk": own stand on the desk. "arm": clamps to a shared pole (stacked layout) */
  stand: "desk" | "arm";
}) {
  const group = new Group();
  const W = MONITOR.screenWidth;
  const H = MONITOR.screenHeight;

  // housing: black glass front, satin silver edge
  const housing = new Mesh(kit.housing, [materials.bezel, materials.silver]);
  group.add(housing);
  group.add(new Mesh(kit.rear, materials.graphite));

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

  let hotspots: ScreenHotspots = { primary: [0, 0, 1, 1] };
  let hover = false;
  const paint = () => {
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);
    hotspots = painter(ctx, cw, ch, { fonts, logo, hover, compact });
    ctx.restore();
    texture.needsUpdate = true;
  };
  paint();

  const screenMat = new MeshBasicMaterial({ map: texture, toneMapped: false });
  const screen = new Mesh(kit.screen, screenMat);
  screen.position.z = 0.0022; // just proud of the bezel face (z = bevel)
  group.add(screen);

  // glass sheen (shared material)
  const sheen = new Mesh(kit.screen, materials.sheen);
  sheen.position.z = 0.003;
  group.add(sheen);

  // ── Stand ────────────────────────────────────────────────────────────────
  const standParts = new Group();
  group.add(standParts);
  function placeStand() {
    standParts.clear();
    if (stand === "arm") {
      const arm = new Mesh(kit.neck, materials.silver);
      arm.scale.set(1, 0.07, 3.2);
      arm.position.set(0, 0, -MONITOR.depth - 0.045);
      standParts.add(arm);
      return;
    }
    // neck from the base up to the back of the panel
    const deskLocalY = DESK.height - group.position.y;
    const neckLen = -deskLocalY + 0.02;
    const neck = new Mesh(kit.neck, materials.silver);
    neck.scale.y = neckLen;
    neck.position.set(0, deskLocalY + neckLen / 2, -MONITOR.depth - 0.05);
    neck.rotation.x = -0.05;
    standParts.add(neck);
    const base = new Mesh(kit.base, materials.silver);
    base.position.set(0, deskLocalY + 0.002, -0.07);
    standParts.add(base);
    const shadow = new Mesh(kit.shadow, materials.contactShadow);
    shadow.scale.set(0.36, 1, 0.24);
    shadow.position.set(0, deskLocalY + 0.0015, -0.07);
    standParts.add(shadow);
    // light spill from the panel onto the desk
    const spill = new Mesh(kit.shadow, materials.screenGlow);
    spill.scale.set(W * 1.5, 1, 0.5);
    spill.position.set(0, deskLocalY + 0.0018, 0.24);
    standParts.add(spill);
  }

  // ── Animation state ───────────────────────────────────────────────────────
  let hoverAmount = 0;
  let power = 1;
  let powerDelay = 0;
  let powerTarget = 1;

  const tmp = new Vector3();

  return {
    group,
    screen,
    /** place in the room (x, y = screen centre, z) and re-seat the stand */
    place(position: Vector3, yaw: number) {
      group.position.copy(position);
      group.rotation.set(0, yaw, 0);
      placeStand();
    },
    get hotspots() {
      return hotspots;
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
      powerTarget = 1;
    },
    update(delta: number) {
      if (powerDelay > 0) powerDelay -= delta;
      else power += (powerTarget - power) * (1 - Math.exp(-3.2 * delta));
      hoverAmount += ((hover ? 1 : 0) - hoverAmount) * (1 - Math.exp(-10 * delta));
      screenMat.color.setScalar(power * (0.9 + hoverAmount * 0.1));
    },
    /** world position of a point on the screen, given (u, v) with v from the top */
    screenPoint(u: number, v: number, target = tmp) {
      target.set((u - 0.5) * W, (0.5 - v) * H, 0);
      return screen.localToWorld(target);
    },
    rectCorners(rect: ScreenRect, out: Vector3[]) {
      const [u0, v0, u1, v1] = rect;
      this.screenPoint(u0, v0, out[0]);
      this.screenPoint(u1, v0, out[1]);
      this.screenPoint(u1, v1, out[2]);
      this.screenPoint(u0, v1, out[3]);
      return out;
    },
    dispose() {
      texture.dispose();
      screenMat.dispose();
    },
  };
}
