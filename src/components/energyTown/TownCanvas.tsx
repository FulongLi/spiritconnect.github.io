"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildTown, DAY, NIGHT } from "./townBuilder";
import { loadGltfFleet } from "./gltfAssets";

type Props = {
  /** scroll progress target, 0..1 — written by the page, read every frame */
  progressRef: MutableRefObject<number>;
  /** theme target, 0 = day, 1 = night */
  themeRef: MutableRefObject<number>;
  /** camera flight ends at this progress; beyond it the portal takes over */
  flightEnd?: number;
};

/* Camera flight path: positions and look-at targets, sampled by progress */
// Closely-spaced waypoints inside the energy district make the camera
// linger there; the flight ends by diving INTO the main dome — the
// hologram portal then reads as the dome's interior.
// Narrative order follows the energy flow:
// inputs (PV + reactor) → storage (BESS) → processing (SST, with the
// landing pad / charging area beside it) → loads (data centre, habitat)
// → into the main dome, ending at the holographic pedestal.
const CAM_POSITIONS: [number, number, number][] = [
  [0, 165, 250], // 0 opening: in dark space above the lunar surface
  [80, 48, 120], // 1 descending toward the input zone
  [112, 9, 64], // 2 arriving over the PV rows
  [106, 7.5, 42], // 3 slow drift along the panels (PV dwell)
  [104, 8, 24], // 4 the reactor beside the array (nuclear dwell)
  [88, 7, 32], // 5 leaving the inputs, containers ahead
  [76, 5.5, 24], // 6 alongside the battery banks (BESS dwell)
  [62, 7, 18], // 7 turning toward the SST
  [45, 5.5, -2], // 8 at the conversion hub (SST dwell, pad behind)
  [34, 6, -26], // 9 passing the charging area toward the data centre
  [10, 5, -44], // 10 along the server hall (DC dwell)
  [-20, 8, 14], // 11 swinging around to face the main dome
  [-10, 6, 13], // 12 final approach to the shell
  [-3, 4.6, 6], // 13 crossing the hull into the interior
  [0, 4.1, 1.6], // 14 settling in front of the pedestal
];

const CAM_TARGETS: [number, number, number][] = [
  [0, 85, -40], // mostly black sky, horizon low in frame
  [95, 3, 52],
  [96, 2, 50],
  [95, 2, 46], // PV
  [92, 5, 16], // reactor
  [71, 2.5, 30],
  [70, 2, 30], // BESS
  [50, 4, 8],
  [49, 3.5, 7], // SST
  [15, 2.5, -36],
  [14, 2, -35], // data centre
  [0, 6, 0], // main dome
  [0, 5, 0],
  [0, 3.6, 0], // pedestal
  [0, 3.2, -0.5],
];

