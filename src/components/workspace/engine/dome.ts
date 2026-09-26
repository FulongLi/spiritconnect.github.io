import {
  BackSide,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Scene,
  type Texture,
} from "three";
import type { WorkspaceMaterials } from "./materials";

/* ------------------------------------------------------------------ */
/* The Dome interior — the inside of the same main dome the journey      */
/* flies into. Its structure echoes the exterior: twelve meridian ribs,  */
/* latitude panel seams, a crown ring near the apex, a window band part- */
/* way up and a ring of light at the base (neutral here, not cyan).      */
/*                                                                      */
/* One rib runs down the central axis behind the monitors, two more      */
/* frame the workstation at ±30°. Soft off-white shell, graphite ribs,   */
/* recessed indirect light.                                             */
/* ------------------------------------------------------------------ */

export const DOME = {
  radius: 10,
  /** a low dome: the shell curves over within the frame */
  height: 6.6,
  ribs: 12,
  /** window band (world heights) */
  windowBottom: 1.4,
  windowTop: 2.45,
  /** crown ring at this fraction of the height (as on the exterior) */
  crown: 0.78,
} as const;

const K = DOME.height / DOME.radius;

/** polar angle on the (unflattened) sphere for a world height */
const thetaAt = (y: number) => Math.acos(Math.min(1, y / DOME.height));
/** horizontal radius of the shell at a world height */
const radiusAt = (y: number) => DOME.radius * Math.sin(thetaAt(y));

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

