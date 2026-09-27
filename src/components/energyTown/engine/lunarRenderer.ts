import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createRenderLoop } from "@/lib/render/renderLoop";
import { getDebugFlags } from "@/lib/debugFlags";
import { buildTown, DAY, NIGHT } from "../townBuilder";
import { loadGltfFleet } from "../gltfAssets";
import { createCameraPath } from "./cameraPath";
import { computeRenderProfile, type RenderProfile } from "./renderProfile";

/* ------------------------------------------------------------------ */
/* Lunar micro-grid renderer (WebGL). Framework-free: the React        */
/* wrapper (TownCanvas) owns the lifecycle and calls start / stop /    */
/* releaseGpuMemory as the experience moves between states.            */
/* ------------------------------------------------------------------ */

export type LunarInputs = {
  /** story progress, 0..1 — already smoothed by the page (it also drives the Dome hand-off) */
  progress: () => number;
  /** theme target, 0 = day, 1 = night */
  theme: () => number;
  /** AI → energy feedback loop target, 0..1 */
  loop: () => number;
};

export type LunarRenderer = {
  start: () => void;
  stop: () => void;
  /**
   * Free the large GPU buffers (post-processing targets, shadow map) while
   * the scene is hidden. They are re-created automatically on the next
   * rendered frame.
   */
  releaseGpuMemory: () => void;
  setReducedMotion: (reduced: boolean) => void;
  dispose: () => void;
};

