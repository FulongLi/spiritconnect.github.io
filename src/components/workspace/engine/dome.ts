import {
  BackSide,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  FrontSide,
  Group,
  HemisphereLight,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  BoxGeometry,
  Vector2,
  Path,
  type BufferGeometry,
  type Material,
  type Scene,
  type Texture,
} from "three";
import {
  MAIN_DOME,
  MAIN_DOME_INTERIOR,
  archOutline,
  elevationAt,
  elevationForRadius,
  glassGeometry,
  revealGeometry,
  ribGeometry,
  ribMatrices,
  shellGeometry,
  shellHoles,
  sweepOutline,
} from "@/components/shared/domeArchitecture";
import { createLunarView } from "./lunarView";
import type { WorkspaceMaterials } from "./materials";

/* ------------------------------------------------------------------ */
/* The Dome interior: the inside of the very building the journey      */
/* flies into (shared/domeArchitecture) — same six ribs, same openings, */
/* same airlock on +z, same oculus.                                    */
/*                                                                     */
/* Calm rather than technical: one smooth off-white lining, six deep   */
/* ribs in a slightly warmer grey, a long low panorama behind the      */
/* workstation, a luminous diffuser in the oculus and a warm cove line */
/* at the foot of the shell. No seams, no rings, no wireframe.         */
/* ------------------------------------------------------------------ */

const S = { R: MAIN_DOME_INTERIOR.radius, H: MAIN_DOME_INTERIOR.height };
/** the lining is this much inside the exterior surface (openings' depth) */
const WALL = MAIN_DOME.radius - MAIN_DOME_INTERIOR.radius;

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

