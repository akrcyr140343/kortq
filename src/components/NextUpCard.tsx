"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Player } from "@/lib/types";
import type { ResolvedQueuedGame } from "@/hooks/useKortq";
import { EmptySeat, Matchup, PlayerChip, TeamPanel } from "./Matchup";
import { IconDice, IconPlay, IconSparkle, IconSwap, IconTap, IconTrash, IconUserPlus } from "./icons";
import { staggerDelay, trackBusy } from "./motion";
import { Tick } from "./Tick";
import { CARD, CARD_DASHED, CARD_NEXT } from "./ui";

/**
 * One team of a queued game. While arranging (admin) each chip is a touch
 * target for swap/substitute, plus a small ✕ to drop the player back to the
 * open queue. Members see static chips. Empty seats of a partial Q show as
 * dashed placeholders.
 */
function QueueSide({
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
    <TeamPanel tone={tone} label={right ? "ทีม B" : "ทีม A"} warnCount={warnCount}>
      {players.map((p, i) => (
        <PlayerChip
          key={p.id}
          player={p}
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
        <EmptySeat key={`seat-${i}`} filling={filling} />
      ))}
    </TeamPanel>
  );
}

/** A small arranging tool. Kept quieter than Q1's send so that stays the loudest action. */
function ToolButton({
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
  const tone = active ? "btn-teal" : variant === "fair" ? "btn-grape-soft" : "";
  return (
    <button
      type="button"
      onClick={() => trackBusy(onClick(), setBusy)}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={`btn ${tone} ${busy ? "is-busy" : ""} h-10 rounded-xl px-3 text-caption`}
    >
      {children}
    </button>
  );
}

/** The ticket perforation between a queued game's header and its teams. */
function Perforation({ notch }: { notch: string }) {
  const style = { ["--notch" as string]: notch } as CSSProperties;
  return (
    <div aria-hidden className="relative h-0">
      <span className="ticket-notch -left-[13px] -top-[11px] [clip-path:inset(0_0_0_50%)]" style={style} />
      <span className="ticket-notch -right-[13px] -top-[11px] [clip-path:inset(0_50%_0_0)]" style={style} />
      <span className="absolute inset-x-5 -top-px border-t-2 border-dashed border-line" />
    </div>
  );
}

/**
 * One game waiting in line (Q1, Q2, Q3) — drawn as a ticket. Q1 is the one
 * people act on: sun-edged, its number is the big sticker, and its
 * "เรียกลงสนาม" button is the loudest thing on screen, so anyone holding the
 * tablet can call the next game. Q2/Q3 are quieter but can still be arranged
 * (fair / random / hand-picked, swap, substitute, fill).
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
  const [rolls, setRolls] = useState(0); // the dice tumbles on each random draw

  const status = !complete
    ? { label: `ยังไม่ครบ ${q.count}/4`, cls: "bg-tomato-wash text-tomato-deep", dot: "bg-tomato" }
    : first && canSend
      ? { label: "พร้อมลงสนาม", cls: "bg-teal-wash text-teal-deep", dot: "live-dot bg-teal" }
      : first
        ? { label: "รอสนามว่าง", cls: "bg-sun-wash text-sun-deep", dot: "bg-sun-ledge" }
        : { label: "รอคิว", cls: "bg-sand text-ink-2", dot: "bg-ink-4" };

  return (
    <section
      className={`${first ? CARD_NEXT : CARD} anim-rise relative shrink-0 rounded-[26px]`}
      style={staggerDelay(index + 1)}
      aria-label={`คิวที่ ${q.number}`}
    >
      {/* ── Header: Q number sticker, status, delete ── */}
      <header className="flex items-center gap-3 px-3.5 pb-3.5 pt-3.5">
        <span
          className={`sticker num grid shrink-0 place-items-center rounded-full leading-none ${
            first ? "h-14 w-14 bg-sun text-[1.875rem] text-ink" : "h-11 w-11 bg-sand text-[1.375rem] text-ink-2 ring-2 ring-inset ring-line-2"
          }`}
          style={first ? ({ boxShadow: "0 3px 0 var(--sun-ledge)", ["--tilt" as string]: "-7deg" } as CSSProperties) : undefined}
        >
          <Tick value={q.number} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-body font-semibold leading-tight text-ink">
            คิวที่ {q.number}
            {first && <span className="ml-1.5 text-caption font-medium text-sun-deep">· ลงสนามต่อไป</span>}
          </h3>
          <span key={status.label} className={`chip anim-status mt-1.5 ${status.cls}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="ลบคิวนี้"
            className="btn btn-ghost h-10 min-w-10 shrink-0 rounded-full px-2 text-ink-3 hover:text-tomato-deep sm:px-3"
          >
            <IconTrash className="h-[1.125rem] w-[1.125rem]" />
            <span className="hidden text-caption sm:inline">ลบคิว</span>
          </button>
        )}
      </header>

      <Perforation notch={first ? "color-mix(in srgb, var(--sun) 80%, var(--line))" : "var(--line)"} />

      {/* ── Teams ── */}
      <div className="px-2.5 pb-3 pt-3.5 sm:px-3.5">
        <Matchup
          a={
            <QueueSide
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
          }
          b={
            <QueueSide
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
          }
        />
      </div>

      {/* ── Arranging tools (admin) ── */}
      {isAdmin && (
        <div className="space-y-2.5 px-3.5 pb-3.5">
          {(selectedId || filling) && (
            <p
              key={selectedId ? "swap" : "fill"}
              className="anim-status flex items-start gap-2 rounded-2xl bg-sky-wash px-3 py-2.5 text-caption leading-snug text-sky-deep"
            >
              {selectedId ? <IconSwap className="mt-px h-4 w-4 shrink-0" /> : <IconTap className="mt-px h-4 w-4 shrink-0" />}
              {selectedId
                ? "แตะอีกคน (ในคิวนี้หรือคิวอื่น) เพื่อสลับ หรือแตะคนในคิวรอเพื่อเปลี่ยนตัว"
                : `แตะชื่อในคิวรอเพื่อเติมคิวที่ ${q.number} (${q.count}/4)`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ToolButton onClick={onFair} disabled={!canDraw} variant="fair">
              <IconSparkle className="h-4 w-4" />
              {q.count > 0 ? "จับแฟร์ใหม่" : "จับแฟร์"}
            </ToolButton>
            <ToolButton
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
            </ToolButton>
            {!complete && (
              <ToolButton onClick={onToggleFill} active={filling}>
                <IconUserPlus className="h-4 w-4" />
                {filling ? "เสร็จแล้ว" : "เติมผู้เล่น"}
              </ToolButton>
            )}
          </div>
        </div>
      )}

      {/* ── Q1: call it onto court ── */}
      {first && isAdmin && (
        <div className="px-3.5 pb-4">
          <button
            key={canSend ? "ready" : "wait"}
            type="button"
            onClick={() => trackBusy(onSend(), setSending)}
            disabled={!canSend || sending}
            className={`btn btn-teal ${sending ? "is-busy" : canSend ? "pulse-ring" : ""} h-14 w-full rounded-[20px] text-lede`}
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
    </section>
  );
}

/** A big "pick a mode" tile — icon, label, and a one-line hint. */
function ModeTile({
  onClick,
  disabled = false,
  label,
  hint,
  icon,
  variant,
  roll = false,
}: {
  onClick: () => unknown;
  disabled?: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  variant: "fair" | "soft" | "pick";
  roll?: boolean; // random draw: the dice tumbles on tap
}) {
  // Fair / random are round-trips (Fair also reads fresh history): a
  // travelling shine says "working on it" without blocking anything.
  const [busy, setBusy] = useState(false);
  const [rolls, setRolls] = useState(0);
  const iconWrap =
    variant === "fair" ? "bg-white/20 text-white" : variant === "pick" ? "bg-sky-wash text-sky-deep" : "bg-sun-wash text-sun-deep";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (roll) setRolls((n) => n + 1);
        trackBusy(onClick(), setBusy);
      }}
      disabled={disabled}
      className={`btn ${variant === "fair" ? "btn-grape" : "enabled:text-ink"} ${busy ? "is-busy" : ""} h-auto min-h-[6.25rem] flex-col gap-1.5 whitespace-normal rounded-[20px] px-2 py-3`}
    >
      <span key={rolls} className={`grid h-9 w-9 place-items-center rounded-full ${disabled ? "bg-line text-ink-4" : iconWrap} ${rolls > 0 ? "anim-roll" : ""}`}>
        {icon}
      </span>
      <span className="text-body font-semibold leading-none">{label}</span>
      <span className={`text-[0.6875rem] font-normal leading-tight ${variant === "fair" && !disabled ? "text-white/85" : "text-ink-3"} ${disabled ? "text-ink-4" : ""}`}>
        {hint}
      </span>
    </button>
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
  const [busy, setBusy] = useState(false);
  return (
    <section className={`${CARD_DASHED} anim-rise relative shrink-0 rounded-[26px] p-3.5`} style={staggerDelay(index + 1)}>
      <div className="flex items-center gap-3">
        <span className="sticker num grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper text-[1.375rem] leading-none text-ink-2 ring-2 ring-inset ring-line-2">
          <Tick value={number} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-body font-semibold text-ink">จัดคิวที่ {number}</h3>
          <p className="mt-0.5 text-caption text-ink-3">จัดเกมรอไว้ล่วงหน้า ไม่ครบ 4 คนก็ได้</p>
        </div>
      </div>

      {selectedCount > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            trackBusy(onCreateFromSelected(), setBusy);
          }}
          className={`btn btn-sun ${busy ? "is-busy" : "ping-once"} mt-3.5 h-14 w-full justify-between rounded-[20px] px-5`}
        >
          <span className="text-lede">จัดเป็นคิวที่ {number}</span>
          <span className="chip bg-ink/10 text-ink">
            <Tick value={selectedCount} /> คนที่เลือก
          </span>
        </button>
      ) : (
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <ModeTile onClick={onFair} disabled={!canDraw} label="จับแฟร์" hint="ยุติธรรม · ไม่ซ้ำคู่" icon={<IconSparkle className="h-5 w-5" />} variant="fair" />
          <ModeTile onClick={onRandom} disabled={!canDraw} label="สุ่ม" hint="จากคนที่ว่าง" icon={<IconDice className="h-5 w-5" />} variant="soft" roll />
          <ModeTile onClick={onPickManually} label="เลือกเอง" hint="แตะชื่อในคิวรอ" icon={<IconTap className="h-5 w-5" />} variant="pick" />
        </div>
      )}
      {!canDraw && selectedCount === 0 && (
        <p className="mt-2.5 px-1 text-caption leading-relaxed text-ink-3">ผู้เล่นว่างยังไม่ถึง 4 คน — เลือกเองได้ หรือรอคนจบเกม</p>
      )}
    </section>
  );
}
