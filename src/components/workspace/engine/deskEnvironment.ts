import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Scene,
  type Texture,
} from "three";
import { DESK } from "./layout";
import type { WorkspaceMaterials } from "./materials";
import type { CanvasFonts } from "../screens/canvasKit";

/* ------------------------------------------------------------------ */
/* The Dome interior and the curved desk.                               */
/*                                                                     */
/* Dome: a low cylindrical wall + hemispherical shell in warm off-white */
/* with restrained panel seams, a soft cove light, and a window band    */
/* looking out onto the lunar surface. Desk: one wide, gently curved    */
/* graphite slab whose front edge carries the Spirit Connect loop.      */
/* ------------------------------------------------------------------ */

const DOME_RADIUS = 7.5;
const WALL_HEIGHT = 2.9;
const WINDOW = { bottom: 1.72, top: 2.62, halfAngle: 1.0 };

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

/** dome shell: longitudinal ribs converging on the oculus, a few latitude seams */
function createDomeTexture() {
  const { c, ctx } = canvas(1024, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#b9b6b0");
  g.addColorStop(1, "#dcd8d1");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#dcd8d1";
  ctx.fillRect(0, 256, 1024, 256);
  ctx.strokeStyle = "rgba(60, 58, 55, 0.28)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 32; i++) {
    const x = (i / 32) * 1024;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(60, 58, 55, 0.2)";
  for (const y of [70, 150, 212]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** wall panels: vertical seams + a shadow gap at the skirting */
function createWallTexture() {
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = "#d8d4cd";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(60, 58, 55, 0.3)";
  ctx.fillRect(0, 0, 2, 256);
  ctx.fillStyle = "rgba(40, 40, 40, 0.55)";
  ctx.fillRect(0, 246, 256, 10);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.repeat.set(48, 1);
  return tex;
}

/** the view outside: black lunar sky over a pale regolith horizon */
function createExteriorTexture() {
  const { c, ctx } = canvas(2048, 256);
  ctx.fillStyle = "#020203";
  ctx.fillRect(0, 0, 2048, 256);
  // faint stars
  ctx.fillStyle = "rgba(235, 238, 245, 0.55)";
  for (let i = 0; i < 90; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 2048;
    const y = (Math.sin(i * 37.3 + 1.1) * 0.5 + 0.5) * 120;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  // Earth, low and small
  const earth = ctx.createRadialGradient(1320, 64, 0, 1320, 64, 13);
  earth.addColorStop(0, "rgba(214, 224, 238, 0.95)");
  earth.addColorStop(0.8, "rgba(150, 170, 200, 0.7)");
  earth.addColorStop(1, "rgba(150, 170, 200, 0)");
  ctx.fillStyle = earth;
  ctx.beginPath();
  ctx.arc(1320, 64, 13, 0, Math.PI * 2);
  ctx.fill();
  // rolling horizon
  const ground = ctx.createLinearGradient(0, 150, 0, 256);
  ground.addColorStop(0, "#8d8b87");
  ground.addColorStop(0.4, "#5f5e5b");
  ground.addColorStop(1, "#3a3938");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  for (let x = 0; x <= 2048; x += 16) {
    const y =
      176 +
      Math.sin(x * 0.0021) * 16 +
      Math.sin(x * 0.0063 + 1.3) * 7 +
      Math.sin(x * 0.017 + 0.4) * 2.5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(2048, 256);
  ctx.closePath();
  ctx.fill();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** the Spirit Connect loop, engraved into the desk's front edge */
function createLoopTexture(fonts: CanvasFonts, loop: string, logo: HTMLImageElement | null) {
  const { c, ctx } = canvas(2048, 64);
  ctx.clearRect(0, 0, 2048, 64);
  const [left, right] = loop.split(/(?<=\.)\s+/);
  ctx.fillStyle = "#e6e4df";
  ctx.font = `400 26px ${fonts.mono}`;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "9px";
  ctx.textAlign = "right";
  ctx.fillText(left ?? loop, 1024 - 46, 33);
  ctx.textAlign = "left";
  ctx.fillText(right ?? "", 1024 + 52, 33);
  if (logo) {
    // the mark is black: draw it, then recolour to the engraving tone
    const h = 34;
    const w = h * (44 / 36);
    const off = canvas(Math.ceil(w), h);
    off.ctx.drawImage(logo, 0, 0, w, h);
    off.ctx.globalCompositeOperation = "source-in";
    off.ctx.fillStyle = "#e6e4df";
    off.ctx.fillRect(0, 0, w, h);
    ctx.drawImage(off.c, 1024 - w / 2, 32 - h / 2);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** annular sector around the desk's centre of curvature (shape space: y = −z) */
function deskShape(frontRadius: number, backRadius: number, half: number) {
  const cy = -DESK.curveCenterZ;
  const shape = new Shape();
  const a0 = Math.PI / 2 - half;
  const a1 = Math.PI / 2 + half;
  shape.absarc(0, cy, backRadius, a0, a1, false);
  shape.absarc(0, cy, frontRadius, a1, a0, true);
  shape.closePath();
  return shape;
}

export type DeskEnvironment = ReturnType<typeof createDeskEnvironment>;

export function createDeskEnvironment({
  scene,
  materials,
  fonts,
  loop,
  logo,
  compact,
}: {
  scene: Scene;
  materials: WorkspaceMaterials;
  fonts: CanvasFonts;
  loop: string;
  logo: HTMLImageElement | null;
  compact: boolean;
}) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const textures: Texture[] = [];
  const ownMaterials: (MeshBasicMaterial | MeshStandardMaterial)[] = [];
  const add = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);
  const radial = compact ? 48 : 96;

  // ── Dome shell ───────────────────────────────────────────────────────────
  const domeTex = createDomeTexture();
  const wallTex = createWallTexture();
  const exteriorTex = createExteriorTexture();
  textures.push(domeTex, wallTex, exteriorTex);

  const domeMat = new MeshStandardMaterial({ map: domeTex, roughness: 0.92, metalness: 0, side: BackSide });
  const wallMat = new MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0, side: BackSide });
  const exteriorMat = new MeshBasicMaterial({ map: exteriorTex, side: BackSide, fog: false });
  const coveMat = new MeshBasicMaterial({ color: new Color("#f3ebdf").multiplyScalar(1.15) });
  ownMaterials.push(domeMat, wallMat, exteriorMat, coveMat);

  const dome = new Mesh(add(new SphereGeometry(DOME_RADIUS, radial, 24, 0, Math.PI * 2, 0, Math.PI / 2)), domeMat);
  dome.position.y = WALL_HEIGHT;
  group.add(dome);

  const wall = new Mesh(add(new CylinderGeometry(DOME_RADIUS, DOME_RADIUS, WALL_HEIGHT, radial, 1, true)), wallMat);
  wall.position.y = WALL_HEIGHT / 2;
  group.add(wall);

  // window band facing the visitor (CylinderGeometry θ = π points down −z)
  const windowRadius = DOME_RADIUS - 0.03;
  const windowHeight = WINDOW.top - WINDOW.bottom;
  const exterior = new Mesh(
    add(
      new CylinderGeometry(
        windowRadius,
        windowRadius,
        windowHeight,
        radial,
        1,
        true,
        Math.PI - WINDOW.halfAngle,
        WINDOW.halfAngle * 2,
      ),
    ),
    exteriorMat,
  );
  exterior.position.y = WINDOW.bottom + windowHeight / 2;
  group.add(exterior);

  // mullions + sill / head in graphite
  const mullionGeo = add(new BoxGeometry(0.07, windowHeight + 0.02, 0.1));
  const panes = compact ? 6 : 10;
  const mullions = new InstancedMesh(mullionGeo, materials.graphiteMatte, panes + 1);
  const mm = new Matrix4();
  for (let i = 0; i <= panes; i++) {
    const theta = Math.PI - WINDOW.halfAngle + (i / panes) * WINDOW.halfAngle * 2;
    mm.makeRotationY(theta).setPosition(
      Math.sin(theta) * (windowRadius - 0.04),
      exterior.position.y,
      Math.cos(theta) * (windowRadius - 0.04),
    );
    mullions.setMatrixAt(i, mm);
  }
  group.add(mullions);
  const railMat = materials.graphiteMatte.clone();
  railMat.side = BackSide;
  ownMaterials.push(railMat);
  for (const y of [WINDOW.bottom, WINDOW.top]) {
    const rail = new Mesh(
      add(
        new CylinderGeometry(
          windowRadius - 0.05,
          windowRadius - 0.05,
          0.05,
          radial,
          1,
          true,
          Math.PI - WINDOW.halfAngle - 0.01,
          WINDOW.halfAngle * 2 + 0.02,
        ),
      ),
      railMat,
    );
    rail.position.y = y;
    group.add(rail);
  }

  // soft cove light where the wall meets the dome
  const cove = new Mesh(add(new TorusGeometry(DOME_RADIUS - 0.12, 0.018, 6, radial * 2)), coveMat);
  cove.rotation.x = Math.PI / 2;
  cove.position.y = WALL_HEIGHT - 0.04;
  group.add(cove);

  const floor = new Mesh(add(new CircleGeometry(DOME_RADIUS, radial)), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // ── Desk ────────────────────────────────────────────────────────────────
  const frontR = DESK.curveCenterZ - DESK.frontZ;
  const backR = frontR + DESK.depth;
  const bevel = 0.006;
  const top = new Mesh(
    add(
      new ExtrudeGeometry(deskShape(frontR, backR, DESK.halfAngle), {
        depth: DESK.thickness - bevel * 2,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: compact ? 2 : 4,
        curveSegments: compact ? 48 : 96,
      }),
    ),
    materials.deskTop,
  );
  top.geometry.rotateX(-Math.PI / 2);
  top.position.y = DESK.height - DESK.thickness + bevel;
  group.add(top);

  // satin silver lip under the front edge (faces the visitor → BackSide of an arc)
  const lipHeight = 0.014;
  const lipGeo = add(
    new CylinderGeometry(frontR - 0.004, frontR - 0.004, lipHeight, compact ? 64 : 128, 1, true, Math.PI - DESK.halfAngle + 0.01, DESK.halfAngle * 2 - 0.02),
  );
  const lipMat = materials.silver.clone();
  lipMat.side = BackSide;
  ownMaterials.push(lipMat);
  const lip = new Mesh(lipGeo, lipMat);
  lip.position.set(0, DESK.height - DESK.thickness - lipHeight / 2 + 0.002, DESK.curveCenterZ);
  group.add(lip);

  // engraved loop on the front edge, centred on the visitor's axis
  const loopTex = createLoopTexture(fonts, loop, logo);
  textures.push(loopTex);
  const loopMat = new MeshBasicMaterial({ map: loopTex, transparent: true, opacity: 0.62, side: BackSide, depthWrite: false });
  ownMaterials.push(loopMat);
  const loopSpan = 0.62 / frontR; // ~62 cm of engraving
  const loopBand = new Mesh(
    add(new CylinderGeometry(frontR - 0.0065, frontR - 0.0065, DESK.thickness * 0.62, 48, 1, true, Math.PI - loopSpan / 2, loopSpan)),
    loopMat,
  );
  // flip U so the text reads left → right from inside the arc
  loopBand.scale.x = -1;
  loopBand.position.set(0, DESK.height - DESK.thickness / 2, DESK.curveCenterZ);
  group.add(loopBand);

  // two slab legs at the far ends (mostly out of frame; they ground the desk)
  if (!compact) {
    const legGeo = add(new BoxGeometry(0.04, DESK.height - DESK.thickness, DESK.depth * 0.82));
    for (const side of [-1, 1]) {
      const a = side * (DESK.halfAngle - 0.06);
      const r = frontR + DESK.depth / 2;
      const leg = new Mesh(legGeo, materials.graphite);
      leg.position.set(Math.sin(a) * r, (DESK.height - DESK.thickness) / 2, DESK.curveCenterZ - Math.cos(a) * r);
      leg.rotation.y = -a;
      group.add(leg);
    }
  }

  scene.add(group);

  // ── Lights ──────────────────────────────────────────────────────────────
  const hemi = new HemisphereLight("#f6f1e9", "#1b1b1d", 1.15);
  const key = new DirectionalLight("#fff4e6", 1.5);
  key.position.set(-2.4, 4.2, 2.2);
  const fill = new DirectionalLight("#e4ebf5", 0.45);
  fill.position.set(3, 2, 1.5);
  scene.add(hemi, key, fill);

  const fog = new Fog("#9d9a95", 5, 17);
  scene.fog = fog;
  scene.background = new Color("#9d9a95");

  const DAY = { hemi: 1.15, key: 1.5, fill: 0.45, dome: 1, exterior: 1, cove: 1.15, fog: "#9d9a95" };
  const NIGHT = { hemi: 0.42, key: 0.5, fill: 0.2, dome: 0.5, exterior: 0.45, cove: 0.8, fog: "#2c2c2e" };

  return {
    group,
    setNight(night: boolean) {
      const s = night ? NIGHT : DAY;
      hemi.intensity = s.hemi;
      key.intensity = s.key;
      fill.intensity = s.fill;
      domeMat.color.setScalar(s.dome);
      wallMat.color.setScalar(s.dome);
      exteriorMat.color.setScalar(s.exterior);
      coveMat.color.set("#f3ebdf").multiplyScalar(s.cove);
      fog.color.set(s.fog);
      (scene.background as Color).set(s.fog);
    },
    dispose() {
      scene.remove(group, hemi, key, fill);
      scene.fog = null;
      mullions.dispose();
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
      for (const m of ownMaterials) m.dispose();
    },
  };
}
