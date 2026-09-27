import * as THREE from "three";
import {
  makeCladdingTexture,
  makeDecalAtlas,
  makeLouvreTexture,
  makeRibTexture,
  type DecalCell,
  type DecalName,
} from "./surfaceTextures";
import { makeSolarCellTexture } from "./textures";

/* ------------------------------------------------------------------ */
/* One industrial material library for every lunar installation, so    */
/* the solar field, reactor, storage, SST and data centre read as      */
/* products of the same manufacturer:                                  */
/*   satin aluminium cladding · dark anodised graphite · steel frames  */
/*   glazed ceramic insulators · copper conductors · dark tech glass   */
/*   sintered-regolith foundations · off-white ceramic decks ·         */
/*   thermal foil · frosted functional lighting                        */
/* Surfaces differ by roughness, metalness and relief, not colour only. */
/* ------------------------------------------------------------------ */

export type MatKey =
  | "alu"
  | "graphite"
  | "frame"
  | "ribbed"
  | "radiator"
  | "vent"
  | "ceramic"
  | "copper"
  | "glass"
  | "foundation"
  | "cable"
  | "deck"
  | "foil"
  | "solar"
  | "lightCool"
  | "lightInfo"
  | "lightAmber"
  | "lightPulse"
  | "decal";

/** materials whose geometry keeps its own UVs instead of metric box UVs */
export const OWN_UV: ReadonlySet<MatKey> = new Set<MatKey>(["decal", "solar"]);
/** self-lit materials: never cast shadows */
export const NO_SHADOW: ReadonlySet<MatKey> = new Set<MatKey>([
  "decal",
  "lightCool",
  "lightInfo",
  "lightAmber",
  "lightPulse",
]);

export type IndustrialKit = {
  mats: Record<MatKey, THREE.MeshStandardMaterial>;
  decalCells: Map<DecalName, DecalCell>;
  applyTheme: (mix: number) => void;
  /** per-frame: functional lighting + the AI-loop information lights */
  update: (elapsed: number, loop: number) => void;
};

type Track = <T extends { dispose: () => void }>(o: T) => T;

