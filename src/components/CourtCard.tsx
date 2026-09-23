"use client";

import { useEffect, useRef, useState } from "react";
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
              data-flip-place={`court:${courtId}:${right ? "b" : "a"}`}
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

export function CourtCard({
  court,
  byId,
  isAdmin,
  waitingCount,
  selectedCount,
  swapSelectedId,
  nextUpCount,
  pairWarn,
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
  pairWarn?: (ids: string[]) => number; // finished games this team's pair already played together
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

  // Repeat-teammate warning only while the game hasn't started (assigned). Once
  // it starts, teams are locked in and the warning is no longer actionable.
  const warnA = assigned && pairWarn ? pairWarn(court.teamA) : 0;
  const warnB = assigned && pairWarn ? pairWarn(court.teamB) : 0;

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

  // One-shot choreography for each real state change of THIS court (local tap
  // or a realtime update from another device). Mount and unrelated re-renders
  // play nothing:
  //   → live   a band of light serves across the card, the number jumps
  //   → open   the markings redraw from the net and the empty scene settles in
  const phase = started ? "live" : occupied ? "set" : "open";
  const [fx, setFx] = useState<"live" | "open" | null>(null);
  const lastPhase = useRef(phase);
  useEffect(() => {
    const prev = lastPhase.current;
    lastPhase.current = phase;
    if (prev === phase || phase === "set") return;
    setFx(phase);
    const t = setTimeout(() => setFx(null), 720);
    return () => clearTimeout(t);
  }, [phase]);

  // Start is a round-trip: show it travelling instead of a dead button.
  const [starting, setStarting] = useState(false);

  return (
    <motion.article
      whileHover={lift}
      style={staggerDelay(index + 1)}
      onClick={canDrop ? () => onAssignSelected(court.id) : undefined}
      className={`court-grain anim-enter relative flex h-[24.5rem] flex-col overflow-hidden rounded-[26px] transition-all duration-200 sm:h-[25rem] ${
        occupied ? LIVE : E2
      } ${canDrop ? "tap-ready cursor-pointer" : ""} ${flash ? "flash-live" : ""} ${fx === "live" ? "serve-sweep" : ""} ${className}`}
    >
      <CourtMarks live={occupied} redraw={fx === "open"} />

      <div aria-hidden className={`absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl ${occupied ? "bg-mint-wash" : "bg-accent-wash"}`} />
      <div className="relative flex flex-1 flex-col p-4 xl:p-5">
        {/* ── Identity left, clock right ───────────────────────────── */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-[17px] ${fx === "live" ? "anim-bump" : ""} ${occupied ? "bg-mint-wash text-mint-deep" : "bg-accent-wash text-accent"}`}>
              <span className="numeral text-title leading-none">{number}</span>
            </span>
            <div>
              <span className="section-heading block text-xs text-ink">คอร์ต {court.index}</span>
              <span key={phase} className="anim-status mt-1 block text-eyebrow font-semibold text-ink-3">
                {started ? "กำลังสนุกกันอยู่" : assigned ? "จัดผู้เล่นแล้ว · แตะเพื่อสลับ" : "พร้อมรับเกมใหม่"}
              </span>
            </div>
          </div>

          {started && court.startedAt != null ? (
            <div className="anim-status">
              <CourtTimer startedAt={court.startedAt} />
            </div>
          ) : assigned ? (
            <span className="anim-status mt-1 flex items-center gap-1.5 rounded-full bg-accent-wash px-3 py-1.5 text-eyebrow font-extrabold text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" />รอเริ่มเกม</span>
          ) : (
            <span className="anim-status mt-1 flex items-center gap-1.5 rounded-full bg-mint-wash px-3 py-1.5 text-eyebrow font-extrabold text-mint-deep"><span className="h-1.5 w-1.5 rounded-full bg-mint" />ว่าง</span>
          )}
        </header>

        {/* ── Body ─────────────────────────────────────────────────── */}
        {occupied ? (
          <>
            <div className="mt-5 flex items-start gap-3">
              <Side
                courtId={court.id}
                ids={court.teamA}
                byId={byId}
                label="ทีม A"
                align="left"
                selectable={isAdmin && assigned}
                selectedId={swapSelectedId}
                warnCount={warnA}
                onPlayerTap={(id) => onPlayerTap(court.id, id)}
              />
              <div className="w-px self-stretch bg-gradient-to-b from-transparent via-line-2 to-transparent" />
              <Side
                courtId={court.id}
                ids={court.teamB}
                byId={byId}
                label="ทีม B"
                align="right"
                selectable={isAdmin && assigned}
                selectedId={swapSelectedId}
                warnCount={warnB}
                onPlayerTap={(id) => onPlayerTap(court.id, id)}
              />
            </div>

            {isAdmin && assigned && (
              <p key={swapSelectedId ? "swap" : "idle"} className="anim-status mt-3 rounded-[12px] bg-accent-wash px-3 py-2 text-[0.66rem] font-semibold leading-relaxed text-accent-deep">
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
                    className={`${finishing ? "kq-busy" : ""} anim-swap lime-button shine-button h-12 flex-[2] rounded-[15px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0`}
                  >
                    {finishing ? "กำลังจบเกม…" : "จบเกม + กลับคิว"}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={press}
                    onClick={() => trackBusy(onStart(court.id), setStarting)}
                    className={`${starting ? "kq-busy" : ""} anim-swap start-button flex h-12 flex-[2] items-center justify-center whitespace-nowrap rounded-[15px] px-3 text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0`}
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
              <MiniCourtScene />
              <span className="anim-status flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[0.68rem] font-extrabold tracking-[0.14em] text-mint shadow-[0_12px_24px_-16px_rgba(29,51,34,0.75)]" style={staggerDelay(2)}>
                <span className="h-2 w-2 rounded-full bg-mint" /> READY
              </span>
              <span className="anim-enter mt-3 text-sm font-extrabold text-ink-2" style={staggerDelay(3)}>คอร์ตพร้อมแล้ว</span>
              <span className="anim-enter mt-1 text-[0.68rem] font-medium text-ink-3" style={staggerDelay(4)}>เลือกผู้เล่นหรือให้ระบบจัดคู่</span>
            </div>

            {isAdmin ? (
              nextUpCount === 4 ? (
                // Priority: a full Next Up is staged — this court can only take
                // it. Fair / Random / Manual are hidden until it's promoted.
                <div className="anim-enter space-y-2.5" style={staggerDelay(3)}>
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
                <div className="anim-enter rounded-[15px] border border-dashed border-accent/25 bg-accent-wash/50 px-4 py-4 text-center" style={staggerDelay(3)}>
                  <p className="text-caption font-extrabold text-accent-deep">เกมถัดไปจองคิวไว้แล้ว</p>
                  <p className="mt-1 text-[0.68rem] leading-relaxed text-ink-3">
                    เติมเกมถัดไปให้ครบ 4 คน หรือล้างก่อน ถึงจะจัดคอร์ตนี้ได้
                  </p>
                </div>
              ) : (
                <div className="anim-enter space-y-2.5" style={staggerDelay(3)}>
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
                        shuffle
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
