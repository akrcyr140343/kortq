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
export function WorkingDots({ tone = "bg-teal" }: { tone?: string }) {
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
 * world. The sunny court is revealed through a circle grown from the exact
 * button that was pressed, the chosen number of courts pop onto a card, and
 * the curtain only lifts once Firestore has genuinely confirmed the session is
 * live — never on a timer, never before a failure would show. Confetti marks
 * the moment it is ready.
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
        className="absolute inset-0"
        style={{
          background:
            "url(/kortq-court-bg-clean.webp) center 62% / cover no-repeat, linear-gradient(180deg, #dff2ff, #fff9f0)",
        }}
        initial={{ clipPath: circle.from }}
        animate={{ clipPath: circle.to }}
        transition={{ duration: 0.62, ease: EASE }}
      >
        <div className="absolute inset-0 bg-white/20" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.32, type: "spring", stiffness: 380, damping: 26 } }}
        className="card relative z-10 flex w-full max-w-sm flex-col items-center rounded-[30px] px-5 py-6 text-center"
      >
        {status === "error" ? (
          <>
            <span className="sticker grid h-14 w-14 place-items-center rounded-2xl bg-tomato-wash text-tomato-deep ring-2 ring-inset ring-tomato/20">
              <span className="font-num text-[1.75rem] font-bold leading-none">!</span>
            </span>
            <p className="mt-4 font-display text-lede font-semibold text-ink">เปิดสนามไม่สำเร็จ</p>
            <p className="mt-1.5 text-caption text-ink-3">{errorMessage || "ลองอีกครั้งนะ อาจเป็นที่การเชื่อมต่อ"}</p>
            <button type="button" onClick={onRetry} className="btn btn-sun mt-5 h-12 rounded-full px-7">
              ลองใหม่
            </button>
          </>
        ) : (
          <>
            <div className="flex items-end justify-center gap-2.5">
              {Array.from({ length: courtCount }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18, scale: 0.75 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.46 + i * 0.1, type: "spring", stiffness: 420, damping: 20 }}
                  className="w-20 sm:w-24"
                >
                  <CourtArt lit />
                </motion.div>
              ))}
            </div>

            <div className="mt-4 flex items-baseline gap-2 text-ink">
              <span className="num text-h2 leading-none">
                <Tick value={courtCount} />
              </span>
              <span className="font-display text-lede font-medium">คอร์ตกำลังจะเปิด</span>
            </div>

            <div className="mt-3 flex h-8 items-center justify-center">
              {status === "opening" ? (
                <span className="flex items-center gap-2 font-display text-caption text-ink-3">
                  <WorkingDots />
                  กำลังจัดคิว…
                </span>
              ) : (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 18 }}
                  className="chip bg-teal-wash px-3.5 py-2 text-caption text-teal-deep ring-2 ring-inset ring-teal/30"
                >
                  ✓ พร้อมแล้ว ไปตีกัน!
                </motion.span>
              )}
            </div>
            {status === "ready" && <Confetti pieces={24} spread={1.7} />}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
