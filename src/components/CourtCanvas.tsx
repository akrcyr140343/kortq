"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Court, Player } from "@/lib/types";
import { CourtTimer } from "./CourtTimer";
import { CourtLines, ShuttleBuddy } from "./art";
import { Avatar } from "./Avatar";
import { Confetti } from "./Confetti";
import { IconFlag, IconPlay, IconReturn } from "./icons";
import { PlayerToken } from "./PlayerToken";
import { staggerDelay, trackBusy } from "./motion";

/** One half of a live court — the players standing on it. No taps. */
function CourtHalf({ courtId, ids, byId, tone }: { courtId: string; ids: string[]; byId: Map<string, Player>; tone: "a" | "b" }) {
  const right = tone === "b";
  return (
    <div className="flex min-w-0 flex-col justify-center gap-2">
      {ids.map((id, i) => {
        const p = byId.get(id);
        if (!p) return null;
        return (
          <PlayerToken
            key={id}
            player={p}
            variant="court"
            tone={tone}
            flipPlace={`game:${courtId}:${right ? "b" : "a"}`}
            align={right ? "right" : "left"}
            order={i * 2 + (right ? 1 : 0)}
          />
        );
      })}
    </div>
  );
}

/**
 * A shuttle rallying along the bottom of the mat — this game is alive. Each
 * game rallies at its own pace so a row of courts never moves in lockstep.
 * Decorative; hidden for reduce-motion.
 */
function Rally({ seed }: { seed: number }) {
  const d = `${(2.3 + ((seed * 37) % 9) / 10).toFixed(1)}s`;
  const vars = { ["--rally-d" as string]: d } as CSSProperties;
  return (
    <span aria-hidden className="rally-track pointer-events-none absolute bottom-2 left-[12%] z-[1] h-0 w-[76%]" style={vars}>
      <span className="rally-shuttle absolute -left-3 -top-5 block h-6 w-6" style={vars}>
        <ShuttleBuddy className="h-6 w-6" />
      </span>
    </span>
  );
}

/**
 * A game being played, drawn as the court it is on: team A on the left half,
 * team B on the right, the net between them. Not a court number: each game
 * has its own identity (เกม #n) and its own finish / cancel, so games can end
 * in any order. A game that just started switches its court's lights on.
 */
export function LiveCourt({
  court,
  byId,
  isAdmin,
  finishing = false,
  onFinish,
  onCancel,
  index = 0,
}: {
  court: Court; // a running game doc
  byId: Map<string, Player>;
  isAdmin: boolean;
  finishing?: boolean; // a finish request for THIS game is in flight (UI guard)
  index?: number;
  onFinish: (gameId: string) => void;
  onCancel: (gameId: string) => void;
}) {
  const number = String(court.index).padStart(2, "0");

  // A game that was sent a moment ago (on this or another device) lights its
  // court up — lines draw on, a band of light, confetti; an old game mounted
  // by a reload or a tab switch arrives quietly.
  const [fx, setFx] = useState<"live" | null>(() =>
    court.startedAt != null && Date.now() - court.startedAt < 4000 ? "live" : null,
  );
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), 1100);
    return () => clearTimeout(t);
  }, [fx]);

  return (
    <article style={staggerDelay(index + 1)} className="anim-rise relative flex flex-col rounded-[30px] bg-paper p-2 shadow-soft">
      <div
        className={`court-surface relative min-h-[14rem] overflow-hidden rounded-[24px] ${
          fx === "live" ? "anim-lights-on serve-sweep" : ""
        }`}
      >
        <CourtLines draw={fx === "live"} />
        {/* The net, with its two posts. */}
        <span aria-hidden className="absolute inset-y-2 left-1/2 z-[1] w-1 -translate-x-1/2 rounded-full bg-white/95" />
        <span aria-hidden className="absolute left-1/2 top-1 z-[1] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-ink" />
        <span aria-hidden className="absolute bottom-1 left-1/2 z-[1] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-ink" />
        {/* Giant side letters painted on the mat. */}
        <span aria-hidden className="num pointer-events-none absolute -bottom-3 left-2 text-[6.5rem] leading-none text-white/12">
          A
        </span>
        <span aria-hidden className="num pointer-events-none absolute -bottom-3 right-2 text-[6.5rem] leading-none text-white/12">
          B
        </span>

        {/* Scoreboard bar riding on the mat. */}
        <div className="relative z-[2] flex items-center justify-between gap-2 p-2.5">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-ink py-1 pl-1 pr-3 text-white shadow-soft">
            <span
              className={`num grid h-7 min-w-7 place-items-center rounded-full bg-lime px-1.5 text-[0.9375rem] leading-none text-ink ${
                fx === "live" ? "anim-stamp" : ""
              }`}
            >
              {number}
            </span>
            <span className="truncate font-display text-caption font-semibold">เกม #{court.index}</span>
            <span aria-hidden className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
          </span>
          {court.startedAt != null && <CourtTimer startedAt={court.startedAt} />}
        </div>

        <div className="relative z-[2] grid grid-cols-2 gap-6 px-2.5 pb-10 pt-1 sm:gap-8">
          <CourtHalf courtId={court.id} ids={court.teamA} byId={byId} tone="a" />
          <CourtHalf courtId={court.id} ids={court.teamB} byId={byId} tone="b" />
        </div>

        <Rally seed={court.index} />
      </div>

      {fx === "live" && <Confetti pieces={20} spread={1.3} className="top-[45%]!" />}

      {isAdmin && (
        <div className="flex gap-2 px-1 pb-1 pt-2">
          <button type="button" onClick={() => onCancel(court.id)} className="btn btn-ghost h-12 flex-1 px-3 text-ink-2 hover:text-danger-deep">
            <IconReturn className="h-[1.125rem] w-[1.125rem]" />
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onFinish(court.id)}
            disabled={finishing}
            className={`btn btn-lime h-12 flex-[2] px-3 ${finishing ? "is-busy" : ""}`}
          >
            <IconFlag className="h-[1.125rem] w-[1.125rem]" />
            {finishing ? "กำลังจบเกม…" : "จบเกม + กลับคิว"}
          </button>
        </div>
      )}
    </article>
  );
}

