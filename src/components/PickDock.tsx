"use client";

import { useState, type ReactNode } from "react";
import { motion, useIsPresent } from "framer-motion";
import type { Player } from "@/lib/types";
import { Avatar } from "./Avatar";
import { IconArrowRight, IconTicket, IconX } from "./icons";
import { bouncy, popOut, trackBusy } from "./motion";

/**
 * The pick dock springs up from the bottom edge and sinks away when the pick
 * is cleared or sent. While it is leaving it no longer takes taps, so a stale
 * button can never act on a selection that is already gone.
 */
export function PickTray({ className, children }: { className: string; children: ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: bouncy }}
      exit={{ opacity: 0, y: 24, transition: popOut }}
      style={present ? undefined : { pointerEvents: "none" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * What the dock shows: four seats filling up with the picked players (names,
 * not just a count) and what to do with them.
 */
export function PickDock({
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
    <div className="mx-auto flex max-w-[52rem] flex-col gap-2.5 rounded-[30px] bg-ink p-2.5 text-white shadow-lift sm:flex-row sm:items-center sm:gap-3 sm:pl-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Four seats — each pick hops into the next one. */}
        <div className="flex shrink-0 -space-x-1.5" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => {
            const p = players[i];
            return p ? (
              <span key={p.id} className="anim-hop-in relative rounded-full ring-2 ring-ink">
                <Avatar name={p.name} seed={p.profileId ?? p.id} size="md" className="ring-0!" />
              </span>
            ) : (
              <span key={`empty-${i}`} className="h-9 w-9 rounded-full border-2 border-dashed border-white/25 bg-ink" />
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          <span className="num block text-lede leading-none tracking-normal">
            <span className="text-lime">{players.length}</span>
            <span className="text-white/40">/4</span>
            <span className="ml-1.5 font-display text-caption font-medium text-white/70">คนที่เลือก</span>
          </span>
          <span className="mt-1 block truncate font-display text-caption text-white/80">{players.map((p) => p.name).join(" · ")}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
        {!queueFull ? (
          <button
            key={ready ? "ready" : "wait"}
            type="button"
            onClick={() => trackBusy(onCreate(), setBusy)}
            className={`btn btn-lime ${busy ? "is-busy" : ready ? "ping-once" : ""} h-12 min-w-[9rem] flex-1 px-5 text-body sm:flex-none`}
            style={{ ["--ring" as string]: "rgba(197,240,60,0.7)" }}
          >
            <IconTicket className="h-[1.125rem] w-[1.125rem]" />
            จัดเป็นคิวที่ {nextNumber}
          </button>
        ) : (
          <span className="flex-1 px-1 font-display text-caption text-white/70 sm:flex-none">คิวเกมเต็ม {maxQueued} คิว</span>
        )}

        <button type="button" onClick={onGoToGames} className="btn h-12 bg-white/10! px-4 text-caption text-white! shadow-none! lg:hidden">
          ไปดูคิวเกม
          <IconArrowRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onClear}
          aria-label="ล้างที่เลือก"
          className="btn btn-ghost h-12 w-12 shrink-0 px-0 text-white/70 hover:bg-white/10! hover:text-white"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
