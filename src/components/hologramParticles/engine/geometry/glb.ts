import { Box3, Matrix3, Mesh, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import type { GeometryData } from "../../types";

/**
 * Load a GLB, normalise it to a 3-unit bounding box resting on y = 0, and
 * sample `particleCount` surface points spread evenly across its meshes.
 */
export async function sampleGLBSurface(url: string, particleCount: number): Promise<GeometryData> {
  const gltf = await new GLTFLoader().loadAsync(url);

  // ── Normalise to a consistent bounding box ────────────────────────────────
  const bbox = new Box3().setFromObject(gltf.scene);
  const centre = new Vector3();
  bbox.getCenter(centre);
  gltf.scene.position.sub(centre);
  gltf.scene.updateMatrixWorld(true);

  const bbox2 = new Box3().setFromObject(gltf.scene);
  const sv = new Vector3();
  bbox2.getSize(sv);
  const maxDim = Math.max(sv.x, sv.y, sv.z);
  gltf.scene.scale.setScalar(maxDim > 0 ? 3 / maxDim : 1);
  gltf.scene.updateMatrixWorld(true);

  const bbox3 = new Box3().setFromObject(gltf.scene);
  gltf.scene.position.y -= bbox3.min.y;
  gltf.scene.updateMatrixWorld(true);

  const meshes: Mesh[] = [];
  gltf.scene.traverse((child: Object3D) => {
    if ((child as Mesh).isMesh) meshes.push(child as Mesh);
  });

  const positions = new Float32Array(particleCount * 3);
  const normals = new Float32Array(particleCount * 3);
  const tempPos = new Vector3();
  const tempNorm = new Vector3();
  const normMatrix = new Matrix3();

  let filled = 0;
  const perMesh = Math.floor(particleCount / meshes.length);

  for (let m = 0; m < meshes.length; m++) {
    const mesh = meshes[m];
    const count = m < meshes.length - 1 ? perMesh : particleCount - filled;
    normMatrix.getNormalMatrix(mesh.matrixWorld);
    const sampler = new MeshSurfaceSampler(mesh).build();
    for (let i = 0; i < count; i++) {
      sampler.sample(tempPos, tempNorm);
      mesh.localToWorld(tempPos);
      tempNorm.applyMatrix3(normMatrix).normalize();
      const b = (filled + i) * 3;
      positions[b] = tempPos.x;
      positions[b + 1] = tempPos.y;
      positions[b + 2] = tempPos.z;
      normals[b] = tempNorm.x;
      normals[b + 1] = tempNorm.y;
      normals[b + 2] = tempNorm.z;
    }
    filled += count;
  }

  return { positions, normals };
}
