"use client";

import { LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

// Animation features load after first paint; `m.*` elements render their
// initial state until then.
const loadFeatures = () =>
  import("./motion-features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}
