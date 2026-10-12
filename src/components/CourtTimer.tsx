"use client";

import { useEffect, useState } from "react";

const WARN_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Elapsed game clock, scoreboard-style. Teal while the rally is on; past 20
 * minutes it turns tomato and breathes slowly — the one loop that is an alert.
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
    <div
      className={`flex shrink-0 flex-col items-end rounded-2xl px-3 py-1.5 ring-2 ring-inset ${
        warn ? "bg-tomato-wash ring-tomato/20" : "bg-teal-wash ring-teal/25"
      }`}
    >
      <span className={`flex items-center gap-1.5 font-display text-[0.6875rem] font-medium ${warn ? "text-tomato-deep" : "text-teal-deep"}`}>
        <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${warn ? "bg-tomato" : "live-dot bg-teal"}`} />
        {warn ? "เกินเวลาแล้ว" : "กำลังตี"}
      </span>
      <span
        className={`num mt-0.5 flex items-baseline text-[1.375rem] leading-none ${warn ? "anim-breathe text-tomato-deep" : "text-ink"}`}
      >
        <span>{mm}</span>
        <span aria-hidden className="px-px opacity-35">:</span>
        <span>{ss}</span>
      </span>
    </div>
  );
}
