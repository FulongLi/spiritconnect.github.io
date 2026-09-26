import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { terrainHeight } from "../scene/terrain";
import {
  GroundPainter,
  makePadMarkingTexture,
  makeRadialGroundTexture,
  makeSoftRectTexture,
} from "../scene/surfaceTextures";
import type { Track } from "./parts";

/* ------------------------------------------------------------------ */
/* Ground integration: installations sit IN the regolith, not on it.   */
/*  - site decals: one baked canvas per hero site (graded apron,       */
/*    contact shadows, dust rims, rover tracks, cable trenches)        */
/*  - shared decals: generic round / rectangular contact shadows for   */
/*    domes, pads and small equipment, merged into two meshes          */
/* All decals follow the terrain surface and receive the sun shadows.  */
/* ------------------------------------------------------------------ */

/** terrain range under a (rotated) rectangle — for plinths and skirts */
export function siteLevel(cx: number, cz: number, w: number, d: number, rot = 0) {
  let min = Infinity;
  let max = -Infinity;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i <= 6; i++) {
    for (let j = 0; j <= 6; j++) {
      const lx = (i / 6 - 0.5) * w;
      const lz = (j / 6 - 0.5) * d;
      const h = terrainHeight(cx + lx * c + lz * s, cz - lx * s + lz * c);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  }
  return { min, max };
}

/** grid that hugs the terrain; local x/z rotate by `rot` like Object3D.rotation.y */
function conformingGrid(cx: number, cz: number, rot: number, w: number, d: number, step: number, lift: number) {
  const nx = Math.max(2, Math.ceil(w / step));
  const nz = Math.max(2, Math.ceil(d / step));
  const g = new THREE.PlaneGeometry(w, d, nx, nz);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const x = cx + lx * c + lz * s;
    const z = cz - lx * s + lz * c;
    pos.setXYZ(i, x, terrainHeight(x, z) + lift, z);
  }
  g.computeVertexNormals();
  return g;
}

export type GroundLayer = {
  /** bake a hero site's footprint; painter coordinates are site-local metres */
  site: (
    cx: number,
    cz: number,
    rot: number,
    w: number,
    d: number,
    seed: number,
    paint: (p: GroundPainter) => void,
  ) => void;
  /** round contact shadow + dust halo for a footprint of radius r */
  disc: (x: number, z: number, r: number) => void;
  /** soft rectangular contact shadow */
  rect: (x: number, z: number, w: number, d: number, rot?: number) => void;
  /** painted landing-pad markings on a pad top at height y */
  padMarking: (x: number, y: number, z: number, r: number) => void;
  build: () => void;
  applyTheme: (mix: number) => void;
};

export function createGroundLayer(
  group: THREE.Group,
  track: Track,
  quality: "high" | "low",
  shadows: boolean,
): GroundLayer {
  const res = quality === "high" ? 512 : 256;
  const lift = quality === "high" ? 0.05 : 0.09;
  const themed: THREE.MeshStandardMaterial[] = [];
  const decalMat = (map: THREE.Texture) => {
    const m = track(
      new THREE.MeshStandardMaterial({
        map,
        transparent: true,
        depthWrite: false,
        roughness: 1,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      }),
    );
    themed.push(m);
    return m;
  };
  const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(track(geo), mat);
    mesh.receiveShadow = shadows;
    mesh.renderOrder = -1; // under the other transparent layers
    group.add(mesh);
  };

  const discs: THREE.BufferGeometry[] = [];
  const rects: THREE.BufferGeometry[] = [];
  const pads: THREE.BufferGeometry[] = [];

  return {
    site(cx, cz, rot, w, d, seed, paint) {
      const painter = new GroundPainter(w, d, res, seed);
      paint(painter);
      const tex = track(painter.finish(Math.min(w, d) * 0.12));
      addMesh(conformingGrid(cx, cz, rot, w, d, 1.2, lift), decalMat(tex));
    },
    disc(x, z, r) {
      const R = r / 0.64;
      discs.push(conformingGrid(x, z, 0, R * 2, R * 2, Math.max(1, R / 8), lift));
    },
    rect(x, z, w, d, rot = 0) {
      rects.push(conformingGrid(x, z, rot, w / 0.6, d / 0.6, 1, lift));
    },
    padMarking(x, y, z, r) {
      const g = new THREE.CircleGeometry(r, 40);
      g.rotateX(-Math.PI / 2);
      g.translate(x, y + 0.02, z);
      pads.push(g);
    },
    build() {
      const radial = mergeGeometries(discs, false);
      if (radial) addMesh(radial, decalMat(track(makeRadialGroundTexture())));
      const rect = mergeGeometries(rects, false);
      if (rect) addMesh(rect, decalMat(track(makeSoftRectTexture())));
      const pad = mergeGeometries(pads, false);
      if (pad) {
        const m = decalMat(track(makePadMarkingTexture()));
        m.roughness = 0.85;
        addMesh(pad, m);
      }
      for (const g of [...discs, ...rects, ...pads]) g.dispose();
    },
    applyTheme(mix) {
      for (const m of themed) m.color.set("#ffffff").lerp(NIGHT_GROUND, mix);
    },
  };
}

const NIGHT_GROUND = new THREE.Color("#5d6b85");
