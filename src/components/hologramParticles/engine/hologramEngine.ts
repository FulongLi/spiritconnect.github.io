import { Group, PerspectiveCamera, Scene, TextureLoader, type Texture } from "three";
import { WebGPURenderer } from "three/webgpu";
import { assetPath } from "@/components/shared/assetPath";
import { createRenderLoop } from "@/lib/render/renderLoop";
import type { HologramParams } from "../types";
import { sampleGeometry } from "./geometry";
import { createInteraction } from "./interaction";
import { createPostProcessing } from "./postprocessing";
import { createGradientBackground } from "./scene/background";
import { createDotGrid } from "./scene/dotGrid";
import { createParticleField } from "./scene/particleField";
import { createHaloRings, createHoloCylinder, prepareTriangleTexture } from "./scene/stageRig";
import { createTransitionController } from "./transition";

/* ------------------------------------------------------------------ */
/* Hologram engine: WebGPU (or its WebGL 2 backend) renderer, the       */
/* particle stage and its render loop. Framework-free — the React       */
/* component (ParticlesHologram) owns the lifecycle.                    */
/* ------------------------------------------------------------------ */

export type HologramEngineOptions = {
  container: HTMLElement;
  url: string;
  /** latest parameters (read every frame / sync) */
  params: () => HologramParams;
  forceWebGL: boolean;
  maxPixelRatio: number;
  enableZoom: boolean;
  /** start rendering immediately (otherwise warm up, then wait) */
  active: boolean;
  onLoaded?: () => void;
  onTransitionComplete?: () => void;
  onUnavailable?: () => void;
};

export type HologramEngine = {
  setActive: (active: boolean) => void;
  setModel: (url: string) => void;
  replayEntrance: () => void;
  syncParams: () => void;
  rebuildCylinder: () => void;
  rebuildRings: () => void;
  dispose: () => void;
};

/** frames rendered while inactive so shaders / pipelines are compiled up front */
const WARM_UP_FRAMES = 3;

