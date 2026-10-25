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
 * "ปิดสนาม" button. A lilac dusk washes out from it, the stars come out, the
 * courts' lights go off one by one, and it only lifts once Firestore has
 * actually confirmed the session is over (never on a timer, never if the
 * close fails).
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
        style={{ background: "linear-gradient(180deg, #e9e4ff 0%, #f6ecff 50%, #ffe9dc 100%)" }}
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
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.28, type: "spring", stiffness: 360, damping: 26 } }}
        className="relative z-10 flex w-full max-w-md flex-col items-center text-center"
      >
        {status === "error" ? (
          <div className="flex w-full flex-col items-center rounded-[36px] bg-paper px-6 py-8 shadow-lift">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-wash text-danger-deep">
              <span className="num text-[1.75rem] leading-none">!</span>
            </span>
            <p className="display mt-4 text-lede text-ink">ปิดสนามไม่สำเร็จ</p>
            <p className="mt-1.5 text-caption text-ink-3">{errorMessage || "ลองอีกครั้งนะ อาจเป็นที่การเชื่อมต่อ"}</p>
            <button type="button" onClick={onRetry} className="btn btn-ink mt-5 h-12 px-7">
              ลองใหม่
            </button>
          </div>
        ) : (
          <>
            {/* Each court's lights go off in turn. */}
            <div className="flex items-end justify-center gap-3">
              {Array.from({ length: Math.max(courtCount, 1) }, (_, i) => (
                <div key={i} className="relative w-24 sm:w-28">
                  <CourtArt lit={false} />
                  <motion.span
                    className="absolute inset-0"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 0.45 + i * 0.16, duration: 0.45, ease: EASE }}
                  >
                    <CourtArt lit />
                  </motion.span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-baseline gap-2.5">
              <span className="num text-[4.5rem] leading-none text-lilac-deep">
                <Tick value={courtCount} />
              </span>
              <span className="display text-title text-ink">คอร์ตปิดไฟแล้ว</span>
            </div>

            <div className="mt-4 flex min-h-10 items-center justify-center">
              {status === "closing" ? (
                <span className="flex items-center gap-2 rounded-full bg-paper/70 px-4 py-2.5 font-display text-caption text-ink-2">
                  <WorkingDots tone="bg-lilac-deep" />
                  กำลังปิดสนาม…
                </span>
              ) : (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 18 }}
                  className="chip gap-2 bg-paper px-4 py-2.5 text-caption text-lilac-deep shadow-soft"
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
