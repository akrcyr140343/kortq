"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Player } from "@/lib/types";
import type { ResolvedQueuedGame } from "@/hooks/useKortq";
import { SkillBadge } from "./SkillBadge";
import { ActionButton } from "./CourtCard";
import { press, staggerDelay, trackBusy } from "./motion";
import { Tick } from "./Tick";
import { E2 } from "./ui";

/**
 * One team of a queued game. Mirrors CourtCard's `Side`: while arranging
 * (admin) each chip is a touch target for swap/substitute, plus a small ✕ to
 * drop the player back to the open queue. Members see static chips. Empty
 * slots of a partial Q show as dashed placeholders.
 */
function NextUpSide({
  queueId,
  players,
  label,
  align,
  isAdmin,
  selectedId,
  warnCount,
  onPlayerTap,
  onRemove,
}: {
  queueId: string;
  players: Player[];
  label: string;
  align: "left" | "right";
  isAdmin: boolean;
  selectedId: string | null;
  warnCount: number; // finished games this team's pair already played together (0 = none)
  onPlayerTap: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const right = align === "right";
  const warn = warnCount > 0;
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2.5 ${right ? "items-end" : "items-start"}`}>
      <span className={`rounded-full px-2.5 py-1 text-eyebrow font-extrabold ${right ? "bg-sky-wash text-sky-deep" : "bg-coral-wash text-coral-deep"}`}>{label}</span>
      <div className="flex w-full flex-col gap-2">
        {players.map((p, i) => {
          const chosen = selectedId === p.id;
          return (
            <motion.div
              key={p.id}
              data-flip-id={p.id}
              data-flip-place={`q:${queueId}:${right ? "b" : "a"}`}
              whileTap={isAdmin ? press : undefined}
              onClick={isAdmin ? () => onPlayerTap(p.id) : undefined}
              // Dealt like cards, alternating sides: A1, B1, A2, B2.
              style={staggerDelay(i * 2 + (right ? 1 : 0), 0.05)}
              className={`anim-pop relative flex min-h-11 min-w-0 items-center gap-2 rounded-[13px] border px-2.5 py-2 shadow-[0_8px_18px_-16px_rgba(32,35,63,0.45)] transition-all duration-150 ${
                right ? "flex-row-reverse" : ""
              } ${
                chosen
                  ? "border-accent bg-accent-wash ring-2 ring-accent"
                  : warn
                    ? "border-amber-300 bg-amber-50 ring-1 ring-amber-300"
                    : "border-white/80 bg-white/72"
              } ${isAdmin ? "cursor-pointer" : ""}`}
            >
              {/* Picked for a swap: one ring ripples out from the chip. */}
              {chosen && <span aria-hidden className="anim-ping pointer-events-none absolute inset-0 rounded-[13px]" />}
              <SkillBadge skill={p.skill} />
              {/* Name is the priority datum. On narrow mobile (two teams share a
                  row) it keeps full size and wraps to 2 lines before truncating,
                  with "· N เกม" demoted to a quieter line below. From sm up there
                  is room, so it collapses back to the original single inline row. */}
              <div
                className={`flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2 ${
                  right ? "items-end sm:flex-row-reverse sm:justify-end" : "items-start"
                }`}
              >
                <span
                  className={`line-clamp-2 text-body font-extrabold leading-tight text-ink [overflow-wrap:anywhere] sm:line-clamp-none sm:min-w-0 sm:flex-1 sm:truncate ${
                    right ? "text-right sm:text-left" : ""
                  }`}
                >
                  {p.name}
                </span>
                {/* Finished-games count — always shown (incl. 0), quieter than the
                    name and never truncated. Sits before the ✕. */}
                <span className="shrink-0 text-eyebrow font-semibold tabular-nums text-ink-4">· {p.gamesPlayed ?? 0} เกม</span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  aria-label="เอาออกจากคิวนี้"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(p.id);
                  }}
                  className="group -my-2 grid h-11 w-11 shrink-0 place-items-center text-ink-4"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full transition-colors duration-200 group-hover:bg-alert-wash group-hover:text-alert">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
              )}
            </motion.div>
          );
        })}
        {/* Open slots of a partial Q. */}
        {Array.from({ length: Math.max(0, 2 - players.length) }, (_, i) => (
          <span
            key={`slot-${i}`}
            aria-hidden
            className="flex min-h-11 w-full items-center justify-center rounded-[13px] border border-dashed border-accent/25 bg-white/40 text-eyebrow font-bold text-ink-4"
          >
            ว่าง
          </span>
        ))}
      </div>
      {/* Repeat-teammate warning — advisory only, never blocks sending or swapping. */}
      {warn && (
        <span className={`flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[0.6rem] font-bold text-amber-700 ring-1 ring-amber-200 ${right ? "self-end" : "self-start"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />คู่ซ้ำ · เคยคู่กัน {warnCount} เกม
        </span>
      )}
    </div>
  );
}

