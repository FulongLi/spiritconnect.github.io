import type * as THREE from "three";
import type { IndustrialKit } from "../scene/materials";
import type { GroundLayer } from "./ground";
import type { Track } from "./parts";

/** everything an infrastructure builder needs from the town */
export type InfraContext = {
  group: THREE.Group;
  kit: IndustrialKit;
  track: Track;
  /** high-quality profile: small hardware, handrails, bolts */
  detail: boolean;
  shadows: boolean;
  ground: GroundLayer;
};