/**
 * A free playing slot, drawn as an empty court: a pale mat whose chalk lines
 * march slowly, the shuttle waiting at the net. When Q1 is ready and an admin
 * is looking, the court itself offers the very same "เรียกลงสนาม" as Q1's own
 * button — right where the finished game just was.
 */
export function OpenCourt({
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
    <div style={staggerDelay(index + 1)} className="anim-rise relative rounded-[30px] bg-paper/70 p-2 ring-1 ring-line">
      <div className="court-surface-off relative flex min-h-[14rem] flex-col items-center justify-center overflow-hidden rounded-[24px] px-4 py-5 text-center">
        <CourtLines dashed color="rgba(11,112,73,0.3)" />
        <span aria-hidden className="absolute inset-y-2 left-1/2 w-0 -translate-x-1/2 border-l-2 border-dashed border-court-deep/30" />

        <span
          aria-hidden
          className="anim-bob relative"
          style={{ ["--bob-y" as string]: "-8px", ["--bob-r" as string]: "8deg", ["--bob-d" as string]: "2.6s" }}
        >
          <ShuttleBuddy className="h-11 w-11" mood={cta ? "wow" : "happy"} />
        </span>
        <span className="display relative mt-1 text-title text-court-deep">สนามว่าง</span>

        {cta ? (
          <button
            type="button"
            onClick={() => trackBusy(cta.onSend(), setBusy)}
            disabled={busy}
            className={`btn btn-court ${busy ? "is-busy" : "pulse-ring"} relative mt-3 h-13 w-full max-w-xs px-4`}
            style={{ ["--ring" as string]: "rgba(43,184,134,0.5)" }}
          >
            <span aria-hidden className="flex -space-x-2">
              {cta.players.map((p) => (
                <Avatar key={p.id} name={p.name} seed={p.profileId ?? p.id} size="xs" />
              ))}
            </span>
            {busy ? "กำลังเรียกลงสนาม…" : "เรียกคิวที่ 1 ลงสนาม"}
            <IconPlay className="h-4 w-4" />
          </button>
        ) : (
          <span className="relative mt-1 max-w-[16rem] text-caption text-court-deep/80">{hint ?? "เรียกคิวที่ 1 ลงสนามได้เลย"}</span>
        )}
      </div>
    </div>
  );
}
