import * as THREE from "three";
import { R, rand } from "./random";

type Track = <T extends { dispose: () => void }>(o: T) => T;

export type Atmosphere = {
  update: (elapsed: number) => void;
  applyTheme: (mix: number) => void;
};

/** Drifting regolith dust, the star field and the Milky Way band. */
export function buildAtmosphere(
  group: THREE.Group,
  track: Track,
  quality: "high" | "low",
): Atmosphere {
  /* ---------------- drifting dust ---------------- */
  const dustCount = quality === "high" ? 360 : 160;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = R(-115, 115);
    dustPos[i * 3 + 1] = R(0.5, 16);
    dustPos[i * 3 + 2] = R(-115, 115);
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = track(
    new THREE.PointsMaterial({
      color: "#aab4c4",
      size: 0.55,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  /* ---------------- sky: stars + Milky Way ---------------- */
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const elev = Math.asin(rand() * 0.95 + 0.04);
    const rr = 380;
    starPos[i * 3] = Math.cos(a) * Math.cos(elev) * rr;
    starPos[i * 3 + 1] = Math.sin(elev) * rr;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(elev) * rr;
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = track(
    new THREE.PointsMaterial({
      color: "#dde8ff",
      size: 1.3,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: false,
      depthWrite: false,
    })
  );
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  const brightCount = 130;
  const brightPos = new Float32Array(brightCount * 3);
  for (let i = 0; i < brightCount; i++) {
    const a = rand() * Math.PI * 2;
    const elev = Math.asin(rand() * 0.94 + 0.05);
    const rr = 375;
    brightPos[i * 3] = Math.cos(a) * Math.cos(elev) * rr;
    brightPos[i * 3 + 1] = Math.sin(elev) * rr;
    brightPos[i * 3 + 2] = Math.sin(a) * Math.cos(elev) * rr;
  }
  const brightGeo = track(new THREE.BufferGeometry());
  brightGeo.setAttribute("position", new THREE.BufferAttribute(brightPos, 3));
  const brightMat = track(
    new THREE.PointsMaterial({
      color: "#ffffff",
      size: 2.4,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      depthWrite: false,
    })
  );
  const brightStars = new THREE.Points(brightGeo, brightMat);
  brightStars.frustumCulled = false;
  group.add(brightStars);

  const mwCount = quality === "high" ? 2400 : 1200;
  const mwPos = new Float32Array(mwCount * 3);
  const mwNormal = new THREE.Vector3(0.42, 1, 0.3).normalize();
  const mwU = new THREE.Vector3(1, 0, 0).cross(mwNormal).normalize();
  const mwV = new THREE.Vector3().crossVectors(mwNormal, mwU).normalize();
  const mwDir = new THREE.Vector3();
  let mwI = 0;
  for (let i = 0; i < mwCount * 2 && mwI < mwCount; i++) {
    const th = rand() * Math.PI * 2;
    const spread = (rand() + rand() + rand() - 1.5) * 0.16;
    mwDir
      .copy(mwU)
      .multiplyScalar(Math.cos(th))
      .addScaledVector(mwV, Math.sin(th))
      .addScaledVector(mwNormal, spread)
      .normalize();
    if (mwDir.y < 0.03) continue;
    mwPos[mwI * 3] = mwDir.x * 372;
    mwPos[mwI * 3 + 1] = mwDir.y * 372;
    mwPos[mwI * 3 + 2] = mwDir.z * 372;
    mwI++;
  }
  const mwGeo = track(new THREE.BufferGeometry());
  mwGeo.setAttribute("position", new THREE.BufferAttribute(mwPos.slice(0, mwI * 3), 3));
  const mwMat = track(
    new THREE.PointsMaterial({
      color: "#b9c8e8",
      size: 0.9,
      transparent: true,
      opacity: 0.42,
      sizeAttenuation: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const milkyWay = new THREE.Points(mwGeo, mwMat);
  milkyWay.frustumCulled = false;
  group.add(milkyWay);

  return {
    update(elapsed) {
      dust.rotation.y = elapsed * 0.0045;
      dust.position.y = Math.sin(elapsed * 0.12) * 0.6;
    },
    applyTheme(mix) {
      starMat.opacity = 0.85 + 0.1 * mix;
      dustMat.opacity = 0.13 + 0.07 * mix;
    },
  };
}
