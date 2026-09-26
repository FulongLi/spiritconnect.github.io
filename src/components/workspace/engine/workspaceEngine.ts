import { Group, NeutralToneMapping, PerspectiveCamera, Scene, Vector3 } from "three";
import { WebGPURenderer } from "three/webgpu";
import { assetPath } from "@/components/shared/assetPath";
import { BRAND } from "@/content/site";
import { WORKSPACE, type WorkspaceScreenId } from "@/content/workspace";
import { sampleGeometry, MODEL_URLS } from "@/components/hologramParticles/engine/geometry";
import { createInteraction } from "@/components/hologramParticles/engine/interaction";
import { createPostProcessing } from "@/components/hologramParticles/engine/postprocessing";
import { createParticleField } from "@/components/hologramParticles/engine/scene/particleField";
import { createTransitionController } from "@/components/hologramParticles/engine/transition";
import { createRenderLoop } from "@/lib/render/renderLoop";
import { loadImage, readCanvasFonts } from "../screens/canvasKit";
import { createDesk } from "./desk";
import { createDome } from "./dome";
import { entityParams, type EntityQuality } from "./entity";
import { createLayout, layoutModeFor, type WorkspaceLayout } from "./layout";
import { createWorkspaceMaterials } from "./materials";
import { createMonitorKit } from "./workspaceMonitor";
import { createWorkstation, type Workstation } from "./workstation";

/* ------------------------------------------------------------------ */
/* Workspace engine: one WebGPURenderer (WebGPU or its WebGL 2 backend) */
/* rendering the Dome, the desk and its objects, and the Presence        */
/* particle entity inside the device. Framework-free; WorkspaceScene     */
/* owns the lifecycle.                                                   */
/*                                                                      */
/* Reuses the hologram particle stack: particle field (TSL), entrance    */
/* transition, pointer interaction / camera parallax, bloom, geometry    */
/* sampling and the shared render loop.                                 */
/* ------------------------------------------------------------------ */

export type HotspotBinding = {
  el: HTMLElement;
  screen: WorkspaceScreenId;
};

export type WorkspaceEngineOptions = {
  /** element the canvas is appended to */
  container: HTMLElement;
  /** element pointer input is read from (contains the link hotspots) */
  eventTarget: HTMLElement;
  forceWebGL: boolean;
  compact: boolean;
  reducedMotion: boolean;
  night: boolean;
  active: boolean;
  onReady?: () => void;
  onUnavailable?: () => void;
};

export type WorkspaceEngine = {
  setActive: (active: boolean) => void;
  setNight: (night: boolean) => void;
  setHover: (screen: WorkspaceScreenId | null) => void;
  bindHotspots: (bindings: HotspotBinding[]) => void;
  /** particles assemble, the visitor sits down, the screens wake */
  replayEntrance: () => void;
  dispose: () => void;
};

