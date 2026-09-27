import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Material,
  type Texture,
} from "three";
import { RING } from "./layout";
import type { WorkspaceMaterials } from "./materials";

/* ------------------------------------------------------------------ */
/* The ring workstation: one continuous piece of architecture-scale    */
/* furniture around the centre of the Dome, open towards the airlock.  */
/*                                                                     */
/* Cross-section (radius → , height ↑):                                */
/*                                                                     */
/*                     trim ┌──────── raised level ────────┐           */
/*   lower level      ┌─────┘ step fascia                  │ outer     */
/*   ═══════════════──┘                                     │ skin      */
/*   trim └─ overhang ─┐ plinth                             │           */
/*                     │ (recessed)                         │           */
/*        cove light ··└────────────────────────────────── ┘ kick     */
/*                                                                     */
/* Every face is a surface of revolution (one lathe band per face, so  */
/* each can take its own material and keeps crisp edges); the section  */
/* closes the two ends at the gap.                                     */
/* ------------------------------------------------------------------ */

type RZ = [number, number];

const R = RING;
const TRIM = 0.018;
const KICK = { inset: 0.045, height: 0.07 };

/** closed cross-section, counter-clockwise in (radius, height) */
const SECTION: RZ[] = [
  [R.inner, R.height - R.thickness],
  [R.plinth, R.height - R.thickness],
  [R.plinth, 0],
  [R.outer - KICK.inset, 0],
  [R.outer - KICK.inset, KICK.height],
  [R.outer, KICK.height],
  [R.outer, R.riserTop],
  [R.step - TRIM, R.riserTop],
  [R.step - TRIM, R.riserTop - R.riserThickness],
  [R.step, R.riserTop - R.riserThickness],
  [R.step, R.height],
  [R.inner, R.height],
];

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

/** 1D profile across a radial strip: u = 0 inner edge → 1 outer edge */
function createStripTexture(stops: [number, number][]) {
  const { c, ctx } = canvas(128, 4);
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  for (const [at, a] of stops) g.addColorStop(at, `rgba(255,255,255,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 4);
  return new CanvasTexture(c);
}

/** flat ring on the floor with radial UVs (u: inner → outer) */
function floorStrip(inner: number, outer: number, segments: number, gapHalf: number) {
  // RingGeometry θ runs from +x in its XY plane; after lying it flat, θ = phi − π/2
  const g = new RingGeometry(inner, outer, segments, 1, gapHalf - Math.PI / 2, Math.PI * 2 - gapHalf * 2);
  const pos = g.getAttribute("position");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner), 0.5);
  }
  g.rotateX(-Math.PI / 2);
  return g;
}

/** reverse a geometry's facing (winding + normals) */
function flip(g: BufferGeometry) {
  const index = g.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
  }
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

export type RingDesk = ReturnType<typeof createRingDesk>;

export function createRingDesk({ materials, compact }: { materials: WorkspaceMaterials; compact: boolean }) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const textures: Texture[] = [];
  const ownMaterials: Material[] = [];
  const segments = compact ? 120 : 220;
  const gap = R.gapHalf;
  const phiStart = gap;
  const phiLength = Math.PI * 2 - gap * 2;

  /**
   * One face of the section swept around the ring. Lathe normals follow
   * the profile direction: bottom → top faces out, outer → inner faces up.
   */
  const face = (from: RZ, to: RZ, material: Material) => {
    const g = new LatheGeometry([new Vector2(...from), new Vector2(...to)], segments, phiStart, phiLength);
    geometries.push(g);
    group.add(new Mesh(g, material));
  };

  // ── lower level ─────────────────────────────────────────────────────────
  face([R.step, R.height], [R.inner, R.height], materials.worktop);
  face([R.inner, R.height], [R.inner, R.height - R.thickness], materials.aluminium); // working edge trim
  face([R.inner, R.height - R.thickness], [R.plinth, R.height - R.thickness], materials.graphiteMatte);

  // ── raised level: a thin slab on a recessed step ───────────────────────
  face([R.step, R.riserTop - R.riserThickness], [R.step, R.height], materials.graphiteMatte);
  face([R.step - TRIM, R.riserTop - R.riserThickness], [R.step, R.riserTop - R.riserThickness], materials.graphiteMatte);
  face([R.step - TRIM, R.riserTop], [R.step - TRIM, R.riserTop - R.riserThickness], materials.aluminium);
  face([R.outer, R.riserTop], [R.step - TRIM, R.riserTop], materials.riserTop);

  // ── body: recessed plinth inside, a continuous skin outside ──────────────
  face([R.plinth, R.height - R.thickness], [R.plinth, 0.05], materials.graphiteMatte);
  face([R.outer, KICK.height], [R.outer, R.riserTop], materials.ringSkin);
  face([R.outer - KICK.inset, KICK.height], [R.outer, KICK.height], materials.graphiteMatte);
  face([R.outer - KICK.inset, 0], [R.outer - KICK.inset, KICK.height], materials.graphiteMatte);

  // recessed cove light at the foot of the plinth
  face([R.plinth, 0.05], [R.plinth, 0.012], materials.coveLight);

  // ── the two ends, at the access gap ───────────────────────────────────
  const shape = new Shape(SECTION.map(([r, y]) => new Vector2(r, y)));
  const up = new Vector3(0, 1, 0);
  for (const [phi, facingGap] of [
    [phiStart, true],
    [phiStart + phiLength, false],
  ] as const) {
    const radial = new Vector3(Math.sin(phi), 0, Math.cos(phi));
    // (radial, up, radial × up) — the section's +z faces towards lower phi
    const basis = new Matrix4().makeBasis(radial, up, new Vector3().crossVectors(radial, up));
    const g = new ShapeGeometry(shape).applyMatrix4(basis);
    if (!facingGap) flip(g);
    geometries.push(g);
    group.add(new Mesh(g, materials.ringSkin));
  }

  // ── light and shade on the floor ─────────────────────────────────────────
  const glowTex = createStripTexture([
    [0, 0],
    [0.7, 0.35],
    [1, 1],
  ]);
  const shadeTex = createStripTexture([
    [0, 0],
    [0.14, 0.75],
    [0.82, 0.85],
    [1, 0],
  ]);
  textures.push(glowTex, shadeTex);
  const glowMat = new MeshBasicMaterial({
    color: materials.coveLight.color.clone().multiplyScalar(0.22),
    alphaMap: glowTex,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const shadeMat = new MeshBasicMaterial({
    color: "#000000",
    alphaMap: shadeTex,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  ownMaterials.push(glowMat, shadeMat);
  const shade = new Mesh(floorStrip(R.plinth - 0.22, R.outer + 0.5, segments, gap), shadeMat);
  shade.position.y = 0.002;
  const glow = new Mesh(floorStrip(R.plinth - 0.55, R.plinth, segments, gap), glowMat);
  glow.position.y = 0.003;
  geometries.push(shade.geometry, glow.geometry);
  group.add(shade, glow);

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
