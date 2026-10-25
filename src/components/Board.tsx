"use client";

import type { Court, Player, Skill } from "@/lib/types";
import type { ResolvedQueuedGame } from "@/hooks/useKortq";
import { ShuttleBuddy } from "./art";
import { Bench } from "./Bench";
import { LiveCourt, OpenCourt } from "./CourtCanvas";
import { LineupTicket, NewTicket } from "./Lineup";
import { SceneSwitch, type AppView } from "./SceneSwitch";
import { Tick } from "./Tick";

export type { AppView };

/** Words that rise out of a mask, one after another. */
function Kinetic({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  return (
    <span className="kq-word">
      <span className={className} style={{ animationDelay: `${delay}s` }}>
        {text}
      </span>
    </span>
  );
}

/** A colour-dotted figure pill for the hall heading. */
function StatPill({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-paper py-1.5 pl-2.5 pr-3 shadow-soft">
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-display text-caption text-ink-3">{label}</span>
      <span className="num text-body leading-none text-ink">
        <Tick value={value} />
      </span>
    </span>
  );
}

/**
 * The live board — the whole hall on one screen.
 *
 *   THE HALL   every court drawn as a court (players standing on it), empty
 *              courts waiting for Q1, then the line of match tickets.
 *   THE BENCH  the composer, the waiting players as seats, the chill zone.
 *
 * iPad landscape and up: hall and bench side by side, each scrolling on its
 * own. Phones / portrait tablets: two scenes behind a sticky switch.
 *
 * Pure presentation: every action arrives as a prop from the page, which
 * owns all state, guards and Firestore calls.
 */
export function Board({
  isAdmin,
  activeView,
  onViewChange,
  courtCount,
  games,
  playersById,
  finishingIds,
  onFinish,
  onCancel,
  queue,
  maxQueued,
  waiting,
  resting,
  selectedIds,
  qSel,
  fillQueueId,
  pick,
  pairWarn,
  stats,
  onSendQ1,
  onFairQ,
  onRandomQ,
  onToggleFill,
  onDeleteQ,
  onQueuedPlayerTap,
  onRemoveFromQ,
  onCreateFromSelected,
  onPickManually,
  onAddPlayer,
  onOpenRegistry,
  onWaitingTap,
  onRest,
  onResume,
  onDelete,
}: {
  isAdmin: boolean;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  courtCount: number;
  games: Court[];
  playersById: Map<string, Player>;
  finishingIds: Set<string>;
  onFinish: (gameId: string) => void;
  onCancel: (gameId: string) => void;
  queue: ResolvedQueuedGame[];
  maxQueued: number;
  waiting: Player[]; // the open queue (assignable)
  resting: Player[];
  selectedIds: Set<string>;
  qSel: { queueId: string; playerId: string } | null;
  fillQueueId: string | null;
  pick: { active: boolean; label: string | null };
  pairWarn: (ids: string[]) => number;
  stats: { totalPlayers: number; playing: number; gamesPlayed: number };
  onSendQ1: () => unknown;
  onFairQ: (queueId: string | null) => unknown;
  onRandomQ: (queueId: string | null) => unknown;
  onToggleFill: (queueId: string) => void;
  onDeleteQ: (queueId: string) => void;
  onQueuedPlayerTap: (queueId: string, playerId: string) => void;
  onRemoveFromQ: (queueId: string, playerId: string) => void;
  onCreateFromSelected: () => unknown;
  onPickManually: () => void;
  onAddPlayer: (name: string, skill: Skill) => Promise<boolean>;
  onOpenRegistry: () => void;
  onWaitingTap: (id: string) => void;
  onRest: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const queueFull = queue.length >= maxQueued;
  const slotsFree = Math.max(0, courtCount - games.length);

  // Q1 can be called from the first free court too (same handler, same guards).
  const q1 = queue[0];
  const q1Full = !!q1 && q1.teamA.length === 2 && q1.teamB.length === 2;
  const freeSlotHint = !q1
    ? "จัดคิวเกมไว้ แล้วเรียกลงสนามได้เลย"
    : !q1Full
      ? "คิวที่ 1 ยังไม่ครบ 4 คน"
      : isAdmin
        ? "เรียกคิวที่ 1 ลงสนามได้เลย"
        : "รอแอดมินเรียกคิวที่ 1 ลงสนาม";

  return (
    <>
      <SceneSwitch
        active={activeView}
        onChange={onViewChange}
        liveCount={games.length}
        courtCount={courtCount}
        waitingCount={waiting.length}
      />

      <div className="grid min-w-0 flex-1 gap-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,23rem)] lg:gap-7">
        {/* ═══ THE HALL ═══ */}
        <section className={`${activeView === "courts" ? "scene-from-left flex" : "hidden"} min-w-0 flex-col lg:flex lg:min-h-0`}>
          <div data-flip-scroll className="scroll-pane flex flex-col gap-8 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-6 lg:pr-1">
            {/* Hall heading — giant live count + the night's figures. */}
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-1">
              <div className="min-w-0">
                <span className="eyebrow flex items-center gap-1.5 text-ink-3">
                  <span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-court" />
                  KD CLUB · ON COURT
                </span>
                <h1 className="display mt-2 flex items-baseline gap-3 text-h2 leading-none text-ink sm:text-h1">
                  <Kinetic text="สนาม" />
                  <span className="num text-[3.25rem] leading-[0.85] sm:text-[4rem]">
                    <Tick value={games.length} />
                    <span className="text-ink-4">/{courtCount}</span>
                  </span>
                  <Kinetic text="กำลังตี" delay={0.08} className="text-lede font-medium text-ink-3 sm:text-title" />
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatPill dot="bg-sky" label="ผู้เล่น" value={stats.totalPlayers} />
                <StatPill dot="bg-sun" label="รอ" value={waiting.length} />
                <StatPill dot="bg-court" label="เล่นอยู่" value={stats.playing} />
                <StatPill dot="bg-coral" label="จบแล้ว" value={stats.gamesPlayed} />
              </div>
            </div>

            {/* The courts. */}
            <div className="grid gap-4 md:grid-cols-2">
              {games.map((game, i) => (
                <LiveCourt
                  key={game.id}
                  court={game}
                  byId={playersById}
                  isAdmin={isAdmin}
                  finishing={finishingIds.has(game.id)}
                  onFinish={onFinish}
                  onCancel={onCancel}
                  index={i}
                />
              ))}
              {Array.from({ length: slotsFree }, (_, i) => (
                <OpenCourt
                  key={`free-${i}`}
                  index={games.length + i}
                  cta={i === 0 && isAdmin && q1 && q1Full ? { players: [...q1.teamA, ...q1.teamB], onSend: onSendQ1 } : null}
                  hint={freeSlotHint}
                />
              ))}
            </div>

            {/* The line — match tickets waiting to go on. */}
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3 px-1">
                <div>
                  <span className="eyebrow text-ink-3">UP NEXT</span>
                  <h2 className="display mt-1 text-h3 leading-none text-ink">คิวเกม</h2>
                </div>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="flex gap-1">
                    {Array.from({ length: maxQueued }, (_, i) => (
                      <span
                        key={i}
                        className={`h-2.5 w-6 rounded-full transition-colors duration-500 ${i < queue.length ? (i === 0 ? "bg-sun" : "bg-ink") : "bg-mist-2"}`}
                      />
                    ))}
                  </span>
                  <span className="num text-lede leading-none text-ink">
                    <Tick value={queue.length} />
                    <span className="text-ink-4">/{maxQueued}</span>
                  </span>
                  <span className="sr-only">คิว</span>
                </span>
              </div>

              {queue.map((q, i) => {
                const first = q.number === 1;
                const fullTeams = q.teamA.length === 2 && q.teamB.length === 2;
                return (
                  <LineupTicket
                    key={q.id}
                    q={q}
                    isAdmin={isAdmin}
                    pairWarn={pairWarn}
                    selectedId={qSel?.queueId === q.id ? qSel.playerId : null}
                    filling={fillQueueId === q.id}
                    canSend={first && fullTeams && slotsFree > 0}
                    sendBlockedReason={
                      !first
                        ? null
                        : !fullTeams
                          ? "ต้องมีผู้เล่นครบ 4 คนก่อนเรียกลงสนาม"
                          : slotsFree === 0
                            ? `สนามเต็ม ${games.length}/${courtCount} — จบเกมก่อนแล้วค่อยเรียก`
                            : null
                    }
                    canDraw={waiting.length + q.count >= 4}
                    onSend={onSendQ1}
                    onFair={() => onFairQ(q.id)}
                    onRandom={() => onRandomQ(q.id)}
                    onToggleFill={() => onToggleFill(q.id)}
                    onDelete={() => onDeleteQ(q.id)}
                    onPlayerTap={(pid) => onQueuedPlayerTap(q.id, pid)}
                    onRemovePlayer={(pid) => onRemoveFromQ(q.id, pid)}
                    index={i}
                  />
                );
              })}
              {isAdmin && !queueFull && (
                <NewTicket
                  number={queue.length + 1}
                  canDraw={waiting.length >= 4}
                  selectedCount={selectedIds.size}
                  onFair={() => onFairQ(null)}
                  onRandom={() => onRandomQ(null)}
                  onPickManually={onPickManually}
                  onCreateFromSelected={onCreateFromSelected}
                  index={queue.length}
                />
              )}
              {!isAdmin && queue.length === 0 && (
                <div className="chalk anim-rise flex flex-col items-center rounded-[28px] px-4 py-7 text-center">
                  <span className="anim-bob" style={{ ["--bob-y" as string]: "-6px", ["--bob-d" as string]: "3.2s" }}>
                    <ShuttleBuddy className="h-12 w-12" mood="sleepy" />
                  </span>
                  <p className="display mt-3 text-body text-ink-2">ยังไม่มีคิวเกม</p>
                  <p className="mt-1 text-caption text-ink-3">รอแอดมินจัดคิวถัดไปได้เลย</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══ THE BENCH ═══ */}
        <aside className={`${activeView === "queue" ? "scene-from-right block" : "hidden"} min-w-0 lg:block lg:min-h-0`}>
          <Bench
            waiting={waiting}
            resting={resting}
            isAdmin={isAdmin}
            selectedIds={selectedIds}
            pickActive={pick.active}
            pickLabel={pick.label}
            onAddPlayer={onAddPlayer}
            onOpenRegistry={onOpenRegistry}
            onToggleSelect={onWaitingTap}
            onRest={onRest}
            onResume={onResume}
            onDelete={onDelete}
          />
        </aside>
      </div>
    </>
  );
}
