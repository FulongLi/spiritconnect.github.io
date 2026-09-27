import {
  CanvasTexture,
  Color,
  DoubleSide,
  EquirectangularReflectionMapping,
  MeshBasicMaterial,
  MeshStandardMaterial,
  AdditiveBlending,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

/* ------------------------------------------------------------------ */
/* Shared materials + small procedural textures for the workspace.     */
/* Everything is created once per engine and shared between meshes.   */
/* Palette: graphite, charcoal, satin aluminium, silver, warm off-white. */
/* ------------------------------------------------------------------ */

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

/**
 * Soft studio environment for reflections on metal / satin surfaces:
 * warm overhead light, a pale horizon (the dome) and two long softboxes.
 * PMREM-filtered by the renderer.
 */
function createEnvironmentTexture() {
  const { c, ctx } = canvas(512, 256);
  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#f3efe8");
  sky.addColorStop(0.38, "#a9a7a3");
  sky.addColorStop(0.5, "#6d6d6f");
  sky.addColorStop(0.56, "#262729");
  sky.addColorStop(1, "#0b0b0d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);
  // two long softboxes above and slightly behind the visitor
  ctx.filter = "blur(6px)";
  ctx.fillStyle = "rgba(255, 250, 242, 0.95)";
  ctx.fillRect(40, 44, 150, 14);
  ctx.fillRect(300, 50, 170, 12);
  // the monitors glow in front of the visitor
  ctx.fillStyle = "rgba(220, 226, 236, 0.5)";
  ctx.fillRect(210, 104, 90, 24);
  ctx.filter = "none";
  const tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** radial falloff used for fake contact shadows and light pools */
function createSoftSpotTexture() {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/** diagonal sheen for the monitor glass */
function createSheenTexture() {
  const { c, ctx } = canvas(256, 160);
  const g = ctx.createLinearGradient(0, 0, 256, 160);
  g.addColorStop(0, "rgba(255,255,255,0.0)");
  g.addColorStop(0.28, "rgba(255,255,255,0.0)");
  g.addColorStop(0.36, "rgba(255,255,255,0.55)");
  g.addColorStop(0.52, "rgba(255,255,255,0.12)");
  g.addColorStop(0.66, "rgba(255,255,255,0.0)");
  g.addColorStop(1, "rgba(255,255,255,0.08)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 160);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** perforated speaker grille (tiles horizontally around the device) */
function createGrilleTexture() {
  const { c, ctx } = canvas(128, 64);
  ctx.fillStyle = "#3a3b3f";
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "#070708";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 16; x++) {
      ctx.beginPath();
      ctx.arc(x * 8 + 4 + (y % 2) * 4, y * 8 + 4, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function createWorkspaceMaterials({ compact }: { compact: boolean }) {
  const environment = createEnvironmentTexture();
  const softSpot = createSoftSpotTexture();
  const sheen = createSheenTexture();
  const grille = createGrilleTexture();
  grille.repeat.set(compact ? 6 : 9, 1.6);

  const textures: Texture[] = [environment, softSpot, sheen, grille];

  const m = {
    /** ring workstation, lower level: charcoal, fine satin */
    worktop: new MeshStandardMaterial({ color: "#36373c", roughness: 0.5, metalness: 0.18 }),
    /** the ring's outer skin + ends: solid charcoal, softly satin */
    ringSkin: new MeshStandardMaterial({ color: "#4a4b50", roughness: 0.55, metalness: 0.2 }),
    /** raised level: a shade lighter, a little more polish */
    riserTop: new MeshStandardMaterial({ color: "#3e3f44", roughness: 0.36, metalness: 0.28 }),
    /** satin graphite for device housings, keyboard keys, monitor backs */
    graphite: new MeshStandardMaterial({ color: "#2b2c30", roughness: 0.36, metalness: 0.6 }),
    graphiteMatte: new MeshStandardMaterial({ color: "#121315", roughness: 0.72, metalness: 0.2 }),
    /** satin / brushed silver for edges, fins and seams */
    silver: new MeshStandardMaterial({ color: "#c3c6cb", roughness: 0.3, metalness: 1 }),
    /** satin anodised aluminium: display bodies + stands, keyboard, mouse base */
    aluminium: new MeshStandardMaterial({ color: "#c9ccd0", roughness: 0.42, metalness: 0.7 }),
    /** low-profile keycaps: white, soft matte */
    keycap: new MeshStandardMaterial({ color: "#e4e5e7", roughness: 0.55, metalness: 0 }),
    /** mouse top shell: one smooth white multi-touch surface */
    mouseShell: new MeshStandardMaterial({ color: "#eeeeec", roughness: 0.22, metalness: 0.02 }),
    /** black glass bezel */
    bezel: new MeshStandardMaterial({ color: "#060607", roughness: 0.16, metalness: 0.3 }),
    grille: new MeshStandardMaterial({ map: grille, roughness: 0.55, metalness: 0.4 }),
    /** thin warm light line on the device's charging tray */
    trayLight: new MeshBasicMaterial({ color: new Color("#f4e9da").multiplyScalar(1.4) }),
    /** recessed architectural light (the workstation's floor cove) */
    coveLight: new MeshBasicMaterial({ color: new Color("#f6eee2").multiplyScalar(1.05) }),
    contactShadow: new MeshBasicMaterial({
      color: "#000000",
      alphaMap: softSpot,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    screenGlow: new MeshBasicMaterial({
      color: "#9aa3b0",
      alphaMap: softSpot,
      transparent: true,
      opacity: 0.016,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
    sheen: new MeshBasicMaterial({
      map: sheen,
      transparent: true,
      opacity: 0.07,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  };

  // shared props
  for (const mat of [m.contactShadow, m.screenGlow]) mat.side = DoubleSide;

  return {
    ...m,
    environment,
    softSpot,
    dispose() {
      for (const mat of Object.values(m)) mat.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

export type WorkspaceMaterials = ReturnType<typeof createWorkspaceMaterials>;
