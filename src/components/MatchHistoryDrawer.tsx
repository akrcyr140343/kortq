"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Court, Match, Player, Session } from "@/lib/types";
import { useProfiles } from "@/hooks/useProfiles";
import {
  buildNameByIdentity,
  buildPlayerOptions,
  buildTimeline,
  summarizePlayer,
  type NamedIdentity,
  type RelationStat,
} from "@/lib/matchHistory";
import { ShuttleBuddy } from "./art";
import { Avatar, seedOfIdentity } from "./Avatar";
import { IconHistory, IconSearch } from "./icons";
import { glide, staggerDelay } from "./motion";
import { Sheet } from "./Sheet";

type Mode = "player" | "timeline";

/** Team pills — sky for Team A, coral for Team B, matching the courts. */
function TeamChips({ team, tone }: { team: NamedIdentity[]; tone: "a" | "b" }) {
  const cls = tone === "a" ? "bg-sky-wash text-sky-deep ring-1 ring-inset ring-sky/20" : "bg-coral-wash text-coral-deep ring-1 ring-inset ring-coral/20";
  return (
    <div className="flex flex-wrap gap-1.5">
      {team.map((p) => (
        <span
          key={p.identity}
          className={`inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 font-display text-caption font-medium ${cls}`}
        >
          <Avatar name={p.name} seed={seedOfIdentity(p.identity)} size="xs" />
          <span className="truncate">{p.name}</span>
        </span>
      ))}
    </div>
  );
}

/** A "คู่กับ / เจอกับ" row: avatar + name on the left, count bubble on the right. */
function RelationRow({ stat, tone, index }: { stat: RelationStat; tone: "partner" | "rival"; index: number }) {
  const chip = tone === "partner" ? "bg-court-wash text-court-deep" : "bg-coral-wash text-coral-deep";
  return (
    <li
      className="anim-enter-x flex items-center gap-2.5 rounded-2xl border border-line bg-paper py-1.5 pl-1.5 pr-2"
      style={staggerDelay(Math.min(index, 8), 0.03)}
    >
      <Avatar name={stat.name} seed={seedOfIdentity(stat.identity)} size="sm" />
      <span className="min-w-0 flex-1 truncate font-display text-body text-ink">{stat.name}</span>
      <span className={`num grid h-7 min-w-9 shrink-0 place-items-center rounded-full px-2 text-caption ${chip}`}>
        {stat.count}
        <span className="sr-only"> ครั้ง</span>
      </span>
    </li>
  );
}

function EmptyHint({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="anim-rise flex flex-col items-center rounded-[22px] border border-dashed border-line-2 px-4 py-9 text-center">
      <span className="anim-bob" style={{ ["--bob-y" as string]: "-6px", ["--bob-d" as string]: "3.2s" }}>
        <ShuttleBuddy className="h-12 w-12" mood="sleepy" />
      </span>
      <p className="mt-3 font-display text-body font-semibold text-ink-2">{title}</p>
      {sub && <p className="mt-1 text-caption text-ink-3">{sub}</p>}
    </div>
  );
}

