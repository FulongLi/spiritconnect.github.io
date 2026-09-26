import { Group, Mesh } from "three";
import type { WorkspaceScreenId } from "@/content/workspace";
import { paintAipeScreen } from "../screens/aipeScreen";
import type { CanvasFonts } from "../screens/canvasKit";
import { paintPresenceScreen } from "../screens/presenceScreen";
import { MONITOR, RISER_TOP, type WorkspaceLayout } from "./layout";
import type { WorkspaceMaterials } from "./materials";
import { createKeyboard, createMouse } from "./peripherals";
import { createPresenceDevice } from "./presenceDevice";
import { createWorkspaceMonitor, type MonitorKit, type WorkspaceMonitor } from "./workspaceMonitor";

/* ------------------------------------------------------------------ */
/* Everything on the desk, arranged for one layout: the two monitors    */
/* and the Presence device on the riser, keyboard and mouse on the main */
/* surface. Rebuilt (cheaply) when the viewport switches between        */
/* landscape and portrait.                                              */
/* ------------------------------------------------------------------ */

export type Workstation = ReturnType<typeof createWorkstation>;

export function createWorkstation({
  layout,
  materials,
  monitorKit,
  fonts,
  logo,
  compact,
  maxAnisotropy,
}: {
  layout: WorkspaceLayout;
  materials: WorkspaceMaterials;
  monitorKit: MonitorKit;
  fonts: CanvasFonts;
  logo: HTMLImageElement | null;
  compact: boolean;
  maxAnisotropy: number;
}) {
  const group = new Group();
  const disposers: (() => void)[] = [];

  // ── Monitors: identical panels, Presence left / top, AIPE right / bottom ──
  const stand = layout.stand === "pair" ? "desk" : "arm";
  const common = { kit: monitorKit, materials, fonts, logo, compact, maxAnisotropy, stand } as const;
  const monitors: Record<WorkspaceScreenId, WorkspaceMonitor> = {
    presence: createWorkspaceMonitor({ ...common, painter: paintPresenceScreen }),
    aipe: createWorkspaceMonitor({ ...common, painter: paintAipeScreen }),
  };
  monitors.presence.place(layout.presenceMonitor.position, layout.presenceMonitor.yaw);
  monitors.aipe.place(layout.aipeMonitor.position, layout.aipeMonitor.yaw);
  for (const m of Object.values(monitors)) {
    group.add(m.group);
    disposers.push(m.dispose);
  }

  // stacked layout: one aluminium pole on the riser carries both panels
  if (layout.stand === "stacked") {
    const top = layout.presenceMonitor.position;
    const z = top.z - MONITOR.depth - 0.07;
    const poleLen = top.y + 0.08 - RISER_TOP;
    const pole = new Mesh(monitorKit.plate, materials.aluminium);
    pole.scale.set(0.22, poleLen, 4);
    pole.position.set(0, RISER_TOP + poleLen / 2, z);
    const foot = new Mesh(monitorKit.foot, materials.aluminium);
    foot.position.set(0, RISER_TOP + 0.001, z + 0.03);
    const shadow = new Mesh(monitorKit.flat, materials.contactShadow);
    shadow.scale.set(0.3, 1, 0.26);
    shadow.position.set(0, RISER_TOP + 0.0012, z + 0.03);
    group.add(pole, foot, shadow);
  }

  // ── Presence device ──────────────────────────────────────────────────────
  const device = createPresenceDevice(materials, compact);
  device.group.position.copy(layout.device.position);
  device.group.scale.setScalar(layout.device.scale);
  device.group.rotation.y = layout.device.yaw;
  group.add(device.group);
  disposers.push(device.dispose);

  // ── Keyboard + mouse ─────────────────────────────────────────────────────
  if (layout.keyboard) {
    const keyboard = createKeyboard(materials);
    keyboard.group.position.copy(layout.keyboard.position);
    group.add(keyboard.group);
    disposers.push(keyboard.dispose);
  }
  if (layout.mouse) {
    const mouse = createMouse(materials);
    mouse.group.position.copy(layout.mouse.position);
    mouse.group.rotation.y = layout.mouse.yaw;
    group.add(mouse.group);
    disposers.push(mouse.dispose);
  }

  group.updateMatrixWorld(true);

  return {
    group,
    monitors,
    device,
    update(delta: number) {
      monitors.presence.update(delta);
      monitors.aipe.update(delta);
    },
    dispose() {
      group.removeFromParent();
      for (const d of disposers) d();
    },
  };
}
