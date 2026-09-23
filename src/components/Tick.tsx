"use client";

import { useState } from "react";

/**
 * A number that rolls in from the direction it moved — only when it actually
 * changes. First render and unrelated re-renders (realtime ticks that leave
 * the value alone) show it still.
 */
export function Tick({ value, className = "" }: { value: number | string; className?: string }) {
  const [state, setState] = useState({ value, n: 0, dir: "up" as "up" | "down" });
  if (state.value !== value) {
    const down = typeof value === "number" && typeof state.value === "number" && value < state.value;
    setState({ value, n: state.n + 1, dir: down ? "down" : "up" });
  }
  const cls = `${state.n > 0 ? `tick-${state.dir}` : ""} ${className}`.trim();
  return (
    <span key={state.n} className={cls || undefined}>
      {value}
    </span>
  );
}