export function MatchHistoryDrawer({
  open,
  onClose,
  matches,
  players,
  playersById,
  session,
  courts,
}: {
  open: boolean;
  onClose: () => void;
  matches: Match[];
  players: Player[];
  playersById: Map<string, Player>;
  session: Session | null;
  courts: Court[];
}) {
  const [mode, setMode] = useState<Mode>("player");
  const [search, setSearch] = useState("");
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);

  // Names for departed-but-rostered players (case 2) need the Profile roster;
  // subscribe ONLY while the drawer is open, for every role. Read-only, tiny.
  const profiles = useProfiles(open);

  // Close AND reset transient UI in one step, so reopening starts fresh without
  // a reset-on-close effect. The parent unmounts this drawer on any session
  // change, so onClose is the only same-session close path.
  const handleClose = useCallback(() => {
    setMode("player");
    setSearch("");
    setSelectedIdentity(null);
    onClose();
  }, [onClose]);

  const names = useMemo(() => buildNameByIdentity(players, profiles), [players, profiles]);
  const options = useMemo(
    () => buildPlayerOptions(players, matches, playersById, session, names),
    [players, matches, playersById, session, names],
  );
  const timeline = useMemo(
    () => buildTimeline(matches, playersById, session, names),
    [matches, playersById, session, names],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const summary = useMemo(
    () =>
      selectedIdentity
        ? summarizePlayer(selectedIdentity, matches, playersById, session, names)
        : null,
    [selectedIdentity, matches, playersById, session, names],
  );

  const totalGames = matches.length;
  const courtCount = session?.courtCount ?? courts.length;

  // Mode switch — the lime pill slides to the chosen view.
  const toolbar = (
    <div className="seg grid-cols-2" role="group" aria-label="มุมมอง">
      {(["player", "timeline"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={active}
            className={`relative h-10 rounded-full font-display text-caption font-medium transition-colors duration-200 ${
              active ? "text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="history-mode-pill"
                transition={glide}
                aria-hidden
                className="absolute inset-0 rounded-full bg-lime"
              />
            )}
            <span className="relative">{m === "player" ? "รายคน" : "ไทม์ไลน์"}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      label="ประวัติการเล่น"
      eyebrow="SESSION HISTORY"
      title="ประวัติการเล่น"
      subtitle={`เล่นจบแล้ว ${totalGames} เกม · ${courtCount} คอร์ต`}
      icon={
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-wash text-sky-deep ring-1 ring-inset ring-sky/25">
          <IconHistory className="h-6 w-6" />
        </span>
      }
      toolbar={toolbar}
    >
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
        {mode === "player" ? (
          // Modes slide in from the side their tab sits on.
          <div key="player" className="anim-view-l space-y-4">
            {/* Player picker */}
            <div>
              <label className="relative block">
                <span className="sr-only">ค้นหาผู้เล่น</span>
                <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-ink-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาผู้เล่น…"
                  className="field h-11 pl-10 placeholder:font-sans"
                />
              </label>
              {shown.length === 0 ? (
                <p className="mt-3 px-1 text-caption text-ink-3">ไม่พบผู้เล่นที่ค้นหา</p>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {shown.map((o, i) => {
                    const active = selectedIdentity === o.identity;
                    return (
                      <button
                        key={o.identity}
                        type="button"
                        onClick={() => setSelectedIdentity(o.identity)}
                        aria-pressed={active}
                        style={staggerDelay(Math.min(i, 12), 0.02)}
                        className={`anim-pop inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-1.5 font-display text-caption transition-[background-color,border-color,box-shadow,translate] duration-150 active:scale-95 ${
                          active
                            ? "-translate-y-px border-ink bg-lime text-ink shadow-soft"
                            : "border-line-2 bg-paper text-ink-2 hover:border-line-2"
                        } ${!o.inSession ? "italic opacity-70" : ""}`}
                      >
                        <Avatar name={o.name} seed={seedOfIdentity(o.identity)} size="xs" />
                        <span className="max-w-[9rem] truncate">{o.name}</span>
                        <span className={`num rounded-full px-1.5 text-[0.6875rem] ${active ? "bg-lime text-ink" : "bg-mist text-ink-3"}`}>
                          {o.gamesPlayed}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected player summary */}
            {!summary ? (
              <EmptyHint title="เลือกผู้เล่นเพื่อดูสถิติ" sub="แตะชื่อด้านบน" />
            ) : summary.gamesPlayed === 0 ? (
              <div key={selectedIdentity} className="anim-rise space-y-3">
                <div className="surface flex items-center gap-3 rounded-[22px] px-4 py-3.5">
                  <Avatar name={summary.name} seed={seedOfIdentity(summary.identity)} size="lg" />
                  <div className="min-w-0">
                    <span className="block truncate font-display text-lede font-semibold text-ink">{summary.name}</span>
                    <span className="mt-0.5 block text-caption text-ink-3">ในเซสชันนี้</span>
                  </div>
                </div>
                <EmptyHint title="ยังไม่มีประวัติการเล่น" sub="ผู้เล่นคนนี้ยังไม่ได้ลงเล่นเกมที่จบแล้วในเซสชันนี้" />
              </div>
            ) : (
              <div key={selectedIdentity} className="anim-rise space-y-4">
                {/* Games played */}
                <div className="surface flex items-center gap-3 rounded-[22px] px-4 py-3.5">
                  <Avatar name={summary.name} seed={seedOfIdentity(summary.identity)} size="lg" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lede font-semibold text-ink">{summary.name}</span>
                    <span className="mt-0.5 block text-caption text-ink-3">เล่นในเซสชันนี้</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="num block text-h2 leading-none text-ink">{summary.gamesPlayed}</span>
                    <span className="font-display text-[0.6875rem] text-ink-3">เกม</span>
                  </div>
                </div>

                {/* Partners */}
                <section>
                  <h3 className="mb-2 px-1 font-display text-caption font-semibold text-court-deep">เคยคู่กับ ({summary.partners.length})</h3>
                  {summary.partners.length === 0 ? (
                    <p className="px-1 text-caption text-ink-3">—</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {summary.partners.map((s, i) => (
                        <RelationRow key={s.identity} stat={s} tone="partner" index={i} />
                      ))}
                    </ul>
                  )}
                </section>

                {/* Opponents */}
                <section>
                  <h3 className="mb-2 px-1 font-display text-caption font-semibold text-coral-deep">เคยเจอกับ ({summary.opponents.length})</h3>
                  {summary.opponents.length === 0 ? (
                    <p className="px-1 text-caption text-ink-3">—</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {summary.opponents.map((s, i) => (
                        <RelationRow key={s.identity} stat={s} tone="rival" index={i + 1} />
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        ) : (
          /* ── Timeline ─────────────────────────────────────── */
          <div key="timeline" className="anim-view-r">
            {timeline.length === 0 ? (
              <EmptyHint title="ยังไม่มีประวัติการเล่น" sub="เกมที่จบแล้วจะแสดงที่นี่ตามลำดับ" />
            ) : (
              <ol className="relative space-y-3 border-l border-dashed border-line-2 pl-4">
                {timeline.map((g, i) => (
                  <li key={g.id} className="anim-rise relative" style={staggerDelay(Math.min(i, 8), 0.04)}>
                    {/* A dot on the rail for every finished game. */}
                    <span aria-hidden className="absolute -left-[1.4rem] top-4 h-3 w-3 rounded-full bg-lime  ring-4 ring-canvas" />
                    <div className="surface rounded-[20px] p-3">
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="font-display text-caption font-semibold text-ink">
                          เกมที่ <span className="num">{g.index}</span>
                        </span>
                        <span className="chip bg-mist font-num text-[0.6875rem] font-semibold tabular-nums text-ink-3">
                          {new Date(g.finishedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <TeamChips team={g.teamA} tone="a" />
                      <div className="my-2 flex items-center gap-2">
                        <span className="h-px flex-1 bg-line-2" />
                        <span className="num text-[0.625rem] text-ink-4">VS</span>
                        <span className="h-px flex-1 bg-line-2" />
                      </div>
                      <TeamChips team={g.teamB} tone="b" />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
