"use client";

import type { Player } from "@/lib/types";
import { Avatar } from "./Avatar";
import { SkillBadge } from "./SkillBadge";
import { IconPlus, IconX } from "./icons";
import { staggerDelay } from "./motion";

/**
 * A player standing somewhere on the board — on a court half, or in a team of
 * a ticket strip. Keyed by player id by the caller, so a fresh pairing
 * remounts and the player HOPS in (dealt A1, B1, A2, B2). Tagged for the
 * flight layer (`data-flip-*`) so a player moving between the bench, a ticket
 * and a court travels across the screen.
 *
 *  - `court`  white token on the green mat, team colour as a side stripe
 *  - `lineup` softer token on a ticket; a tap target while arranging (admin)
 */
export function PlayerToken({
  player,
  flipPlace,
  align,
  order,
  tone,
  variant,
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
  tone: "a" | "b";
  variant: "court" | "lineup";
  chosen?: boolean; // picked for a swap / substitute
  warn?: boolean; // part of a repeat pair
  interactive?: boolean; // tap target for the swap flow (admin)
  onTap?: () => void;
  onRemove?: () => void; // small ✕ — drop back to the open queue (admin)
}) {
  const right = align === "right";
  const games = player.gamesPlayed ?? 0;
  const tap = interactive && onTap ? onTap : undefined;
  const stripe = tone === "a" ? "bg-sky" : "bg-coral";

  const look = chosen
    ? "-translate-y-1 -rotate-2 bg-lime shadow-lift ring-2 ring-ink"
    : warn
      ? "bg-sun-wash ring-2 ring-sun"
      : variant === "court"
        ? "bg-paper shadow-[0_6px_16px_-8px_rgba(0,40,25,0.55)]"
        : "bg-paper ring-1 ring-line";

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
      // Dealt alternating sides: A1, B1, A2, B2 — each one hops on.
      style={staggerDelay(order, 0.07)}
      className={`anim-hop-in relative flex min-h-[3.25rem] min-w-0 items-center gap-2 overflow-visible rounded-2xl py-1.5 transition-[translate,rotate,background-color,box-shadow,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        right ? "flex-row-reverse pl-2 pr-1.5" : "pl-1.5 pr-2"
      } ${look} ${tap ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.96]" : ""}`}
    >
      {chosen && <span aria-hidden className="anim-ping pointer-events-none absolute inset-0 rounded-2xl" />}
      {/* Team stripe on the outer edge. */}
      <span aria-hidden className={`absolute inset-y-2.5 w-1 rounded-full ${stripe} ${right ? "-right-[3px]" : "-left-[3px]"}`} />
      <Avatar name={player.name} seed={player.profileId ?? player.id} size="md" />
      <span className={`flex min-w-0 flex-1 flex-col gap-1 ${right ? "items-end" : "items-start"}`}>
        <span
          className={`line-clamp-2 font-display text-[0.9375rem] font-semibold leading-[1.15] text-ink [overflow-wrap:anywhere] ${
            right ? "text-right" : ""
          }`}
        >
          {player.name}
        </span>
        <span className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 ${right ? "flex-row-reverse justify-start" : ""}`}>
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
          // A remove badge on the token's outer corner, clear of the name.
          className={`absolute -top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-ink text-white shadow-soft transition-transform duration-150 before:absolute before:-inset-2.5 before:content-[''] hover:bg-danger-deep active:scale-90 ${
            right ? "-right-2" : "-left-2"
          }`}
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** An open spot in a partial ticket. Breathes while the admin is filling it. */
export function EmptySpot({ filling = false }: { filling?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex min-h-[3.25rem] items-center justify-center gap-1 rounded-2xl border-2 border-dashed font-display text-caption ${
        filling ? "anim-breathe border-ink bg-lime-wash text-ink" : "border-line-2 text-ink-4"
      }`}
    >
      <IconPlus className="h-4 w-4" />
      ว่าง
    </span>
  );
}

/** The repeat-teammate advisory under a team — never blocks sending or swapping. */
export function PairWarning({ count, align }: { count: number; align: "left" | "right" }) {
  if (count <= 0) return null;
  return (
    <span
      className={`chip anim-status whitespace-normal bg-sun text-[0.6875rem] leading-tight text-ink ${
        align === "right" ? "self-end text-right" : "self-start"
      }`}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
      คู่ซ้ำ · เคยคู่กัน {count} เกม
    </span>
  );
}
