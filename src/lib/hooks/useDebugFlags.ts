"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_DEBUG_FLAGS, getDebugFlags } from "@/lib/debugFlags";

const noopSubscribe = () => () => {};

/** URL debug flags (defaults during the static render). */
export function useDebugFlags() {
  return useSyncExternalStore(noopSubscribe, getDebugFlags, () => DEFAULT_DEBUG_FLAGS);
}
