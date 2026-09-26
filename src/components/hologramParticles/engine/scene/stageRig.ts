import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  RepeatWrapping,
  TorusGeometry,
  type Texture,
} from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  abs,
  clamp,
  float,
  mx_noise_float,
  normalView,
  positionLocal,
  pow,
  sin,
  smoothstep as tslSmoothstep,
  texture as tslTexture,
  time,
  uniform,
  uv,
  vec3,
} from "three/tsl";
import type { HologramParams } from "../../types";

/* ------------------------------------------------------------------ */
/* The stage rig around the particle body: a transparent holographic    */
/* cylinder with animated noise lines, and split halo rings at its top  */
/* and bottom edges.                                                    */
/* ------------------------------------------------------------------ */

export function prepareTriangleTexture(tex: Texture) {
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

export function createHoloCylinder(p: HologramParams, triTex: Texture) {
  const cylGeo = new CylinderGeometry(p.cylRadius, p.cylRadius, p.cylHeight, 64, 1, true);
  const cylMat = new MeshBasicNodeMaterial() as any;
  cylMat.transparent = true;
  cylMat.side = DoubleSide;
  cylMat.depthWrite = false;

  const uCylColor = uniform(new Color(p.cylColor));
  const uCylNoiseScale = uniform(p.cylNoiseScale);
  const uCylLineWidth = uniform(p.cylLineWidth);
  const uCylFresnelPow = uniform(p.cylFresnelPow);
  const uCylBaseOpacity = uniform(p.cylBaseOpacity);
  const uCylLineOpacity = uniform(p.cylLineOpacity);
  const uCylNoiseSpeed = uniform(p.cylNoiseSpeed);
  const uCylPulseSpeed = uniform(p.cylPulseSpeed);
  const uCylPulseAmp = uniform(p.cylPulseAmp);
  const uCylPulseEasing = uniform(p.cylPulseEasing);
  const uCylWaveFreq = uniform(p.cylWaveFreq);
  const uCylTexRepeat = uniform(p.cylTexRepeat);

  const NdotV = abs(normalView.z);
  const fresnelRim = pow(clamp(float(1).sub(NdotV), float(0), float(1)), uCylFresnelPow);

  const cylTimeOff1 = vec3(
    time.mul(uCylNoiseSpeed),
    float(0),
    time.mul(uCylNoiseSpeed).mul(float(0.7)),
  );
  const cylTimeOff2 = vec3(
    float(0),
    time.mul(uCylNoiseSpeed).mul(float(0.5)),
    time.mul(uCylNoiseSpeed).mul(float(1.3)),
  );

  const cylP1 = positionLocal.mul(uCylNoiseScale).add(cylTimeOff1);
  const cylP2 = positionLocal
    .mul(uCylNoiseScale.mul(float(1.87)))
    .add(vec3(17.3, 5.7, 23.1))
    .add(cylTimeOff2);
  const cylLine1 = float(1).sub(tslSmoothstep(float(0), uCylLineWidth, abs(mx_noise_float(cylP1))));
  const cylLine2 = float(1).sub(tslSmoothstep(float(0), uCylLineWidth, abs(mx_noise_float(cylP2))));
  const cylLinePat = clamp(cylLine1.add(cylLine2), float(0), float(1));

  const cylPhase = time.mul(uCylPulseSpeed).sub(positionLocal.y.mul(uCylWaveFreq));
  const cylSineRaw = sin(cylPhase).mul(float(0.5)).add(float(0.5));
  const cylPulse = pow(cylSineRaw, uCylPulseEasing);
  const cylPulsedLineOp = uCylLineOpacity.mul(
    float(1).sub(uCylPulseAmp).add(uCylPulseAmp.mul(cylPulse)),
  );

  const cylTexUV = uv().mul(uCylTexRepeat);
  const texBright = tslTexture(triTex, cylTexUV).r;

  const detailOp = texBright.mul(cylLinePat).mul(fresnelRim).mul(cylPulsedLineOp);
  const cylFinalOp = clamp(fresnelRim.mul(uCylBaseOpacity).add(detailOp), float(0), float(1));

  cylMat.colorNode = uCylColor;
  cylMat.opacityNode = cylFinalOp;

  const mesh = new Mesh(cylGeo, cylMat);
  mesh.position.set(0, p.cylHeight / 2 + p.cylY, 0);
  mesh.visible = p.cylVisible;

  return {
    mesh,
    sync(params: HologramParams) {
      uCylColor.value.set(params.cylColor);
      uCylNoiseScale.value = params.cylNoiseScale;
      uCylLineWidth.value = params.cylLineWidth;
      uCylFresnelPow.value = params.cylFresnelPow;
      uCylBaseOpacity.value = params.cylBaseOpacity;
      uCylLineOpacity.value = params.cylLineOpacity;
      uCylNoiseSpeed.value = params.cylNoiseSpeed;
      uCylPulseSpeed.value = params.cylPulseSpeed;
      uCylPulseAmp.value = params.cylPulseAmp;
      uCylPulseEasing.value = params.cylPulseEasing;
      uCylWaveFreq.value = params.cylWaveFreq;
      uCylTexRepeat.value = params.cylTexRepeat;
      mesh.visible = params.cylVisible;
    },
    /** radius / height / y changed */
    rebuild(params: HologramParams) {
      const old = mesh.geometry;
      mesh.geometry = new CylinderGeometry(
        params.cylRadius,
        params.cylRadius,
        params.cylHeight,
        64,
        1,
        true,
      );
      mesh.position.y = params.cylHeight / 2 + params.cylY;
      old.dispose();
    },
    dispose() {
      mesh.geometry.dispose();
      cylMat.dispose();
    },
  };
}

export function createHaloRings(p: HologramParams) {
  const gapRad = p.ringGap * (Math.PI / 180);
  const arcSpan = Math.PI - gapRad;

  const makeRingGeo = (radius: number, thickness: number, span: number) =>
    new TorusGeometry(radius, thickness, 8, 80, span);

  const ringMat = new MeshBasicNodeMaterial() as any;
  ringMat.transparent = true;
  ringMat.depthWrite = false;
  ringMat.side = DoubleSide;

  const uRingColor = uniform(new Color(p.ringColor));
  const uRingOpacity = uniform(p.ringOpacity);
  const uRingBrightness = uniform(p.ringBrightness);
  ringMat.colorNode = uRingColor.mul(uRingBrightness);
  ringMat.opacityNode = uRingOpacity;

  const meshes: Mesh[] = [];
  const wrappers: Group[] = [];
  const makeArcPair = () => {
    const m1 = new Mesh(makeRingGeo(p.ringRadius, p.ringThickness, arcSpan), ringMat);
    m1.rotation.x = -Math.PI / 2;
    const m2 = new Mesh(makeRingGeo(p.ringRadius, p.ringThickness, arcSpan), ringMat);
    m2.rotation.x = -Math.PI / 2;
    const wA = new Group();
    wA.rotation.y = gapRad / 2;
    wA.add(m1);
    const wB = new Group();
    wB.rotation.y = Math.PI + gapRad / 2;
    wB.add(m2);
    meshes.push(m1, m2);
    wrappers.push(wA, wB);
    return [wA, wB];
  };

  const topGroup = new Group();
  topGroup.position.y = p.cylHeight + p.cylY;
  topGroup.add(...makeArcPair());

  const botGroup = new Group();
  botGroup.position.y = p.cylY;
  botGroup.add(...makeArcPair());

  /** spun together with the particle body */
  const group = new Group();
  group.add(topGroup, botGroup);
  group.visible = p.ringVisible;

  return {
    group,
    sync(params: HologramParams) {
      uRingColor.value.set(params.ringColor);
      uRingOpacity.value = params.ringOpacity;
      uRingBrightness.value = params.ringBrightness;
      group.visible = params.ringVisible;
    },
    /** follow the cylinder's height / offset */
    placeOnCylinder(params: HologramParams) {
      topGroup.position.y = params.cylHeight + params.cylY;
      botGroup.position.y = params.cylY;
    },
    /** radius / thickness / gap changed */
    rebuild(params: HologramParams) {
      const gap = params.ringGap * (Math.PI / 180);
      const span = Math.PI - gap;
      for (const mesh of meshes) {
        const old = mesh.geometry;
        mesh.geometry = makeRingGeo(params.ringRadius, params.ringThickness, span);
        old.dispose();
      }
      wrappers.forEach((w, i) => {
        w.rotation.y = i % 2 === 0 ? gap / 2 : Math.PI + gap / 2;
      });
    },
    dispose() {
      ringMat.dispose();
      for (const mesh of meshes) mesh.geometry.dispose();
    },
  };
}
