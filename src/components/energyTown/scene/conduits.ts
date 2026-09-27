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
   * (amber) and measurements keep flowing in to the data centre (blue);
   * as the loop engages the data network brightens, and above ~0.3
   * feedback waves leave the data centre and travel back out through the
   * whole network to the sources — the redesign returning to the system.
   */
  setLoop: (k: number) => void;
  /** 0..1: a feedback wave is leaving the data centre right now */
  feedbackPulse: () => number;
  /** reduced motion: no travelling feedback waves */
  setReducedMotion: (reduced: boolean) => void;
};

/* ---------------- conduits: two semantic networks ----------------
   POWER (amber dots / warm ribbons): generation → storage → SST → loads
   DATA  (blue dots / blue ribbons): every installation ↔ data centre  */

/* Every link in the base carries a TWIN pair of lines: an amber ENERGY
   line (authored in the direction energy flows) and, beside it, a blue
   DATA line. Data dots always travel toward the data centre (the
   physical system becomes data); feedback waves travel away from it
   (intelligence returns to redesign the system). Directions come from
   each point's network distance to the data centre. */
export const CONDUIT_ROUTES: [number, number][][] = [
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
  /** footprints (landing pads, pad domes) the conduits run beneath: no flow dots there */
  covered?: { x: number; z: number; r: number }[];
}): ConduitNetwork {
  const { group, track, std, conduitMat, dotTex, covered = [] } = opts;

  const conduitAmberMat = std("#1a1208", {
    roughness: 0.4,
    emissive: new THREE.Color("#ffb53f"),
    emissiveIntensity: 0.5,
  });

  type PathDef = { kind: "power" | "data"; link: number; pts: [number, number][] };
  const pathDefs: PathDef[] = CONDUIT_ROUTES.flatMap((pts, link) => [
    { kind: "power" as const, link, pts: offsetPath(pts, 0.85) },
    { kind: "data" as const, link, pts: offsetPath(pts, -0.85) },
  ]);
  const network = networkDistances();

  type Flow = {
    samples: Float32Array;
    /** network distance to the data centre at each sample */
    dist: Float32Array;
    nSamples: number;
    count: number;
    speed: number;
    /** +1: dots run with the authored direction, -1: against it */
    dir: 1 | -1;
  };
  const flows: Flow[] = [];
  const flowKinds: ("power" | "data")[] = [];
  const conduitPulses: {
    mat: THREE.MeshStandardMaterial;
    phase: number;
    kind: "power" | "data";
    /** network-distance range the ribbon spans (for the feedback wave) */
    near: number;
    far: number;
  }[] = [];
  let totalDots = 0;
  let pathIndex = 0;
  for (const def of pathDefs) {
    const pts = def.pts.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.25, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
    const len = curve.getLength();
    const ribbon = track(makeRibbon(curve, 0.85, Math.max(28, Math.floor(len / 1.8)), 0.16));
    const ribbonMat = track((def.kind === "power" ? conduitAmberMat : conduitMat).clone());
    const linkDist = network[def.link];
    conduitPulses.push({
      mat: ribbonMat,
      phase: pathIndex * 1.35,
      kind: def.kind,
      near: Math.min(...linkDist),
      far: Math.max(...linkDist),
    });
    pathIndex++;
    const conduitMesh = new THREE.Mesh(ribbon, ribbonMat);
    group.add(conduitMesh);

    const nSamples = 220;
    const spaced = curve.getSpacedPoints(nSamples - 1);
    const samples = new Float32Array(nSamples * 3);
    spaced.forEach((p, i) => {
      samples[i * 3] = p.x;
      // under a pad deck the line runs inside the foundation: park its dots out of sight
      const hidden = covered.some((c) => (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < c.r * c.r);
      samples[i * 3 + 1] = hidden ? HIDDEN_Y : terrainHeight(p.x, p.z) + 0.6;
      samples[i * 3 + 2] = p.z;
    });
    const dist = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) dist[i] = sampleAlong(linkDist, i / (nSamples - 1));
    // energy runs as authored; data runs toward the data centre
    const dir: 1 | -1 = def.kind === "power" || dist[nSamples - 1] < dist[0] ? 1 : -1;
    const count = Math.max(5, Math.round(len / 3.2));
    flows.push({ samples, dist, nSamples, count, speed: R(0.03, 0.05), dir });
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
  let dotSize = 1.35;
  let reducedMotion = false;
  /** time since the current run of feedback waves began */
  let waveClock = 0;
  let waveAmp = 0;
  let waveFront = -1e3;

  /** feedback-wave brightness at network distance d (front at waveFront) */
  const waveAt = (d: number) => {
    const ahead = waveFront - d;
    if (ahead < -WAVE.width * 3) return 0;
    const front = Math.exp(-((ahead / WAVE.width) ** 2));
    const tail = ahead > 0 ? 0.3 * Math.exp(-ahead / WAVE.tail) : 0;
    return waveAmp * (front + tail);
  };

  function update(dt: number, elapsed: number, themeMix: number) {
    if (!flowOffsets) flowOffsets = flows.map(() => rand());

    // one wave at a time leaves the data centre and runs out to the far
    // ends of the network; the first leaves as soon as the loop engages
    waveAmp = reducedMotion ? 0 : smooth(0.35, 0.9, loop);
    if (waveAmp > 0) waveClock += dt;
    else waveClock = 0;
    waveFront = waveAmp > 0 ? (waveClock % WAVE.period) * WAVE.speed : -1e3;

    const baseBlue = 0.55 + 0.85 * themeMix;
    const baseAmber = 0.5 + 0.8 * themeMix;
    // the steady data lines brighten a little; the waves carry the story
    const dataBoost = 1 + 0.8 * loop;
    const powerDim = 1 - 0.25 * loop;
    for (const p of conduitPulses) {
      const w = 0.5 + 0.5 * Math.sin(elapsed * 1.7 + p.phase);
      let k = (p.kind === "power" ? baseAmber * powerDim : baseBlue * dataBoost) * (0.75 + 0.45 * w);
      if (p.kind === "data" && waveAmp > 0) {
        // the ribbon lights while the wave front runs along it
        const inside = Math.min(waveFront - p.near, p.far - waveFront + WAVE.width) / WAVE.width;
        k += waveAmp * 2.4 * (0.4 + 0.6 * themeMix) * Math.min(1, Math.max(0, inside + 1));
      }
      p.mat.emissiveIntensity = k;
    }

    const recolor = loop > 0.001 || loopColorsDirty;
    let idx = 0;
    for (let fi = 0; fi < flows.length; fi++) {
      const f = flows[fi];
      const isData = flowKinds[fi] === "data";
      // energy flows outward; data flows in to the data centre — faster
      // once the AI loop is engaged
      const speed = isData ? f.speed * (1 + 2.2 * loop) : f.speed;
      flowOffsets[fi] = (((flowOffsets[fi] + dt * speed * f.dir) % 1) + 1) % 1;
      for (let i = 0; i < f.count; i++) {
        const t = (i / f.count + flowOffsets[fi]) % 1;
        const fIdx = t * (f.nSamples - 1);
        const i0 = Math.floor(fIdx);
        const i1 = Math.min(f.nSamples - 1, i0 + 1);
        const frac = fIdx - i0;
        dotPositions[idx * 3] = f.samples[i0 * 3] + (f.samples[i1 * 3] - f.samples[i0 * 3]) * frac;
        const y0 = f.samples[i0 * 3 + 1];
        const y1 = f.samples[i1 * 3 + 1];
        dotPositions[idx * 3 + 1] = y0 === HIDDEN_Y || y1 === HIDDEN_Y ? HIDDEN_Y : y0 + (y1 - y0) * frac;
        dotPositions[idx * 3 + 2] =
          f.samples[i0 * 3 + 2] + (f.samples[i1 * 3 + 2] - f.samples[i0 * 3 + 2]) * frac;

        if (recolor) {
          let gain: number;
          if (isData) {
            // the data network brightens; the feedback wave passes over it
            const d = f.dist[i0] + (f.dist[i1] - f.dist[i0]) * frac;
            gain = 1 + loop * 0.55 + 2.4 * waveAt(d);
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
    dotSize = 1.35 + 0.75 * mix;
    dotMat.size = dotSize * (1 + 0.6 * loop);
  }

  function setLoop(k: number) {
    const next = Math.min(1, Math.max(0, k));
    if (next <= 0.001 && loop > 0.001) loopColorsDirty = true;
    loop = next;
    // the flow reads from further away once the camera has risen
    dotMat.size = dotSize * (1 + 0.6 * loop);
  }

  return {
    update,
    applyTheme,
    setLoop,
    feedbackPulse: () => (waveAmp > 0 ? waveAmp * Math.exp(-waveFront / 14) : 0),
    setReducedMotion(reduced: boolean) {
      reducedMotion = reduced;
    },
  };
}

/* ---------------- network distance to the data centre ---------------- */

/** flow dots under a covered footprint are parked this far below the ground */
const HIDDEN_Y = -500;

/** feedback wave: metres per second, seconds between waves, profile (m) */
const WAVE = { speed: 46, period: 6.2, width: 7, tail: 22 };
const DATA_CENTRE = { x: 16, z: -42, r: 8 };
/** conduits closer than this (m) are treated as joined */
const JOIN = 4.5;

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** linear lookup in evenly spaced samples, t in 0..1 */
function sampleAlong(values: number[], t: number) {
  const f = Math.min(1, Math.max(0, t)) * (values.length - 1);
  const i = Math.min(values.length - 2, Math.floor(f));
  return values[i] + (values[i + 1] - values[i]) * (f - i);
}

/**
 * Shortest distance along the conduit network from the data centre, at
 * evenly spaced samples of every route (a small Dijkstra over ~2 m steps;
 * routes that pass within JOIN metres of each other are connected).
 */
function networkDistances(): number[][] {
  type Node = { x: number; z: number; link: number };
  const nodes: Node[] = [];
  const firstOf: number[] = [];
  for (let l = 0; l < CONDUIT_ROUTES.length; l++) {
    const curve = new THREE.CatmullRomCurve3(
      CONDUIT_ROUTES[l].map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      "catmullrom",
      0.35,
    );
    const n = Math.max(4, Math.ceil(curve.getLength() / 2));
    firstOf.push(nodes.length);
    for (const p of curve.getSpacedPoints(n)) nodes.push({ x: p.x, z: p.z, link: l });
  }
  const N = nodes.length;
  const dist = new Float64Array(N).fill(Infinity);
  const done = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const d = Math.hypot(nodes[i].x - DATA_CENTRE.x, nodes[i].z - DATA_CENTRE.z);
    if (d < DATA_CENTRE.r) dist[i] = d;
  }
  for (;;) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break;
    done[u] = 1;
    const a = nodes[u];
    for (let v = 0; v < N; v++) {
      if (done[v]) continue;
      const b = nodes[v];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      const neighbour = b.link === a.link ? Math.abs(u - v) === 1 : d < JOIN;
      if (neighbour && dist[u] + d < dist[v]) dist[v] = dist[u] + d;
    }
  }
  // any isolated route falls back to its straight-line distance
  return CONDUIT_ROUTES.map((_, l) => {
    const end = l + 1 < firstOf.length ? firstOf[l + 1] : N;
    const out: number[] = [];
    for (let i = firstOf[l]; i < end; i++) {
      out.push(
        Number.isFinite(dist[i]) ? dist[i] : Math.hypot(nodes[i].x - DATA_CENTRE.x, nodes[i].z - DATA_CENTRE.z),
      );
    }
    return out;
  });
}
