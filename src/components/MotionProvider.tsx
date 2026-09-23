"use client";

import { MotionConfig } from "framer-motion";

/** Framer honours the OS "reduce motion" setting app-wide (transforms off). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
