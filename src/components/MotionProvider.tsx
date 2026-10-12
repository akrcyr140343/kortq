"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";

/** Framer honours the OS "reduce motion" setting app-wide (transforms off). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  // iOS Safari only applies `:active` when a touch listener exists up the
  // tree; a passive no-op on the document makes every chunky button press
  // down under the finger, exactly like it does with a mouse.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
