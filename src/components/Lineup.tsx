"use client";

import { useState, type ReactNode } from "react";
import type { Player } from "@/lib/types";
import type { ResolvedQueuedGame } from "@/hooks/useKortq";
import { EmptySpot, PairWarning, PlayerToken } from "./PlayerToken";
import { IconDice, IconPlay, IconSparkle, IconSwap, IconTap, IconTrash, IconUserPlus } from "./icons";
import { staggerDelay, trackBusy } from "./motion";
import { Tick } from "./Tick";

/**
 * One team of a ticket. While arranging (admin) each token is a touch target
 * for swap/substitute, plus a small ✕ to drop the player back to the bench.
 * Members see static tokens. Empty spots of a partial Q show as dashed.
 */
function TicketTeam({
  queueId,
  players,
  tone,
  isAdmin,
  selectedId,
  warnCount,
  filling,
  onPlayerTap,
  onRemove,
}: {
  queueId: string;
  players: Player[];
  tone: "a" | "b";
  isAdmin: boolean;
  selectedId: string | null;
  warnCount: number; // finished games this team's pair already played together (0 = none)
  filling: boolean;
  onPlayerTap: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const right = tone === "b";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={`eyebrow flex items-center gap-1.5 ${right ? "flex-row-reverse text-coral-deep" : "text-sky-deep"}`}>
        <span aria-hidden className={`h-2 w-2 rounded-full ${right ? "bg-coral" : "bg-sky"}`} />
        {right ? "ทีม B" : "ทีม A"}
      </span>
      {players.map((p, i) => (
        <PlayerToken
          key={p.id}
          player={p}
          variant="lineup"
          tone={tone}
          flipPlace={`q:${queueId}:${right ? "b" : "a"}`}
          align={right ? "right" : "left"}
          order={i * 2 + (right ? 1 : 0)}
          chosen={selectedId === p.id}
          warn={warnCount > 0}
          interactive={isAdmin}
          onTap={() => onPlayerTap(p.id)}
          onRemove={isAdmin ? () => onRemove(p.id) : undefined}
        />
      ))}
      {Array.from({ length: Math.max(0, 2 - players.length) }, (_, i) => (
        <EmptySpot key={`seat-${i}`} filling={filling} />
      ))}
      <PairWarning count={warnCount} align={right ? "right" : "left"} />
    </div>
  );
}

