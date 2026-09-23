"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
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
import { glide, press, sheetIn, sheetOut, staggerDelay } from "./motion";

type Mode = "player" | "timeline";

/** Team pills — sky for Team A, coral for Team B, matching the app's hue map. */
function TeamChips({ team, tone }: { team: NamedIdentity[]; tone: "a" | "b" }) {
  const cls =
    tone === "a"
      ? "bg-sky-wash text-sky-deep ring-sky/25"
      : "bg-coral-wash text-coral-deep ring-coral/25";
  return (
    <div className="flex flex-wrap gap-1.5">
      {team.map((p) => (
        <span
          key={p.identity}
          className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-caption font-bold ring-1 ring-inset ${cls}`}
        >
          <span className="truncate">{p.name}</span>
        </span>
      ))}
    </div>
  );
}

/** A "คู่กับ / เจอกับ" row: name on the left, count chip on the right. */
function RelationRow({ stat, tone, index }: { stat: RelationStat; tone: "mint" | "sun"; index: number }) {
  const chip =
    tone === "mint"
      ? "bg-mint-wash text-mint-deep"
      : "bg-sun-wash text-coral-deep";
  return (
    <li className="anim-enter flex items-center gap-2 rounded-[13px] border border-line bg-surface-2 py-2 pl-3 pr-2" style={staggerDelay(Math.min(index, 8), 0.03)}>
      <span className="min-w-0 flex-1 truncate text-body font-bold text-ink">{stat.name}</span>
      <span className={`numeral grid h-7 min-w-9 shrink-0 place-items-center rounded-full px-2 text-caption font-extrabold ${chip}`}>
        {stat.count}
        <span className="sr-only"> ครั้ง</span>
      </span>
    </li>
  );
}

function EmptyHint({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-line-2 bg-surface-2 px-4 py-10 text-center">
      <p className="text-body font-extrabold text-ink-2">{title}</p>
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

  // Lock background scroll + Esc to close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, handleClose]);

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
  const courtCount = courts.length;

  // Portal target only exists on the client. This drawer is rendered only after
  // the client-side session subscription resolves (parent gates it behind an
  // active session), so it never renders during SSR/hydration — no mounted flag,
  // no hydration mismatch.
  if (typeof document === "undefined") return null;

  const drawer = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={handleClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: sheetIn }}
            exit={{ x: "100%", transition: sheetOut }}
            className="absolute inset-y-0 right-0 flex h-full w-full flex-col bg-canvas shadow-[0_0_60px_-10px_rgba(16,35,24,0.5)] sm:max-w-md"
          >
            {/* ── Header ────────────────────────────────────────────── */}
            {/* Full-screen overlay sits under the iOS status bar / Dynamic Island
                (viewport-fit=cover + black-translucent), so add the top inset to
                the design's pt-5. env() is 0 on desktop → layout unchanged there. */}
            <div className="club-panel relative shrink-0 overflow-hidden px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
              <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-mint/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <span className="text-[0.64rem] font-extrabold tracking-[0.16em] text-mint">ประวัติเซสชันนี้</span>
                  <h2 className="display mt-1.5 text-h3 leading-none text-white">ประวัติการเล่น</h2>
                  <span className="mt-2 block text-[0.66rem] font-bold text-white/55">
                    เล่นจบแล้ว {totalGames} เกม · {courtCount} คอร์ต
                  </span>
                </div>
                <motion.button
                  whileTap={press}
                  onClick={handleClose}
                  aria-label="ปิด"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/8 text-white transition-colors duration-200 hover:bg-white/16"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </div>

              {/* Mode switch */}
              <div className="relative mt-4 grid grid-cols-2 gap-1 rounded-[14px] bg-white/8 p-1">
                {(["player", "timeline"] as const).map((m) => {
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      aria-pressed={active}
                      className={`relative h-10 rounded-[11px] text-caption font-extrabold transition-all duration-200 ${
                        active ? "text-accent-deep" : "text-white/60 hover:text-white"
                      }`}
                    >
                      {/* The lime pill slides to the chosen mode. */}
                      {active && (
                        <motion.span
                          layoutId="history-mode-pill"
                          transition={glide}
                          aria-hidden
                          className="absolute inset-0 rounded-[11px] bg-mint shadow-sm"
                        />
                      )}
                      <span className="relative">{m === "player" ? "รายคน" : "ไทม์ไลน์"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Body ──────────────────────────────────────────────── */}
            {/* Bottom inset keeps the last row clear of the Home Indicator; env()
                is 0 on desktop so the padding stays the design's pb-4 there. */}
            <div className="scroll-pane min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              {mode === "player" ? (
                // Modes slide in from the side their tab sits on.
                <div key="player" className="anim-enter-xl space-y-4">
                  {/* Player picker */}
                  <div>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ค้นหาผู้เล่น…"
                      className="h-11 w-full rounded-[14px] border border-line bg-white px-4 text-caption font-semibold text-ink outline-none transition-all duration-200 placeholder:font-normal placeholder:text-ink-4 focus:border-mint-deep/40"
                    />
                    {shown.length === 0 ? (
                      <p className="mt-3 px-1 text-caption text-ink-3">ไม่พบผู้เล่นที่ค้นหา</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {shown.map((o, i) => {
                          const active = selectedIdentity === o.identity;
                          return (
                            <button
                              key={o.identity}
                              type="button"
                              onClick={() => setSelectedIdentity(o.identity)}
                              style={staggerDelay(Math.min(i, 12), 0.02)}
                              className={`anim-enter inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-bold transition-all duration-200 ${
                                active
                                  ? "border-mint-deep bg-mint-deep text-white shadow-sm"
                                  : "border-line bg-white text-ink-2 hover:border-mint-deep/40 hover:text-ink"
                              } ${!o.inSession ? "italic" : ""}`}
                            >
                              <span className="max-w-[9rem] truncate">{o.name}</span>
                              <span
                                className={`numeral rounded-full px-1.5 text-[0.6rem] font-extrabold ${
                                  active ? "bg-white/20 text-white" : "bg-canvas text-ink-3"
                                }`}
                              >
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
                    <div key={selectedIdentity} className="anim-enter space-y-3">
                      <div className="e2 rounded-[18px] bg-white px-4 py-3.5">
                        <span className="block truncate text-body font-extrabold text-ink">{summary.name}</span>
                        <span className="mt-0.5 block text-caption text-ink-3">ในเซสชันนี้</span>
                      </div>
                      <EmptyHint title="ยังไม่มีประวัติการเล่น" sub="ผู้เล่นคนนี้ยังไม่ได้ลงเล่นเกมที่จบแล้วในเซสชันนี้" />
                    </div>
                  ) : (
                    <div key={selectedIdentity} className="anim-enter space-y-4">
                      {/* Games played */}
                      <div className="e2 flex items-center justify-between rounded-[18px] bg-white px-4 py-3.5">
                        <div className="min-w-0">
                          <span className="block truncate text-body font-extrabold text-ink">{summary.name}</span>
                          <span className="mt-0.5 block text-caption text-ink-3">เล่นในเซสชันนี้</span>
                        </div>
                        <div className="text-right">
                          <span className="numeral block text-h2 leading-none text-ink">{summary.gamesPlayed}</span>
                          <span className="text-[0.62rem] font-bold text-ink-3">เกม</span>
                        </div>
                      </div>

                      {/* Partners */}
                      <section>
                        <h3 className="mb-1.5 px-1 text-[0.64rem] font-extrabold tracking-[0.14em] text-mint-deep">
                          เคยคู่กับ ({summary.partners.length})
                        </h3>
                        {summary.partners.length === 0 ? (
                          <p className="px-1 text-caption text-ink-3">—</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {summary.partners.map((s, i) => (
                              <RelationRow key={s.identity} stat={s} tone="mint" index={i} />
                            ))}
                          </ul>
                        )}
                      </section>

                      {/* Opponents */}
                      <section>
                        <h3 className="mb-1.5 px-1 text-[0.64rem] font-extrabold tracking-[0.14em] text-coral-deep">
                          เคยเจอกับ ({summary.opponents.length})
                        </h3>
                        {summary.opponents.length === 0 ? (
                          <p className="px-1 text-caption text-ink-3">—</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {summary.opponents.map((s, i) => (
                              <RelationRow key={s.identity} stat={s} tone="sun" index={i + 1} />
                            ))}
                          </ul>
                        )}
                      </section>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Timeline ─────────────────────────────────────── */
                <div key="timeline" className="anim-enter-x">
                  {timeline.length === 0 ? (
                    <EmptyHint title="ยังไม่มีประวัติการเล่น" sub="เกมที่จบแล้วจะแสดงที่นี่ตามลำดับ" />
                  ) : (
                    <ul className="space-y-2.5">
                      {timeline.map((g, i) => (
                        <li key={g.id} className="anim-enter e2 rounded-[18px] bg-white p-3.5" style={staggerDelay(Math.min(i, 8), 0.04)}>
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-[0.64rem] font-extrabold tracking-[0.12em] text-ink-3">
                              เกมที่ <span className="numeral text-ink">{g.index}</span>
                            </span>
                            <span className="numeral text-[0.64rem] font-bold text-ink-4">
                              {new Date(g.finishedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <TeamChips team={g.teamA} tone="a" />
                          <div className="my-1.5 flex items-center gap-2">
                            <span className="h-px flex-1 bg-line" />
                            <span className="text-[0.6rem] font-extrabold tracking-[0.12em] text-ink-4">VS</span>
                            <span className="h-px flex-1 bg-line" />
                          </div>
                          <TeamChips team={g.teamB} tone="b" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(drawer, document.body);
}