export function createHologramEngine(opts: HologramEngineOptions): HologramEngine {
  const { container, params } = opts;
  let disposed = false;
  let active = opts.active;
  let warmFrames = WARM_UP_FRAMES;
  let currentUrl = opts.url;
  let lastFrameTime = performance.now();

  // set once initialised
  let stage: {
    field: ReturnType<typeof createParticleField>;
    transition: ReturnType<typeof createTransitionController>;
    interaction: ReturnType<typeof createInteraction>;
    post: ReturnType<typeof createPostProcessing>;
    cylinder: ReturnType<typeof createHoloCylinder>;
    rings: ReturnType<typeof createHaloRings>;
    grid: ReturnType<typeof createDotGrid>;
    background: ReturnType<typeof createGradientBackground>;
    posGroup: Group;
    rotGroup: Group;
    particleCount: number;
  } | null = null;
  let renderer: WebGPURenderer | null = null;
  let triTex: Texture | null = null;
  let onResize: (() => void) | null = null;

  const loop = createRenderLoop(frame, {
    onResume: () => {
      lastFrameTime = performance.now();
    },
  });

  function frame() {
    if (!stage) return;
    const { field, transition, interaction, post, rings, rotGroup } = stage;
    const u = field.uniforms;
    const p = params();

    const now = performance.now();
    const delta = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    transition.step(delta);

    if (!transition.isEntrance && interaction.mouseEverMoved && u.entranceGlow.value < 1) {
      u.entranceGlow.value = Math.min(u.entranceGlow.value + delta / 1.0, 1);
    }

    const rotDelta = ((2 * Math.PI) / 60) * p.autoRotateSpeed * delta;
    rotGroup.rotation.y += rotDelta;
    rings.group.rotation.y += rotDelta;

    interaction.update(delta);
    post.render();

    if (!active && --warmFrames <= 0) loop.stop();
  }

  function syncParams() {
    if (!stage) return;
    const p = params();
    stage.field.sync(p, stage.transition.idle);
    stage.post.sync(p);
    stage.posGroup.position.set(p.modelX, p.modelY, p.modelZ);
    stage.cylinder.sync(p);
    stage.grid.sync(p);
    stage.rings.sync(p);
    stage.background.draw(p.bgColorCenter, p.bgColorMid, p.bgColorEdge);
  }

  function morphToCurrent() {
    if (!stage) return;
    const url = currentUrl;
    const { particleCount } = stage;
    sampleGeometry(url, particleCount).then(
      ({ positions, normals }) => {
        if (disposed || !stage || url !== currentUrl || stage.particleCount !== particleCount) return;
        stage.transition.morphTo(positions, normals);
      },
      (error) => console.error(`Unable to load hologram model ${url}`, error),
    );
  }

  (async () => {
    // ── Renderer ────────────────────────────────────────────────────────────
    const r = new WebGPURenderer({ antialias: true, alpha: true, forceWebGL: opts.forceWebGL });
    renderer = r;
    await r.init();
    if (disposed) return;

    r.setSize(container.clientWidth, container.clientHeight);
    r.setPixelRatio(Math.min(window.devicePixelRatio, opts.maxPixelRatio));
    container.appendChild(r.domElement);

    const p = params();
    const particleCount = p.particleCount;
    const loadedUrl = currentUrl;

    // ── Scene / Camera ────────────────────────────────────────────────────
    const scene = new Scene();
    const background = createGradientBackground();
    scene.background = background.texture;
    background.draw(p.bgColorCenter, p.bgColorMid, p.bgColorEdge);

    const grid = createDotGrid(p);
    scene.add(grid.mesh);

    const camera = new PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    // ── Particles ─────────────────────────────────────────────────────────
    const geometry = await sampleGeometry(loadedUrl, particleCount);
    if (disposed) return;
    const field = createParticleField(geometry, particleCount, p);

    const posGroup = new Group();
    posGroup.position.set(p.modelX, p.modelY, p.modelZ);
    const rotGroup = new Group();
    rotGroup.add(field.mesh);
    posGroup.add(rotGroup);

    // ── Stage rig: cylinder + halo rings ──────────────────────────────────
    triTex = prepareTriangleTexture(
      await new TextureLoader().loadAsync(assetPath("/assets/triangle-texture.png")),
    );
    if (disposed) return;
    const cylinder = createHoloCylinder(p, triTex);
    posGroup.add(cylinder.mesh);
    const rings = createHaloRings(p);
    posGroup.add(rings.group);

    scene.add(posGroup);
    opts.onLoaded?.();

    // ── Post-processing, interaction, transitions ─────────────────────────
    const post = createPostProcessing(r, scene, camera, p);

    onResize = () => {
      if (disposed) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      r.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const interaction = createInteraction({
      container,
      camera,
      posGroup,
      rotGroup,
      uniforms: field.uniforms,
      params,
      initialModelScale: p.initialModelScale,
      enableZoom: opts.enableZoom,
    });

    const transition = createTransitionController(field.uniforms, field.attrs, params, () =>
      opts.onTransitionComplete?.(),
    );

    stage = {
      field,
      transition,
      interaction,
      post,
      cylinder,
      rings,
      grid,
      background,
      posGroup,
      rotGroup,
      particleCount,
    };
    syncParams();
    if (currentUrl !== loadedUrl) morphToCurrent();

    lastFrameTime = performance.now();
    loop.start(); // renders continuously if active, otherwise warms up and pauses
  })().catch((error) => {
    console.error("Unable to initialize the hologram renderer", error);
    if (!disposed) opts.onUnavailable?.();
  });

  return {
    setActive(next) {
      active = next;
      if (!stage) return;
      if (active) {
        loop.start();
      } else if (warmFrames <= 0) {
        loop.stop();
      }
    },
    setModel(url) {
      if (url === currentUrl) return;
      currentUrl = url;
      morphToCurrent();
    },
    replayEntrance() {
      stage?.transition.replayEntrance();
    },
    syncParams,
    rebuildCylinder() {
      if (!stage) return;
      stage.cylinder.rebuild(params());
      stage.rings.placeOnCylinder(params());
    },
    rebuildRings() {
      stage?.rings.rebuild(params());
    },
    dispose() {
      disposed = true;
      loop.dispose();
      if (onResize) window.removeEventListener("resize", onResize);
      if (stage) {
        stage.interaction.dispose();
        stage.field.dispose();
        stage.cylinder.dispose();
        stage.rings.dispose();
        stage.grid.dispose();
        stage.background.dispose();
        stage.post.dispose();
        stage = null;
      }
      triTex?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
    },
  };
}

/** sample models in the background so switching to them is instant */
export function preloadGeometry(urls: string[], particleCount: number) {
  for (const url of urls) sampleGeometry(url, particleCount).catch(() => {});
}
