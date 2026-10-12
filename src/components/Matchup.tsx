"use client";

import type { ReactNode } from "react";
import type { Player } from "@/lib/types";
import { Avatar } from "./Avatar";
import { SkillBadge } from "./SkillBadge";
import { IconPlus, IconX } from "./icons";
import { staggerDelay } from "./motion";

/**
 * The face-off layout shared by games on court and games in line:
 * Team A (sky) · VS sticker · Team B (pink), mirrored so the two pairs face
 * each other across the net. Player names are the loudest type in the card.
 */

const TONE = {
  a: { panel: "bg-sky-wash", label: "text-sky-deep", dot: "bg-sky" },
  b: { panel: "bg-pink-wash", label: "text-pink-deep", dot: "bg-pink" },
} as const;

export function Matchup({ a, b }: { a: ReactNode; b: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-stretch gap-1 sm:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] sm:gap-1.5">
      {a}
      <div className="relative z-10 flex items-center justify-center">
        <span className="vs-badge">VS</span>
      </div>
      {b}
    </div>
  );
}

export function TeamPanel({
  tone,
  label,
  warnCount = 0,
  children,
}: {
  tone: "a" | "b";
  label: string;
  warnCount?: number; // finished games this pair already played together (0 = none)
  children: ReactNode;
}) {
  const t = TONE[tone];
  const right = tone === "b";
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-[18px] p-1 sm:p-1.5 ${t.panel}`}>
      {/* Labels sit on the net side (mirrored), leaving the outer corners free
          for the remove badges. */}
      <span
        className={`flex items-center gap-1.5 px-1.5 pt-1 font-display text-[0.6875rem] font-semibold ${t.label} ${
          right ? "" : "flex-row-reverse"
        }`}
      >
        <span aria-hidden className={`h-2 w-2 rounded-full ${t.dot}`} />
        {label}
      </span>
      {children}
      {/* Repeat-teammate warning — advisory only, never blocks sending or swapping. */}
      {warnCount > 0 && (
        <span
          className={`chip anim-status mx-0.5 mb-0.5 whitespace-normal bg-orange-wash text-[0.6875rem] leading-tight text-orange-deep ring-1 ring-inset ring-orange/35 ${
            right ? "self-end text-right" : "self-start"
          }`}
        >
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
          คู่ซ้ำ · เคยคู่กัน {warnCount} เกม
        </span>
      )}
    </div>
  );
}

/**
 * One player in a team. Keyed by player id by the caller, so a fresh pairing
 * remounts and pops in. Tagged for the flight layer (`data-flip-*`) so a player
 * moving between the queue, a queued game and a court travels on screen.
 */
export function PlayerChip({
  player,
  flipPlace,
  align,
  order,
  chosen = false,
  warn = false,
  interactive = false,
  onTap,
  onRemove,
}: {
  player: Player;
  flipPlace: string;
  align: "left" | "right";
  order: number; // deal order, for the stagger
  chosen?: boolean; // picked for a swap / substitute
  warn?: boolean; // part of a repeat pair
  interactive?: boolean; // tap target for the swap flow (admin)
  onTap?: () => void;
  onRemove?: () => void; // small ✕ — drop back to the open queue (admin)
}) {
  const right = align === "right";
  const games = player.gamesPlayed ?? 0;
  const tap = interactive && onTap ? onTap : undefined;

  return (
    <div
      data-flip-id={player.id}
      data-flip-place={flipPlace}
      role={tap ? "button" : undefined}
      tabIndex={tap ? 0 : undefined}
      aria-pressed={tap ? chosen : undefined}
      onClick={
        tap
          ? (e) => {
              e.stopPropagation();
              tap();
            }
          : undefined
      }
      onKeyDown={
        tap
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                tap();
              }
            }
          : undefined
      }
      // Dealt like cards, alternating sides: A1, B1, A2, B2.
      style={staggerDelay(order, 0.05)}
      className={`anim-pop relative flex min-h-12 min-w-0 items-center gap-1.5 rounded-[14px] border-2 px-1.5 py-1.5 transition-[border-color,background-color,box-shadow,translate,scale] duration-150 sm:gap-2 sm:px-2 ${
        right ? "flex-row-reverse" : ""
      } ${
        chosen
          ? "-translate-y-0.5 border-ink bg-sun-wash shadow-[0_3px_0_var(--ink)]"
          : warn
            ? "border-orange/55 bg-orange-wash shadow-[0_2px_0_rgba(168,83,0,0.12)]"
            : "border-transparent bg-paper shadow-[0_2px_0_rgba(91,62,24,0.08)]"
      } ${tap ? "cursor-pointer hover:border-line-2 active:scale-[0.97]" : ""}`}
    >
      {chosen && <span aria-hidden className="anim-ping pointer-events-none absolute inset-0 rounded-[12px]" />}
      <Avatar name={player.name} seed={player.profileId ?? player.id} size="sm" />
      <span className={`flex min-w-0 flex-1 flex-col gap-1 ${right ? "items-end" : "items-start"}`}>
        <span
          className={`line-clamp-2 font-display text-[0.9375rem] font-medium leading-[1.2] text-ink [overflow-wrap:anywhere] ${
            right ? "text-right" : ""
          }`}
        >
          {player.name}
        </span>
        <span className={`flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
          <SkillBadge skill={player.skill} size="sm" />
          <span className="whitespace-nowrap text-[0.6875rem] font-medium tabular-nums text-ink-3">{games} เกม</span>
        </span>
      </span>
      {onRemove && (
        <button
          type="button"
          aria-label={`เอา ${player.name} ออกจากคิวนี้`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          // An iOS-style remove badge on the chip's outer corner, clear of the name.
          className={`absolute -top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-paper text-ink-3 shadow-[0_2px_0_var(--line-2)] ring-2 ring-line transition-colors duration-150 before:absolute before:-inset-2.5 before:content-[''] hover:bg-tomato-wash hover:text-tomato-deep active:scale-90 ${
            right ? "-right-2" : "-left-2"
          }`}
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** An open seat in a partial queued game. Breathes while the admin is filling it. */
export function EmptySeat({ filling = false }: { filling?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex min-h-12 items-center justify-center gap-1 rounded-[14px] border-2 border-dashed font-display text-caption ${
        filling ? "anim-breathe border-sun-ledge/60 bg-sun-wash text-sun-deep" : "border-ink/10 bg-paper/55 text-ink-4"
      }`}
    >
      <IconPlus className="h-4 w-4" />
      ว่าง
    </span>
  );
}
