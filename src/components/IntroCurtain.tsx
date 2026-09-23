"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { EASE } from "./motion";

const AUTO_MS = 1150; // ceiling before it dismisses itself
const REDUCE_MS = 180;

/**
 * Cinematic hand-off, not a splash screen. The mark and wordmark here share
 * `layoutId`s with the real ones in <Header>, which is already mounted
 * underneath (just hidden behind this curtain) — so when this unmounts,
 * Framer Motion doesn't cross-fade two logos, it continuously reshapes ONE
 * from its big centred moment into its small header slot while the curtain
 * fades off around it. `revealed` in Home() flips the instant a skip fires,
 * so the page behind starts its own staggered entrance in that same frame —
 * the curtain lifting and the hall appearing are one continuous gesture.
 *
 * Never blocks: tap/click anywhere skips instantly, and a timer caps the
 * unskipped wait well under what would feel like "waiting for an app".
 * `MotionConfig reducedMotion="user"` (see MotionProvider) already turns the
 * layout hand-off into a plain cut for reduced-motion users; the shorter
 * timer here just stops it holding the screen at all in that case.
 */
export function IntroCurtain({ onSkip }: { onSkip: () => void }) {
  const skipped = useRef(false);

  const skip = () => {
    if (skipped.current) return;
    skipped.current = true;
    onSkip();
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(skip, reduce ? REDUCE_MS : AUTO_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      role="button"
      aria-label="ข้ามอินโทร"
      tabIndex={0}
      onClick={skip}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && skip()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.28, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.34, ease: EASE } }}
      className="fixed inset-0 z-[999] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden"
    >
      {/* Same deep club-panel gradient the header hands off to, so the cut
          from curtain-background to header-background is invisible. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -12%, rgba(184,239,47,0.18), transparent 55%), linear-gradient(150deg, #052a22, #073b35 48%, #0b5148 100%)",
        }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-mint/10 blur-3xl"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } }}
      />

      <motion.div
        layoutId="brand-mark"
        transition={{ type: "spring", stiffness: 190, damping: 24 }}
        className="relative z-10 grid h-24 w-24 place-items-center overflow-hidden rounded-[28px] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65)] sm:h-28 sm:w-28"
      >
        <Image src="/kd-logo.png" alt="" fill sizes="112px" className="object-cover" priority />
      </motion.div>

      <motion.span
        layoutId="brand-word"
        transition={{ type: "spring", stiffness: 190, damping: 24 }}
        className="display relative z-10 mt-6 block text-[3.4rem] leading-none tracking-tight text-white sm:text-[4.25rem]"
      >
        Kort<span className="text-mint">Q</span>
      </motion.span>

      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.32, duration: 0.34, ease: EASE } }}
        className="relative z-10 mt-4 text-[0.7rem] font-bold tracking-[0.24em] text-white/55"
      >
        KD · KHONDEE-TEEBAD
      </motion.span>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5, transition: { delay: 0.6, duration: 0.4 } }}
        className="absolute bottom-10 z-10 text-[0.68rem] font-semibold tracking-[0.14em] text-white/40"
      >
        แตะเพื่อข้าม
      </motion.span>
    </motion.div>
  );
}
