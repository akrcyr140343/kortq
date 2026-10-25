"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShuttleBuddy } from "./art";
import { EASE } from "./motion";

const AUTO_MS = 1150; // ceiling before it dismisses itself
const REDUCE_MS = 180;

// The club colours bursting out from behind the mark, then settling as dots.
const BURST = [
  { c: "bg-lime", x: -120, y: -90, s: 64, d: 0 },
  { c: "bg-sky", x: 130, y: -70, s: 48, d: 0.05 },
  { c: "bg-coral", x: 110, y: 100, s: 56, d: 0.1 },
  { c: "bg-sun", x: -110, y: 110, s: 44, d: 0.15 },
  { c: "bg-grape", x: 0, y: -150, s: 28, d: 0.2 },
  { c: "bg-court", x: -170, y: 10, s: 32, d: 0.12 },
  { c: "bg-lime", x: 175, y: 20, s: 24, d: 0.18 },
];

/**
 * Cinematic hand-off, not a splash screen. The mark and wordmark here share
 * `layoutId`s with the real ones in <Header>, which is already mounted
 * underneath (just hidden behind this curtain) — so when this unmounts,
 * Framer Motion doesn't cross-fade two logos, it continuously reshapes ONE
 * from its big centred moment into its small header slot while the curtain
 * fades off around it. `revealed` in Home() flips the instant a skip fires,
 * so the page behind starts its own staggered entrance in that same frame.
 *
 * Court Board staging: the club colours burst out of the mark like a serve,
 * the shuttle loops over it, and "kortq" bounces in letter by letter.
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
      animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.34, ease: EASE } }}
      className="fixed inset-0 z-[999] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden bg-canvas"
    >
      {/* Colour burst. */}
      <div aria-hidden className="absolute left-1/2 top-[44%]">
        {BURST.map((b, i) => (
          <motion.span
            key={i}
            className={`absolute rounded-full ${b.c}`}
            style={{ width: b.s, height: b.s, marginLeft: -b.s / 2, marginTop: -b.s / 2 }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: b.x,
              y: b.y,
              scale: 1, // spring overshoots on its own (low damping); arrays allow 2 frames only
              opacity: 1,
              transition: { delay: 0.05 + b.d, type: "spring", stiffness: 260, damping: 16 },
            }}
          />
        ))}
      </div>

      {/* The shuttle loops over the mark. */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-[44%] -ml-6 -mt-6"
        initial={{ x: -160, y: 40, rotate: -70, opacity: 0 }}
        animate={{
          x: [-160, 0, 160],
          y: [40, -150, 40],
          rotate: [-70, 40, 150],
          opacity: [0, 1, 0],
          transition: { delay: 0.15, duration: 0.95, ease: "easeInOut" },
        }}
      >
        <ShuttleBuddy className="h-12 w-12" mood="wow" />
      </motion.span>

      <motion.div
        layoutId="brand-mark"
        transition={{ type: "spring", stiffness: 190, damping: 24 }}
        className="relative z-10 grid h-28 w-28 place-items-center rounded-full bg-paper shadow-lift ring-4 ring-ink sm:h-32 sm:w-32"
      >
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <Image src="/kd-logo.png" alt="" fill sizes="128px" className="object-cover" priority />
        </span>
      </motion.div>

      <motion.span
        layoutId="brand-word"
        transition={{ type: "spring", stiffness: 190, damping: 24 }}
        className="num relative z-10 mt-7 block text-[4rem] lowercase leading-none text-ink sm:text-[5rem]"
      >
        {"kort".split("").map((ch, i) => (
          <span key={i} className="kq-word">
            <span style={{ animationDelay: `${(0.14 + i * 0.05).toFixed(2)}s` }}>{ch}</span>
          </span>
        ))}
        <span className="kq-word">
          <span className="rounded-xl bg-lime px-2" style={{ animationDelay: "0.38s" }}>
            q
          </span>
        </span>
      </motion.span>

      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.34, ease: EASE } }}
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
