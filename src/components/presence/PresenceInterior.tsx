"use client";

import type { RefObject } from "react";
import WorkspaceScene from "@/components/workspace/WorkspaceScene";

type Props = {
  night: boolean;
  /** workspace renderer frames on / off (see the experience render plan) */
  active: boolean;
  /** increments each time the Dome is entered → particles assemble, the screens wake */
  entranceKey: number;
  /** links are interactive once the visitor reaches the workstation */
  revealed: boolean;
  /** 0 in the airlock → 1 at the workstation, driven by the journey */
  arrivalRef?: RefObject<number>;
};

/**
 * Inside the Spirit Connect Dome: the final destination of the lunar
 * journey. The visitor walks in from the airlock to the ring workstation —
 * Presence and AIPE on two equal displays, the Presence device alive on
 * the raised level. See components/workspace.
 */
export default function PresenceInterior(props: Props) {
  return <WorkspaceScene {...props} />;
}