/** story progress over which drift + parallax fade out before the airlock */
const ARRIVAL_SETTLE = [0.8, 0.86] as const;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createLunarRenderer(
  mount: HTMLElement,
  inputs: LunarInputs,
  options: { reducedMotion: boolean },
): LunarRenderer {
  const flags = getDebugFlags();
  const diagnostics = flags.renderDiagnostics;
  const compact = window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  const overrides = { dpr: flags.lunarDpr, samples: flags.lunarMsaa };
  const profileFor = () =>
    computeRenderProfile(window.innerWidth, window.innerHeight, window.devicePixelRatio, compact, overrides);
  let profile = profileFor();
  const { quality } = profile;
  let reducedMotion = options.reducedMotion;

  // Every frame is drawn into the composer's (multisampled) targets and only
  // a fullscreen quad reaches the canvas, so the canvas itself needs no MSAA —
  // on a Retina display that buffer alone is hundreds of MB.
  // throws when WebGL is unavailable — the caller shows its fallback
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(profile.dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (profile.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = DAY.background.clone();
  scene.fog = new THREE.Fog(DAY.background.clone(), DAY.fogNear, DAY.fogFar);

  // image-based lighting: gives metals (solar panels) real reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  let envTarget = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 900);

  /* lights */
  const hemi = new THREE.HemisphereLight(DAY.hemiSky.clone(), DAY.hemiGround.clone(), DAY.hemiIntensity);
  scene.add(hemi);
  // earthshine fill so shadowed sides never go dead black
  const fill = new THREE.DirectionalLight("#6f8fc4", 0.3);
  fill.position.set(-110, 60, -80);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(DAY.sunColor.clone(), DAY.sunIntensity);
  sun.position.set(150, 65, 90); // low sun angle → long, dramatic lunar shadows
  if (profile.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -140;
    sun.shadow.camera.right = 140;
    sun.shadow.camera.top = 140;
    sun.shadow.camera.bottom = -140;
    sun.shadow.camera.far = 420;
    sun.shadow.bias = -0.0008;
  }
  scene.add(sun);

  /* town */
  const town = buildTown(quality);
  scene.add(town.group);

  /* NASA models (SEV rover, HDU habitat) */
  const fleet = loadGltfFleet(quality === "high");
  scene.add(fleet.group);

  /* post-processing: bloom gives the emissive conduits a real glow */
  // The composer swaps its two targets every frame (OutputPass needsSwap),
  // so both carry these samples — keep the count modest.
  const rt = new THREE.WebGLRenderTarget(window.innerWidth * profile.dpr, window.innerHeight * profile.dpr, {
    samples: profile.samples,
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(profile.dpr);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35, // strength (raised at night)
    0.55, // radius
    0.88 // threshold: only emissives bloom in daylight
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  sizeBloom();

  /** bloom at render resolution, or below it on very large displays */
  function sizeBloom() {
    const scale = profile.dpr * profile.bloomScale;
    bloom.setSize(Math.round(window.innerWidth * scale), Math.round(window.innerHeight * scale));
  }

  /* diagnostics: is a flash a GPU context loss? (dev, or ?gldebug=1) */
  const canvas = renderer.domElement;
  let contextLosses = 0;
  const logProfile = (reason: string, p: RenderProfile) => {
    if (!diagnostics) return;
    const gl = renderer.getContext();
    const maxSamples = gl instanceof WebGL2RenderingContext ? gl.getParameter(gl.MAX_SAMPLES) : 0;
    console.info(`[lunar] render profile (${reason})`, {
      tier: p.tier,
      css: `${window.innerWidth}×${window.innerHeight}`,
      deviceDpr: window.devicePixelRatio,
      dpr: p.dpr,
      nativeMP: +(p.nativePixels / 1e6).toFixed(2),
      renderMP: +(p.renderPixels / 1e6).toFixed(2),
      samples: `${p.samples} (GPU max ${maxSamples})`,
      bloomScale: p.bloomScale,
      shadows: p.shadows,
    });
  };
  logProfile("init", profile);
  const onContextLost = (event: Event) => {
    contextLosses += 1;
    // three.js calls preventDefault() itself so the context can be restored
    if (diagnostics) {
      console.warn(`[lunar] webglcontextlost #${contextLosses}`, {
        at: `${performance.now().toFixed(0)}ms`,
        visibility: document.visibilityState,
        rendering: loop.running,
        statusMessage: (event as WebGLContextEvent).statusMessage || undefined,
      });
    }
  };
  const onContextRestored = () => {
    // the PMREM environment is rendered on the GPU, so it is gone — rebuild it
    // (the old target's GL objects died with the context; nothing to dispose)
    envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    if (diagnostics) {
      console.warn(`[lunar] webglcontextrestored (after ${contextLosses} loss(es))`, {
        at: `${performance.now().toFixed(0)}ms`,
      });
    }
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  const path = createCameraPath();
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();

  /* state */
  let smoothedLoop = inputs.loop();
  let lastLoopApplied = -1;
  let themeMix = inputs.theme();
  let lastThemeApplied = -1;
  const dayBg = DAY.background.clone();
  const nightBg = NIGHT.background.clone();
  const bg = new THREE.Color();
  const sunDay = DAY.sunColor.clone();
  const sunNight = NIGHT.sunColor.clone();
  const hemiSkyD = DAY.hemiSky.clone();
  const hemiSkyN = NIGHT.hemiSky.clone();
  const hemiGndD = DAY.hemiGround.clone();
  const hemiGndN = NIGHT.hemiGround.clone();

  function applyTheme(mix: number) {
    town.applyTheme(mix);
    fleet.applyTheme(mix);
    bg.copy(dayBg).lerp(nightBg, mix);
    scene.background = bg;
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(bg);
    fog.near = DAY.fogNear + (NIGHT.fogNear - DAY.fogNear) * mix;
    fog.far = DAY.fogFar + (NIGHT.fogFar - DAY.fogFar) * mix;
    sun.color.copy(sunDay).lerp(sunNight, mix);
    sun.intensity = DAY.sunIntensity + (NIGHT.sunIntensity - DAY.sunIntensity) * mix;
    hemi.color.copy(hemiSkyD).lerp(hemiSkyN, mix);
    hemi.groundColor.copy(hemiGndD).lerp(hemiGndN, mix);
    hemi.intensity = DAY.hemiIntensity + (NIGHT.hemiIntensity - DAY.hemiIntensity) * mix;
    fill.intensity = 0.3 + 0.35 * mix;
    scene.environmentIntensity = 0.32 - 0.18 * mix;
    bloom.strength = 0.35 + 0.55 * mix;
    bloom.threshold = 0.88 - 0.22 * mix;
  }

  /* mouse parallax (desktop only) — subtle camera drift toward the cursor */
  let mx = 0;
  let my = 0;
  let smx = 0;
  let smy = 0;
  const onPointerMove = (ev: PointerEvent) => {
    mx = (ev.clientX / window.innerWidth - 0.5) * 2;
    my = (ev.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!compact) window.addEventListener("pointermove", onPointerMove);

  const clock = new THREE.Clock();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    const progress = Math.min(inputs.progress(), 1);

    /* theme lerp toward target */
    const themeTarget = inputs.theme();
    if (Math.abs(themeMix - themeTarget) > 0.0005) {
      themeMix += (themeTarget - themeMix) * Math.min(1, dt * 2.4);
      if (Math.abs(themeMix - themeTarget) < 0.0005) themeMix = themeTarget;
    }
    if (themeMix !== lastThemeApplied) {
      applyTheme(themeMix);
      lastThemeApplied = themeMix;
    }

    /* AI loop */
    smoothedLoop += (inputs.loop() - smoothedLoop) * Math.min(1, dt * 1.5);
    if (Math.abs(smoothedLoop - lastLoopApplied) > 0.0005) {
      town.setLoop(smoothedLoop);
      lastLoopApplied = smoothedLoop;
    }

    /* camera along the flight path */
    path.sample(progress, camPos, camTgt);
    // drift and parallax settle as the camera lines up with the airlock
    const free = 1 - smoothstep(ARRIVAL_SETTLE[0], ARRIVAL_SETTLE[1], progress);
    if (!reducedMotion) {
      // very gentle idle drift — kept tiny to avoid motion sickness
      camPos.x += Math.sin(elapsed * 0.16) * 0.22 * free;
      camPos.y += Math.sin(elapsed * 0.21) * 0.14 * free;
    }
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    // parallax: shift in camera space after orientation is set
    const px = reducedMotion ? 0 : mx * free;
    const py = reducedMotion ? 0 : my * free;
    smx += (px - smx) * Math.min(1, dt * 2.2);
    smy += (py - smy) * Math.min(1, dt * 2.2);
    camera.translateX(smx * 0.8);
    camera.translateY(-smy * 0.45);

    town.update(dt, elapsed);
    fleet.update(dt, elapsed);
    composer.render();
  }

  const loop = createRenderLoop(frame, {
    // don't let a long pause turn into one huge simulation step
    onResume: () => clock.getDelta(),
  });

  const onResize = () => {
    // DPR can change too (window dragged between a Retina and an external display)
    const next = profileFor();
    const dprChanged = next.dpr !== profile.dpr || next.bloomScale !== profile.bloomScale;
    // MSAA samples / shadows / quality are fixed at creation; only sizing follows the window
    profile = { ...next, samples: profile.samples, quality: profile.quality, shadows: profile.shadows };
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(profile.dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(profile.dpr);
    composer.setSize(window.innerWidth, window.innerHeight);
    sizeBloom();
    if (dprChanged) logProfile("resize", profile);
  };
  window.addEventListener("resize", onResize);

  function releaseGpuMemory() {
    if (loop.running) return;
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    bloom.renderTargetBright.dispose();
    for (const t of bloom.renderTargetsHorizontal) t.dispose();
    for (const t of bloom.renderTargetsVertical) t.dispose();
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null; // WebGLShadowMap re-creates it on demand
    }
  }

  return {
    start: () => loop.start(),
    stop: () => loop.stop(),
    releaseGpuMemory,
    setReducedMotion(reduced) {
      reducedMotion = reduced;
    },
    dispose() {
      loop.dispose();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      town.dispose();
      fleet.dispose();
      composer.dispose();
      rt.dispose();
      envTarget.dispose();
      roomEnv.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
