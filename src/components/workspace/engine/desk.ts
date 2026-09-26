import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Shape,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import {
  BACK_RADIUS,
  DESK,
  FRONT_RADIUS,
  RISER_BACK_RADIUS,
  RISER_FRONT_RADIUS,
  RISER_TOP,
  deskPoint,
} from "./layout";
import type { WorkspaceMaterials } from "./materials";
import type { CanvasFonts } from "../screens/canvasKit";

/* ------------------------------------------------------------------ */
/* The two-level curved workstation desk.                               */
/*                                                                     */
/*   main surface   graphite slab, satin aluminium lip on the front     */
/*                  edge engraved with the Spirit Connect loop          */
/*   riser          a thin shelf following the same arc across the      */
/*                  back of the desk, carried by a recessed back panel  */
/*                  and end fins — one piece of furniture, two levels   */
/*   base           two slim end panels, set in from the ends           */
/* ------------------------------------------------------------------ */

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

/** the Spirit Connect loop, engraved into the desk's front edge */
function createLoopTexture(fonts: CanvasFonts, loop: string, logo: HTMLImageElement | null) {
  const { c, ctx } = canvas(2048, 64);
  const [left, right] = loop.split(/(?<=\.)\s+/);
  ctx.fillStyle = "#3a3b3e";
  ctx.font = `500 27px ${fonts.mono}`;
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
    off.ctx.fillStyle = "#3a3b3e";
    off.ctx.fillRect(0, 0, w, h);
    ctx.drawImage(off.c, 1024 - w / 2, 32 - h / 2);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** 1D fade across a strip (alpha map for soft shadow bands) */
function createFadeTexture() {
  const { c, ctx } = canvas(64, 4);
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.45, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0.6)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 4);
  return new CanvasTexture(c);
}

/** annular sector around the desk's centre of curvature (shape space: y = −z) */
function arcShape(frontRadius: number, backRadius: number, half: number) {
  const cy = -DESK.curveCenterZ;
  const shape = new Shape();
  const a0 = Math.PI / 2 - half;
  const a1 = Math.PI / 2 + half;
  shape.absarc(0, cy, backRadius, a0, a1, false);
  shape.absarc(0, cy, frontRadius, a1, a0, true);
  shape.closePath();
  return shape;
}