export function createIndustrialKit(track: Track): IndustrialKit {
  const cladding = track(makeCladdingTexture());
  const ribs = track(makeRibTexture(0.3));
  const radiatorRibs = track(ribs.clone()); // shares the image, tighter pitch
  radiatorRibs.repeat.set(1 / 0.48, 1);
  const louvre = track(makeLouvreTexture());
  const atlas = makeDecalAtlas();
  track(atlas.texture);
  const solarCells = track(makeSolarCellTexture());

  /** relief + occlusion + roughness from one channel-packed texture */
  const surface = (tex: THREE.Texture, bump: number, ao = 0.75) => ({
    bumpMap: tex,
    bumpScale: bump,
    aoMap: tex,
    aoMapIntensity: ao,
    roughnessMap: tex,
  });

  const std = (p: THREE.MeshStandardMaterialParameters) =>
    track(new THREE.MeshStandardMaterial(p));

  const mats: Record<MatKey, THREE.MeshStandardMaterial> = {
    // satin / brushed aluminium cladding
    alu: std({ color: "#c4ccd4", metalness: 0.6, roughness: 0.52, ...surface(cladding, 0.9) }),
    // dark anodised structural panels
    graphite: std({ color: "#41474f", metalness: 0.5, roughness: 0.6, ...surface(cladding, 0.5, 0.6) }),
    // painted steel frames, posts, pipework
    frame: std({ color: "#6f7781", metalness: 0.65, roughness: 0.48 }),
    // corrugated container walls
    ribbed: std({ color: "#cdd3d9", metalness: 0.45, roughness: 0.6, ...surface(ribs, 2.2, 0.9) }),
    // white-coated tube-and-fin heat-rejection panels
    radiator: std({ color: "#e0e4e8", metalness: 0.15, roughness: 0.5, ...surface(radiatorRibs, 1.6, 0.8) }),
    // louvred vents and grilles
    vent: std({ color: "#30353c", metalness: 0.5, roughness: 0.62, ...surface(louvre, 2.4, 1) }),
    // glazed porcelain HV insulators
    ceramic: std({ color: "#e6e4de", metalness: 0, roughness: 0.24 }),
    // conductors, busbar joints, terminations
    copper: std({ color: "#b3764a", metalness: 1, roughness: 0.32 }),
    // dark technical glass (screens, viewports)
    glass: std({
      color: "#0b1118",
      metalness: 0.85,
      roughness: 0.08,
      emissive: new THREE.Color("#0c2034"),
      emissiveIntensity: 0.25,
    }),
    // sintered-regolith foundations and plinths (formwork joints)
    foundation: std({ color: "#8d8f91", metalness: 0, roughness: 0.94, ...surface(cladding, 0.8, 0.6) }),
    // cable jackets, hoses
    cable: std({ color: "#1c2026", metalness: 0.2, roughness: 0.72 }),
    // off-white lunar-rated ceramic deck and structural panels
    deck: std({ color: "#d9d9d4", metalness: 0.05, roughness: 0.78, ...surface(cladding, 0.45, 0.55) }),
    // champagne multi-layer thermal blanket (lander descent stages)
    foil: std({ color: "#a38c5f", metalness: 0.75, roughness: 0.4, ...surface(cladding, 1.4, 0.5) }),
    // anti-reflective solar glass over monocrystalline cells
    solar: std({
      color: "#ffffff",
      map: solarCells,
      metalness: 0.35,
      roughness: 0.2,
      emissive: new THREE.Color("#1f7fe8"),
      emissiveIntensity: 0.06,
    }),
    // frosted blue-white functional lighting
    lightCool: std({
      color: "#11161d",
      roughness: 0.4,
      emissive: new THREE.Color("#d6efff"),
      emissiveIntensity: 0.9,
    }),
    // information / status lights (brighten with the AI loop)
    lightInfo: std({
      color: "#10161f",
      roughness: 0.4,
      emissive: new THREE.Color("#2ebcfe"),
      emissiveIntensity: 0.8,
    }),
    // restrained warm amber: nuclear, hazard, aviation warning
    lightAmber: std({
      color: "#1a1208",
      roughness: 0.4,
      emissive: new THREE.Color("#ffae42"),
      emissiveIntensity: 0.8,
    }),
    // converter-cell activity indicators (slow shimmer)
    lightPulse: std({
      color: "#10161f",
      roughness: 0.4,
      emissive: new THREE.Color("#bfe6ff"),
      emissiveIntensity: 0.8,
    }),
    // ID plates, hazard stripes, safety symbols
    decal: std({
      color: "#ffffff",
      map: atlas.texture,
      metalness: 0.2,
      roughness: 0.6,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  };

  const theme: [MatKey, string, string][] = [
    ["alu", "#c4ccd4", "#3a4458"],
    ["graphite", "#41474f", "#1d2331"],
    ["frame", "#6f7781", "#283041"],
    ["ribbed", "#cdd3d9", "#3c475b"],
    ["radiator", "#e0e4e8", "#414c61"],
    ["vent", "#30353c", "#151a24"],
    ["ceramic", "#e6e4de", "#4b515e"],
    ["copper", "#b3764a", "#4a3a33"],
    ["glass", "#0b1118", "#070b12"],
    ["foundation", "#8d8f91", "#353c4a"],
    ["cable", "#1c2026", "#0c0f15"],
    ["deck", "#d9d9d4", "#3f4556"],
    ["foil", "#a38c5f", "#4a4234"],
    ["solar", "#ffffff", "#7088ad"],
    ["decal", "#ffffff", "#6c778b"],
  ];
  const themed = theme.map(([k, d, n]) => [mats[k], new THREE.Color(d), new THREE.Color(n)] as const);

  let mix = 0;
  function applyTheme(m: number) {
    mix = m;
    for (const [mat, d, n] of themed) mat.color.copy(d).lerp(n, m);
    mats.solar.emissiveIntensity = 0.06 + 0.4 * m;
    mats.glass.emissiveIntensity = 0.25 + 0.6 * m;
  }

  function update(elapsed: number, loop: number) {
    mats.lightCool.emissiveIntensity = 0.8 + 0.45 * mix;
    // slow, steady breathing — warning lights, not effects
    const breathe = 0.85 + 0.15 * Math.sin(elapsed * 1.3);
    mats.lightAmber.emissiveIntensity = (0.8 + 0.8 * mix) * breathe;
    mats.lightInfo.emissiveIntensity = 0.8 * (1 + 0.9 * loop);
    mats.lightPulse.emissiveIntensity = (0.7 + 0.5 * mix) * (0.75 + 0.25 * Math.sin(elapsed * 2.1));
  }

  applyTheme(0);
  return { mats, decalCells: atlas.cells, applyTheme, update };
}
