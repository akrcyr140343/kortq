"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Court, Player } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";
import { CourtTimer } from "./CourtTimer";
import { lift, press, staggerDelay } from "./motion";
import { E2, LIVE } from "./ui";

/**
 * Court markings — boundary, service lines and the net. Static and decorative:
 * the card becomes the court, so no icon is needed to say what it is.
 */
function CourtMarks({ live }: { live: boolean }) {
  const edge = live ? "border-mint/35" : "border-accent/10";
  const rule = live ? "bg-mint/25" : "bg-accent/8";
  const net = live ? "bg-accent/25" : "bg-accent/14";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-5 rounded-[18px] border ${edge}`} />
      <div className={`absolute inset-x-5 top-[29%] h-px ${rule}`} />
      <div className={`absolute inset-x-5 bottom-[29%] h-px ${rule}`} />
      <div className={`absolute inset-y-5 left-1/2 w-px ${net}`} />
    </div>
  );
}

/** One side of the net. Player names are the loudest type in the card. */
function Side({
  ids,
  byId,
  label,
  align,
}: {
  ids: string[];
  byId: Map<string, Player>;
  label: string;
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2.5 ${right ? "items-end" : "items-start"}`}>
      <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold ${right ? "bg-sky-wash text-sky-deep" : "bg-coral-wash text-coral-deep"}`}>{label}</span>
      <div className="flex w-full flex-col gap-2">
        {ids.map((id, i) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            // Keyed by player id, so a fresh pairing remounts and pops in.
            <div
              key={id}
              style={staggerDelay(i, 0.06)}
              className={`anim-pop flex min-w-0 items-center gap-2 rounded-[13px] border border-white/80 bg-white/72 px-2.5 py-2 shadow-[0_8px_18px_-16px_rgba(32,35,63,0.45)] backdrop-blur-sm ${
                right ? "flex-row-reverse" : ""
              }`}
            >
              <SkillBadge skill={p.skill} />
              <span className="truncate text-body font-extrabold leading-tight text-ink">{p.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CourtCard({
  court,
  byId,
  isAdmin,
  waitingCount,
  selectedCount,
  onAuto,
  onRandom,
  onAssignSelected,
  onFinish,
  onRemove,
  index = 0,
  className = "",
}: {
  court: Court;
  byId: Map<string, Player>;
  isAdmin: boolean;
  waitingCount: number;
  selectedCount: number;
  index?: number;
  onAuto: (courtId: string) => void;
  onRandom: (courtId: string) => void;
  onAssignSelected: (courtId: string) => void;
  onFinish: (courtId: string) => void;
  onRemove: (courtId: string) => void;
  className?: string;
}) {
  const occupied = court.teamA.length + court.teamB.length > 0;
  const notEnough = waitingCount < 4;
  const number = String(court.index).padStart(2, "0");
  const canDrop = isAdmin && !occupied && selectedCount >= 2;

  // A fresh `startedAt` means players just landed here — wash the card once.
  const [flash, setFlash] = useState(false);
  const lastStart = useRef(court.startedAt);
  useEffect(() => {
    const changed = lastStart.current !== court.startedAt;
    lastStart.current = court.startedAt;
    if (!changed || court.startedAt == null) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 340);
    return () => clearTimeout(t);
  }, [court.startedAt]);

  return (
    <motion.article
      whileHover={lift}
      style={staggerDelay(index + 1)}
      onClick={canDrop ? () => onAssignSelected(court.id) : undefined}
      className={`court-grain anim-enter relative flex h-[22rem] flex-col overflow-hidden rounded-[28px] transition-all duration-200 sm:h-[22.5rem] ${
        occupied ? LIVE : E2
      } ${canDrop ? "tap-ready cursor-pointer" : ""} ${flash ? "flash-live" : ""} ${className}`}
    >
      <CourtMarks live={occupied} />

      <div aria-hidden className={`absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl ${occupied ? "bg-mint-wash" : "bg-accent-wash"}`} />
      <div className="relative flex flex-1 flex-col p-5">
        {/* ── Identity left, clock right ───────────────────────────── */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-[17px] ${occupied ? "bg-mint-wash text-mint-deep" : "bg-accent-wash text-accent"}`}>
              <span className="numeral text-title leading-none">{number}</span>
            </span>
            <div>
              <span className="block text-xs font-extrabold text-ink">คอร์ต {court.index}</span>
              <span className="mt-1 block text-[0.65rem] font-semibold text-ink-3">{occupied ? "กำลังสนุกกันอยู่" : "พร้อมรับเกมใหม่"}</span>
            </div>
          </div>

          {occupied && court.startedAt != null ? (
            <CourtTimer startedAt={court.startedAt} />
          ) : (
            <span className="mt-1 flex items-center gap-1.5 rounded-full bg-mint-wash px-3 py-1.5 text-[0.65rem] font-extrabold text-mint-deep"><span className="h-1.5 w-1.5 rounded-full bg-mint" />ว่าง</span>
          )}
        </header>

        {/* ── Body ─────────────────────────────────────────────────── */}
        {occupied ? (
          <>
            <div className="mt-5 flex items-start gap-3">
              <Side ids={court.teamA} byId={byId} label="ทีม A" align="left" />
              <div className="w-px self-stretch bg-gradient-to-b from-transparent via-line-2 to-transparent" />
              <Side ids={court.teamB} byId={byId} label="ทีม B" align="right" />
            </div>

            {isAdmin && (
              <div className="mt-auto flex gap-2">
                <motion.button
                  whileTap={press}
                  onClick={() => onRemove(court.id)}
                  className="h-12 flex-1 rounded-[15px] border border-line bg-white/80 text-caption font-bold text-ink-3 transition-all duration-200 hover:border-alert/30 hover:bg-alert-wash hover:text-alert"
                >
                  ยกเลิก
                </motion.button>
                <motion.button
                  whileTap={press}
                  onClick={() => onFinish(court.id)}
                  className="lime-button shine-button h-12 flex-[2] rounded-[15px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5"
                >
                  จบเกม + กลับคิว
                </motion.button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 flex flex-1 flex-col">
            {/* Faded center mark — signals this is a playable slot, not a gap */}
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[0.68rem] font-extrabold tracking-[0.14em] text-mint shadow-[0_12px_24px_-16px_rgba(29,51,34,0.75)]">
                <span className="h-2 w-2 rounded-full bg-mint" /> READY
              </span>
              <span className="mt-3 text-sm font-extrabold text-ink-2">คอร์ตพร้อมแล้ว</span>
              <span className="mt-1 text-[0.68rem] font-medium text-ink-3">เลือกผู้เล่นหรือให้ระบบจัดคู่</span>
            </div>

            {isAdmin ? (
              <div className="space-y-2.5">
                {selectedCount >= 2 ? (
                  <ActionButton
                    onClick={() => onAssignSelected(court.id)}
                    label="ส่งลงคอร์ตนี้"
                    hint={`${selectedCount} คนที่เลือก`}
                    variant="primary"
                  />
                ) : (
                  <>
                    <ActionButton
                      onClick={() => onAuto(court.id)}
                      disabled={notEnough}
                      label="จับคู่ให้เลย"
                      hint="4 คนแรกในคิว"
                      variant="primary"
                    />
                    <ActionButton
                      onClick={() => onRandom(court.id)}
                      disabled={notEnough}
                      label="สุ่มดวงกันหน่อย"
                      hint="สุ่มจากทั้งคิว"
                      variant="soft"
                    />
                  </>
                )}
                {notEnough && selectedCount < 2 && (
                    <p className="px-1 pt-0.5 text-[0.68rem] leading-relaxed text-ink-4">
                    ขอครบ 4 คนในคิวก่อนนะ แล้วจะจัดให้ทันที
                  </p>
                )}
              </div>
            ) : (
              <p className="pb-4 text-body text-ink-3"></p>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

/** Text-first action button: bold label, muted hint, no iconography. */
function ActionButton({
  onClick,
  disabled = false,
  label,
  hint,
  variant,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  hint: string;
  variant: "primary" | "soft";
}) {
  const styles = {
    primary:
      "lime-button shine-button font-extrabold hover:-translate-y-0.5 disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none",
    soft: "border border-line bg-white text-ink-2 shadow-sm hover:-translate-y-0.5 hover:border-coral/25 hover:bg-coral-wash hover:text-coral-deep disabled:border-line disabled:bg-canvas disabled:text-ink-4 disabled:shadow-none",
  }[variant];

  return (
    <motion.button
      whileTap={disabled ? undefined : press}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`flex h-12 w-full items-center justify-between rounded-[15px] px-4 transition-all duration-200 disabled:cursor-not-allowed ${styles}`}
    >
      <span className="text-caption font-bold">{label}</span>
      <span className="text-eyebrow opacity-70">{hint}</span>
    </motion.button>
  );
}
