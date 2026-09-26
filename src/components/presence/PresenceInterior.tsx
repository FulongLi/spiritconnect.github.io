"use client";

import WorkspaceScene from "@/components/workspace/WorkspaceScene";

type Props = {
  night: boolean;
  /** workspace renderer frames on / off (see the experience render plan) */
  active: boolean;
  /** increments each time the Dome is entered → particles assemble, the visitor sits down */
  entranceKey: number;
  /** links are interactive once the fog has cleared */
  revealed: boolean;
};

/**
 * Inside the Spirit Connect Dome: the final destination of the lunar
 * journey. The visitor arrives at their Spirit Connect workstation —
 * Presence and AIPE on two equal monitors, the Presence device alive on
 * the desk. See components/workspace.
 */
export default function PresenceInterior(props: Props) {
  return <WorkspaceScene {...props} />;
}
