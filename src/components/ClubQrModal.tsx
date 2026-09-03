"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CLUB_QR_SRC } from "@/lib/club";
import { press } from "./motion";
import { E3 } from "./ui";

/** Decorative twinkle placed at a corner of the QR frame. */
function Sparkle({ className, delay }: { className: string; delay: number }) {
  return (
    <span
      aria-hidden
      className={`twinkle pointer-events-none absolute text-mint ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M12 0c.6 5.7 3.3 8.4 9 9-5.7.6-8.4 3.3-9 9-.6-5.7-3.3-8.4-9-9 5.7-.6 8.4-3.3 9-9Z" />
      </svg>
    </span>
  );
}

export function ClubQrModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const reduce = useReducedMotion();

  // Portal target (document.body) only exists on the client.
  useEffect(() => setMounted(true), []);

  // Lock background scroll + Esc to close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 z-[110] overflow-y-auto bg-accent-deep/45 backdrop-blur-md"
        >
          <div className="flex min-h-dvh items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className={`${E3} relative w-full max-w-[19rem] overflow-hidden rounded-[30px] p-6`}
            >
              <div aria-hidden className="absolute -left-14 -top-16 h-40 w-40 rounded-full bg-mint-wash blur-2xl" />
              <div aria-hidden className="absolute -bottom-16 -right-12 h-36 w-36 rounded-full bg-sky-wash blur-2xl" />

              {/* ── Close ─────────────────────────────────────────── */}
              <motion.button
                whileTap={press}
                onClick={onClose}
                aria-label="ปิด"
                className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-canvas text-ink-3 shadow-sm transition-colors duration-200 hover:bg-alert-wash hover:text-alert"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.button>

              {/* ── Ribbon title ──────────────────────────────────── */}
              <div className="relative flex justify-center">
                <span className="rounded-full bg-accent px-4 py-1.5 text-[0.7rem] font-extrabold tracking-[0.06em] text-mint shadow-[0_10px_22px_-14px_rgba(29,51,34,0.9)]">
                  สแกนเพื่อลงชื่อเข้าก๊วน
                </span>
              </div>

              {/* ── QR card ───────────────────────────────────────── */}
              <div className="relative mx-auto mt-6 w-full">
                {/* Soft aura behind the card — breathes, never covers the QR. */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -inset-3 rounded-[28px] bg-gradient-to-tr from-mint/30 via-sky/20 to-mint/25 blur-xl"
                  animate={reduce ? undefined : { opacity: [0.45, 0.8, 0.45], scale: [0.97, 1.02, 0.97] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                />

                <Sparkle className="-left-1 -top-1" delay={0} />
                <Sparkle className="-right-1 top-6" delay={0.9} />
                <Sparkle className="-bottom-1 left-8" delay={1.6} />

                <div className="relative rounded-[22px] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(16,35,24,0.5)] ring-1 ring-mint/25">
                  {imgOk ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={CLUB_QR_SRC}
                      alt="QR ก๊วน คนดีตีแบด"
                      onError={() => setImgOk(false)}
                      className="mx-auto block aspect-square w-full max-w-[15rem] rounded-[12px] object-contain"
                    />
                  ) : (
                    // Neutral placeholder until public/club-qr.png exists — no code.
                    <div className="mx-auto grid aspect-square w-full max-w-[15rem] place-items-center rounded-[12px] border border-dashed border-line-2 bg-surface-2 px-4 text-center">
                      <span className="text-sm font-extrabold text-ink-3">QR กำลังมา เร็ว ๆ นี้</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Hint ──────────────────────────────────────────── */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.28 }}
                className="relative mt-5 text-center text-[0.74rem] font-medium text-ink-3"
              >
                เปิดด้วยมือถือแล้วสแกนได้เลย
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
