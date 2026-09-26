import { Color, Mesh, PlaneGeometry } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  float,
  fract,
  mx_noise_float,
  positionWorld,
  smoothstep as tslSmoothstep,
  time,
  uniform,
  vec2,
  vec3,
} from "three/tsl";
import type { HologramParams } from "../../types";

/** Animated dot-grid backdrop behind the stage. */
export function createDotGrid(p: HologramParams) {
  const gridGeo = new PlaneGeometry(50, 32);
  const gridMat = new MeshBasicNodeMaterial() as any;
  gridMat.transparent = true;
  gridMat.depthWrite = false;
  gridMat.depthTest = true;

  const uGridColor = uniform(new Color(p.gridColor));
  const uGridBaseOpacity = uniform(p.gridBaseOpacity);
  const uGridWaveAmp = uniform(p.gridWaveAmp);
  const uGridNoiseScale = uniform(p.gridNoiseScale);
  const uGridWaveSpeed = uniform(p.gridWaveSpeed);
  const uGridDensity = uniform(p.gridDensity);
  const uGridDotSize = uniform(p.gridDotSize);

  const cellPos = positionWorld.xy.mul(uGridDensity);
  const fracCell = fract(cellPos).sub(vec2(0.5, 0.5));
  const dotDist = fracCell.length();
  const dotShape = float(1).sub(tslSmoothstep(float(0), uGridDotSize, dotDist));
  const noiseCoord = vec3(
    positionWorld.x.mul(uGridNoiseScale),
    positionWorld.y.mul(uGridNoiseScale),
    time.mul(uGridWaveSpeed),
  );
  const wave = mx_noise_float(noiseCoord).mul(float(0.5)).add(float(0.5));
  const waveBrightness = uGridBaseOpacity.add(wave.mul(uGridWaveAmp));
  gridMat.colorNode = uGridColor.mul(waveBrightness);
  gridMat.opacityNode = dotShape;

  const mesh = new Mesh(gridGeo, gridMat);
  mesh.position.z = -5;
  mesh.renderOrder = -1;

  return {
    mesh,
    sync(params: HologramParams) {
      uGridColor.value.set(params.gridColor);
      uGridBaseOpacity.value = params.gridBaseOpacity;
      uGridWaveAmp.value = params.gridWaveAmp;
      uGridNoiseScale.value = params.gridNoiseScale;
      uGridWaveSpeed.value = params.gridWaveSpeed;
      uGridDensity.value = params.gridDensity;
      uGridDotSize.value = params.gridDotSize;
      mesh.visible = params.gridVisible;
    },
    dispose() {
      gridGeo.dispose();
      gridMat.dispose();
    },
  };
}
