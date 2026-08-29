"use client";

import { useEffect, useState } from "react";

const WARN_MS = 20 * 60 * 1000; // 20 minutes → warning color

/**
 * Live MM:SS counter for a court, driven by the game's startedAt timestamp
 * (stored in Firestore) so it survives refreshes and shows the same time on
 * every device. Turns red once the game passes 20 minutes.
 */
export function CourtTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - startedAt);
  const totalSec = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const warn = elapsed >= WARN_MS;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ring-1 transition-colors ${
        warn
          ? "animate-pulse bg-rose-100 text-rose-700 ring-rose-300"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span aria-hidden>⏱</span>
      {mm}:{ss}
    </span>
  );
}