/** Small secondary tool for arranging a Q (kept quiet so Q1's send stays the loudest action). */
function ToolButton({
  onClick,
  children,
  tone = "default",
  active = false,
  disabled = false,
}: {
  onClick: () => unknown;
  children: React.ReactNode;
  tone?: "default" | "danger";
  active?: boolean;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <motion.button
      whileTap={disabled ? undefined : press}
      onClick={() => trackBusy(onClick(), setBusy)}
      disabled={disabled}
      className={`${busy ? "kq-busy" : ""} h-10 rounded-full border px-3.5 text-[0.72rem] font-extrabold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? "border-accent bg-accent text-mint"
          : tone === "danger"
            ? "border-line bg-white/80 text-ink-3 hover:border-alert/30 hover:bg-alert-wash hover:text-alert"
            : "border-accent/20 bg-accent-wash text-accent-deep hover:-translate-y-0.5"
      }`}
    >
      {children}
    </motion.button>
  );
}

/**
 * One game waiting in line (Q1, Q2, Q3). Q1 is the one people act on: its
 * teams read big and its "เรียกลงสนาม" button is the loudest thing on the
 * screen, so anyone holding the tablet can call the next game without knowing
 * how the queue was arranged. Q2/Q3 are quieter previews that can still be
 * arranged (fair / random / hand-picked, swap, substitute, fill).
 */