/** an extruded slab on the arc, top face at `top` */
function arcSlab(frontRadius: number, backRadius: number, half: number, thickness: number, bevel: number, curve: number) {
  const g = new ExtrudeGeometry(arcShape(frontRadius, backRadius, half), {
    depth: thickness - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: curve,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -thickness + bevel, 0);
  return g;
}

/**
 * Open cylinder segment on the desk arc, seen from the visitor's side
 * (the inside of the arc). CylinderGeometry θ = π points down −z.
 */
function arcWall(radius: number, height: number, half: number, segments: number) {
  return new CylinderGeometry(radius, radius, height, segments, 1, true, Math.PI - half, half * 2);
}

/** strip on the desk surface across the arc, u running front → back */
function arcStrip(inner: number, outer: number, half: number, segments: number) {
  const g = new RingGeometry(inner, outer, segments, 1, Math.PI / 2 - half, half * 2);
  const pos = g.getAttribute("position");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  // ring lies in XY with y = −(z − centre): into the desk plane
  g.rotateX(-Math.PI / 2);
  return g;
}

export type Desk = ReturnType<typeof createDesk>;

export function createDesk({
  materials,
  fonts,
  loop,
  logo,
  compact,
}: {
  materials: WorkspaceMaterials;
  fonts: CanvasFonts;
  loop: string;
  logo: HTMLImageElement | null;
  compact: boolean;
}) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const textures: Texture[] = [];
  const ownMaterials: Material[] = [];
  const add = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);
  const curve = compact ? 48 : 96;
  const zc = DESK.curveCenterZ;
  const half = DESK.halfAngle;
  const insideSilver = materials.silver.clone();
  insideSilver.side = BackSide;
  const panelMat = materials.graphiteMatte.clone();
  panelMat.side = DoubleSide;
  ownMaterials.push(insideSilver, panelMat);

  // ── Main working surface ─────────────────────────────────────────────────
  const top = new Mesh(add(arcSlab(FRONT_RADIUS, BACK_RADIUS, half, DESK.thickness, 0.006, curve)), materials.deskTop);
  top.position.y = DESK.height;
  group.add(top);

  // satin aluminium lip along the front edge
  const lipH = 0.016;
  const lip = new Mesh(add(arcWall(FRONT_RADIUS - 0.004, lipH, half - 0.004, curve)), insideSilver);
  lip.position.set(0, DESK.height - DESK.thickness - lipH / 2 + 0.003, zc);
  group.add(lip);

  // engraved loop, centred on the visitor's axis
  const loopTex = createLoopTexture(fonts, loop, logo);
  textures.push(loopTex);
  const loopMat = new MeshBasicMaterial({ map: loopTex, transparent: true, opacity: 0.8, side: BackSide, depthWrite: false });
  ownMaterials.push(loopMat);
  const loopSpan = 0.62 / FRONT_RADIUS;
  const loopBand = new Mesh(add(arcWall(FRONT_RADIUS - 0.0065, DESK.thickness * 0.62, loopSpan / 2, 48)), loopMat);
  loopBand.scale.x = -1; // read left → right from inside the arc
  loopBand.position.set(0, DESK.height - DESK.thickness / 2 + 0.001, zc);
  group.add(loopBand);

  // ── Riser: the second level, same arc ────────────────────────────────────
  const riserHalf = half - 0.012;
  const riserT = DESK.riser.thickness;
  const riser = new Mesh(
    add(arcSlab(RISER_FRONT_RADIUS, RISER_BACK_RADIUS, riserHalf, riserT, 0.004, curve)),
    materials.deskTop,
  );
  riser.position.y = RISER_TOP;
  group.add(riser);
  const riserLipH = 0.008;
  const riserLip = new Mesh(add(arcWall(RISER_FRONT_RADIUS - 0.002, riserLipH, riserHalf, curve)), insideSilver);
  riserLip.position.set(0, RISER_TOP - riserT - riserLipH / 2 + 0.002, zc);
  group.add(riserLip);

  // carried by a recessed back panel and two end fins
  const underH = DESK.riser.lift - riserT;
  const back = new Mesh(add(arcWall(RISER_BACK_RADIUS - 0.03, underH, riserHalf - 0.01, curve)), panelMat);
  back.position.set(0, DESK.height + underH / 2, zc);
  group.add(back);
  const finGeo = add(new BoxGeometry(0.014, underH, RISER_BACK_RADIUS - RISER_FRONT_RADIUS - 0.03));
  for (const side of [-1, 1]) {
    const a = side * (riserHalf - 0.01);
    const fin = new Mesh(finGeo, materials.silver);
    deskPoint((RISER_FRONT_RADIUS + RISER_BACK_RADIUS) / 2 + 0.01, a, DESK.height + underH / 2, fin.position);
    fin.rotation.y = -a;
    group.add(fin);
  }

  // soft shade on the main surface beneath the shelf's front edge
  const fadeTex = createFadeTexture();
  textures.push(fadeTex);
  const shadeMat = new MeshBasicMaterial({
    color: "#000000",
    alphaMap: fadeTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  ownMaterials.push(shadeMat);
  const shade = new Mesh(add(arcStrip(RISER_FRONT_RADIUS - 0.06, RISER_BACK_RADIUS, riserHalf, curve)), shadeMat);
  shade.position.set(0, DESK.height + 0.0012, zc);
  group.add(shade);

  // ── Base: two slim end panels, set in from the ends ──────────────────────
  const legH = DESK.height - DESK.thickness;
  const legGeo = add(new BoxGeometry(0.024, legH, DESK.depth * 0.72));
  for (const side of [-1, 1]) {
    const a = side * (half - 0.07);
    const leg = new Mesh(legGeo, materials.graphite);
    deskPoint(FRONT_RADIUS + DESK.depth / 2 + 0.03, a, legH / 2, leg.position);
    leg.rotation.y = -a;
    group.add(leg);
  }

  // grounded: a soft shadow under the desk on the floor
  const floorShadow = new Mesh(add(new PlaneGeometry(1, 1)), materials.contactShadow);
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.scale.set(3.2, 1.3, 1);
  floorShadow.position.set(0, 0.003, zc - FRONT_RADIUS - DESK.depth / 2 + 0.1);
  group.add(floorShadow);

  return {
    group,
    dispose() {
      group.removeFromParent();
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
      for (const m of ownMaterials) m.dispose();
    },
  };
}
