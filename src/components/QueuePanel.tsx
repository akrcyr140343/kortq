"use client";

import type { ReactNode } from "react";
import type { Player, Skill } from "@/lib/types";
import { AddPlayerForm } from "./AddPlayerForm";
import { ShuttleBuddy } from "./art";
import { Avatar } from "./Avatar";
import { IconCheck, IconCoffee, IconPeople, IconPlay, IconTap, IconX } from "./icons";
import { SkillBadge } from "./SkillBadge";
import { staggerDelay } from "./motion";
import { Tick } from "./Tick";
import { CARD } from "./ui";

/** The one destructive control in a row: a quiet ✕ that turns tomato on hover. */
function DeleteButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="ลบผู้เล่น"
      aria-label="ลบผู้เล่น"
      className="btn btn-ghost h-10 w-10 shrink-0 rounded-full px-0 text-ink-3 hover:text-tomato-deep"
    >
      <IconX className="h-[1.125rem] w-[1.125rem]" />
    </button>
  );
}

function WaitingRow({
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
              if (e.target !== e.currentTarget) return; // keys on the row's own buttons stay theirs
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(player.id);
              }
            }
          : undefined
      }
      className={`anim-enter-x relative flex items-center gap-2 rounded-[18px] border-2 py-1.5 pl-1.5 pr-1 transition-[translate,background-color,border-color,box-shadow,scale] duration-200 sm:gap-2.5 ${
        selected
          ? "-translate-y-0.5 border-ink bg-sun-wash shadow-[0_3px_0_var(--ink)]"
          : pickActive && isAdmin
            ? "border-sky/35 bg-sky-wash/70 hover:border-sky/60"
            : "border-transparent bg-sand/70 hover:bg-sand"
      } ${clickable ? "cursor-pointer active:scale-[0.985]" : ""}`}
    >
      {/* Queue position — picking stamps it; un-picking lets it sit back. */}
      <span
        key={selected ? "on" : "off"}
        className={`num grid h-8 min-w-8 shrink-0 place-items-center rounded-xl px-1 text-body leading-none ${
          selected ? "anim-stamp bg-ink text-sun" : "bg-paper text-ink-3 shadow-[0_2px_0_var(--line-2)]"
        }`}
      >
        {order}
      </span>

      <span className="relative shrink-0">
        <Avatar name={player.name} seed={player.profileId ?? player.id} size="md" />
        {selected && (
          <span
            aria-hidden
            className="anim-stamp absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-teal text-ink ring-2 ring-paper"
          >
            <IconCheck className="h-3 w-3" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-body font-medium leading-tight text-ink">{player.name}</span>
        <span className="mt-1 flex items-center gap-1.5">
          <SkillBadge skill={player.skill} size="sm" />
          {games > 0 && <span className="text-[0.6875rem] font-medium tabular-nums text-ink-3">{games} เกม</span>}
        </span>
      </span>

      {isAdmin && (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRest(player.id);
            }}
            className="btn h-9 min-h-9 rounded-xl px-2.5 text-caption"
          >
            <IconCoffee className="h-4 w-4" />
            พัก
          </button>
          <DeleteButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player.id);
            }}
          />
        </div>
      )}
    </li>
  );
}

function RestingRow({
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
      className="anim-enter-x flex items-center gap-2 rounded-[18px] border-2 border-dashed border-lilac/40 bg-lilac-wash/70 py-1.5 pl-2 pr-1 sm:gap-2.5"
    >
      <span className="relative shrink-0">
        <Avatar name={player.name} seed={player.profileId ?? player.id} size="md" className="opacity-80" />
        <span aria-hidden className="anim-zzz num absolute -right-1 -top-2 text-[0.6875rem] text-lilac-deep">
          z
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-body leading-tight text-ink-2">{player.name}</span>
        <span className="mt-1 flex items-center gap-1.5">
          <SkillBadge skill={player.skill} size="sm" />
          {games > 0 && <span className="text-[0.6875rem] font-medium tabular-nums text-ink-3">{games} เกม</span>}
        </span>
      </span>
      {isAdmin && (
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => onResume(player.id)} className="btn btn-teal-soft h-9 min-h-9 rounded-xl px-2.5 text-caption">
            <IconPlay className="h-3.5 w-3.5" />
            เล่นต่อ
          </button>
          <DeleteButton onClick={() => onDelete(player.id)} />
        </div>
      )}
    </li>
  );
}

