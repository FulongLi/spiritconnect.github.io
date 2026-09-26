import {
  Color,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Vector3,
} from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  attribute,
  clamp,
  cos,
  dot,
  float,
  mix,
  mx_fractal_noise_vec3,
  mx_noise_float,
  normalize,
  normalLocal,
  positionLocal,
  pow,
  sin,
  time,
  uniform,
  vec3,
} from "three/tsl";
import type { GeometryData, HologramParams } from "../../types";

/* ------------------------------------------------------------------ */
/* The particle body: one instanced icosahedron per particle. Each      */
/* instance blends between a source and a target shape                 */
/* (instancePos → instancePosTarget) so models can morph on the GPU.   */
/* Shading, noise, mouse displacement and glow are all TSL nodes.       */
/* ------------------------------------------------------------------ */

export function createParticleUniforms(p: HologramParams) {
  return {
    color: uniform(new Color(p.color)),
    floatAmp: uniform(p.floatAmp),
    breathAmp: uniform(p.breathAmp),
    sphereSize: uniform(p.sphereSize),
    ambient: uniform(p.ambient),
    wrap: uniform(p.wrap),
    light1Pos: uniform(new Vector3(p.light1X, p.light1Y, p.light1Z)),
    light1Color: uniform(new Color(p.light1Color)),
    light1Intensity: uniform(p.light1Intensity),
    light2Pos: uniform(new Vector3(p.light2X, p.light2Y, p.light2Z)),
    light2Color: uniform(new Color(p.light2Color)),
    light2Intensity: uniform(p.light2Intensity),
    volumeStrength: uniform(p.volumeStrength),
    noiseAmp: uniform(p.noiseAmp),
    noiseScale: uniform(p.noiseScale),
    noiseSpeed: uniform(p.noiseSpeed),
    noiseGain: uniform(p.noiseGain),
    maskScale: uniform(p.maskScale),
    maskSpeed: uniform(p.maskSpeed),
    maskContrast: uniform(p.transitionMaskContrast),
    mousePos: uniform(new Vector3()),
    mouseVel: uniform(new Vector3()),
    mouseRadius: uniform(p.mouseRadius),
    mouseStrength: uniform(p.mouseStrength),
    mouseScatter: uniform(p.mouseScatter),
    mouseGlowColor: uniform(new Color(p.mouseGlowColor)),
    mouseGlowPassive: uniform(p.mouseGlowPassive),
    mouseGlowActive: uniform(p.mouseGlowActive),
    mouseGlowPow: uniform(p.mouseGlowPow),
    mouseGlowEnergy: uniform(0),
    transitionProgress: uniform(0),
    transitionGlowScale: uniform(p.transitionGlowScale),
    entranceGlow: uniform(1),
  };
}

export type ParticleUniforms = ReturnType<typeof createParticleUniforms>;

export type ParticleAttributes = {
  pos: InstancedBufferAttribute;
  norm: InstancedBufferAttribute;
  posTarget: InstancedBufferAttribute;
  normTarget: InstancedBufferAttribute;
};

