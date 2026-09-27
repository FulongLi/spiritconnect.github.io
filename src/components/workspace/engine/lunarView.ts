import {
  BackSide,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Scene,
  type Texture,
} from "three";
import {
  MAIN_DOME,
  elevationForRadius,
  radiusAtHeight,
  ribGeometry,
  ribMatrices,
  satelliteDome,
  shellGeometry,
} from "@/components/shared/domeArchitecture";

/* ------------------------------------------------------------------ */
/* What the Dome's openings look out on — restrained, and consistent   */
/* with the lunar scene the visitor just flew through: black sky with  */
/* faint stars, the Earth low over the panorama, pale regolith to the  */
/* horizon, and the same habitat (six satellite domes, the corridors)  */
/* where it really stands.                                             */
/* Dome-local frame: entrance on +z, the panorama towards −z.          */
/* ------------------------------------------------------------------ */

/** hexagon of satellite domes around the main Dome (see energyTown/scene/habitatSite) */
const HEX_RADIUS = 26;
const SATELLITE_RADIUS = 6.5;
/** their azimuths in Dome-local space: the corridors join the main Dome at its ribs */
const SATELLITE_PHI = [30, 90, 150, -150, -90, -30].map((d) => (d * Math.PI) / 180);
/**
 * The perimeter ring is open on the Dome's axis: in front of the airlock
 * (between the ±30° domes) and behind the panorama (between the ±150°).
 */
const OPEN_COURTS = [
  [5, 0],
  [2, 3],
];

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

function createStarTexture() {
  const { c, ctx } = canvas(2048, 1024);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 2048, 1024);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 2048;
    const y = rnd() * 500; // upper hemisphere only
    const b = 120 + rnd() * 110;
    ctx.fillStyle = `rgba(${b}, ${b + 4}, ${b + 10}, ${0.35 + rnd() * 0.5})`;
    ctx.fillRect(x, y, rnd() < 0.08 ? 2 : 1, 1);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** the Earth: a small, cool, partly lit disc — a presence, not a postcard */