function SectionHead({
  title,
  sub,
  count,
  icon,
  iconTone,
  countTone,
}: {
  title: string;
  sub: string;
  count: number;
  icon: ReactNode;
  iconTone: string;
  countTone: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className={`sticker grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconTone}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lede font-semibold leading-tight text-ink">{title}</h2>
          <p className="text-caption text-ink-3">{sub}</p>
        </div>
      </div>
      <span className={`num grid h-10 min-w-10 shrink-0 place-items-center rounded-2xl px-2.5 text-lede leading-none ${countTone}`}>
        <Tick value={count} />
        <span className="sr-only"> คน</span>
      </span>
    </div>
  );
}

export function QueuePanel({
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
    <div className="anim-rise flex flex-col gap-4 xl:h-full xl:min-h-0" style={staggerDelay(3)}>
      {isAdmin && (
        <div className="shrink-0">
          <AddPlayerForm onAddPlayer={onAddPlayer} onOpenRegistry={onOpenRegistry} />
        </div>
      )}

      {/* The rail scrolls on its own (large screens) so a long queue never
          stretches the games column beside it. */}
      <div data-flip-scroll className="scroll-pane flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pb-2 xl:pr-1.5">
        <section className={`${CARD} shrink-0 rounded-[26px] p-3.5`} aria-label="คิวรอ">
          <SectionHead
            title="คิวรอ"
            sub="เรียงตามเวลาที่เข้าคิว"
            count={waiting.length}
            icon={<IconPeople className="h-5 w-5" />}
            iconTone="bg-sky-wash text-sky-deep ring-2 ring-inset ring-sky/25"
            countTone="bg-sun text-ink shadow-[0_3px_0_var(--sun-ledge)]"
          />

          {isAdmin && waiting.length > 0 && (
            <p
              key={pickActive ? (pickLabel ?? "").replace(/\(.*\)/, "") : "idle"}
              className={`anim-status mb-3 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-caption leading-snug ${
                pickActive ? "bg-sky-wash text-sky-deep" : "bg-sand text-ink-2"
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
            <div className="anim-rise flex flex-col items-center rounded-[20px] border-2 border-dashed border-line-2 bg-sand/60 px-4 py-7 text-center">
              <span className="anim-bob" style={{ ["--bob-y" as string]: "-6px", ["--bob-d" as string]: "3s" }}>
                <ShuttleBuddy className="h-14 w-14" />
              </span>
              <p className="mt-3 font-display text-body font-semibold text-ink-2">คิวยังโล่งอยู่</p>
              <p className="mt-1 text-caption text-ink-3">{isAdmin ? "เพิ่มเพื่อนคนแรกได้เลย!" : "รอเพื่อน ๆ เข้าคิวกันก่อนนะ"}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {waiting.map((p, i) => (
                <WaitingRow
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
          <section className={`${CARD} shrink-0 rounded-[26px] p-3.5`} aria-label="นั่งพัก">
            <SectionHead
              title="นั่งพัก"
              sub="พักเหนื่อยก่อน · กลับมาแล้วไปต่อท้ายคิว"
              count={resting.length}
              icon={<IconCoffee className="h-5 w-5" />}
              iconTone="bg-lilac-wash text-lilac-deep ring-2 ring-inset ring-lilac/30"
              countTone="bg-lilac-wash text-lilac-deep ring-2 ring-inset ring-lilac/30"
            />
            <ul className="space-y-2">
              {resting.map((p) => (
                <RestingRow key={p.id} player={p} isAdmin={isAdmin} onResume={onResume} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
