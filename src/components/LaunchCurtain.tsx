"use client";

import { motion } from "framer-motion";
import { CourtArt } from "./art";
import { Confetti } from "./Confetti";
import { Tick } from "./Tick";
import { EASE } from "./motion";

/** A clip-path circle grown from the tapped point until it covers the screen. */
export function revealCircle(origin: { x: number; y: number } | null) {
  const w = typeof window === "undefined" ? 0 : window.innerWidth;
  const h = typeof window === "undefined" ? 0 : window.innerHeight;
  const ox = Math.round(origin?.x ?? w / 2);
  const oy = Math.round(origin?.y ?? h / 2);
  const r = Math.ceil(Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy))) + 32;
  return { from: `circle(0px at ${ox}px ${oy}px)`, to: `circle(${r}px at ${ox}px ${oy}px)` };
}

/** Three dots taking turns — "working on it". */
export function WorkingDots({ tone = "bg-ink" }: { tone?: string }) {
  return (
    <span aria-hidden className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`live-dot h-1.5 w-1.5 rounded-full ${tone}`} style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}

/**
 * "Opening the hall" — staged for the one moment StartSession changes the
 * world. A lime wave floods out from the exact button that was pressed, the
 * chosen courts hop on and draw their lines, and the curtain only lifts once
 * Firestore has genuinely confirmed the session is live — never on a timer,
 * never before a failure would show. Confetti marks the moment it is ready.
 */
export function LaunchCurtain({
  courtCount,
  status,
  errorMessage,
  origin,
  onRetry,
}: {
  courtCount: number;
  status: "opening" | "ready" | "error";
  errorMessage?: string;
  origin: { x: number; y: number } | null;
  onRetry: () => void;
}) {
  const circle = revealCircle(origin);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={false}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE } }}
      className="fixed inset-0 z-[998] flex flex-col items-center justify-center overflow-hidden px-4"
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-lime"
        initial={{ clipPath: circle.from }}
        animate={{ clipPath: circle.to }}
        transition={{ duration: 0.62, ease: EASE }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.3, type: "spring", stiffness: 360, damping: 24 } }}
        className="relative z-10 flex w-full max-w-md flex-col items-center text-center"
      >
        {status === "error" ? (
          <div className="flex w-full flex-col items-center rounded-[36px] bg-paper px-6 py-8 shadow-lift">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-wash text-danger-deep">
              <span className="num text-[1.75rem] leading-none">!</span>
            </span>
            <p className="display mt-4 text-lede text-ink">เปิดสนามไม่สำเร็จ</p>
            <p className="mt-1.5 text-caption text-ink-3">{errorMessage || "ลองอีกครั้งนะ อาจเป็นที่การเชื่อมต่อ"}</p>
            <button type="button" onClick={onRetry} className="btn btn-ink mt-5 h-12 px-7">
              ลองใหม่
            </button>
          </div>
        ) : (
          <>
            <span className="num text-[7rem] leading-[0.85] text-ink sm:text-[9rem]">
              <Tick value={courtCount} />
            </span>
            <span className="display mt-1 text-title text-ink">คอร์ตกำลังเปิด</span>

            <div className="mt-6 flex items-end justify-center gap-3">
              {Array.from({ length: courtCount }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -40, scale: 0.6, rotate: -8 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.45 + i * 0.12, type: "spring", stiffness: 420, damping: 16 }}
                  className="w-24 drop-shadow-[0_14px_14px_rgba(11,112,73,0.3)] sm:w-28"
                >
                  <CourtArt lit draw />
                </motion.div>
              ))}
            </div>

            <div className="mt-6 flex h-10 items-center justify-center">
              {status === "opening" ? (
                <span className="flex items-center gap-2 rounded-full bg-paper/70 px-4 py-2.5 font-display text-caption text-ink-2">
                  <WorkingDots />
                  กำลังจัดคิว…
                </span>
              ) : (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 18 }}
                  className="chip bg-ink px-4 py-2.5 text-caption text-lime"
                >
                  ✓ พร้อมแล้ว ไปตีกัน!
                </motion.span>
              )}
            </div>
            {status === "ready" && <Confetti pieces={28} spread={1.8} />}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