/** frames rendered while inactive so shaders / pipelines compile up front */
const WARM_UP_FRAMES = 3;
const ARRIVAL_SECONDS = 2.8;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function createWorkspaceEngine(opts: WorkspaceEngineOptions): WorkspaceEngine {
  const { container, eventTarget, compact, reducedMotion } = opts;
  let disposed = false;
  let active = opts.active;
  let night = opts.night;
  let warmFrames = WARM_UP_FRAMES;
  let lastFrameTime = performance.now();
  let hotspots: HotspotBinding[] = [];
  let hovered: WorkspaceScreenId | null = null;
  /** 0 → 1 while the camera settles at the desk */
  let arrival = 1;

  const quality: EntityQuality = compact ? "compact" : opts.forceWebGL ? "webgl" : "webgpu";
  const params = entityParams(quality, reducedMotion);

  let renderer: WebGPURenderer | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let world: {
    scene: Scene;
    camera: PerspectiveCamera;
    layout: WorkspaceLayout;
    rig: { position: Vector3; target: Vector3 };
    dome: ReturnType<typeof createDome>;
    desk: ReturnType<typeof createDesk>;
    materials: ReturnType<typeof createWorkspaceMaterials>;
    monitorKit: ReturnType<typeof createMonitorKit>;
    workstation: Workstation;
    field: ReturnType<typeof createParticleField>;
    transition: ReturnType<typeof createTransitionController>;
    interaction: ReturnType<typeof createInteraction>;
    post: ReturnType<typeof createPostProcessing>;
    posGroup: Group;
    rotGroup: Group;
    rebuild: (layout: WorkspaceLayout) => void;
  } | null = null;

  const loop = createRenderLoop(frame, {
    onResume: () => {
      lastFrameTime = performance.now();
    },
  });

  // ── per-frame ───────────────────────────────────────────────────────────
  const corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const lastRects = new WeakMap<HTMLElement, string>();

  function updateHotspots() {
    if (!world || !hotspots.length) return;
    const { camera, workstation } = world;
    const w = container.clientWidth;
    const h = container.clientHeight;
    for (const binding of hotspots) {
      workstation.monitors[binding.screen].screenCorners(corners);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const c of corners) {
        c.project(camera);
        const sx = ((c.x + 1) / 2) * w;
        const sy = ((1 - c.y) / 2) * h;
        x0 = Math.min(x0, sx);
        y0 = Math.min(y0, sy);
        x1 = Math.max(x1, sx);
        y1 = Math.max(y1, sy);
      }
      const key = `${x0.toFixed(1)},${y0.toFixed(1)},${(x1 - x0).toFixed(1)},${(y1 - y0).toFixed(1)}`;
      if (lastRects.get(binding.el) === key) continue;
      lastRects.set(binding.el, key);
      const s = binding.el.style;
      s.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
      s.width = `${(x1 - x0).toFixed(1)}px`;
      s.height = `${(y1 - y0).toFixed(1)}px`;
      binding.el.dataset.placed = "true";
    }
  }

  function frame() {
    if (!world || !container.clientWidth || !container.clientHeight) return;
    const { field, transition, interaction, post, rotGroup, rig, layout, workstation } = world;
    const u = field.uniforms;

    const now = performance.now();
    const delta = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    transition.step(delta);
    if (!transition.isEntrance && interaction.mouseEverMoved && u.entranceGlow.value < 1) {
      u.entranceGlow.value = Math.min(u.entranceGlow.value + delta, 1);
    }
    rotGroup.rotation.y += ((2 * Math.PI) / 60) * params.autoRotateSpeed * delta;

    // the visitor settles into the seat
    if (arrival < 1) arrival = Math.min(1, arrival + delta / ARRIVAL_SECONDS);
    const away = 1 - easeOutCubic(arrival);
    rig.position.copy(layout.camera.position).addScaledVector(layout.arrivalOffset, away);

    interaction.update(delta);
    workstation.update(delta);
    updateHotspots();
    post.render();

    if (!active && --warmFrames <= 0) loop.stop();
  }

  // ── init ────────────────────────────────────────────────────────────────
  (async () => {
    const r = new WebGPURenderer({ antialias: true, alpha: false, forceWebGL: opts.forceWebGL });
    renderer = r;
    await r.init();
    if (disposed) return;

    const maxDpr = compact ? 1.75 : opts.forceWebGL ? 1.5 : 2;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    r.setSize(container.clientWidth, container.clientHeight);
    r.toneMapping = NeutralToneMapping;
    r.toneMappingExposure = 1;
    r.domElement.style.display = "block";
    container.appendChild(r.domElement);

    const [logo, geometry] = await Promise.all([
      loadImage(assetPath(BRAND.logo)),
      sampleGeometry(MODEL_URLS.sphere, params.particleCount),
    ]);
    if (disposed) return;
    const fonts = readCanvasFonts();

    const scene = new Scene();
    const materials = createWorkspaceMaterials({ compact });
    scene.environment = materials.environment;
    scene.environmentIntensity = 0.85;

    const dome = createDome({ scene, materials, compact });
    dome.setNight(night);
    const desk = createDesk({ materials, fonts, loop: WORKSPACE.loop, logo, compact });
    scene.add(desk.group);

    const aspect = container.clientWidth / Math.max(1, container.clientHeight) || 16 / 9;
    let layout = createLayout(aspect);
    const camera = new PerspectiveCamera(layout.camera.fov, aspect, 0.03, 40);
    const rig = { position: layout.camera.position.clone(), target: layout.camera.target.clone() };
    camera.position.copy(rig.position);
    camera.lookAt(rig.target);

    // ── the Presence entity, living in the device ───────────────────────────
    const field = createParticleField(geometry, params.particleCount, params);
    const posGroup = new Group();
    const rotGroup = new Group();
    rotGroup.add(field.mesh);
    posGroup.add(rotGroup);

    const monitorKit = createMonitorKit(compact);
    const maxAnisotropy = r.getMaxAnisotropy();
    const build = (l: WorkspaceLayout) => {
      const ws = createWorkstation({ layout: l, materials, monitorKit, fonts, logo, compact, maxAnisotropy });
      ws.device.entityMount.add(posGroup);
      scene.add(ws.group);
      ws.group.updateMatrixWorld(true);
      return ws;
    };
    let workstation = build(layout);

    const post = createPostProcessing(r, scene, camera, params, { chromatic: false });
    post.sync(params);

    const interaction = createInteraction({
      container,
      eventTarget,
      camera,
      posGroup,
      rotGroup,
      uniforms: field.uniforms,
      params: () => params,
      initialModelScale: 1,
      enableZoom: false,
      cameraRig: rig,
      ignorePointerDown: (e) => !!(e.target as Element | null)?.closest?.("a, button"),
    });
    const transition = createTransitionController(field.uniforms, field.attrs, () => params, () => {});
    field.sync(params, false);

    const rebuild = (next: WorkspaceLayout) => {
      workstation.device.entityMount.remove(posGroup);
      workstation.dispose();
      layout = next;
      workstation = build(layout);
      if (world) {
        world.layout = layout;
        world.workstation = workstation;
      }
      if (hovered) workstation.monitors[hovered].setHover(true);
    };

    world = {
      scene,
      camera,
      layout,
      rig,
      dome,
      desk,
      materials,
      monitorKit,
      workstation,
      field,
      transition,
      interaction,
      post,
      posGroup,
      rotGroup,
      rebuild,
    };

    const onResize = () => {
      if (disposed || !world) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      const a = w / h;
      const next = createLayout(a);
      if (layoutModeFor(a) !== world.layout.mode) world.rebuild(next);
      else world.layout = next;
      camera.fov = world.layout.camera.fov;
      camera.aspect = a;
      camera.updateProjectionMatrix();
      rig.target.copy(world.layout.camera.target);
      r.setSize(w, h);
      if (!loop.running) frame();
    };
    // the container, not the window: the Dome may mount while still hidden
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    onResize();

    opts.onReady?.();
    lastFrameTime = performance.now();
    loop.start(); // renders continuously if active, otherwise warms up and pauses
  })().catch((error) => {
    console.error("Unable to initialize the workspace renderer", error);
    if (!disposed) opts.onUnavailable?.();
  });

  return {
    setActive(next) {
      active = next;
      if (!world) return;
      if (active) {
        warmFrames = WARM_UP_FRAMES;
        loop.start();
      } else if (warmFrames <= 0) {
        loop.stop();
      }
    },
    setNight(next) {
      night = next;
      world?.dome.setNight(next);
    },
    setHover(screen) {
      hovered = screen;
      if (!world) return;
      world.workstation.monitors.presence.setHover(screen === "presence");
      world.workstation.monitors.aipe.setHover(screen === "aipe");
    },
    bindHotspots(bindings) {
      hotspots = bindings;
      updateHotspots();
    },
    replayEntrance() {
      if (!world) return;
      world.transition.replayEntrance();
      if (reducedMotion) return;
      arrival = 0;
      world.workstation.monitors.presence.powerOn(0.5);
      world.workstation.monitors.aipe.powerOn(0.65);
    },
    dispose() {
      disposed = true;
      loop.dispose();
      resizeObserver?.disconnect();
      if (world) {
        world.interaction.dispose();
        world.workstation.device.entityMount.remove(world.posGroup);
        world.workstation.dispose();
        world.monitorKit.dispose();
        world.field.dispose();
        world.desk.dispose();
        world.dome.dispose();
        world.materials.dispose();
        world.post.dispose();
        world = null;
      }
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
    },
  };
}
