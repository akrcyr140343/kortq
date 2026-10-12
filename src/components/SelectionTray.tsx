"use client";

import { useState, type ReactNode } from "react";
import { motion, useIsPresent } from "framer-motion";
import type { Player } from "@/lib/types";
import { Avatar } from "./Avatar";
import { IconArrowRight, IconTicket, IconX } from "./icons";
import { bouncy, popOut, trackBusy } from "./motion";
import { SkillBadge } from "./SkillBadge";
import { Tick } from "./Tick";

/**
 * The pick bar springs up from the bottom edge and sinks away when the pick is
 * cleared or sent. While it is leaving it no longer takes taps, so a stale
 * button can never act on a selection that is already gone.
 */
export function SelectionTray({ className, children }: { className: string; children: ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: bouncy }}
      exit={{ opacity: 0, y: 18, transition: popOut }}
      style={present ? undefined : { pointerEvents: "none" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** What the tray shows: who is picked (names, not just a count) and what to do with them. */
export function SelectionBar({
  players,
  queueFull,
  nextNumber,
  maxQueued,
  onCreate,
  onGoToGames,
  onClear,
}: {
  players: Player[];
  queueFull: boolean;
  nextNumber: number; // the Q number a new game would get
  maxQueued: number;
  onCreate: () => unknown;
  onGoToGames: () => void;
  onClear: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const ready = players.length === 4;

  return (
    <div className="card mx-auto flex max-w-[1600px] flex-col gap-2.5 rounded-[24px] p-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className="sticker num grid h-11 min-w-11 shrink-0 place-items-center rounded-2xl bg-sun px-1 text-lede leading-none text-ink"
          style={{ boxShadow: "0 3px 0 var(--sun-ledge)" }}
        >
          <span>
            <Tick value={players.length} />
            <span className="text-caption text-ink/50">/4</span>
          </span>
          <span className="sr-only"> คนที่เลือก</span>
        </span>

        <div className="scroll-pane no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1">
          {players.map((p) => (
            <span
              key={p.id}
              className="anim-pop flex shrink-0 items-center gap-1.5 rounded-full border-2 border-line bg-paper py-0.5 pl-0.5 pr-1.5"
            >
              <Avatar name={p.name} seed={p.profileId ?? p.id} size="xs" />
              <span className="max-w-[7rem] truncate font-display text-caption text-ink">{p.name}</span>
              <SkillBadge skill={p.skill} size="sm" />
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!queueFull ? (
          <button
            key={ready ? "ready" : "wait"}
            type="button"
            onClick={() => trackBusy(onCreate(), setBusy)}
            className={`btn btn-sun ${busy ? "is-busy" : ready ? "ping-once" : ""} h-11 flex-1 rounded-2xl px-4 text-caption sm:flex-none`}
          >
            <IconTicket className="h-[1.125rem] w-[1.125rem]" />
            จัดเป็นคิวที่ {nextNumber}
          </button>
        ) : (
          <span className="flex-1 px-1 font-display text-caption text-ink-3 sm:flex-none">คิวเกมเต็ม {maxQueued} คิว</span>
        )}

        <button type="button" onClick={onGoToGames} className="btn h-11 rounded-2xl px-3 text-caption xl:hidden">
          ไปดูคิวเกม
          <IconArrowRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onClear}
          aria-label="ล้างที่เลือก"
          className="btn btn-ghost h-11 w-11 shrink-0 rounded-full px-0 text-ink-3 hover:text-tomato-deep"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
