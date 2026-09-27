import * as THREE from "three";
import { R, rand } from "./random";
import { makeRibbon, terrainHeight } from "./terrain";

type Track = <T extends { dispose: () => void }>(o: T) => T;
type StdFactory = (
  color: string,
  extra?: THREE.MeshStandardMaterialParameters
) => THREE.MeshStandardMaterial;

export type ConduitNetwork = {
  update: (dt: number, elapsed: number, themeMix: number) => void;
  /** after the shared conduit colour has been themed */
  applyTheme: (mix: number, conduitColor: THREE.Color) => void;
  /**
   * AI → energy feedback loop strength (0..1). Energy keeps flowing out
   * (amber); as the loop engages, the returning data network (blue) brightens
   * and speeds up, carrying design information back to the sources.
   */
  setLoop: (k: number) => void;
};

/* ---------------- conduits: two semantic networks ----------------
   POWER (amber dots / warm ribbons): generation → storage → SST → loads
   DATA  (blue dots / blue ribbons): habitat ring, comms, data centre  */

/* Every link in the base carries a TWIN pair of lines:
   an amber ENERGY line and, running beside it, a blue DATA line
   (data dots flow in the opposite direction — information returns). */
const LINKS: [number, number][][] = [
  // the fan: PV / reactor / BESS each feed the SST hub directly
  [[72, 34], [60, 22], [50, 6]], // PV -> SST
  [[85, 1], [70, 1], [52, 1]], // reactor -> SST
  [[70, -28], [58, -16], [49, -5]], // BESS -> SST
  // SST outputs
  [[40, -7], [30, -24], [20, -38]], // SST -> data centre
  [[39, 2], [30, 2], [24, 2]], // SST -> habitat hexagon
  [[39, 2], [24, 0], [-42, -8], [-58, -12], [-74, -16]], // habitat edge -> charger branch junction
  [[-74, -16], [-83, -18], [-92, -20], [-108, -23], [-128, -27]], // junction -> left pad + charger branch
  [[-74, -16], [-84, -6], [-94, 4], [-111, 5.5], [-128, 7]], // junction -> upper pad + charger branch (flipped, left)
  [[-19, 14], [-36, 20], [-58, 40], [-80, 60]], // second habitat edge -> charger branch junction
  [[-80, 60], [-90, 62], [-100, 64], [-108, 66], [-128, 70]], // second junction -> left pad + charger branch
  [[-80, 60], [-80, 72], [-80, 82], [-68, 84], [-44, 88]], // second junction -> lower pad + charger branch
  // habitat loop following the hexagon perimeter — open, like the corridor
  // ring, across the court in front of the main Dome's airlock
  [
    [-7.8, -21.7],
    [14.9, -17.5],
    [22.6, 4.1],
    [7.8, 21.7],
    [-14.9, 17.5],
    [-22.6, -4.1],
  ],
  [[18, 12], [24, 24], [30, 31]], // hexagon -> comms tower
  [[14, -38], [8, -30], [4, -24]], // data centre -> hexagon
  [[-19, 14], [-23, 24], [-25, 31]], // hexagon -> HDU
];

/** shift a polyline sideways so the twin lines run in parallel */
function offsetPath(pts: [number, number][], d: number): [number, number][] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const L = Math.hypot(dx, dz) || 1;
    return [p[0] - (dz / L) * d, p[1] + (dx / L) * d] as [number, number];
  });
}

