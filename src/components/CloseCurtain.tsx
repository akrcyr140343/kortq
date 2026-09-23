"use client";

import { motion } from "framer-motion";
import { CourtChoiceArt } from "./StartSession";
import { Tick } from "./Tick";
import { EASE } from "./motion";

/**
 * "Closing the hall" — the mirror of <LaunchCurtain>, staged from the exact
 * "ปิดสนาม" button in the header. Same ring, same palette, so opening and
 * closing read as one motion language — but the courts settle and fade
 * instead of drawing in, and it only lifts once Firestore has actually
 * confirmed the session is over (never on a timer, never if the close fails).
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
  const ox = origin?.x ?? (typeof window === "undefined" ? 0 : window.innerWidth / 2);
  const oy = origin?.y ?? (typeof window === "undefined" ? 0 : window.innerHeight / 2);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={false}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE } }}
      className="fixed inset-0 z-[998] flex flex-col items-center justify-center overflow-hidden"
    >
      <motion.div
        aria-hidden
        className="absolute rounded-full"
        style={{
          left: ox,
          top: oy,
          background:
            "radial-gradient(120% 90% at 50% -12%, rgba(184,239,47,0.1), transparent 55%), linear-gradient(150deg, #052a22, #073b35 48%, #0b5148 100%)",
        }}
        initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.4 }}
        animate={{ width: "250vmax", height: "250vmax", x: "-125vmax", y: "-125vmax", opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
      />

      {status === "error" ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.38, duration: 0.3, ease: EASE } }}
          className="relative z-10 flex max-w-xs flex-col items-center gap-4 px-6 text-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-alert/15 text-2xl text-alert">!</span>
          <div>
            <p className="text-lede font-extrabold text-white">ปิดสนามไม่สำเร็จ</p>
            <p className="mt-1.5 text-caption text-white/60">{errorMessage || "ลองอีกครั้งนะ อาจเป็นที่การเชื่อมต่อ"}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97, transition: { duration: 0.12, ease: EASE } }}
            onClick={onRetry}
            className="lime-button h-11 rounded-full px-6 text-caption font-extrabold"
          >
            ลองใหม่
          </motion.button>
        </motion.div>
      ) : (
        <>
          {/* The courts that were live settle back to idle and fade, rather
              than drawing in — the same art, going quiet instead of arriving. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.32, duration: 0.34, ease: EASE } }}
            className="relative z-10 flex items-end gap-3 sm:gap-5"
          >
            {Array.from({ length: Math.max(courtCount, 1) }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0.32, y: 6, scale: 0.92 }}
                transition={{ delay: 0.4 + i * 0.07, duration: 0.5, ease: EASE }}
                className="w-24 sm:w-32"
              >
                <CourtChoiceArt active={false} />
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.56, duration: 0.32, ease: EASE } }}
            className="relative z-10 mt-6 flex items-baseline gap-2.5 text-white"
          >
            <span className="numeral text-h2 leading-none">
              <Tick value={courtCount} />
            </span>
            <span className="text-lede font-extrabold">คอร์ตปิดไฟแล้ว</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.78, duration: 0.28 } }}
            className="relative z-10 mt-4 flex items-center gap-2"
          >
            {status === "closing" ? (
              <>
                <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-white/50" />
                <span className="text-[0.72rem] font-bold tracking-[0.14em] text-white/55">กำลังปิดสนาม…</span>
              </>
            ) : (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[0.72rem] font-extrabold tracking-[0.1em] text-white/80"
              >
                ✓ ปิดสนามแล้ว วันนี้เล่นสนุกกัน
              </motion.span>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
