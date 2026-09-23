"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { PinModal } from "./PinModal";
import type { Session } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";
import { press } from "./motion";

/** History glyph — a clock with a back-arrow, for "ประวัติการเล่น". */
function HistoryGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 3.5V7h3.5M12 8v4.2l2.8 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 13h2M14 13h2M8 16.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Power glyph — closing the session for the day ("ปิดสนาม"). */
function PowerGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M12 3.5v7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.6 6.6a7 7 0 1 0 8.8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Header({
  session,
  onEndSession,
  onOpenHistory,
}: {
  session: Session | null;
  onEndSession: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenHistory?: () => void;
}) {
  const { isAdmin, lock } = useAdmin();
  const [showPin, setShowPin] = useState(false);

  const sessionActive = session?.active ?? false;

  return (
    <header className="app-safe-top anim-enter sticky top-0 z-40 shrink-0 px-0 pt-0 sm:px-5 sm:pt-3">
      <div className="club-panel mx-auto flex max-w-[1600px] items-center justify-between gap-3 overflow-hidden rounded-b-[26px] px-4 py-2.5 sm:rounded-[22px] sm:px-5">
        {/* ── Brand ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-3">
            <motion.span
              layoutId="brand-mark"
              transition={{ type: "spring", stiffness: 190, damping: 24 }}
              className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-white shadow-[0_10px_26px_-14px_rgba(0,0,0,0.8)] sm:h-12 sm:w-12"
            >
              <Image src="/kd-logo.png" alt="โลโก้ KD KHONDEE-TEEBAD" fill sizes="56px" className="object-cover" priority />
            </motion.span>
            <div className="min-w-0">
              <motion.span
                layoutId="brand-word"
                transition={{ type: "spring", stiffness: 190, damping: 24 }}
                className="display block text-title leading-none tracking-tight text-white sm:text-[1.9rem]"
              >
                Kort<span className="text-mint">Q</span>
              </motion.span>
              <span className="mt-1 flex items-center gap-1.5 text-[0.64rem] font-bold tracking-[0.12em] text-white/55">
                <span className="hidden sm:inline">KD · KHONDEE-TEEBAD ·</span>
                <span className="text-mint/80">v{APP_VERSION}</span>
              </span>
            </div>
          </div>

          {sessionActive && (
            <>
              <span className="hidden h-7 w-px bg-white/12 md:block" />
              <span className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/12 px-3.5 py-2 text-white shadow-inner md:flex">
                <CalendarGlyph />
                <span className="text-[0.72rem] font-bold">วันนี้ · {session?.courtCount} คอร์ต</span>
              </span>
            </>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* ประวัติการเล่น — read-only, every role, only while a session is open. */}
          {sessionActive && onOpenHistory && (
            <motion.button
              whileTap={press}
              onClick={onOpenHistory}
              aria-label="ประวัติการเล่น"
              className="relative flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 text-caption font-bold text-white transition-all duration-200 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[''] hover:-translate-y-0.5 hover:bg-white/14 sm:px-4"
            >
              <HistoryGlyph />
              <span className="hidden sm:inline">ประวัติ</span>
            </motion.button>
          )}

          {isAdmin ? (
            <>
              <span className="anim-pop hidden rounded-full bg-mint/14 px-3 py-2 text-[0.7rem] font-extrabold text-mint sm:block">
                ♛ แอดมิน
              </span>
              {sessionActive && (
                <motion.button
                  whileTap={press}
                  onClick={onEndSession}
                  aria-label="ปิดสนาม"
                  className="relative flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 text-caption font-bold text-white/80 transition-all duration-200 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[''] hover:-translate-y-0.5 hover:bg-white/14 hover:text-white sm:px-3.5"
                >
                  <PowerGlyph />
                  <span className="hidden sm:inline">ปิดสนาม</span>
                </motion.button>
              )}
              <motion.button
                whileTap={press}
                onClick={lock}
                className="relative h-10 rounded-full border border-white/15 bg-white/8 px-4 text-caption font-bold text-white transition-all duration-200 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[''] hover:-translate-y-0.5 hover:bg-white/14"
              >
                ล็อค
              </motion.button>
            </>
          ) : (
            <motion.button
              whileTap={press}
              onClick={() => setShowPin(true)}
              className="lime-button shine-button h-11 rounded-full px-5 text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5"
            >
              เข้าโหมดแอดมิน
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>{showPin && <PinModal key="pin" onClose={() => setShowPin(false)} />}</AnimatePresence>
    </header>
  );
}
