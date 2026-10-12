"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShuttleBuddy } from "./art";
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
 * so the page behind starts its own staggered entrance in that same frame.
 *
 * Pop Court staging: a sunny sky, the letters of "KortQ" bouncing in one by
 * one, and the shuttle buddy lobbing across the screen.
 *
 * Never blocks: tap/click anywhere skips instantly, and a timer caps the
 * unskipped wait well under what would feel like "waiting for an app".
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
      animate={{ opacity: 1, transition: { duration: 0.24, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.34, ease: EASE } }}
      className="fixed inset-0 z-[999] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden bg-cream"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 46% at 50% 44%, rgba(255,226,140,0.75) 0%, rgba(255,241,194,0) 70%), linear-gradient(180deg, #dff2ff 0%, #fff6e3 52%, #fff9f0 100%)",
        }}
      />
      {/* Soft sun disc rising behind the mark. */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-[44%] h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun/30 blur-2xl"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } }}
      />

      {/* The shuttle buddy lobs across, net to net. */}
      <span aria-hidden className="anim-arc absolute left-1/2 top-[30%] -ml-7">
        <ShuttleBuddy className="h-14 w-14" mood="wow" />
      </span>

      <motion.div
        layoutId="brand-mark"
        transition={{ type: "spring", stiffness: 190, damping: 24 }}
        className="relative z-10 grid h-28 w-28 place-items-center rounded-[30px] bg-paper shadow-[0_6px_0_var(--line-2),0_30px_50px_-20px_rgba(91,62,24,0.45)] ring-4 ring-paper sm:h-32 sm:w-32"
      >
        <span className="absolute inset-0 overflow-hidden rounded-[26px]">
          <Image src="/kd-logo.png" alt="" fill sizes="128px" className="object-cover" priority />
        </span>
      </motion.div>

      <motion.span
        layoutId="brand-word"
        transition={{ type: "spring", stiffness: 190, damping: 24 }}
        className="num relative z-10 mt-6 block text-[3.75rem] leading-none text-ink sm:text-[4.5rem]"
      >
        {"Kort".split("").map((ch, i) => (
          <span key={i} className="anim-letter" style={{ animationDelay: `${(0.1 + i * 0.06).toFixed(2)}s` }}>
            {ch}
          </span>
        ))}
        <span className="anim-letter text-teal-deep" style={{ animationDelay: "0.38s" }}>
          Q
        </span>
      </motion.span>

      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.42, duration: 0.34, ease: EASE } }}
        className="eyebrow relative z-10 mt-4 text-ink-3"
      >
        KD · KHONDEE-TEEBAD
      </motion.span>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.6, duration: 0.4 } }}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] z-10 font-display text-caption text-ink-3"
      >
        แตะเพื่อข้าม
      </motion.span>
    </motion.div>
  );
}
