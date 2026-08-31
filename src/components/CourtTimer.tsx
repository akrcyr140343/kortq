"use client";

import { useEffect, useState } from "react";

const WARN_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Broadcast-style elapsed clock. The numerals are the whole component — no
 * icon, no chrome. Past 20 minutes they turn red and breathe slowly: one of
 * the three looping animations in the app, and it earns it as an alert.
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
    <div className={`flex flex-col items-end rounded-[14px] px-3 py-2 ${warn ? "bg-alert-wash" : "bg-mint-wash"}`}>
      <span className={`flex items-center gap-1.5 text-[0.64rem] font-extrabold ${warn ? "text-alert" : "text-mint-deep"}`}>
        {!warn && (
          <span aria-hidden className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
        )}
        {warn ? "เกินเวลาแล้ว" : "กำลังตี"}
      </span>
      <div
        className={`numeral mt-1 flex items-baseline text-lede leading-[0.8] ${
          warn ? "animate-warn text-alert" : "text-ink"
        }`}
      >
        <span>{mm}</span>
        <span className="px-0.5 opacity-30">:</span>
        <span>{ss}</span>
      </div>
    </div>
  );
}