/** A small arranging tool. Kept quieter than Q1's call so that stays the loudest action. */
function Tool({
  onClick,
  children,
  variant = "soft",
  active = false,
  disabled = false,
}: {
  onClick: () => unknown;
  children: ReactNode;
  variant?: "soft" | "fair";
  active?: boolean;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const tone = active ? "btn-ink" : variant === "fair" ? "btn-grape-soft" : "";
  return (
    <button
      type="button"
      onClick={() => trackBusy(onClick(), setBusy)}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={`btn ${tone} ${busy ? "is-busy" : ""} h-10 px-3.5 text-caption`}
    >
      {children}
    </button>
  );
}

/**
 * One game waiting in line (Q1, Q2, Q3), drawn as a match ticket: a coloured
 * stub carries the giant queue number and its status; the body shows the two
 * teams facing each other. Q1 is "on deck" — a sun stub, and its
 * "เรียกลงสนาม" is the loudest button on the board, so anyone holding the
 * tablet can call the next game. Q2/Q3 can still be arranged (fair / random /
 * hand-picked, swap, substitute, fill).
 */
export function LineupTicket({
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
  filling: boolean; // bench taps currently add players to THIS Q
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
  const [rolls, setRolls] = useState(0); // the dice tumbles on each random draw

  const status = !complete
    ? { label: `ยังไม่ครบ ${q.count}/4`, dot: "bg-danger" }
    : first && canSend
      ? { label: "พร้อมลงสนาม", dot: "live-dot bg-court" }
      : first
        ? { label: "รอสนามว่าง", dot: "bg-sun-deep" }
        : { label: "รอคิว", dot: "bg-ink-4" };

  return (
    <section
      className={`anim-slide-in relative flex shrink-0 flex-col overflow-visible rounded-[28px] shadow-soft sm:flex-row ${
        first ? "bg-sun-wash" : "bg-paper"
      }`}
      style={staggerDelay(index + 1, 0.08)}
      aria-label={`คิวที่ ${q.number}`}
    >
      {/* ── Stub: the queue number, huge ── */}
      <div
        className={`relative flex shrink-0 items-center gap-3 rounded-t-[28px] px-4 py-3 sm:w-28 sm:flex-col sm:items-start sm:justify-between sm:rounded-l-[28px] sm:rounded-tr-none sm:py-4 ${
          first ? "bg-sun" : "bg-mist"
        }`}
      >
        <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
          <span className="eyebrow text-ink/60">{first ? "ON DECK" : "คิวที่"}</span>
          <span className="num text-[2.75rem] leading-[0.9] text-ink sm:text-[3.75rem]">
            <Tick value={q.number} />
          </span>
        </div>
        <span key={status.label} className="chip anim-status ml-auto bg-paper/80 text-ink-2 sm:ml-0 sm:whitespace-normal">
          <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="ลบคิวนี้"
            className="btn btn-ghost h-10 w-10 shrink-0 px-0 text-ink-2 hover:text-danger-deep sm:hidden"
          >
            <IconTrash className="h-[1.125rem] w-[1.125rem]" />
          </button>
        )}
        {/* Perforation: two notches + a dashed tear line. */}
        <span aria-hidden className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full bg-canvas sm:-right-2.5 sm:-top-2.5 sm:bottom-auto sm:left-auto" />
        <span aria-hidden className="absolute -bottom-2.5 -right-2.5 h-5 w-5 rounded-full bg-canvas sm:-bottom-2.5 sm:-right-2.5" />
        <span aria-hidden className="absolute inset-x-4 -bottom-px border-t-2 border-dashed border-ink/10 sm:inset-x-auto sm:inset-y-4 sm:-right-px sm:bottom-auto sm:border-l-2 sm:border-t-0" />
      </div>

      {/* ── Body: the face-off ── */}
      <div className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="mb-2 hidden items-center justify-between gap-2 sm:flex">
          <h3 className="display text-body text-ink">
            คิวที่ {q.number}
            {first && <span className="ml-2 font-medium text-sun-deep">· ลงสนามต่อไป</span>}
          </h3>
          {isAdmin && (
            <button type="button" onClick={onDelete} aria-label="ลบคิวนี้" className="btn btn-ghost h-10 px-3 text-caption text-ink-3 hover:text-danger-deep">
              <IconTrash className="h-[1.125rem] w-[1.125rem]" />
              ลบคิว
            </button>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]">
          <TicketTeam
            queueId={q.id}
            players={q.teamA}
            tone="a"
            isAdmin={isAdmin}
            selectedId={selectedId}
            warnCount={warnA}
            filling={filling}
            onPlayerTap={onPlayerTap}
            onRemove={onRemovePlayer}
          />
          <span
            aria-hidden
            key={`vs-${q.count}`}
            className="anim-stamp num grid h-8 w-8 place-items-center justify-self-center rounded-full bg-ink text-[0.6875rem] tracking-normal text-lime sm:h-10 sm:w-10 sm:text-caption"
            style={{ animationDelay: "0.3s" }}
          >
            VS
          </span>
          <TicketTeam
            queueId={q.id}
            players={q.teamB}
            tone="b"
            isAdmin={isAdmin}
            selectedId={selectedId}
            warnCount={warnB}
            filling={filling}
            onPlayerTap={onPlayerTap}
            onRemove={onRemovePlayer}
          />
        </div>

        {/* ── Arranging tools (admin) ── */}
        {isAdmin && (
          <div className="mt-3 space-y-2.5">
            {(selectedId || filling) && (
              <p
                key={selectedId ? "swap" : "fill"}
                className="anim-status flex items-start gap-2 rounded-2xl bg-ink px-3.5 py-2.5 text-caption leading-snug text-white"
              >
                {selectedId ? <IconSwap className="mt-px h-4 w-4 shrink-0 text-lime" /> : <IconTap className="mt-px h-4 w-4 shrink-0 text-lime" />}
                {selectedId
                  ? "แตะอีกคน (ในคิวนี้หรือคิวอื่น) เพื่อสลับ หรือแตะคนในคิวรอเพื่อเปลี่ยนตัว"
                  : `แตะชื่อในคิวรอเพื่อเติมคิวที่ ${q.number} (${q.count}/4)`}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Tool onClick={onFair} disabled={!canDraw} variant="fair">
                <IconSparkle className="h-4 w-4" />
                {q.count > 0 ? "จับแฟร์ใหม่" : "จับแฟร์"}
              </Tool>
              <Tool
                onClick={() => {
                  setRolls((n) => n + 1);
                  return onRandom();
                }}
                disabled={!canDraw}
              >
                <span key={rolls} className={rolls > 0 ? "anim-roll inline-flex" : "inline-flex"}>
                  <IconDice className="h-4 w-4" />
                </span>
                {q.count > 0 ? "สุ่มใหม่" : "สุ่ม"}
              </Tool>
              {!complete && (
                <Tool onClick={onToggleFill} active={filling}>
                  <IconUserPlus className="h-4 w-4" />
                  {filling ? "เสร็จแล้ว" : "เติมผู้เล่น"}
                </Tool>
              )}
            </div>
          </div>
        )}

        {/* ── Q1: call it onto court ── */}
        {first && isAdmin && (
          <div className="mt-3">
            <button
              key={canSend ? "ready" : "wait"}
              type="button"
              onClick={() => trackBusy(onSend(), setSending)}
              disabled={!canSend || sending}
              className={`btn btn-court ${sending ? "is-busy" : canSend ? "pulse-ring" : ""} h-14 w-full text-lede`}
              style={{ ["--ring" as string]: "rgba(43,184,134,0.5)" }}
            >
              <IconPlay className="h-5 w-5" />
              {sending ? "กำลังเรียกลงสนาม…" : "เรียกลงสนาม"}
            </button>
            {sendBlockedReason && !sending && (
              <p key={sendBlockedReason} className="anim-status mt-2 px-2 text-center text-caption text-ink-3">
                {sendBlockedReason}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** A round "pick a mode" bubble — icon in a big circle, label and hint under it. */
function ModeBubble({
  onClick,
  disabled = false,
  label,
  hint,
  icon,
  tone,
  roll = false,
}: {
  onClick: () => unknown;
  disabled?: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  tone: string; // circle colours
  roll?: boolean; // random draw: the dice tumbles on tap
}) {
  // Fair / random are round-trips (Fair also reads fresh history): a
  // travelling shine says "working on it" without blocking anything.
  const [busy, setBusy] = useState(false);
  const [rolls, setRolls] = useState(0);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (roll) setRolls((n) => n + 1);
        trackBusy(onClick(), setBusy);
      }}
      disabled={disabled}
      className="group flex min-w-0 flex-col items-center gap-1.5 rounded-3xl px-1 py-2 text-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] enabled:hover:-translate-y-1 enabled:active:scale-95 disabled:cursor-not-allowed"
    >
      <span
        key={rolls}
        aria-hidden
        className={`btn pointer-events-none grid h-16 w-16 place-items-center px-0 sm:h-[4.5rem] sm:w-[4.5rem] ${
          disabled ? "bg-mist! text-ink-4! shadow-none!" : tone
        } ${busy ? "is-busy" : ""} ${rolls > 0 ? "anim-roll" : ""}`}
      >
        {icon}
      </span>
      <span className={`display text-body leading-none ${disabled ? "text-ink-4" : "text-ink"}`}>{label}</span>
      <span className={`text-[0.6875rem] leading-tight ${disabled ? "text-ink-4" : "text-ink-3"}`}>{hint}</span>
    </button>
  );
}

/**
 * The next free place in line (only while fewer than 3 games are queued): a
 * chalk-outlined blank ticket. Arrange a new Q by Fair, random draw, or by
 * hand-picking 1–4 players from the bench (the pick dock then offers
 * "จัดเป็นคิวที่ n").
 */
export function NewTicket({
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
  selectedCount: number; // players already picked from the bench
  onFair: () => unknown;
  onRandom: () => unknown;
  onPickManually: () => void;
  onCreateFromSelected: () => unknown;
  index?: number;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="chalk anim-slide-in relative shrink-0 rounded-[28px] p-3.5 sm:p-4" style={staggerDelay(index + 1, 0.08)}>
      <div className="flex items-center gap-3">
        <span className="num text-[2.5rem] leading-none text-ink-4">
          +<Tick value={number} />
        </span>
        <div className="min-w-0">
          <h3 className="display text-body text-ink">จัดคิวที่ {number}</h3>
          <p className="text-caption text-ink-3">จัดเกมรอไว้ล่วงหน้า ไม่ครบ 4 คนก็ได้</p>
        </div>
      </div>

      {selectedCount > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            trackBusy(onCreateFromSelected(), setBusy);
          }}
          className={`btn btn-lime ${busy ? "is-busy" : "ping-once"} mt-3.5 h-14 w-full justify-between px-5`}
          style={{ ["--ring" as string]: "rgba(197,240,60,0.7)" }}
        >
          <span className="text-lede">จัดเป็นคิวที่ {number}</span>
          <span className="chip bg-ink text-lime">
            <Tick value={selectedCount} /> คนที่เลือก
          </span>
        </button>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-1">
          <ModeBubble onClick={onFair} disabled={!canDraw} label="จับแฟร์" hint="ยุติธรรม · ไม่ซ้ำคู่" icon={<IconSparkle className="h-6 w-6" />} tone="btn-grape" />
          <ModeBubble onClick={onRandom} disabled={!canDraw} label="สุ่ม" hint="จากคนที่ว่าง" icon={<IconDice className="h-6 w-6" />} tone="btn-lime" roll />
          <ModeBubble onClick={onPickManually} label="เลือกเอง" hint="แตะชื่อในคิวรอ" icon={<IconTap className="h-6 w-6" />} tone="btn-sky-soft" />
        </div>
      )}
      {!canDraw && selectedCount === 0 && (
        <p className="mt-1.5 px-1 text-center text-caption leading-relaxed text-ink-3">ผู้เล่นว่างยังไม่ถึง 4 คน — เลือกเองได้ หรือรอคนจบเกม</p>
      )}
    </section>
  );
}