export default function TownCanvas({ progressRef, themeRef, flightEnd = 0.84 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }

    const compact =
      window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
    const quality = compact ? "low" : "high";

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    if (quality === "high") {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = DAY.background.clone();
    scene.fog = new THREE.Fog(DAY.background.clone(), DAY.fogNear, DAY.fogFar);

    // image-based lighting: gives metals (solar panels) real reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.32;

    const camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.5,
      900
    );

    /* lights */
    const hemi = new THREE.HemisphereLight(
      DAY.hemiSky.clone(),
      DAY.hemiGround.clone(),
      DAY.hemiIntensity
    );
    scene.add(hemi);
    // earthshine fill so shadowed sides never go dead black
    const fill = new THREE.DirectionalLight("#6f8fc4", 0.3);
    fill.position.set(-110, 60, -80);
    scene.add(fill);
    const sun = new THREE.DirectionalLight(DAY.sunColor.clone(), DAY.sunIntensity);
    sun.position.set(150, 65, 90); // low sun angle → long, dramatic lunar shadows
    if (quality === "high") {
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

    /* NASA models (SEV rover, HDU habitat, crawler, CYGNSS satellite) */
    const fleet = loadGltfFleet(quality === "high");
    scene.add(fleet.group);

    /* post-processing: bloom gives the emissive conduits a real glow */
    const dpr = Math.min(window.devicePixelRatio, compact ? 1.5 : 2);
    const rt = new THREE.WebGLRenderTarget(
      window.innerWidth * dpr,
      window.innerHeight * dpr,
      { samples: quality === "high" ? 8 : 2, type: THREE.HalfFloatType }
    );
    const composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(dpr);
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

    /* camera path */
    const posCurve = new THREE.CatmullRomCurve3(
      CAM_POSITIONS.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.4
    );
    const tgtCurve = new THREE.CatmullRomCurve3(
      CAM_TARGETS.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.4
    );
    const camPos = new THREE.Vector3();
    const camTgt = new THREE.Vector3();

    /* state */
    let smoothedProgress = 0;
    let themeMix = themeRef.current;
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
    let raf = 0;
    let disposed = false;

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      /* damped scroll progress */
      const target = Math.min(progressRef.current, 1);
      smoothedProgress += (target - smoothedProgress) * Math.min(1, dt * 2.6);

      /* theme lerp toward target */
      const themeTarget = themeRef.current;
      if (Math.abs(themeMix - themeTarget) > 0.0005) {
        themeMix += (themeTarget - themeMix) * Math.min(1, dt * 2.4);
        if (Math.abs(themeMix - themeTarget) < 0.0005) themeMix = themeTarget;
      }
      if (themeMix !== lastThemeApplied) {
        town.applyTheme(themeMix);
        fleet.applyTheme(themeMix);
        bg.copy(dayBg).lerp(nightBg, themeMix);
        scene.background = bg;
        const fog = scene.fog as THREE.Fog;
        fog.color.copy(bg);
        fog.near = DAY.fogNear + (NIGHT.fogNear - DAY.fogNear) * themeMix;
        fog.far = DAY.fogFar + (NIGHT.fogFar - DAY.fogFar) * themeMix;
        sun.color.copy(sunDay).lerp(sunNight, themeMix);
        sun.intensity =
          DAY.sunIntensity + (NIGHT.sunIntensity - DAY.sunIntensity) * themeMix;
        hemi.color.copy(hemiSkyD).lerp(hemiSkyN, themeMix);
        hemi.groundColor.copy(hemiGndD).lerp(hemiGndN, themeMix);
        hemi.intensity =
          DAY.hemiIntensity +
          (NIGHT.hemiIntensity - DAY.hemiIntensity) * themeMix;
        fill.intensity = 0.3 + 0.35 * themeMix;
        scene.environmentIntensity = 0.32 - 0.18 * themeMix;
        bloom.strength = 0.35 + 0.55 * themeMix;
        bloom.threshold = 0.88 - 0.22 * themeMix;
        lastThemeApplied = themeMix;
      }

      /* camera along path; clamp to flight portion of the scroll */
      const t = Math.min(1, smoothedProgress / flightEnd);
      const eased = t; // curve itself is smooth; damping adds the easing feel
      posCurve.getPoint(eased, camPos);
      tgtCurve.getPoint(eased, camTgt);
      // gentle idle drift so the scene never feels frozen
      camPos.x += Math.sin(elapsed * 0.23) * 0.6;
      camPos.y += Math.sin(elapsed * 0.31) * 0.4;
      camera.position.copy(camPos);
      camera.lookAt(camTgt);

      // parallax: shift in camera space after orientation is set
      smx += (mx - smx) * Math.min(1, dt * 2.2);
      smy += (my - smy) * Math.min(1, dt * 2.2);
      camera.translateX(smx * 1.7);
      camera.translateY(-smy * 0.95);

      town.update(dt, elapsed);
      fleet.update(dt, elapsed);
      composer.render();
    }
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloom.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      town.dispose();
      fleet.dispose();
      composer.dispose();
      rt.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 50% 42%, #d2dde8 0%, #9eb3c7 42%, #718da3 100%)",
          color: "rgba(244, 250, 255, 0.92)",
          fontFamily: "var(--font-barlow), sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        This device cannot start the interactive journey. Please open the site
        in a current browser with hardware acceleration enabled.
      </div>
    );
  }

  return <div ref={mountRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}
