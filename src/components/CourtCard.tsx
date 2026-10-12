"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Court, Player } from "@/lib/types";
import { CourtTimer } from "./CourtTimer";
import { CourtArt, ShuttleBuddy } from "./art";
import { Avatar } from "./Avatar";
import { Confetti } from "./Confetti";
import { IconFlag, IconPlay, IconReturn } from "./icons";
import { Matchup, PlayerChip, TeamPanel } from "./Matchup";
import { staggerDelay, trackBusy } from "./motion";
import { CARD_DASHED, CARD_LIVE } from "./ui";

/** One team of a running game — static chips, no taps. */
function LiveSide({ courtId, ids, byId, tone }: { courtId: string; ids: string[]; byId: Map<string, Player>; tone: "a" | "b" }) {
  const right = tone === "b";
  return (
    <TeamPanel tone={tone} label={right ? "ทีม B" : "ทีม A"}>
      {ids.map((id, i) => {
        const p = byId.get(id);
        if (!p) return null;
        return (
          <PlayerChip
            key={id}
            player={p}
            flipPlace={`game:${courtId}:${right ? "b" : "a"}`}
            align={right ? "right" : "left"}
            order={i * 2 + (right ? 1 : 0)}
          />
        );
      })}
    </TeamPanel>
  );
}

/**
 * A game currently being played ("กำลังเล่น"). Not a court number: each game
 * has its own identity (เกม #n) and its own finish / cancel, so games can end
 * in any order.
 */
export function CourtCard({
  court,
  byId,
  isAdmin,
  finishing = false,
  onFinish,
  onCancel,
  index = 0,
  className = "",
}: {
  court: Court; // a running game doc
  byId: Map<string, Player>;
  isAdmin: boolean;
  finishing?: boolean; // a finish request for THIS game is in flight (UI guard)
  index?: number;
  onFinish: (gameId: string) => void;
  onCancel: (gameId: string) => void;
  className?: string;
}) {
  const number = String(court.index).padStart(2, "0");

  // A game that was sent a moment ago (on this or another device) arrives with
  // a wash, a band of light and a pop of confetti; an old game mounted by a
  // reload or a tab switch arrives quietly.
  const [fx, setFx] = useState<"live" | null>(() =>
    court.startedAt != null && Date.now() - court.startedAt < 4000 ? "live" : null,
  );
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), 1100);
    return () => clearTimeout(t);
  }, [fx]);

  return (
    <article
      style={staggerDelay(index + 1)}
      className={`${CARD_LIVE} anim-rise relative flex flex-col overflow-hidden rounded-[26px] ${
        fx === "live" ? "flash-live serve-sweep" : ""
      } ${className}`}
    >
      {fx === "live" && <Confetti pieces={18} spread={1.25} className="top-[42%]!" />}

      {/* ── Identity left, clock right ───────────────────────────── */}
      <header className="relative flex items-center justify-between gap-3 px-3.5 pt-3.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`sticker grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal text-ink ${fx === "live" ? "anim-tada" : ""}`}
            style={{ boxShadow: "0 3px 0 var(--teal-ledge)", ["--tilt" as string]: "-6deg" } as CSSProperties}
          >
            <span className="num text-[1.375rem] leading-none">{number}</span>
          </span>
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 font-display text-body font-semibold text-ink">
              เกม #{court.index}
              <span className="chip bg-teal-wash px-2 py-1 text-[0.625rem] font-semibold text-teal-deep">
                <span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-teal" />
                LIVE
              </span>
            </span>
            <span className="mt-0.5 block truncate text-caption text-ink-3">กำลังสนุกกันอยู่</span>
          </div>
        </div>

        {court.startedAt != null && (
          <div className="anim-status">
            <CourtTimer startedAt={court.startedAt} />
          </div>
        )}
      </header>

      {/* ── Teams ────────────────────────────────────────────────── */}
      <div className="relative px-2.5 pt-3 sm:px-3.5">
        <Matchup
          a={<LiveSide courtId={court.id} ids={court.teamA} byId={byId} tone="a" />}
          b={<LiveSide courtId={court.id} ids={court.teamB} byId={byId} tone="b" />}
        />
      </div>

      {isAdmin ? (
        <div className="relative mt-auto flex gap-2 p-3 sm:px-3.5">
          <button type="button" onClick={() => onCancel(court.id)} className="btn h-12 flex-1 rounded-2xl px-3 hover:text-tomato-deep">
            <IconReturn className="h-[1.125rem] w-[1.125rem]" />
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onFinish(court.id)}
            disabled={finishing}
            className={`btn btn-sun h-12 flex-[2] rounded-2xl px-3 ${finishing ? "is-busy" : ""}`}
          >
            <IconFlag className="h-[1.125rem] w-[1.125rem]" />
            {finishing ? "กำลังจบเกม…" : "จบเกม + กลับคิว"}
          </button>
        </div>
      ) : (
        <div className="h-3" />
      )}
    </article>
  );
}

/**
 * A free playing slot (the court count allows another game). The shuttle buddy
 * bounces on an empty court. When Q1 is ready and an admin is looking, the
 * slot offers the very same "เรียกลงสนาม" as Q1's own button — right where the
 * finished game just was, so finish → send needs no scrolling on a phone.
 */
export function FreeSlotCard({
  index = 0,
  cta = null,
  hint,
}: {
  index?: number;
  cta?: { players: Player[]; onSend: () => unknown } | null;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div
      style={staggerDelay(index + 1)}
      className={`${CARD_DASHED} anim-rise relative flex flex-col items-center rounded-[26px] px-4 pb-4 pt-4 text-center`}
    >
      <div aria-hidden className="relative w-full max-w-[12.5rem]">
        <CourtArt lit />
        <span className="anim-hop absolute left-1/2 top-[6%] -ml-5">
          <ShuttleBuddy className="h-10 w-10" />
        </span>
        <span className="anim-hop-shadow absolute left-1/2 top-[56%] -ml-4 h-2 w-8 rounded-full bg-ink/40" />
      </div>
      <span className="chip mt-2 bg-teal-wash text-teal-deep ring-1 ring-inset ring-teal/30">
        <span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-teal" />
        สนามว่าง
      </span>
      {cta ? (
        <button
          type="button"
          onClick={() => trackBusy(cta.onSend(), setBusy)}
          disabled={busy}
          className={`btn btn-teal ${busy ? "is-busy" : "pulse-ring"} mt-3 h-12 w-full max-w-xs rounded-2xl px-3`}
        >
          <span aria-hidden className="flex -space-x-2">
            {cta.players.map((p) => (
              <Avatar key={p.id} name={p.name} seed={p.profileId ?? p.id} size="xs" className="ring-teal" />
            ))}
          </span>
          {busy ? "กำลังเรียกลงสนาม…" : "เรียกคิวที่ 1 ลงสนาม"}
          <IconPlay className="h-4 w-4" />
        </button>
      ) : (
        <span className="mt-2 text-caption text-ink-3">{hint ?? "เรียกคิวที่ 1 ลงสนามได้เลย"}</span>
      )}
    </div>
  );
}
