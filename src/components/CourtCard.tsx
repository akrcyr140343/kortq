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
  selectable,
  selectedId,
  onPlayerTap,
}: {
  ids: string[];
  byId: Map<string, Player>;
  label: string;
  align: "left" | "right";
  selectable: boolean;
  selectedId: string | null;
  onPlayerTap?: (id: string) => void;
}) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2.5 ${right ? "items-end" : "items-start"}`}>
      <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold ${right ? "bg-sky-wash text-sky-deep" : "bg-coral-wash text-coral-deep"}`}>{label}</span>
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
              whileTap={selectable ? press : undefined}
              onClick={
                selectable && onPlayerTap
                  ? (e) => {
                      e.stopPropagation();
                      onPlayerTap(id);
                    }
                  : undefined
              }
              style={staggerDelay(i, 0.06)}
              className={`anim-pop flex min-w-0 items-center gap-2 rounded-[13px] border px-2.5 py-2 shadow-[0_8px_18px_-16px_rgba(32,35,63,0.45)] backdrop-blur-sm transition-all duration-150 ${
                right ? "flex-row-reverse" : ""
              } ${
                chosen
                  ? "border-accent bg-accent-wash ring-2 ring-accent"
                  : "border-white/80 bg-white/72"
              } ${selectable ? "cursor-pointer" : ""}`}
            >
              <SkillBadge skill={p.skill} />
              <span className="min-w-0 flex-1 truncate text-body font-extrabold leading-tight text-ink">{p.name}</span>
              {/* Finished-games count — always shown (incl. 0), smaller/quieter
                  than the name and never truncated, so admins can eyeball load. */}
              <span className="shrink-0 text-eyebrow font-semibold tabular-nums text-ink-4">· {p.gamesPlayed ?? 0} เกม</span>
            </motion.div>
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
  swapSelectedId,
  nextUpCount,
  finishing = false,
  onFair,
  onRandom,
  onAssignSelected,
  onPromote,
  onStart,
  onPlayerTap,
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
  swapSelectedId: string | null; // player selected for swapping on THIS court
  nextUpCount: number; // staged Next Up size (0 = none, 1–3 = locked, 4 = ready)
  finishing?: boolean; // a finish request for THIS court is in flight (UI guard)
  index?: number;
  onFair: (courtId: string) => void;
  onRandom: (courtId: string) => void;
  onAssignSelected: (courtId: string) => void;
  onPromote: (courtId: string) => void;
  onStart: (courtId: string) => void;
  onPlayerTap: (courtId: string, playerId: string) => void;
  onFinish: (courtId: string) => void;
  onRemove: (courtId: string) => void;
  className?: string;
}) {
  const occupied = court.teamA.length + court.teamB.length > 0;
  const started = court.startedAt != null; // game clock running
  const assigned = occupied && !started; // players placed, game not started yet
  const notEnough = waitingCount < 4;
  const number = String(court.index).padStart(2, "0");
  // Next Up priority states (kept inline — see the empty-court body below):
  //   nextUpCount === 4        → this court can promote the staged game
  //   1 ≤ nextUpCount ≤ 3      → booked but incomplete: court is locked
  //   nextUpCount === 0        → normal assignment
  // While any next game is staged, an empty court can't take a manual drop.
  const canDrop = isAdmin && !occupied && selectedCount >= 2 && nextUpCount === 0;

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
              <span className="mt-1 block text-[0.65rem] font-semibold text-ink-3">
                {started ? "กำลังสนุกกันอยู่" : assigned ? "จัดผู้เล่นแล้ว · แตะเพื่อสลับ" : "พร้อมรับเกมใหม่"}
              </span>
            </div>
          </div>

          {started && court.startedAt != null ? (
            <CourtTimer startedAt={court.startedAt} />
          ) : assigned ? (
            <span className="mt-1 flex items-center gap-1.5 rounded-full bg-accent-wash px-3 py-1.5 text-[0.65rem] font-extrabold text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" />รอเริ่มเกม</span>
          ) : (
            <span className="mt-1 flex items-center gap-1.5 rounded-full bg-mint-wash px-3 py-1.5 text-[0.65rem] font-extrabold text-mint-deep"><span className="h-1.5 w-1.5 rounded-full bg-mint" />ว่าง</span>
          )}
        </header>

        {/* ── Body ─────────────────────────────────────────────────── */}
        {occupied ? (
          <>
            <div className="mt-5 flex items-start gap-3">
              <Side
                ids={court.teamA}
                byId={byId}
                label="ทีม A"
                align="left"
                selectable={isAdmin && assigned}
                selectedId={swapSelectedId}
                onPlayerTap={(id) => onPlayerTap(court.id, id)}
              />
              <div className="w-px self-stretch bg-gradient-to-b from-transparent via-line-2 to-transparent" />
              <Side
                ids={court.teamB}
                byId={byId}
                label="ทีม B"
                align="right"
                selectable={isAdmin && assigned}
                selectedId={swapSelectedId}
                onPlayerTap={(id) => onPlayerTap(court.id, id)}
              />
            </div>

            {isAdmin && assigned && (
              <p className="mt-3 rounded-[12px] bg-accent-wash px-3 py-2 text-[0.66rem] font-semibold leading-relaxed text-accent-deep">
                {swapSelectedId
                  ? "แตะอีกคนบนคอร์ตนี้หรือคอร์ตอื่นเพื่อสลับ หรือแตะคนในคิวเพื่อเปลี่ยนตัว"
                  : "แตะผู้เล่นเพื่อสลับทีม / เปลี่ยนตัวก่อนเริ่มเกม"}
              </p>
            )}

            {isAdmin && (
              <div className="mt-auto flex gap-2 pt-3">
                <motion.button
                  whileTap={press}
                  onClick={() => onRemove(court.id)}
                  className="h-12 flex-1 rounded-[15px] border border-line bg-white/80 text-caption font-bold text-ink-3 transition-all duration-200 hover:border-alert/30 hover:bg-alert-wash hover:text-alert"
                >
                  ยกเลิก
                </motion.button>
                {started ? (
                  <motion.button
                    whileTap={finishing ? undefined : press}
                    onClick={() => onFinish(court.id)}
                    disabled={finishing}
                    className="lime-button shine-button h-12 flex-[2] rounded-[15px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {finishing ? "กำลังจบเกม…" : "จบเกม + กลับคิว"}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={press}
                    onClick={() => onStart(court.id)}
                    className="lime-button shine-button h-12 flex-[2] rounded-[15px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5"
                  >
                    เริ่มเกม
                  </motion.button>
                )}
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
              nextUpCount === 4 ? (
                // Priority: a full Next Up is staged — this court can only take
                // it. Fair / Random / Manual are hidden until it's promoted.
                <div className="space-y-2.5">
                  <ActionButton
                    onClick={() => onPromote(court.id)}
                    label="ส่งเกมถัดไปลง"
                    hint="4 คนที่ตั้งไว้"
                    variant="primary"
                  />
                  <p className="px-1 pt-0.5 text-[0.68rem] leading-relaxed text-ink-4">
                    มีเกมถัดไปรออยู่ — ส่งลงก่อนถึงจะจับคู่ชุดใหม่ได้
                  </p>
                </div>
              ) : nextUpCount >= 1 ? (
                // Priority: an incomplete next game is booked. The queue can't
                // jump ahead of it — admin must fill it to 4 or clear it first.
                <div className="rounded-[15px] border border-dashed border-accent/25 bg-accent-wash/50 px-4 py-4 text-center">
                  <p className="text-caption font-extrabold text-accent-deep">เกมถัดไปจองคิวไว้แล้ว</p>
                  <p className="mt-1 text-[0.68rem] leading-relaxed text-ink-3">
                    เติมเกมถัดไปให้ครบ 4 คน หรือล้างก่อน ถึงจะจัดคอร์ตนี้ได้
                  </p>
                </div>
              ) : (
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
                        onClick={() => onFair(court.id)}
                        disabled={notEnough}
                        label="จับแฟร์"
                        hint="ยุติธรรม · ไม่ซ้ำคู่"
                        variant="smart"
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
              )
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
  variant: "primary" | "soft" | "smart";
}) {
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