export function buildConduits(opts: {
  group: THREE.Group;
  track: Track;
  std: StdFactory;
  /** blue emissive conduit material shared with dome rings, pads, … */
  conduitMat: THREE.MeshStandardMaterial;
  dotTex: THREE.Texture;
}): ConduitNetwork {
  const { group, track, std, conduitMat, dotTex } = opts;

  const conduitAmberMat = std("#1a1208", {
    roughness: 0.4,
    emissive: new THREE.Color("#ffb53f"),
    emissiveIntensity: 0.5,
  });

  type PathDef = { kind: "power" | "data"; pts: [number, number][] };
  const pathDefs: PathDef[] = LINKS.flatMap((pts) => [
    { kind: "power" as const, pts: offsetPath(pts, 0.85) },
    { kind: "data" as const, pts: offsetPath(pts, -0.85) },
  ]);

  type Flow = { samples: Float32Array; nSamples: number; count: number; speed: number };
  const flows: Flow[] = [];
  const flowKinds: ("power" | "data")[] = [];
  const conduitPulses: {
    mat: THREE.MeshStandardMaterial;
    phase: number;
    kind: "power" | "data";
  }[] = [];
  let totalDots = 0;
  let pathIndex = 0;
  for (const def of pathDefs) {
    const pts = def.pts.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.25, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
    const len = curve.getLength();
    const ribbon = track(makeRibbon(curve, 0.85, Math.max(28, Math.floor(len / 1.8)), 0.16));
    const ribbonMat = track((def.kind === "power" ? conduitAmberMat : conduitMat).clone());
    conduitPulses.push({ mat: ribbonMat, phase: pathIndex * 1.35, kind: def.kind });
    pathIndex++;
    const conduitMesh = new THREE.Mesh(ribbon, ribbonMat);
    group.add(conduitMesh);

    const nSamples = 220;
    const spaced = curve.getSpacedPoints(nSamples - 1);
    const samples = new Float32Array(nSamples * 3);
    spaced.forEach((p, i) => {
      samples[i * 3] = p.x;
      samples[i * 3 + 1] = terrainHeight(p.x, p.z) + 0.6;
      samples[i * 3 + 2] = p.z;
    });
    const count = Math.max(5, Math.round(len / 3.2));
    flows.push({ samples, nSamples, count, speed: R(0.03, 0.05) });
    flowKinds.push(def.kind);
    totalDots += count;
  }

  const dotPositions = new Float32Array(totalDots * 3);
  const dotColors = new Float32Array(totalDots * 3);
  const cBlue = new THREE.Color("#2ebcfe"); // information
  const cAmber = new THREE.Color("#ffb53f"); // energy
  const writeBaseColors = () => {
    let di = 0;
    flows.forEach((f, fi) => {
      const c = flowKinds[fi] === "power" ? cAmber : cBlue;
      for (let i = 0; i < f.count; i++) {
        dotColors[di * 3] = c.r;
        dotColors[di * 3 + 1] = c.g;
        dotColors[di * 3 + 2] = c.b;
        di++;
      }
    });
  };
  writeBaseColors();
  const dotGeo = track(new THREE.BufferGeometry());
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
  dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
  const dotMat = track(
    new THREE.PointsMaterial({
      size: 1.35,
      map: dotTex, // round sprites instead of square points
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.frustumCulled = false;
  group.add(dots);

  /* ---------------- per-frame ---------------- */
  // seeded lazily on the first frame so the shared `rand` stream is consumed
  // after every build-time call, exactly as before the module split
  let flowOffsets: number[] | null = null;
  let loop = 0;
  let loopColorsDirty = false;

  function update(dt: number, elapsed: number, themeMix: number) {
    if (!flowOffsets) flowOffsets = flows.map(() => rand());

    const baseBlue = 0.55 + 0.85 * themeMix;
    const baseAmber = 0.5 + 0.8 * themeMix;
    const dataBoost = 1 + 1.3 * loop;
    const powerDim = 1 - 0.25 * loop;
    for (const p of conduitPulses) {
      const w = 0.5 + 0.5 * Math.sin(elapsed * 1.7 + p.phase);
      p.mat.emissiveIntensity =
        (p.kind === "power" ? baseAmber * powerDim : baseBlue * dataBoost) * (0.75 + 0.45 * w);
    }

    const recolor = loop > 0.001 || loopColorsDirty;
    let idx = 0;
    for (let fi = 0; fi < flows.length; fi++) {
      const f = flows[fi];
      const isData = flowKinds[fi] === "data";
      // energy flows outward; data flows back the other way — faster once
      // the AI loop is engaged
      const dir = isData ? -1 : 1;
      const speed = isData ? f.speed * (1 + 2.2 * loop) : f.speed;
      flowOffsets[fi] = (((flowOffsets[fi] + dt * speed * dir) % 1) + 1) % 1;
      for (let i = 0; i < f.count; i++) {
        const t = (i / f.count + flowOffsets[fi]) % 1;
        const fIdx = t * (f.nSamples - 1);
        const i0 = Math.floor(fIdx);
        const i1 = Math.min(f.nSamples - 1, i0 + 1);
        const frac = fIdx - i0;
        dotPositions[idx * 3] = f.samples[i0 * 3] + (f.samples[i1 * 3] - f.samples[i0 * 3]) * frac;
        dotPositions[idx * 3 + 1] =
          f.samples[i0 * 3 + 1] + (f.samples[i1 * 3 + 1] - f.samples[i0 * 3 + 1]) * frac;
        dotPositions[idx * 3 + 2] =
          f.samples[i0 * 3 + 2] + (f.samples[i1 * 3 + 2] - f.samples[i0 * 3 + 2]) * frac;

        if (recolor) {
          let gain: number;
          if (isData) {
            // bright information "packets" travelling back along the line
            const packet = Math.pow(0.5 + 0.5 * Math.sin((t + elapsed * 0.35) * Math.PI * 4), 8);
            gain = 1 + loop * (0.55 + 1.4 * packet);
          } else {
            gain = powerDim;
          }
          const c = isData ? cBlue : cAmber;
          dotColors[idx * 3] = c.r * gain;
          dotColors[idx * 3 + 1] = c.g * gain;
          dotColors[idx * 3 + 2] = c.b * gain;
        }
        idx++;
      }
    }
    (dotGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (recolor) {
      if (loop <= 0.001) {
        writeBaseColors();
        loopColorsDirty = false;
      }
      (dotGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  function applyTheme(mix: number, conduitColor: THREE.Color) {
    conduitAmberMat.color.copy(conduitColor);
    for (const p of conduitPulses) {
      p.mat.color.copy(conduitColor);
    }
    conduitAmberMat.emissiveIntensity = 0.5 + 0.8 * mix;
    dotMat.size = 1.35 + 0.75 * mix;
  }

  function setLoop(k: number) {
    const next = Math.min(1, Math.max(0, k));
    if (next <= 0.001 && loop > 0.001) loopColorsDirty = true;
    loop = next;
  }

  return { update, applyTheme, setLoop };
}
