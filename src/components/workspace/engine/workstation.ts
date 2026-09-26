import { Group, Mesh } from "three";
import type { WorkspaceScreenId } from "@/content/workspace";
import { paintAipeScreen } from "../screens/aipeScreen";
import type { CanvasFonts } from "../screens/canvasKit";
import { paintPresenceScreen } from "../screens/presenceScreen";
import { DESK, MONITOR, type WorkspaceLayout } from "./layout";
import type { WorkspaceMaterials } from "./materials";
import { createKeyboard, createMouse } from "./peripherals";
import { createPresenceDevice } from "./presenceDevice";
import { createWorkspaceMonitor, type MonitorKit, type WorkspaceMonitor } from "./workspaceMonitor";

/* ------------------------------------------------------------------ */
/* Everything on the desk, arranged for one layout: the two monitors,   */
/* the Presence device, keyboard and mouse. Rebuilt (cheaply) when the  */
/* viewport switches between landscape and portrait.                    */
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

  // stacked layout: one silver pole carries both panels
  if (layout.stand === "stacked") {
    const top = layout.presenceMonitor.position;
    const z = top.z - MONITOR.depth - 0.07;
    const poleLen = top.y + 0.08 - DESK.height;
    const pole = new Mesh(monitorKit.neck, materials.silver);
    pole.scale.set(0.9, poleLen, 2.2);
    pole.position.set(0, DESK.height + poleLen / 2, z);
    const base = new Mesh(monitorKit.base, materials.silver);
    base.position.set(0, DESK.height + 0.002, z + 0.02);
    const shadow = new Mesh(monitorKit.shadow, materials.contactShadow);
    shadow.scale.set(0.42, 1, 0.3);
    shadow.position.set(0, DESK.height + 0.0015, z + 0.02);
    group.add(pole, base, shadow);
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