/** pale stone floor: slightly deeper in tone inside the ring, lighter towards the shell */
function createFloorTexture() {
  const { c, ctx } = canvas(1024, 1024);
  const g = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
  g.addColorStop(0, "#8a8986");
  g.addColorStop(0.19, "#8f8e8b");
  g.addColorStop(0.3, "#a6a5a1");
  g.addColorStop(1, "#b9b7b2");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  // very large format stone, joints barely there
  ctx.strokeStyle = "rgba(60, 58, 55, 0.07)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 8; i++) {
    const x = (i / 8) * 1024;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.moveTo(0, x);
    ctx.lineTo(1024, x);
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
  const radial = compact ? 96 : 176;

  const floorTex = createFloorTexture();
  textures.push(floorTex);

  const shellMat = new MeshStandardMaterial({ color: "#e8e5df", roughness: 0.93, metalness: 0, side: BackSide });
  const surfaceMat = new MeshStandardMaterial({ color: "#e3e0da", roughness: 0.9, metalness: 0, side: FrontSide });
  const ribMat = new MeshStandardMaterial({ color: "#d3cfc8", roughness: 0.82, metalness: 0.02 });
  const liningMat = new MeshStandardMaterial({ color: "#6a6863", roughness: 0.8, metalness: 0.08 });
  const floorMat = new MeshStandardMaterial({ map: floorTex, roughness: 0.52, metalness: 0.05 });
  const lightMat = new MeshBasicMaterial({ color: new Color("#f7f1e7").multiplyScalar(1.15) });
  const diffuserMat = new MeshBasicMaterial({ color: new Color("#f3efe8").multiplyScalar(1.05) });
  const glassMat = materials.sheen.clone();
  glassMat.opacity = 0.05;
  const ownMaterials: Material[] = [shellMat, surfaceMat, ribMat, liningMat, floorMat, lightMat, diffuserMat, glassMat];

  // ── Shell with its openings ──────────────────────────────────────────────
  const tTop = elevationForRadius(S, MAIN_DOME.oculus - 0.1);
  const holes = shellHoles(MAIN_DOME, S);
  group.add(new Mesh(add(shellGeometry(S, { cols: radial, rows: compact ? 20 : 30, tTop, holes })), shellMat));

  // ── Six deep ribs (inward fins), from the cove to the oculus ─────────────
  const tBase = elevationAt(S, 0.3);
  const ribGeo = add(ribGeometry(S, tBase, tTop - 0.004, MAIN_DOME.ribWidth, 0.03, -0.3, compact ? 18 : 32));
  const ribs = new InstancedMesh(ribGeo, ribMat, MAIN_DOME.ribs);
  ribMatrices(MAIN_DOME).forEach((m, i) => ribs.setMatrixAt(i, m));
  ribs.instanceMatrix.needsUpdate = true;
  group.add(ribs);

  // ── Openings: deep reveals, a fine dark frame at the glass line ──────────
  for (const hole of holes.slice(0, MAIN_DOME.openings.length)) {
    group.add(new Mesh(add(revealGeometry(S, hole, 0, WALL - 0.05)), surfaceMat));
    group.add(new Mesh(add(revealGeometry(S, hole, WALL - 0.05, WALL)), materials.graphiteMatte));
    group.add(new Mesh(add(glassGeometry(S, hole, WALL - 0.02, -1)), glassMat));
  }

  // ── Oculus: a luminous diffuser in a slim compression ring ───────────────
  const yTop = S.H * Math.sin(tTop);
  const oc = S.R * Math.cos(tTop);
  const diffuser = new Mesh(add(new CircleGeometry(oc, radial / 2)), diffuserMat);
  diffuser.rotation.x = Math.PI / 2;
  diffuser.position.y = yTop + 0.06;
  group.add(diffuser);
  const crown = new Mesh(
    add(
      // inner face of the ring, top → bottom so it faces the Dome centre
      new LatheGeometry([new Vector2(oc, yTop + 0.06), new Vector2(oc + 0.02, yTop - 0.24), new Vector2(oc + 0.4, yTop - 0.3)], radial / 2),
    ),
    ribMat,
  );
  group.add(crown);

  // ── Foot of the shell: a slim skirting with a warm cove line above ──────
  const e = MAIN_DOME.entrance!;
  const gap = Math.asin((e.outerWidth / 2 + 0.05) / S.R);
  const footR = S.R - 0.06;
  group.add(
    new Mesh(
      add(new LatheGeometry([new Vector2(footR, 0.2), new Vector2(footR, 0)], radial, gap, Math.PI * 2 - gap * 2)),
      materials.graphiteMatte,
    ),
    new Mesh(
      add(new LatheGeometry([new Vector2(footR + 0.01, 0.228), new Vector2(footR + 0.01, 0.2)], radial, gap, Math.PI * 2 - gap * 2)),
      lightMat,
    ),
  );

  // ── Floor ────────────────────────────────────────────────────────────────
  const floor = new Mesh(add(new CircleGeometry(S.R + 0.1, radial)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // ── The airlock: portal block, vestibule, its light lines ────────────────
  const inner = archOutline(e.width, e.height, e.corner, 0);
  const outer = archOutline(e.outerWidth, e.outerHeight, e.outerCorner, 0);
  // the vestibule's body stands proud of the lining as a deep portal
  group.add(new Mesh(add(sweepOutline(outer.points, e.z0, S.R + 0.2, false)), surfaceMat));
  const face = new Shape(outer.points);
  face.holes.push(new Path(inner.points));
  const portal = new Mesh(add(new ShapeGeometry(face, 8)), ribMat);
  portal.rotation.y = Math.PI; // faces into the Dome (−z)
  portal.position.z = e.z0;
  group.add(portal);
  group.add(new Mesh(add(sweepOutline(inner.points, e.z0, e.z1, true)), liningMat));
  const L = e.z1 - e.z0;
  const strip = add(new BoxGeometry(0.05, 0.022, L - 0.7));
  const floorLine = add(new BoxGeometry(0.03, 0.012, L - 0.4));
  for (const side of [-1, 1]) {
    const s = new Mesh(strip, lightMat);
    s.position.set(side * (e.width / 2 - 0.36), e.height - 0.07, (e.z0 + e.z1) / 2);
    const f = new Mesh(floorLine, lightMat);
    f.position.set(side * (e.width / 2 - 0.05), 0.006, (e.z0 + e.z1) / 2);
    group.add(s, f);
  }
  // the pressure door, closed behind the visitor
  const door = new Mesh(add(new PlaneGeometry(e.width, e.height)), materials.graphiteMatte);
  door.position.set(0, e.height / 2, e.z1 + 0.02);
  door.rotation.y = Math.PI;
  group.add(door);

  scene.add(group);

  // ── Outside: the lunar surface, the habitat, the Earth ───────────────────
  const view = createLunarView({ scene, compact });

  // ── Lights: soft architectural ambient, a key from the oculus ────────────
  const hemi = new HemisphereLight("#f6f3ee", "#3b3936", 1.3);
  const key = new DirectionalLight("#fbf6ee", 1.2);
  key.position.set(1.2, 9, 2.4);
  // from the airlock side, behind the visitor: shapes the display bodies
  const fill = new DirectionalLight("#e9ecf0", 0.38);
  fill.position.set(-1, 2.6, 8);
  scene.add(hemi, key, fill);
  scene.fog = null;
  scene.background = new Color("#010102");

  const DAY = { hemi: 1.3, key: 1.2, fill: 0.38, shell: 1, light: 1.15, floor: 1 };
  const NIGHT = { hemi: 0.5, key: 0.5, fill: 0.2, shell: 0.62, light: 1.05, floor: 0.7 };

  return {
    group,
    setNight(night: boolean) {
      const s = night ? NIGHT : DAY;
      hemi.intensity = s.hemi;
      key.intensity = s.key;
      fill.intensity = s.fill;
      shellMat.color.set("#e8e5df").multiplyScalar(s.shell);
      surfaceMat.color.set("#e3e0da").multiplyScalar(s.shell);
      ribMat.color.set("#d3cfc8").multiplyScalar(s.shell);
      floorMat.color.setScalar(s.floor);
      lightMat.color.set("#f7f1e7").multiplyScalar(s.light);
      view.setNight(night);
    },
    dispose() {
      scene.remove(group, hemi, key, fill);
      ribs.dispose();
      view.dispose();
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
      for (const m of ownMaterials) m.dispose();
    },
  };
}