/** shell panels: faint seams between the ribs, latitude joints, brighter towards the crown */
function createShellTexture() {
  const { c, ctx } = canvas(1024, 512);
  // only the upper half of the texture maps onto a hemisphere
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#e6e7e8");
  g.addColorStop(0.5, "#d4d6d8");
  g.addColorStop(1, "#c7c9cb");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "rgba(70, 72, 76, 0.16)";
  ctx.lineWidth = 1.5;
  // seams midway between the twelve ribs
  for (let i = 0; i < 24; i++) {
    const x = ((i + 0.5) / 24) * 1024;
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  // latitude joints (the exterior's six rings)
  for (let i = 1; i < 6; i++) {
    const y = (i / 6) * 256;
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

/** the view outside: black lunar sky over a pale regolith horizon, the Earth low */
function createExteriorTexture() {
  const { c, ctx } = canvas(4096, 256);
  ctx.fillStyle = "#020203";
  ctx.fillRect(0, 0, 4096, 256);
  ctx.fillStyle = "rgba(235, 238, 245, 0.5)";
  for (let i = 0; i < 160; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 4096;
    const y = (Math.sin(i * 37.3 + 1.1) * 0.5 + 0.5) * 150;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  const ex = 2048 + 300;
  const earth = ctx.createRadialGradient(ex, 70, 0, ex, 70, 14);
  earth.addColorStop(0, "rgba(214, 224, 238, 0.95)");
  earth.addColorStop(0.8, "rgba(150, 170, 200, 0.7)");
  earth.addColorStop(1, "rgba(150, 170, 200, 0)");
  ctx.fillStyle = earth;
  ctx.beginPath();
  ctx.arc(ex, 70, 14, 0, Math.PI * 2);
  ctx.fill();
  const ground = ctx.createLinearGradient(0, 150, 0, 256);
  ground.addColorStop(0, "#a3a19c");
  ground.addColorStop(0.5, "#7a7874");
  ground.addColorStop(1, "#51504d");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  for (let x = 0; x <= 4096; x += 16) {
    const y =
      186 +
      Math.sin(x * 0.0015) * 16 +
      Math.sin(x * 0.0047 + 1.3) * 7 +
      Math.sin(x * 0.013 + 0.4) * 2.5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(4096, 256);
  ctx.closePath();
  ctx.fill();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** pale stone floor, a quiet inlay ring around the workstation */
function createFloorTexture() {
  const { c, ctx } = canvas(1024, 1024);
  const g = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
  g.addColorStop(0, "#a3a29f");
  g.addColorStop(0.55, "#8d8c89");
  g.addColorStop(1, "#6f6e6b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = "rgba(40, 40, 42, 0.35)";
  ctx.lineWidth = 2;
  for (const r of [150, 156]) {
    ctx.beginPath();
    ctx.arc(512, 512, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // radial joints, aligned with the ribs
  ctx.strokeStyle = "rgba(40, 40, 42, 0.14)";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(512 + Math.cos(a) * 156, 512 + Math.sin(a) * 156);
    ctx.lineTo(512 + Math.cos(a) * 512, 512 + Math.sin(a) * 512);
    ctx.stroke();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export type Dome = ReturnType<typeof createDome>;

export function createDome({
  scene,
  materials,
  compact,
}: {
  scene: Scene;
  materials: WorkspaceMaterials;
  compact: boolean;
}) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const textures: Texture[] = [];
  const add = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);
  const seg = compact ? 48 : 96;
  const R = DOME.radius;

  const shellTex = createShellTexture();
  const exteriorTex = createExteriorTexture();
  const floorTex = createFloorTexture();
  textures.push(shellTex, exteriorTex, floorTex);

  const shellMat = new MeshStandardMaterial({ map: shellTex, roughness: 0.94, metalness: 0, side: BackSide });
  const exteriorMat = new MeshBasicMaterial({ map: exteriorTex, side: BackSide, fog: false });
  const lightMat = new MeshBasicMaterial({ color: new Color("#f4f1ec").multiplyScalar(1.2) });
  const baseLightMat = new MeshBasicMaterial({ color: new Color("#f4f1ec").multiplyScalar(0.75) });
  const floorMat = new MeshStandardMaterial({ map: floorTex, roughness: 0.66, metalness: 0.04 });
  const ownMaterials = [shellMat, exteriorMat, lightMat, baseLightMat, floorMat];

  // ── Shell: above and below the window band (a flattened hemisphere) ───────
  const tTop = thetaAt(DOME.windowTop);
  const tBottom = thetaAt(DOME.windowBottom);
  const upper = new Mesh(add(new SphereGeometry(R, seg, 24, 0, Math.PI * 2, 0, tTop)), shellMat);
  const lower = new Mesh(add(new SphereGeometry(R, seg, 8, 0, Math.PI * 2, tBottom, Math.PI / 2 - tBottom)), shellMat);
  const exterior = new Mesh(
    add(new SphereGeometry(R + 0.06, seg, 4, 0, Math.PI * 2, tTop, tBottom - tTop)),
    exteriorMat,
  );
  for (const m of [upper, lower, exterior]) {
    m.scale.y = K;
    group.add(m);
  }

  // window head + sill, recessed graphite
  for (const y of [DOME.windowBottom, DOME.windowTop]) {
    const rail = new Mesh(add(new TorusGeometry(radiusAt(y) - 0.04, 0.045, 6, seg * 2)), materials.graphiteMatte);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = y;
    group.add(rail);
  }

  // ── Ribs: twelve meridians from the floor to the crown ring ─────────────
  // one sits on the central axis behind the monitors (−z)
  const crownY = DOME.height * DOME.crown;
  const crownTheta = thetaAt(crownY);
  const ribArc = Math.PI / 2 - crownTheta;
  const ribGeo = add(new TorusGeometry(R - 0.08, 0.055, 6, compact ? 20 : 36, ribArc));
  const ribs = new InstancedMesh(ribGeo, materials.graphite, DOME.ribs);
  const m4 = new Matrix4();
  const flatten = new Matrix4().makeScale(1, K, 1);
  for (let i = 0; i < DOME.ribs; i++) {
    // torus arc starts at +x; +π/2 puts rib 0 at −z
    m4.makeRotationY(Math.PI / 2 + (i / DOME.ribs) * Math.PI * 2).multiply(flatten);
    ribs.setMatrixAt(i, m4);
  }
  group.add(ribs);

  // ── Recessed indirect light: crown ring + base ring ──────────────────────
  const crown = new Mesh(add(new TorusGeometry(radiusAt(crownY) - 0.12, 0.035, 6, seg * 2)), lightMat);
  crown.rotation.x = Math.PI / 2;
  crown.position.y = crownY - 0.05;
  group.add(crown);
  const crownBand = new Mesh(add(new TorusGeometry(radiusAt(crownY) - 0.05, 0.09, 6, seg * 2)), materials.graphiteMatte);
  crownBand.rotation.x = Math.PI / 2;
  crownBand.position.y = crownY;
  group.add(crownBand);

  const base = new Mesh(add(new TorusGeometry(R - 0.14, 0.014, 6, seg * 2)), baseLightMat);
  base.rotation.x = Math.PI / 2;
  base.position.y = 0.05;
  group.add(base);

  const floor = new Mesh(add(new CircleGeometry(R, seg)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  scene.add(group);

  // ── Lights: soft architectural ambient, a key from the crown ─────────────
  const hemi = new HemisphereLight("#f5f4f1", "#2a2a2c", 1.55);
  const key = new DirectionalLight("#fbf7f0", 1.35);
  key.position.set(-2, 6, 3);
  const fill = new DirectionalLight("#e6ebf2", 0.4);
  fill.position.set(3, 2.5, 2);
  scene.add(hemi, key, fill);

  const fog = new Fog("#c9c9c8", 12, 34);
  scene.fog = fog;
  scene.background = new Color("#c9c9c8");

  const DAY = { hemi: 1.55, key: 1.35, fill: 0.4, shell: 1, exterior: 1, light: 1.2, floor: 1, fog: "#c9c9c8" };
  const NIGHT = { hemi: 0.4, key: 0.45, fill: 0.18, shell: 0.5, exterior: 0.45, light: 0.85, floor: 0.6, fog: "#2d2e30" };

  return {
    group,
    setNight(night: boolean) {
      const s = night ? NIGHT : DAY;
      hemi.intensity = s.hemi;
      key.intensity = s.key;
      fill.intensity = s.fill;
      shellMat.color.setScalar(s.shell);
      floorMat.color.setScalar(s.floor);
      exteriorMat.color.setScalar(s.exterior);
      lightMat.color.set("#f4f1ec").multiplyScalar(s.light);
      baseLightMat.color.set("#f4f1ec").multiplyScalar(s.light * 0.62);
      fog.color.set(s.fog);
      (scene.background as Color).set(s.fog);
    },
    dispose() {
      scene.remove(group, hemi, key, fill);
      scene.fog = null;
      ribs.dispose();
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
      for (const m of ownMaterials) m.dispose();
    },
  };
}
