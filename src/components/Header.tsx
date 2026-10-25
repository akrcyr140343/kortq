"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { PinModal } from "./PinModal";
import type { Session } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";
import { IconCrown, IconHistory, IconKey, IconLock, IconPower } from "./icons";

/** The four-colour court tape running under the header. */
function Tape() {
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-1">
      <span className="flex-[3] bg-lime" />
      <span className="flex-[2] bg-sky" />
      <span className="flex-[2] bg-coral" />
      <span className="flex-[1] bg-sun" />
    </div>
  );
}

/**
 * The top bar: brand on the left with the live status, role controls on the
 * right as pills. On phones every control collapses to a round icon pill
 * (each keeps its Thai aria-label); labels return from `sm` up. The mark and
 * wordmark share `layoutId`s with <IntroCurtain>, which morphs its big centred
 * logo into this exact slot.
 */
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
    <header className="app-safe-top anim-fade sticky top-0 z-40 shrink-0 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-5">
        {/* ── Brand ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 items-center gap-2.5">
          <motion.span
            layoutId="brand-mark"
            transition={{ type: "spring", stiffness: 190, damping: 24 }}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper shadow-soft ring-2 ring-ink"
          >
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <Image src="/kd-logo.png" alt="โลโก้ KD KHONDEE-TEEBAD" fill sizes="48px" className="object-cover" priority />
            </span>
            {/* Admin wears a little crown on the club mark. */}
            {isAdmin && (
              <span aria-hidden className="anim-stamp absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-lime text-ink ring-2 ring-paper">
                <IconCrown className="h-3 w-3" />
              </span>
            )}
          </motion.span>

          <div className="min-w-0">
            <motion.span
              layoutId="brand-word"
              transition={{ type: "spring", stiffness: 190, damping: 24 }}
              className="num block text-[1.625rem] lowercase leading-none text-ink"
            >
              kort<span className="relative inline-block rounded-md bg-lime px-1 text-ink">q</span>
            </motion.span>
            <span className="mt-1 flex items-center gap-1.5 whitespace-nowrap font-display text-[0.6875rem] font-medium text-ink-3">
              {sessionActive ? (
                <>
                  <span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-court" />
                  <span className="text-court-deep">เปิดสนาม · {session?.courtCount} คอร์ต</span>
                  <span className="hidden text-ink-4 sm:inline">· v{APP_VERSION}</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">KD · KHONDEE-TEEBAD ·</span>
                  <span>v{APP_VERSION}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* ประวัติการเล่น — read-only, every role, only while a session is open. */}
          {sessionActive && onOpenHistory && (
            <button type="button" onClick={onOpenHistory} aria-label="ประวัติการเล่น" className="btn btn-sky-soft h-11 min-w-11 px-3 sm:px-4">
              <IconHistory className="h-5 w-5" />
              <span className="hidden sm:inline">ประวัติ</span>
            </button>
          )}

          {isAdmin ? (
            <>
              <span className="chip anim-pop hidden bg-lime py-2 text-ink md:inline-flex">
                <IconCrown className="h-3.5 w-3.5" /> แอดมิน
              </span>
              {sessionActive && (
                <button type="button" onClick={onEndSession} aria-label="ปิดสนาม" className="btn btn-danger-soft h-11 min-w-11 px-3 sm:px-4">
                  <IconPower className="h-5 w-5" />
                  <span className="hidden sm:inline">ปิดสนาม</span>
                </button>
              )}
              <button type="button" onClick={lock} aria-label="ล็อค ออกจากโหมดแอดมิน" className="btn h-11 min-w-11 px-3 sm:px-4">
                <IconLock className="h-5 w-5" />
                <span className="hidden sm:inline">ล็อค</span>
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setShowPin(true)} className="btn btn-ink h-11 px-4">
              <IconKey className="h-[1.125rem] w-[1.125rem] text-lime" />
              <span className="sm:hidden">แอดมิน</span>
              <span className="hidden sm:inline">เข้าโหมดแอดมิน</span>
            </button>
          )}
        </div>
      </div>
      <Tape />

      <AnimatePresence>{showPin && <PinModal key="pin" onClose={() => setShowPin(false)} />}</AnimatePresence>
    </header>
  );
}