export function createParticleField(
  { positions, normals }: GeometryData,
  particleCount: number,
  p: HologramParams,
) {
  const seeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) seeds[i] = Math.random();

  // ── Sphere geometry ───────────────────────────────────────────────────────
  // instancePos / instanceNormal start at zero: the first "morph" is the
  // entrance, where particles flow out of the origin into the model.
  const sphereGeo = new IcosahedronGeometry(1, 0);
  sphereGeo.setAttribute("instanceSeed", new InstancedBufferAttribute(seeds, 1));
  sphereGeo.setAttribute(
    "instanceNormal",
    new InstancedBufferAttribute(new Float32Array(normals.length), 3),
  );
  sphereGeo.setAttribute(
    "instancePos",
    new InstancedBufferAttribute(new Float32Array(positions.length), 3),
  );
  sphereGeo.setAttribute("instanceNormalTarget", new InstancedBufferAttribute(normals.slice(), 3));
  sphereGeo.setAttribute("instancePosTarget", new InstancedBufferAttribute(positions.slice(), 3));

  const mesh = new InstancedMesh(sphereGeo, null as any, particleCount);
  mesh.instanceMatrix.needsUpdate = true;

  const attrs: ParticleAttributes = {
    pos: sphereGeo.getAttribute("instancePos") as InstancedBufferAttribute,
    norm: sphereGeo.getAttribute("instanceNormal") as InstancedBufferAttribute,
    posTarget: sphereGeo.getAttribute("instancePosTarget") as InstancedBufferAttribute,
    normTarget: sphereGeo.getAttribute("instanceNormalTarget") as InstancedBufferAttribute,
  };

  // ── TSL uniforms ──────────────────────────────────────────────────────────
  const u = createParticleUniforms(p);

  // ── TSL material ──────────────────────────────────────────────────────────
  const material = new MeshBasicNodeMaterial() as any;

  const seedAttr = attribute("instanceSeed", "float");
  const instNorm = attribute("instanceNormal", "vec3");
  const instPos = attribute("instancePos", "vec3");
  const instNormTgt = attribute("instanceNormalTarget", "vec3");
  const instPosTgt = attribute("instancePosTarget", "vec3");

  const blendPos = mix(instPos, instPosTgt, u.transitionProgress);
  const blendNorm = normalize(mix(instNorm, instNormTgt, u.transitionProgress));

  const phase = seedAttr.mul(Math.PI * 2);

  // ── Animation ─────────────────────────────────────────────────────────────
  const floatDisp = vec3(
    cos(time.mul(1.3).add(phase)).mul(u.floatAmp).mul(0.6),
    sin(time.mul(1.6).add(phase)).mul(u.floatAmp),
    sin(time.mul(1.1).add(phase.add(1.0)))
      .mul(u.floatAmp)
      .mul(0.6),
  );

  const maskCoord = blendPos
    .mul(u.maskScale)
    .add(
      vec3(
        time.mul(u.maskSpeed),
        time.mul(u.maskSpeed).mul(0.7),
        time.mul(u.maskSpeed).mul(1.3),
      ),
    );

  const rawMask = mx_noise_float(maskCoord);
  const mask = pow(clamp(rawMask.mul(0.5).add(0.5), float(0), float(1)), u.maskContrast);

  const noiseCoord = blendPos
    .mul(u.noiseScale)
    .add(vec3(time.mul(u.noiseSpeed), float(0), time.mul(u.noiseSpeed).mul(0.7)));

  const noiseDisp = mx_fractal_noise_vec3(noiseCoord, 2, 2.0, u.noiseGain)
    .mul(u.noiseAmp)
    .mul(mask);

  // ── Mouse displacement ────────────────────────────────────────────────────
  const toMouse = u.mousePos.sub(blendPos);
  const dist = toMouse.length();
  const falloff = clamp(float(1.0).sub(dist.div(u.mouseRadius)), float(0), float(1));
  const impulseLen = u.mouseVel.length();
  const velDir = normalize(u.mouseVel.add(vec3(0.0001, 0.0001, 0.0001)));
  const rawRand = vec3(
    sin(seedAttr.mul(127.1)),
    cos(seedAttr.mul(311.7)),
    sin(seedAttr.mul(74.3).add(1.0)),
  );
  const randUnit = normalize(rawRand);
  const onAxis = velDir.mul(dot(randUnit, velDir));
  const perpToVel = normalize(randUnit.sub(onAxis).add(vec3(0, 0.0001, 0)));
  const mouseDisp = velDir
    .add(perpToVel.mul(u.mouseScatter))
    .mul(impulseLen)
    .mul(u.mouseStrength)
    .mul(falloff.mul(falloff));

  material.positionNode = positionLocal
    .mul(u.sphereSize)
    .add(blendPos)
    .add(blendNorm.mul(sin(time.mul(1.15)).mul(u.breathAmp)))
    .add(floatDisp)
    .add(noiseDisp)
    .add(mouseDisp);

  // ── Shading ───────────────────────────────────────────────────────────────
  const lightContrib = (lightPos: any, lightCol: any, lightInt: any) => {
    const dir = normalize(lightPos.sub(blendPos));
    const figW = clamp(
      dot(blendNorm, dir).add(u.wrap).div(float(1.0).add(u.wrap)),
      float(0),
      float(1),
    );
    const sphW = clamp(
      dot(normalize(normalLocal), dir).add(u.wrap).div(float(1.0).add(u.wrap)),
      float(0),
      float(1),
    );
    const diffuse = mix(figW, figW.mul(sphW), u.volumeStrength);
    return lightCol.mul(diffuse).mul(lightInt);
  };

  const litColor = lightContrib(u.light1Pos, u.light1Color, u.light1Intensity).add(
    lightContrib(u.light2Pos, u.light2Color, u.light2Intensity),
  );

  const shadedColor = u.color.mul(clamp(litColor.add(u.ambient), float(0), float(1)));

  // ── Mouse glow ────────────────────────────────────────────────────────────
  const glowFalloff = pow(clamp(falloff, float(0), float(1)), u.mouseGlowPow);
  const passiveGlow = glowFalloff.mul(u.mouseGlowPassive);
  const activeGlow = glowFalloff.mul(u.mouseGlowEnergy).mul(u.mouseGlowActive);
  const mouseGlowFactor = clamp(passiveGlow.add(activeGlow), float(0), float(1));

  // ── Transition glow ───────────────────────────────────────────────────────
  const morphActivity = u.transitionProgress
    .mul(float(1).sub(u.transitionProgress))
    .mul(float(4));
  const transDispMag = instPosTgt.sub(instPos).length();
  const transNorm = clamp(transDispMag.mul(float(0.35)), float(0), float(1));
  const transGlow = transNorm.mul(morphActivity).mul(u.transitionGlowScale);

  const glowFactor = clamp(mouseGlowFactor.add(transGlow), float(0), float(1)).mul(
    u.entranceGlow,
  );
  material.colorNode = mix(shadedColor, u.mouseGlowColor, glowFactor);

  mesh.material = material;

  return {
    mesh,
    uniforms: u,
    attrs,
    /** push the per-render parameters into the uniforms */
    sync(params: HologramParams, idle: boolean) {
      if (idle) u.color.value.set(params.color);
      u.floatAmp.value = params.floatAmp;
      u.breathAmp.value = params.breathAmp;
      u.sphereSize.value = params.sphereSize;
      u.ambient.value = params.ambient;
      u.wrap.value = params.wrap;
      u.volumeStrength.value = params.volumeStrength;
      u.noiseAmp.value = params.noiseAmp;
      u.noiseScale.value = params.noiseScale;
      u.noiseSpeed.value = params.noiseSpeed;
      u.noiseGain.value = params.noiseGain;
      u.maskScale.value = params.maskScale;
      u.maskSpeed.value = params.maskSpeed;
      if (idle) u.maskContrast.value = params.maskContrast;
      u.mouseRadius.value = params.mouseRadius;
      u.mouseStrength.value = params.mouseStrength;
      u.mouseScatter.value = params.mouseScatter;
      u.mouseGlowColor.value.set(params.mouseGlowColor);
      u.mouseGlowPassive.value = params.mouseGlowPassive;
      u.mouseGlowActive.value = params.mouseGlowActive;
      u.mouseGlowPow.value = params.mouseGlowPow;
      u.transitionGlowScale.value = params.transitionGlowScale;
      u.light1Pos.value.set(params.light1X, params.light1Y, params.light1Z);
      u.light1Color.value.set(params.light1Color);
      u.light1Intensity.value = params.light1Intensity;
      u.light2Pos.value.set(params.light2X, params.light2Y, params.light2Z);
      u.light2Color.value.set(params.light2Color);
      u.light2Intensity.value = params.light2Intensity;
    },
    dispose() {
      sphereGeo.dispose();
      material.dispose();
    },
  };
}

export type ParticleField = ReturnType<typeof createParticleField>;
