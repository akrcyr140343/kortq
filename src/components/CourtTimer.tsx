"use client";

import { useEffect, useState } from "react";

const WARN_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Elapsed game clock as a scoreboard pill riding on the court: a ring fills
 * toward the 20-minute mark beside the figures. Past 20 minutes the pill
 * turns red and breathes slowly — the one loop that is an alert.
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
  const progress = Math.min(1, elapsed / WARN_MS);
  const C = 2 * Math.PI * 8;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 shadow-soft ${
        warn ? "anim-breathe bg-danger-deep text-white" : "bg-paper text-ink"
      }`}
      title={warn ? "เกินเวลาแล้ว" : "กำลังตี"}
    >
      <svg viewBox="0 0 20 20" className="h-6 w-6 -rotate-90" aria-hidden>
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={warn ? "#ffffff" : "var(--court)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="num flex items-baseline text-[1.125rem] leading-none">
        <span>{mm}</span>
        <span aria-hidden className="px-px opacity-40">:</span>
        <span>{ss}</span>
      </span>
      {warn ? (
        <span className="font-display text-[0.6875rem] font-semibold">เกินเวลาแล้ว</span>
      ) : (
        <span className="sr-only">กำลังตี</span>
      )}
    </span>
  );
}