function createEarthTexture() {
  const { c, ctx } = canvas(256, 256);
  const disc = ctx.createRadialGradient(150, 110, 10, 128, 128, 118);
  disc.addColorStop(0, "rgba(222, 230, 240, 1)");
  disc.addColorStop(0.55, "rgba(150, 170, 196, 1)");
  disc.addColorStop(1, "rgba(70, 86, 110, 1)");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  // night side
  ctx.globalCompositeOperation = "source-atop";
  const shade = ctx.createLinearGradient(40, 0, 230, 0);
  shade.addColorStop(0, "rgba(0, 0, 0, 0.9)");
  shade.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** fine regolith grain (tiles) */
function createRegolithTexture() {
  const { c, ctx } = canvas(256, 256);
  const img = ctx.createImageData(256, 256);
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 256 * 256; i++) {
    const v = 188 + rnd() * 34;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v - 1;
    img.data[i * 4 + 2] = v - 3;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(90, 90);
  tex.anisotropy = 8;
  return tex;
}

/** distant highlands on the horizon (alpha silhouette around a cylinder) */
function createRidgeTexture() {
  const { c, ctx } = canvas(2048, 128);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, 128);
  for (let x = 0; x <= 2048; x += 4) {
    const y =
      70 -
      Math.max(0, Math.sin(x * 0.0037 + 0.6)) * 34 -
      Math.sin(x * 0.0109 + 1.3) * 9 -
      Math.sin(x * 0.029) * 2.5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(2048, 128);
  ctx.closePath();
  ctx.fill();
  const tex = new CanvasTexture(c);
  tex.wrapS = RepeatWrapping;
  return tex;
}

export function createLunarView({ scene, compact }: { scene: Scene; compact: boolean }) {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const add = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);
  const starTex = createStarTexture();
  const earthTex = createEarthTexture();
  const regolithTex = createRegolithTexture();
  const ridgeTex = createRidgeTexture();
  const textures: Texture[] = [starTex, earthTex, regolithTex, ridgeTex];

  const skyMat = new MeshBasicMaterial({ map: starTex, side: BackSide, depthWrite: false });
  const earthMat = new MeshBasicMaterial({ map: earthTex, transparent: true, depthWrite: false });
  const groundMat = new MeshBasicMaterial({ map: regolithTex, color: new Color("#c4c1bb") });
  const ridgeMat = new MeshBasicMaterial({ color: "#aeaba5", alphaMap: ridgeTex, transparent: true, side: BackSide });
  // sunlit habitat ceramic, in the exterior's language
  const shellMat = new MeshStandardMaterial({ color: "#dedbd5", roughness: 0.66, metalness: 0.04 });
  const ribMat = new MeshStandardMaterial({ color: "#b9bcc0", roughness: 0.4, metalness: 0.5 });
  const ownMaterials: Material[] = [skyMat, earthMat, groundMat, ridgeMat, shellMat, ribMat];

  // ── Sky, Earth, ground, horizon ──────────────────────────────────────────
  const sky = new Mesh(add(new SphereGeometry(900, 48, 24)), skyMat);
  sky.renderOrder = -2;
  group.add(sky);

  const earthDir = new Vector3(Math.sin(Math.PI - 0.13), 0.085, Math.cos(Math.PI - 0.13)).normalize();
  const earth = new Mesh(add(new PlaneGeometry(26, 26)), earthMat);
  earth.position.copy(earthDir).multiplyScalar(820);
  earth.lookAt(0, 0, 0);
  earth.renderOrder = -1;
  group.add(earth);

  const ground = new Mesh(add(new CircleGeometry(880, 64)), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  group.add(ground);
  const ridge = new Mesh(add(new CylinderGeometry(860, 860, 76, 128, 1, true)), ridgeMat);
  ridge.position.y = 36;
  group.add(ridge);

  // ── The habitat around the main Dome ─────────────────────────────────────
  const sat = satelliteDome(SATELLITE_RADIUS);
  const ss = { R: sat.radius, H: sat.height };
  const satShell = add(
    shellGeometry(ss, {
      cols: compact ? 40 : 64,
      rows: 10,
      tTop: elevationForRadius(ss, sat.oculus),
      holes: [],
    }),
  );
  const satRib = add(ribGeometry(ss, 0.05, elevationForRadius(ss, sat.oculus), sat.ribWidth, -0.03, 0.09, 10));
  const place = (phi: number, d: number) =>
    new Matrix4().compose(
      new Vector3(Math.sin(phi) * d, 0, Math.cos(phi) * d),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), phi),
      new Vector3(1, 1, 1),
    );
  const satFrames = SATELLITE_PHI.map((phi) => place(phi, HEX_RADIUS));
  const shells = new InstancedMesh(satShell, shellMat, satFrames.length);
  satFrames.forEach((m, i) => shells.setMatrixAt(i, m));
  const ribFrames = satFrames.flatMap((f) => ribMatrices(sat).map((r) => f.clone().multiply(r)));
  const satRibs = new InstancedMesh(satRib, ribMat, ribFrames.length);
  ribFrames.forEach((m, i) => satRibs.setMatrixAt(i, m));
  group.add(shells, satRibs);

  // corridors: six spokes and the perimeter (open at the entrance court)
  const tube = add(new CylinderGeometry(0.8, 0.8, 1, compact ? 12 : 20, 1, true));
  const tubeFrames: Matrix4[] = [];
  const corridor = (a: Vector3, b: Vector3) => {
    const axis = new Vector3().subVectors(b, a);
    const len = axis.length();
    tubeFrames.push(
      new Matrix4().compose(
        a.clone().addScaledVector(axis, 0.5),
        new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis.normalize()),
        new Vector3(1, len, 1),
      ),
    );
  };
  const satShellAt = radiusAtHeight(ss, 1.9) - 0.2;
  const mainShellAt = radiusAtHeight({ R: MAIN_DOME.radius, H: MAIN_DOME.height }, 1.9) - 0.2;
  const centre = (phi: number) => new Vector3(Math.sin(phi) * HEX_RADIUS, 1.1, Math.cos(phi) * HEX_RADIUS);
  SATELLITE_PHI.forEach((phi, i) => {
    const dir = new Vector3(Math.sin(phi), 0, Math.cos(phi));
    corridor(dir.clone().multiplyScalar(mainShellAt).setY(1.1), dir.clone().multiplyScalar(HEX_RADIUS - satShellAt).setY(1.1));
    const j = (i + 1) % SATELLITE_PHI.length;
    if (OPEN_COURTS.some(([a, b]) => a === i && b === j)) return;
    const a = centre(phi);
    const b = centre(SATELLITE_PHI[j]);
    const along = new Vector3().subVectors(b, a).normalize();
    corridor(a.clone().addScaledVector(along, satShellAt), b.clone().addScaledVector(along, -satShellAt));
  });
  const tubes = new InstancedMesh(tube, shellMat, tubeFrames.length);
  tubeFrames.forEach((m, i) => tubes.setMatrixAt(i, m));
  group.add(tubes);

  scene.add(group);

  return {
    setNight(night: boolean) {
      groundMat.color.set(night ? "#3d4350" : "#c4c1bb");
      ridgeMat.color.set(night ? "#2c313b" : "#aeaba5");
      const k = night ? 0.45 : 1;
      shellMat.color.set("#dedbd5").multiplyScalar(k);
      ribMat.color.set("#b9bcc0").multiplyScalar(k);
      earthMat.color.setScalar(night ? 1.15 : 1);
    },
    dispose() {
      scene.remove(group);
      for (const m of [shells, satRibs, tubes]) m.dispose();
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
      for (const m of ownMaterials) m.dispose();
    },
  };
}
