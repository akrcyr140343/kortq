"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Court, Player } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";
import { CourtTimer } from "./CourtTimer";
import { lift, press, staggerDelay, trackBusy } from "./motion";
import { E2, LIVE } from "./ui";

/**
 * Court markings — boundary, service lines and the net. Static and decorative:
 * the card becomes the court, so no icon is needed to say what it is.
 */
function CourtMarks({ live, redraw = false }: { live: boolean; redraw?: boolean }) {
  const edge = live ? "border-mint/35" : "border-accent/10";
  const rule = live ? "bg-mint/25" : "bg-accent/8";
  const net = live ? "bg-accent/25" : "bg-accent/14";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${redraw ? "marks-redraw" : ""}`}>
      <div className={`absolute inset-5 rounded-[18px] border ${edge}`} />
      <div className={`absolute inset-x-5 top-[29%] h-px ${rule}`} />
      <div className={`absolute inset-x-5 bottom-[29%] h-px ${rule}`} />
      <div className={`absolute inset-y-5 left-1/2 w-px ${net}`} />
    </div>
  );
}

function MiniCourtScene() {
  return (
    <div aria-hidden className="anim-scene relative mb-2 h-20 w-full max-w-[14rem]">
      <svg viewBox="0 0 240 90" className="absolute inset-x-0 bottom-0 w-full overflow-visible drop-shadow-[0_8px_8px_rgba(20,119,86,.16)]">
        <defs>
          <linearGradient id="court-card-green" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#67c983" />
            <stop offset="1" stopColor="#1aa079" />
          </linearGradient>
        </defs>
        <path d="M44 19h152l34 61H10l34-61Z" fill="url(#court-card-green)" stroke="#158b66" strokeWidth="2" />
        <path d="M44 19 10 80M196 19l34 61M120 19v61M25 53h190M74 19 60 80M166 19l14 61" fill="none" stroke="white" strokeOpacity=".84" strokeWidth="1.5" />
        <path d="M37 31h166" stroke="#0a6049" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

/** One side of the net. Player names are the loudest type in the card. */
function Side({
  courtId,
  ids,
  byId,
  label,
  align,
  selectable,
  selectedId,
  warnCount,
  onPlayerTap,
}: {
  courtId: string;
  ids: string[];
  byId: Map<string, Player>;
  label: string;
  align: "left" | "right";
  selectable: boolean;
  selectedId: string | null;
  warnCount: number; // finished games this team's pair already played together (0 = none)
  onPlayerTap?: (id: string) => void;
}) {
  const right = align === "right";
  const warn = warnCount > 0;
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2.5 ${right ? "items-end" : "items-start"}`}>
      <span className={`rounded-full px-2.5 py-1 text-eyebrow font-extrabold ${right ? "bg-sky-wash text-sky-deep" : "bg-coral-wash text-coral-deep"}`}>{label}</span>
      <div className="flex w-full flex-col gap-2">
        {ids.map((id, i) => {
          const p = byId.get(id);
          if (!p) return null;
          const chosen = selectedId === id;
          // Keyed by player id, so a fresh pairing remounts and pops in.
          // While the game hasn't started, each chip is a tap target for the
          // swap flow (touch-friendly for iPad Safari — no drag & drop).
          return (
            <motion.div
              key={id}
              data-flip-id={id}
              data-flip-place={`game:${courtId}:${right ? "b" : "a"}`}
              whileTap={selectable ? press : undefined}
              onClick={
                selectable && onPlayerTap
                  ? (e) => {
                      e.stopPropagation();
                      onPlayerTap(id);
                    }
                  : undefined
              }
              // Dealt like cards, alternating sides: A1, B1, A2, B2.
              style={staggerDelay(i * 2 + (right ? 1 : 0), 0.05)}
              className={`anim-pop relative flex min-w-0 items-center gap-2 rounded-[13px] border px-2.5 py-2 shadow-[0_8px_18px_-16px_rgba(32,35,63,0.45)] backdrop-blur-sm transition-all duration-150 ${
                right ? "flex-row-reverse" : ""
              } ${
                chosen
                  ? "border-accent bg-accent-wash ring-2 ring-accent"
                  : warn
                    ? "border-amber-300 bg-amber-50 ring-1 ring-amber-300"
                    : "border-white/80 bg-white/72"
              } ${selectable ? "cursor-pointer" : ""}`}
            >
              {/* Picked for a swap: one ring ripples out from the chip. */}
              {chosen && <span aria-hidden className="anim-ping pointer-events-none absolute inset-0 rounded-[13px]" />}
              <SkillBadge skill={p.skill} />
              <span className={`flex min-w-0 flex-1 flex-col gap-0.5 ${right ? "items-end" : "items-start"}`}>
                <span className={`line-clamp-2 text-body font-extrabold leading-tight text-ink [overflow-wrap:anywhere] ${right ? "text-right" : ""}`}>{p.name}</span>
                {/* Finished-games count stays visible below the name, so neither
                    datum has to surrender horizontal space on three-card rows. */}
                <span className="shrink-0 text-eyebrow font-semibold tabular-nums text-ink-4">{p.gamesPlayed ?? 0} เกม</span>
              </span>
            </motion.div>
          );
        })}
      </div>
      {/* Repeat-teammate warning — advisory only, never blocks start/swap. */}
      {warn && (
        <span className={`flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[0.6rem] font-bold text-amber-700 ring-1 ring-amber-200 ${right ? "self-end" : "self-start"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />คู่ซ้ำ · เคยคู่กัน {warnCount} เกม
        </span>
      )}
    </div>
  );
}

/**
 * A game currently being played ("กำลังเล่น"). Not a court number: each game
 * has its own identity (เกม #n) and its own finish / cancel, so games can end
 * in any order. The court styling and choreography are unchanged.
 */
export function CourtCard({
  court,
  byId,
  isAdmin,
  finishing = false,
  onFinish,
  onCancel,
  index = 0,
  className = "",
}: {
  court: Court; // a running game doc
  byId: Map<string, Player>;
  isAdmin: boolean;
  finishing?: boolean; // a finish request for THIS game is in flight (UI guard)
  index?: number;
  onFinish: (gameId: string) => void;
  onCancel: (gameId: string) => void;
  className?: string;
}) {
  const number = String(court.index).padStart(2, "0");

  // A game that was sent a moment ago (on this or another device) arrives with
  // one wash + a band of light serving across it; an old game mounted by a
  // reload or a tab switch arrives quietly.
  const [fx, setFx] = useState<"live" | null>(() =>
    court.startedAt != null && Date.now() - court.startedAt < 4000 ? "live" : null,
  );
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), 720);
    return () => clearTimeout(t);
  }, [fx]);

  return (
    <motion.article
      whileHover={lift}
      style={staggerDelay(index + 1)}
      className={`court-grain anim-enter relative flex flex-col overflow-hidden rounded-[26px] transition-all duration-200 ${LIVE} ${
        fx === "live" ? "flash-live serve-sweep" : ""
      } ${className}`}
    >
      <CourtMarks live />

      <div aria-hidden className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-mint-wash blur-3xl" />
      <div className="relative flex flex-1 flex-col p-4 xl:p-5">
        {/* ── Identity left, clock right ───────────────────────────── */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-[17px] bg-mint-wash text-mint-deep ${fx === "live" ? "anim-bump" : ""}`}>
              <span className="numeral text-title leading-none">{number}</span>
            </span>
            <div>
              <span className="section-heading block text-xs text-ink">เกม #{court.index}</span>
              <span className="mt-1 block text-eyebrow font-semibold text-ink-3">กำลังสนุกกันอยู่</span>
            </div>
          </div>

          {court.startedAt != null && (
            <div className="anim-status">
              <CourtTimer startedAt={court.startedAt} />
            </div>
          )}
        </header>

        {/* ── Teams ────────────────────────────────────────────────── */}
        <div className="mt-5 flex items-start gap-3">
          <Side courtId={court.id} ids={court.teamA} byId={byId} label="ทีม A" align="left" selectable={false} selectedId={null} warnCount={0} />
          <div className="w-px self-stretch bg-gradient-to-b from-transparent via-line-2 to-transparent" />
          <Side courtId={court.id} ids={court.teamB} byId={byId} label="ทีม B" align="right" selectable={false} selectedId={null} warnCount={0} />
        </div>

        {isAdmin && (
          <div className="mt-auto flex gap-2 pt-4">
            <motion.button
              whileTap={press}
              onClick={() => onCancel(court.id)}
              className="h-12 flex-1 rounded-[15px] border border-line bg-white/80 text-caption font-bold text-ink-3 transition-all duration-200 hover:border-alert/30 hover:bg-alert-wash hover:text-alert"
            >
              ยกเลิก
            </motion.button>
            <motion.button
              whileTap={finishing ? undefined : press}
              onClick={() => onFinish(court.id)}
              disabled={finishing}
              className={`${finishing ? "kq-busy" : ""} lime-button shine-button h-12 flex-[2] rounded-[15px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0`}
            >
              {finishing ? "กำลังจบเกม…" : "จบเกม + กลับคิว"}
            </motion.button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

/**
 * A free playing slot (the court count allows another game). Pure status — it
 * is not a numbered court and takes no taps; Q1 is sent from the queue card.
 */
export function FreeSlotCard({ index = 0 }: { index?: number }) {
  return (
    <div
      style={staggerDelay(index + 1)}
      className={`court-grain anim-enter relative flex flex-col items-center justify-center overflow-hidden rounded-[26px] px-4 py-6 text-center ${E2}`}
    >
      <CourtMarks live={false} />
      <div className="relative flex flex-col items-center">
        <MiniCourtScene />
        <span className="anim-status flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[0.68rem] font-extrabold tracking-[0.14em] text-mint shadow-[0_12px_24px_-16px_rgba(29,51,34,0.75)]">
          <span className="h-2 w-2 rounded-full bg-mint" /> ว่าง
        </span>
        <span className="mt-2 text-[0.68rem] font-medium text-ink-3">เรียก Q1 ลงสนามได้เลย</span>
      </div>
    </div>
  );
}

/** Text-first action button: bold label, muted hint, no iconography. */
export function ActionButton({
  onClick,
  disabled = false,
  label,
  hint,
  variant,
  shuffle = false,
}: {
  onClick: () => unknown;
  disabled?: boolean;
  label: string;
  hint: string;
  variant: "primary" | "soft" | "smart";
  shuffle?: boolean; // random draw: the label cuts like a deck on tap
}) {
  // Fair / random / send are round-trips (Fair also reads fresh history):
  // a travelling shine says "working on it" without blocking anything.
  const [busy, setBusy] = useState(false);
  const [cuts, setCuts] = useState(0);
  const styles = {
    primary:
      "lime-button shine-button font-extrabold hover:-translate-y-0.5 disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none",
    smart:
      "shine-button bg-gradient-to-r from-accent to-accent-2 font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(108,92,231,0.8)] hover:-translate-y-0.5 disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none",
    soft: "border border-line bg-white text-ink-2 shadow-sm hover:-translate-y-0.5 hover:border-coral/25 hover:bg-coral-wash hover:text-coral-deep disabled:border-line disabled:bg-canvas disabled:text-ink-4 disabled:shadow-none",
  }[variant];

  return (
    <motion.button
      whileTap={disabled ? undefined : press}
      onClick={(e) => {
        e.stopPropagation();
        if (shuffle) setCuts((n) => n + 1);
        trackBusy(onClick(), setBusy);
      }}
      disabled={disabled}
      className={`${busy ? "kq-busy" : ""} flex h-12 w-full items-center justify-between rounded-[15px] px-4 transition-all duration-200 disabled:cursor-not-allowed ${styles}`}
    >
      <span key={cuts} className={`text-caption font-bold ${cuts > 0 ? "anim-shuffle" : ""}`}>{label}</span>
      <span className="text-eyebrow opacity-70">{hint}</span>
    </motion.button>
  );
}