export function QueuedGameCard({
  q,
  isAdmin,
  pairWarn,
  selectedId,
  filling,
  canSend,
  sendBlockedReason,
  canDraw,
  onSend,
  onFair,
  onRandom,
  onToggleFill,
  onDelete,
  onPlayerTap,
  onRemovePlayer,
  index = 0,
}: {
  q: ResolvedQueuedGame;
  isAdmin: boolean;
  pairWarn?: (ids: string[]) => number;
  selectedId: string | null; // player picked inside THIS Q (swap / substitute)
  filling: boolean; // queue taps currently add players to THIS Q
  canSend: boolean; // Q1, full 2v2, and a playing slot is free
  sendBlockedReason: string | null; // why Q1 can't be sent right now (shown under the button)
  canDraw: boolean; // enough free players for Fair / random to fill this Q
  onSend: () => unknown;
  onFair: () => unknown;
  onRandom: () => unknown;
  onToggleFill: () => void;
  onDelete: () => void;
  onPlayerTap: (id: string) => void;
  onRemovePlayer: (id: string) => void;
  index?: number;
}) {
  const first = q.number === 1;
  const complete = q.count === 4;
  const warnA = pairWarn ? pairWarn(q.teamA.map((p) => p.id)) : 0;
  const warnB = pairWarn ? pairWarn(q.teamB.map((p) => p.id)) : 0;
  const [sending, setSending] = useState(false);

  const status = !complete
    ? { label: `ยังไม่ครบ ${q.count}/4`, cls: "bg-alert-wash text-alert", dot: "bg-alert" }
    : first && canSend
      ? { label: "พร้อมลงสนาม", cls: "bg-mint-wash text-mint-deep", dot: "bg-mint live-dot" }
      : first
        ? { label: "รอสนามว่าง", cls: "bg-sun-wash text-coral-deep", dot: "bg-coral" }
        : { label: "รอคิว", cls: "bg-sun-wash text-coral-deep", dot: "bg-coral" };

  return (
    <section
      className={`${E2} anim-enter relative shrink-0 overflow-hidden rounded-[24px] ${
        first ? "p-4 ring-2 ring-mint/60 sm:p-5" : "p-4"
      }`}
      style={staggerDelay(index + 1)}
    >
      {first && <div aria-hidden className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-mint-wash blur-3xl" />}

      {/* ── Header: Q number, status, and (Q1) the call-to-court button ── */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`numeral grid shrink-0 place-items-center rounded-full leading-none ring-1 ring-inset ${
              first ? "h-14 w-14 bg-mint-wash text-h3 text-mint-deep ring-mint/30" : "h-11 w-11 bg-accent-wash text-lede text-accent ring-accent/20"
            }`}
          >
            <Tick value={q.number} />
          </span>
          <div>
            <span className={`section-heading block text-ink ${first ? "text-base" : "text-sm"}`}>
              คิวที่ {q.number}
              {first && <span className="ml-1.5 text-[0.66rem] font-extrabold not-italic text-mint-deep">· ลงสนามต่อไป</span>}
            </span>
            <span
              key={status.label}
              className={`anim-status mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-eyebrow font-extrabold ${status.cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </div>

        {first && isAdmin && (
          <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
            <motion.button
              key={canSend ? "ready" : "wait"}
              whileTap={canSend ? press : undefined}
              onClick={() => trackBusy(onSend(), setSending)}
              disabled={!canSend || sending}
              className={`${canSend ? "anim-ready" : ""} ${sending ? "kq-busy" : ""} play-button shine-button relative flex h-14 items-center justify-center gap-3 rounded-full px-7 text-lede font-extrabold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none disabled:hover:translate-y-0`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
              </svg>
              {sending ? "กำลังเรียกลงสนาม…" : "เรียกลงสนาม"}
            </motion.button>
            {sendBlockedReason && !sending && (
              <span key={sendBlockedReason} className="anim-status px-2 text-center text-[0.68rem] font-semibold text-ink-3 sm:text-right">
                {sendBlockedReason}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Teams ── */}
      <div className={`relative flex items-start gap-3 ${first ? "mt-5" : "mt-4"}`}>
        <NextUpSide
          queueId={q.id}
          players={q.teamA}
          label="ทีม A"
          align="left"
          isAdmin={isAdmin}
          selectedId={selectedId}
          warnCount={warnA}
          onPlayerTap={onPlayerTap}
          onRemove={onRemovePlayer}
        />
        <div className="flex flex-col items-center gap-1 self-stretch">
          <span className="w-px flex-1 bg-gradient-to-b from-transparent via-line-2 to-transparent" />
          <span className="numeral text-[0.66rem] font-extrabold text-ink-4">VS</span>
          <span className="w-px flex-1 bg-gradient-to-b from-transparent via-line-2 to-transparent" />
        </div>
        <NextUpSide
          queueId={q.id}
          players={q.teamB}
          label="ทีม B"
          align="right"
          isAdmin={isAdmin}
          selectedId={selectedId}
          warnCount={warnB}
          onPlayerTap={onPlayerTap}
          onRemove={onRemovePlayer}
        />
      </div>

      {/* ── Arranging tools (admin) ── */}
      {isAdmin && (
        <div className="relative mt-4 space-y-2.5">
          {(selectedId || filling) && (
            <p key={selectedId ? "swap" : "fill"} className="anim-status rounded-[12px] bg-accent-wash px-3 py-2 text-[0.66rem] font-semibold leading-relaxed text-accent-deep">
              {selectedId
                ? "แตะอีกคนในคิวนี้เพื่อสลับทีม หรือแตะคนในคิวรอเพื่อเปลี่ยนตัว"
                : `แตะชื่อในคิวรอเพื่อเติมคิวที่ ${q.number} (${q.count}/4)`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ToolButton onClick={onFair} disabled={!canDraw}>
              {q.count > 0 ? "จับแฟร์ใหม่" : "จับแฟร์"}
            </ToolButton>
            <ToolButton onClick={onRandom} disabled={!canDraw}>
              {q.count > 0 ? "สุ่มใหม่" : "สุ่ม"}
            </ToolButton>
            {!complete && (
              <ToolButton onClick={onToggleFill} active={filling}>
                {filling ? "เสร็จแล้ว" : "เติมผู้เล่น"}
              </ToolButton>
            )}
            <span className="flex-1" />
            <ToolButton onClick={onDelete} tone="danger">
              ลบคิวนี้
            </ToolButton>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * The next free place in line (only while fewer than 3 games are queued).
 * Arrange a new Q by Fair, random draw, or by hand-picking 1–4 players from
 * the waiting list (the selection bar then offers "จัดเป็นคิวที่ n").
 */
export function NewQueuedGameCard({
  number,
  canDraw,
  selectedCount,
  onFair,
  onRandom,
  onPickManually,
  onCreateFromSelected,
  index = 0,
}: {
  number: number;
  canDraw: boolean; // at least 4 free players for Fair / random
  selectedCount: number; // players already picked from the waiting list
  onFair: () => unknown;
  onRandom: () => unknown;
  onPickManually: () => void;
  onCreateFromSelected: () => unknown;
  index?: number;
}) {
  return (
    <section
      className={`${E2} anim-enter relative shrink-0 overflow-hidden rounded-[24px] border-dashed p-4`}
      style={staggerDelay(index + 1)}
    >
      <div className="flex items-center gap-3">
        <span className="numeral grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-wash text-lede leading-none text-accent ring-1 ring-inset ring-accent/20">
          <Tick value={number} />
        </span>
        <div>
          <span className="section-heading block text-sm text-ink">จัดคิวที่ {number}</span>
          <span className="mt-0.5 block text-[0.66rem] font-medium text-ink-3">จัดเกมรอไว้ล่วงหน้า ไม่ครบ 4 คนก็ได้</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {selectedCount > 0 ? (
          <div className="sm:col-span-3">
            <ActionButton
              onClick={onCreateFromSelected}
              label={`จัดเป็นคิวที่ ${number}`}
              hint={`${selectedCount} คนที่เลือก`}
              variant="primary"
            />
          </div>
        ) : (
          <>
            <ActionButton onClick={onFair} disabled={!canDraw} label="จับแฟร์" hint="ยุติธรรม · ไม่ซ้ำคู่" variant="smart" />
            <ActionButton onClick={onRandom} disabled={!canDraw} label="สุ่ม" hint="จากคนที่ว่าง" variant="soft" shuffle />
            <ActionButton onClick={onPickManually} label="เลือกเอง" hint="แตะชื่อในคิวรอ" variant="soft" />
          </>
        )}
      </div>
      {!canDraw && selectedCount === 0 && (
        <p className="mt-2 px-1 text-[0.68rem] leading-relaxed text-ink-4">ผู้เล่นว่างยังไม่ถึง 4 คน — เลือกเองได้ หรือรอคนจบเกม</p>
      )}
    </section>
  );
}
