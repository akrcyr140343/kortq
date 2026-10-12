"use client";

import { motion } from "framer-motion";
import { CourtArt, ShuttleBuddy } from "./art";
import { IconMoon } from "./icons";
import { revealCircle, WorkingDots } from "./LaunchCurtain";
import { Tick } from "./Tick";
import { EASE } from "./motion";

// Fixed star positions (percent of the viewport) so renders stay pure.
const STARS = [
  { x: 12, y: 14, s: 10, d: 0 },
  { x: 64, y: 6, s: 12, d: 0.4 },
  { x: 66, y: 24, s: 8, d: 0.9 },
  { x: 24, y: 30, s: 7, d: 1.3 },
  { x: 90, y: 38, s: 9, d: 0.6 },
  { x: 8, y: 52, s: 8, d: 1.1 },
  { x: 76, y: 78, s: 10, d: 0.2 },
  { x: 18, y: 84, s: 12, d: 0.7 },
];

/**
 * "Closing the hall" — the mirror of <LaunchCurtain>, staged from the exact
 * "ปิดสนาม" button. Same reveal, but dusk instead of daylight: the stars come
 * out, the courts dim, and it only lifts once Firestore has actually confirmed
 * the session is over (never on a timer, never if the close fails).
 */
export function CloseCurtain({
  courtCount,
  status,
  errorMessage,
  origin,
  onRetry,
}: {
  courtCount: number;
  status: "closing" | "done" | "error";
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
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #e4defe 0%, #f3e6ff 46%, #ffe7da 100%)" }}
        initial={{ clipPath: circle.from }}
        animate={{ clipPath: circle.to }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <span className="absolute right-[12%] top-[8%] text-lilac-deep/70">
          <IconMoon className="h-12 w-12" />
        </span>
        {STARS.map((st, i) => (
          <span
            key={i}
            className="anim-twinkle absolute rounded-full bg-sun"
            style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.3, type: "spring", stiffness: 380, damping: 26 } }}
        className="card relative z-10 flex w-full max-w-sm flex-col items-center rounded-[30px] px-5 py-6 text-center"
      >
        {status === "error" ? (
          <>
            <span className="sticker grid h-14 w-14 place-items-center rounded-2xl bg-tomato-wash text-tomato-deep ring-2 ring-inset ring-tomato/20">
              <span className="font-num text-[1.75rem] font-bold leading-none">!</span>
            </span>
            <p className="mt-4 font-display text-lede font-semibold text-ink">ปิดสนามไม่สำเร็จ</p>
            <p className="mt-1.5 text-caption text-ink-3">{errorMessage || "ลองอีกครั้งนะ อาจเป็นที่การเชื่อมต่อ"}</p>
            <button type="button" onClick={onRetry} className="btn btn-sun mt-5 h-12 rounded-full px-7">
              ลองใหม่
            </button>
          </>
        ) : (
          <>
            {/* The courts that were live go quiet instead of arriving. */}
            <div className="flex items-end justify-center gap-2.5">
              {Array.from({ length: Math.max(courtCount, 1) }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0.6, y: 4, scale: 0.94 }}
                  transition={{ delay: 0.42 + i * 0.08, duration: 0.5, ease: EASE }}
                  className="w-20 sm:w-24"
                >
                  <CourtArt lit={false} />
                </motion.div>
              ))}
            </div>

            <div className="mt-4 flex items-baseline gap-2 text-ink">
              <span className="num text-h2 leading-none">
                <Tick value={courtCount} />
              </span>
              <span className="font-display text-lede font-medium">คอร์ตปิดไฟแล้ว</span>
            </div>

            <div className="mt-3 flex min-h-8 items-center justify-center">
              {status === "closing" ? (
                <span className="flex items-center gap-2 font-display text-caption text-ink-3">
                  <WorkingDots tone="bg-lilac" />
                  กำลังปิดสนาม…
                </span>
              ) : (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 18 }}
                  className="chip gap-2 bg-lilac-wash px-3.5 py-2 text-caption text-lilac-deep ring-2 ring-inset ring-lilac/30"
                >
                  <ShuttleBuddy className="-my-1 h-6 w-6" mood="sleepy" />✓ ปิดสนามแล้ว วันนี้เล่นสนุกกัน
                </motion.span>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
