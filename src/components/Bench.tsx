"use client";

import type { CSSProperties } from "react";
import type { Player, Skill } from "@/lib/types";
import { AddPlayerForm } from "./AddPlayerForm";
import { ShuttleBuddy } from "./art";
import { Avatar, avatarColors } from "./Avatar";
import { IconCheck, IconCoffee, IconPlay, IconTap, IconX } from "./icons";
import { SkillBadge } from "./SkillBadge";
import { staggerDelay } from "./motion";
import { Tick } from "./Tick";

/**
 * One seat on the bench — a tile tinted with the player's own colour, their
 * place in line as a big number. Tapping the tile picks them (lifts and tilts
 * it, lime); during a substitution / fill every seat is a tap target.
 */
function BenchSeat({
  player,
  order,
  isAdmin,
  selected,
  selectable,
  pickActive,
  onToggle,
  onRest,
  onDelete,
}: {
  player: Player;
  order: number;
  isAdmin: boolean;
  selected: boolean;
  selectable: boolean;
  pickActive: boolean;
  onToggle: (id: string) => void;
  onRest: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // While a pick is in progress (Q substitution, or filling an incomplete Q)
  // every waiting player is a valid tap target, regardless of the 1–4
  // selection cap that governs the normal "new Q" flow.
  const clickable = isAdmin && (pickActive || selectable || selected);
  const games = player.gamesPlayed ?? 0;
  const seed = player.profileId ?? player.id;
  const tint = { ["--seat" as string]: avatarColors(seed)[0] } as CSSProperties;

  return (
    <li
      data-flip-id={player.id}
      data-flip-place="queue"
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? selected : undefined}
      onClick={clickable ? () => onToggle(player.id) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.target !== e.currentTarget) return; // keys on the seat's own buttons stay theirs
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(player.id);
              }
            }
          : undefined
      }
      style={{ ...tint, ...staggerDelay(Math.min(order - 1, 12), 0.035) }}
      className={`anim-seat-in relative flex min-w-0 flex-col rounded-[22px] p-2.5 transition-[translate,rotate,background-color,box-shadow,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        selected
          ? "-translate-y-1 -rotate-2 bg-lime shadow-lift ring-2 ring-ink"
          : pickActive && isAdmin
            ? "anim-jiggle bg-paper ring-2 ring-sky ring-offset-2 ring-offset-canvas"
            : "bg-[color-mix(in_srgb,var(--seat)_45%,white)]"
      } ${clickable ? "cursor-pointer active:scale-[0.95]" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="relative">
          <Avatar name={player.name} seed={seed} size="md" />
          {selected && (
            <span aria-hidden className="anim-stamp absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-lime ring-2 ring-lime">
              <IconCheck className="h-3 w-3" />
            </span>
          )}
        </span>
        {/* Place in line — picking stamps it. */}
        <span key={selected ? "on" : "off"} className={`num text-[1.75rem] leading-none ${selected ? "anim-stamp text-ink" : "text-ink/25"}`}>
          {order}
        </span>
      </div>

      <span className="mt-2 block truncate font-display text-body font-semibold leading-tight text-ink">{player.name}</span>
      <span className="mt-1 flex items-center gap-1.5">
        <SkillBadge skill={player.skill} size="sm" />
        {games > 0 && <span className="text-[0.6875rem] font-medium tabular-nums text-ink-2">{games} เกม</span>}
      </span>

      {isAdmin && (
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRest(player.id);
            }}
            className="btn h-10 min-h-10 flex-1 bg-white/70! px-2 text-caption shadow-none!"
          >
            <IconCoffee className="h-4 w-4" />
            พัก
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player.id);
            }}
            title="ลบผู้เล่น"
            aria-label="ลบผู้เล่น"
            className="btn btn-ghost h-10 min-h-10 w-10 shrink-0 px-0 text-ink-2 hover:text-danger-deep"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}

/** A resting player — a pill in the chill zone, dimmed and dozing. */
function ChillPill({
  player,
  isAdmin,
  onResume,
  onDelete,
}: {
  player: Player;
  isAdmin: boolean;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const games = player.gamesPlayed ?? 0;
  return (
    <li
      data-flip-id={player.id}
      data-flip-place="rest"
      className="anim-seat-in flex items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-1 shadow-soft"
    >
      <span className="relative shrink-0">
        <Avatar name={player.name} seed={player.profileId ?? player.id} size="md" className="opacity-70 grayscale-[35%]" />
        <span aria-hidden className="anim-zzz num absolute -right-1 -top-2 text-[0.6875rem] text-lilac-deep">
          z
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-body leading-tight text-ink-2">{player.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <SkillBadge skill={player.skill} size="sm" />
          {games > 0 && <span className="text-[0.6875rem] font-medium tabular-nums text-ink-3">{games} เกม</span>}
        </span>
      </span>
      {isAdmin && (
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => onResume(player.id)} className="btn btn-court-soft h-9 min-h-9 px-3 text-caption">
            <IconPlay className="h-3.5 w-3.5" />
            เล่นต่อ
          </button>
          <button
            type="button"
            onClick={() => onDelete(player.id)}
            title="ลบผู้เล่น"
            aria-label="ลบผู้เล่น"
            className="btn btn-ghost h-10 w-10 shrink-0 px-0 text-ink-3 hover:text-danger-deep"
          >
            <IconX className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The bench — everyone not on court or on a ticket. A composer on top
 * (admin), the waiting players as a mosaic of seats in queue order, and a
 * chill zone for those resting.
 */
export function Bench({
  waiting,
  resting,
  isAdmin,
  selectedIds,
  pickActive,
  pickLabel,
  onAddPlayer,
  onOpenRegistry,
  onToggleSelect,
  onRest,
  onResume,
  onDelete,
}: {
  waiting: Player[];
  resting: Player[];
  isAdmin: boolean;
  selectedIds: Set<string>;
  pickActive: boolean; // a tap-to-pick flow is active (Q substitution or fill)
  pickLabel: string | null; // banner text for the active pick flow
  onAddPlayer: (name: string, skill: Skill) => Promise<boolean>;
  onOpenRegistry: () => void;
  onToggleSelect: (id: string) => void;
  onRest: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const selectionFull = selectedIds.size >= 4;

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {isAdmin && (
        <div className="anim-rise shrink-0" style={staggerDelay(2)}>
          <AddPlayerForm onAddPlayer={onAddPlayer} onOpenRegistry={onOpenRegistry} />
        </div>
      )}

      {/* The bench scrolls on its own (large screens) so a long queue never
          stretches the courts beside it. */}
      <div data-flip-scroll className="scroll-pane flex flex-col gap-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-4 lg:pr-1">
        <section className="shrink-0" aria-label="คิวรอ">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <span className="eyebrow text-ink-3">THE BENCH</span>
              <h2 className="display mt-1 text-h3 leading-none text-ink">คิวรอ</h2>
              <p className="mt-1.5 text-caption text-ink-3">เรียงตามเวลาที่เข้าคิว</p>
            </div>
            <span className="flex items-baseline gap-1">
              <span className="num text-[2.75rem] leading-none text-ink">
                <Tick value={waiting.length} />
              </span>
              <span className="font-display text-caption text-ink-3">คน</span>
            </span>
          </div>

          {isAdmin && waiting.length > 0 && (
            <p
              key={pickActive ? (pickLabel ?? "").replace(/\(.*\)/, "") : "idle"}
              className={`anim-status mb-3 flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-caption leading-snug ${
                pickActive ? "bg-sky text-ink" : "bg-mist text-ink-2"
              }`}
            >
              <IconTap className="mt-px h-4 w-4 shrink-0" />
              {pickActive ? pickLabel : "แตะชื่อเพื่อเลือก 1–4 คน แล้วจัดเป็นคิวเกม"}
            </p>
          )}

          {/* No AnimatePresence on these lists on purpose: exit animations gate
              DOM removal, and a backgrounded tab (this app lives on a courtside
              iPad) freezes the timeline — which leaves players who are already
              on court still listed in the queue. Removal must be immediate. */}
          {waiting.length === 0 ? (
            <div className="chalk anim-rise flex flex-col items-center rounded-[26px] px-4 py-8 text-center">
              <span className="anim-bob" style={{ ["--bob-y" as string]: "-6px", ["--bob-d" as string]: "3s" }}>
                <ShuttleBuddy className="h-12 w-12" />
              </span>
              <p className="display mt-3 text-body text-ink-2">ม้านั่งยังว่างอยู่</p>
              <p className="mt-1 text-caption text-ink-3">{isAdmin ? "เพิ่มเพื่อนคนแรกได้เลย!" : "รอเพื่อน ๆ เข้าคิวกันก่อนนะ"}</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2">
              {waiting.map((p, i) => (
                <BenchSeat
                  key={p.id}
                  player={p}
                  order={i + 1}
                  isAdmin={isAdmin}
                  selected={selectedIds.has(p.id)}
                  selectable={!selectionFull}
                  pickActive={pickActive}
                  onToggle={onToggleSelect}
                  onRest={onRest}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </section>

        {resting.length > 0 && (
          <section className="shrink-0 rounded-[28px] bg-lilac-wash p-3" aria-label="นั่งพัก">
            <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <IconCoffee className="h-5 w-5 text-lilac-deep" />
                <div>
                  <h2 className="display text-lede leading-tight text-ink">นั่งพัก</h2>
                  <p className="text-[0.6875rem] text-ink-3">พักเหนื่อยก่อน · กลับมาแล้วไปต่อท้ายคิว</p>
                </div>
              </div>
              <span className="num text-h3 leading-none text-lilac-deep">
                <Tick value={resting.length} />
                <span className="sr-only"> คน</span>
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {resting.map((p) => (
                <ChillPill key={p.id} player={p} isAdmin={isAdmin} onResume={onResume} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
