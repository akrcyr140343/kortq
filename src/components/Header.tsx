"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { PinModal } from "./PinModal";
import { ClubQrModal } from "./ClubQrModal";
import type { Session } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";
import { press } from "./motion";

/** Small QR glyph — three finder squares + a few modules. Purely decorative. */
function QrGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 14h3v3M20 14v.01M20 20v.01M17 20v.01M20 17h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function MiniSparkle({ className, delay }: { className: string; delay: number }) {
  return (
    <span
      aria-hidden
      className={`twinkle pointer-events-none absolute text-mint ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor">
        <path d="M12 0c.6 5.7 3.3 8.4 9 9-5.7.6-8.4 3.3-9 9-.6-5.7-3.3-8.4-9-9 5.7-.6 8.4-3.3 9-9Z" />
      </svg>
    </span>
  );
}

/**
 * The "QR ก๊วน" invite button — the liveliest thing in the header: a breathing
 * mint aura, a periodic light sweep, a floating/wiggling glyph and corner
 * sparkles, all stilled for reduced-motion users. Layered behind/inside so
 * nothing shifts the layout.
 */
function QrClubButton({ onClick }: { onClick: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative shrink-0">
      {/* Breathing aura (behind the pill) — kept gentle, ~25% softer than before */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-mint/32 blur-md"
        animate={reduce ? undefined : { opacity: [0.22, 0.5, 0.22], scale: [0.92, 1.05, 0.92] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <MiniSparkle className="-right-1 -top-1" delay={0.2} />
      <MiniSparkle className="-bottom-1 left-1" delay={1.1} />

      <motion.button
        whileHover={reduce ? undefined : { y: -1.5 }}
        whileTap={press}
        onClick={onClick}
        aria-label="QR ก๊วน — ชวนเพื่อนเข้าก๊วน"
        className="relative z-10 flex h-10 items-center gap-1.5 overflow-hidden rounded-full border border-mint/40 bg-gradient-to-r from-mint/25 via-mint/12 to-mint/25 px-3 text-caption font-extrabold text-mint shadow-[0_5px_14px_-8px_rgba(184,242,61,0.4)] transition-colors duration-200 hover:border-mint/70 sm:px-4"
      >
        {/* Periodic light sweep across the pill */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: "-160%" }}
          animate={reduce ? undefined : { x: ["-160%", "360%"] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
        />
        {/* Floating / wiggling glyph */}
        <motion.span
          className="relative grid place-items-center"
          animate={reduce ? undefined : { y: [0, -2, 0], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <QrGlyph />
        </motion.span>
        <span className="relative hidden sm:inline">QR ก๊วน</span>
      </motion.button>
    </div>
  );
}

export function Header({
  session,
  onEndSession,
  onOpenPayments,
  unpaidCount = 0,
}: {
  session: Session | null;
  onEndSession: () => void;
  onOpenPayments?: () => void;
  unpaidCount?: number;
}) {
  const { isAdmin, lock } = useAdmin();
  const [showPin, setShowPin] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const sessionActive = session?.active ?? false;

  return (
    <header className="app-safe-top anim-enter sticky top-0 z-40 shrink-0 px-0 pt-0 sm:px-5 sm:pt-3">
      <div className="club-panel mx-auto flex max-w-[1700px] items-center justify-between gap-3 overflow-hidden rounded-b-[28px] px-4 py-3 sm:rounded-[24px] sm:py-2.5">
        {/* ── Brand ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[15px] bg-white shadow-[0_10px_26px_-14px_rgba(0,0,0,0.8)] sm:h-14 sm:w-14 sm:rounded-[16px]">
              <Image src="/kd-logo.png" alt="โลโก้ KD KHONDEE-TEEBAD" fill sizes="56px" className="object-cover" priority />
            </span>
            <div className="min-w-0">
              <span className="display block text-title leading-none tracking-tight text-white sm:text-h3">
                Kort<span className="text-mint">Q</span>
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[0.64rem] font-bold tracking-[0.12em] text-white/55">
                <span className="hidden sm:inline">KD · KHONDEE-TEEBAD ·</span>
                <span className="text-mint/80">v{APP_VERSION}</span>
              </span>
            </div>
          </div>

          {sessionActive && (
            <>
              <span className="hidden h-7 w-px bg-white/12 sm:block" />
              <span className="hidden items-center gap-2 rounded-full bg-white/8 px-3 py-2 sm:flex">
                <span className="live-dot h-2 w-2 rounded-full bg-mint shadow-[0_0_0_4px_rgba(184,242,61,0.12)]" />
                <span className="text-[0.72rem] font-bold text-white/80">เปิดอยู่ · {session?.courtCount} คอร์ต</span>
              </span>
            </>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* QR ก๊วน — every role, every state (even before a session opens). */}
          <QrClubButton onClick={() => setShowQr(true)} />

          {isAdmin ? (
            <>
              {sessionActive && onOpenPayments && (
                <motion.button
                  whileTap={press}
                  onClick={onOpenPayments}
                  className="relative h-10 rounded-full border border-white/15 bg-white/8 px-4 text-caption font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/14"
                >
                  <span className="sm:hidden">฿</span>
                  <span className="hidden sm:inline">ยอดเงิน</span>
                  {unpaidCount > 0 && (
                    <span className="numeral absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.62rem] leading-none text-white shadow-sm">
                      {unpaidCount}
                    </span>
                  )}
                </motion.button>
              )}
              <span className="hidden rounded-full bg-white/10 px-3 py-2 text-[0.7rem] font-bold text-mint sm:block">
                ✦ แอดมิน
              </span>
              {sessionActive && (
                <motion.button
                  whileTap={press}
                  onClick={onEndSession}
                  className="h-10 rounded-full px-3.5 text-caption font-bold text-white/65 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                >
                  ปิดสนาม
                </motion.button>
              )}
              <motion.button
                whileTap={press}
                onClick={lock}
                className="h-10 rounded-full border border-white/15 bg-white/8 px-4 text-caption font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/14"
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

      {showPin && <PinModal onClose={() => setShowPin(false)} />}
      <ClubQrModal open={showQr} onClose={() => setShowQr(false)} />
    </header>
  );
}
