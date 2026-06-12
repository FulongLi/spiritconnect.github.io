import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { assetPath } from "@/components/shared/assetPath";
import { terrainHeight } from "./townBuilder";

/* ------------------------------------------------------------------ */
/* NASA GLB set (public domain), optimized with gltf-transform:        */
/* draco geometry + webp textures, ~1.3 MB total.                      */
/* ------------------------------------------------------------------ */

type GroundSpec = {
  kind: "ground";
  urls: string[]; // multi-part models keep their relative transforms
  x: number;
  z: number;
  rotY: number;
  /** desired max horizontal footprint in metres */
  footprint: number;
  sink?: number; // small extra sink into the regolith
};

type OrbitSpec = {
  kind: "orbit";
  urls: string[];
  footprint: number;
  radius: number;
  height: number;
  speed: number;
};

const SPECS: (GroundSpec | OrbitSpec)[] = [
  // NASA Space Exploration Vehicle — near the chargers, clear of the pads
  { kind: "ground", urls: ["/glb/sev.glb"], x: -34, z: 17.5, rotY: 0.7, footprint: 5.5 },
  // NASA Habitat Demonstration Unit (two parts, kept in relative position)
  {
    kind: "ground",
    urls: ["/glb/hdu1.glb", "/glb/hdu2.glb"],
    x: -26,
    z: 34,
    rotY: -0.6,
    footprint: 10,
  },
  // NASA Crawler — asset file was lost to an iCloud sync glitch before it
  // was ever committed. Re-download "Crawler" from NASA 3D Resources into
  // public/glb/ and re-enable this entry.
  // { kind: "ground", urls: ["/glb/crawler.glb"], x: -74, z: -2, rotY: 1.1, footprint: 11 },
  // (CYGNSS satellite removed: it read as a strange object in the
  //  opening dark-space shot. Asset kept in public/glb for future use.)
];

const NIGHT_TINT = new THREE.Color("#5d6b85");

export type GltfFleet = {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  applyTheme: (mix: number) => void;
  dispose: () => void;
};

export function loadGltfFleet(shadows: boolean): GltfFleet {
  const group = new THREE.Group();
  const draco = new DRACOLoader();
  draco.setDecoderPath(assetPath("/draco/"));
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  type Tinted = { mat: THREE.MeshStandardMaterial; base: THREE.Color };
  const tinted: Tinted[] = [];
  const orbiters: { obj: THREE.Object3D; spec: OrbitSpec; phase: number }[] = [];
  let lastMix = 0;
  let disposed = false;

  const registerMaterials = (root: THREE.Object3D) => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = shadows;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.color) tinted.push({ mat: std, base: std.color.clone() });
      }
    });
  };

  const applyMixTo = (items: Tinted[], mix: number) => {
    for (const t of items) {
      t.mat.color.copy(t.base).lerp(NIGHT_TINT, mix * 0.8);
    }
  };

  for (const spec of SPECS) {
    Promise.all(
      spec.urls.map(
        (u) =>
          new Promise<THREE.Object3D>((resolve, reject) =>
            loader.load(assetPath(u), (g) => resolve(g.scene), undefined, reject)
          )
      )
    )
      .then((parts) => {
        if (disposed) return;
        const holder = new THREE.Group();
        parts.forEach((p) => holder.add(p));

        // normalize scale by horizontal footprint
        const box = new THREE.Box3().setFromObject(holder);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = spec.footprint / Math.max(size.x, size.z, 0.001);
        holder.scale.setScalar(scale);

        const before = tinted.length;
        registerMaterials(holder);
        applyMixTo(tinted.slice(before), lastMix);

        if (spec.kind === "ground") {
          holder.rotation.y = spec.rotY;
          const scaledBox = new THREE.Box3().setFromObject(holder);
          const gy = terrainHeight(spec.x, spec.z);
          holder.position.set(
            spec.x,
            gy - scaledBox.min.y - (spec.sink ?? 0.06),
            spec.z
          );
        } else {
          orbiters.push({ obj: holder, spec, phase: Math.random() * Math.PI * 2 });
        }
        group.add(holder);
      })
      .catch(() => {
        /* missing/failed asset: the procedural scene still stands on its own */
      });
  }

  function update(_dt: number, elapsed: number) {
    for (const o of orbiters) {
      const a = o.phase + elapsed * o.spec.speed;
      o.obj.position.set(
        Math.cos(a) * o.spec.radius,
        o.spec.height + Math.sin(elapsed * 0.3) * 3,
        Math.sin(a) * o.spec.radius
      );
      o.obj.rotation.y = a + Math.PI / 2;
      o.obj.rotation.z = Math.sin(elapsed * 0.1) * 0.15;
    }
  }

  function applyTheme(mix: number) {
    lastMix = mix;
    applyMixTo(tinted, mix);
  }

  function dispose() {
    disposed = true;
    draco.dispose();
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m?.dispose();
    });
  }

  return { group, update, applyTheme, dispose };
}
