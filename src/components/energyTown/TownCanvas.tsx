"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { buildTown, DAY, NIGHT } from "./townBuilder";

type Props = {
  /** scroll progress target, 0..1 — written by the page, read every frame */
  progressRef: MutableRefObject<number>;
  /** theme target, 0 = day, 1 = night */
  themeRef: MutableRefObject<number>;
  /** camera flight ends at this progress; beyond it the portal takes over */
  flightEnd?: number;
};

/* Camera flight path: positions and look-at targets, sampled by progress */
const CAM_POSITIONS: [number, number, number][] = [
  [0, 125, 190], // 0 aerial overview
  [-48, 52, 60], // 1 descending toward wind farm
  [-108, 32, -28], // 2 sweeping past the turbines
  [-30, 26, 70], // 3 banking across the valley
  [62, 16, 96], // 4 approaching the solar farm
  [70, 11, 48], // 5 skimming the panels
  [16, 7, 26], // 6 entering the town streets
  [2, 9, 14], // 7 among the buildings
  [0, 80, -36], // 8 ascending into the sky
];

const CAM_TARGETS: [number, number, number][] = [
  [0, 0, 0],
  [-80, 14, -75],
  [-85, 14, -85],
  [20, 4, 40],
  [72, 1, 72],
  [60, 0, 56],
  [-2, 8, 0],
  [-6, 10, -6],
  [0, 6, 0],
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
    renderer.toneMappingExposure = 1.0;
    if (quality === "high") {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = DAY.background.clone();
    scene.fog = new THREE.Fog(DAY.background.clone(), DAY.fogNear, DAY.fogFar);

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
    const sun = new THREE.DirectionalLight(DAY.sunColor.clone(), DAY.sunIntensity);
    sun.position.set(90, 130, 60);
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
      smoothedProgress += (target - smoothedProgress) * Math.min(1, dt * 3.2);

      /* theme lerp toward target */
      const themeTarget = themeRef.current;
      if (Math.abs(themeMix - themeTarget) > 0.0005) {
        themeMix += (themeTarget - themeMix) * Math.min(1, dt * 2.4);
        if (Math.abs(themeMix - themeTarget) < 0.0005) themeMix = themeTarget;
      }
      if (themeMix !== lastThemeApplied) {
        town.applyTheme(themeMix);
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

      town.update(dt, elapsed);
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      town.dispose();
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
