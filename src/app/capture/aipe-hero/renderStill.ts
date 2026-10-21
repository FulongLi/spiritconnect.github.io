import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildTown, DAY, NIGHT } from "@/components/energyTown/townBuilder";
import { loadGltfFleet } from "@/components/energyTown/gltfAssets";

/* ------------------------------------------------------------------ */
/* One still of the lunar micro-grid, for the /aipe hero image.        */
/*                                                                     */
/* Development only (see page.dev.tsx). Builds the same town, NASA     */
/* models, lights, fog, environment and bloom as                        */
/* energyTown/engine/lunarRenderer.ts, but renders a single frame at a */
/* fixed size from a fixed camera: no drift, no parallax, no UI.        */
/* Keep the lighting block in step with lunarRenderer.ts.               */
/* ------------------------------------------------------------------ */

export type StillOptions = {
  width: number;
  height: number;
  cam: THREE.Vector3Tuple;
  tgt: THREE.Vector3Tuple;
  /** vertical field of view, degrees (the journey uses 60) */
  fov: number;
  /**
   * lens shift as a fraction of the frame: +x moves the subject left,
   * +y moves it up — reframes without changing the perspective
   */
  shift: [number, number];
  /** day → night palette mix (Chapter 07's information view is 0.55) */
  dim: number;
  /** AI → energy feedback loop strength, 0..1 */
  loop: number;
  /** scene clock at the captured instant (conduit waves, beacons) */
  time: number;
  samples: number;
};

/** the GLB fleet has no ready signal: wait until both ground models are placed */
async function waitForFleet(group: THREE.Group, count: number, timeoutMs = 20000) {
  const start = performance.now();
  while (group.children.length < count && performance.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return group.children.length >= count;
}

export async function renderStill(o: StillOptions): Promise<HTMLCanvasElement> {
  const { width: w, height: h } = o;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const bg = DAY.background.clone().lerp(NIGHT.background, o.dim);
  scene.background = bg;
  scene.fog = new THREE.Fog(
    bg.clone(),
    DAY.fogNear + (NIGHT.fogNear - DAY.fogNear) * o.dim,
    DAY.fogFar + (NIGHT.fogFar - DAY.fogFar) * o.dim,
  );

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.32 - 0.18 * o.dim;

  const camera = new THREE.PerspectiveCamera(o.fov, w / h, 0.5, 900);

  /* lights — as lunarRenderer.ts, with applyTheme(dim) folded in */
  const hemi = new THREE.HemisphereLight(
    DAY.hemiSky.clone().lerp(NIGHT.hemiSky, o.dim),
    DAY.hemiGround.clone().lerp(NIGHT.hemiGround, o.dim),
    DAY.hemiIntensity + (NIGHT.hemiIntensity - DAY.hemiIntensity) * o.dim,
  );
  scene.add(hemi);
  const fill = new THREE.DirectionalLight("#6f8fc4", 0.3 + 0.35 * o.dim);
  fill.position.set(-110, 60, -80);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(
    DAY.sunColor.clone().lerp(NIGHT.sunColor, o.dim),
    DAY.sunIntensity + (NIGHT.sunIntensity - DAY.sunIntensity) * o.dim,
  );
  sun.position.set(150, 65, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); // a still can afford the sharper map
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const town = buildTown("high");
  scene.add(town.group);
  // the drifting regolith dust (world-sized points without a sprite map, unlike
  // the conduits' round flow dots) reads as square specks in a frozen frame
  town.group.traverse((obj) => {
    if (!(obj instanceof THREE.Points)) return;
    const mat = obj.material as THREE.PointsMaterial;
    if (mat.sizeAttenuation && !mat.map) obj.visible = false;
  });
  const fleet = loadGltfFleet(true);
  scene.add(fleet.group);
  await waitForFleet(fleet.group, 2);

  town.applyTheme(o.dim);
  fleet.applyTheme(o.dim);
  town.setLoop(o.loop);

  // run the scene clock up to the captured instant so the conduit waves
  // and pulses are where they would be in the live journey
  const dt = 1 / 60;
  const steps = Math.round(o.time / dt);
  for (let i = 1; i <= steps; i++) {
    town.update(dt, i * dt);
    fleet.update(dt, i * dt);
  }

  camera.position.set(...o.cam);
  camera.lookAt(new THREE.Vector3(...o.tgt));
  if (o.shift[0] || o.shift[1]) camera.setViewOffset(w, h, o.shift[0] * w, o.shift[1] * h, w, h);

  const rt = new THREE.WebGLRenderTarget(w, h, { samples: o.samples, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.35 + 0.55 * o.dim, 0.55, 0.88 - 0.22 * o.dim);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  composer.render();

  // hand back a plain 2D copy, then free everything on the GPU
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(renderer.domElement, 0, 0);

  town.dispose();
  fleet.dispose();
  composer.dispose();
  rt.dispose();
  envTarget.dispose();
  roomEnv.dispose();
  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
