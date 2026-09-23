"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { useModal } from "@/context/ModalContext";
import { useKortq } from "@/hooks/useKortq";
import { useProfiles } from "@/hooks/useProfiles";
import { normalizeNameKey, type Skill } from "@/lib/types";
import { stablePlayerIdentity } from "@/lib/fairmatch";
import { buildTeammatePairCounts, teammatePairKey } from "@/lib/matchHistory";
import {
  addPlayer,
  addPlayerFromProfile,
  assignToCourt,
  fairAssign,
  randomAssign,
  deletePlayer,
  endSession,
  finishGame,
  removeFromCourt,
  setPlayerResting,
  startGame,
  swapCourtPlayers,
  swapAcrossCourts,
  substituteCourtPlayer,
  setNextUpFair,
  setNextUpManual,
  swapNextUpPlayers,
  substituteNextUpPlayer,
  removeFromNextUp,
  addToNextUp,
  clearNextUp,
  promoteNextUp,
} from "@/lib/db";
import { Header } from "@/components/Header";
import { IntroCurtain } from "@/components/IntroCurtain";
import { LaunchCurtain } from "@/components/LaunchCurtain";
import { CloseCurtain } from "@/components/CloseCurtain";
import { StartSession } from "@/components/StartSession";
import { CourtCard } from "@/components/CourtCard";
import { NextUpCard } from "@/components/NextUpCard";
import { QueuePanel } from "@/components/QueuePanel";
import { PlayerRegistryDrawer } from "@/components/PlayerRegistryDrawer";
import { MatchHistoryDrawer } from "@/components/MatchHistoryDrawer";
import { SkillBadge } from "@/components/SkillBadge";
import { glide, popIn, popOut, press } from "@/components/motion";
import { Tick } from "@/components/Tick";
import { usePlayerFlights } from "@/components/flights";
import { E2 } from "@/components/ui";

/* ══ Scoreboard band — figures carry the meaning, no icons ═════════ */
function Stat({
  label,
  value,
  unit,
  tone,
  cardRef,
  active,
}: {
  label: string;
  value: string | number;
  unit: string;
  tone: "sky" | "coral" | "teal" | "blue" | "green";
  cardRef?: (el: HTMLDivElement | null) => void;
  active?: boolean; // centred in the mobile carousel — stands out from its neighbours
}) {
  const toneClass = {
    sky: "from-[#71c9ef] via-[#1494d5]",
    coral: "from-[#ffc28f] via-[#f28b37]",
    teal: "from-[#65d8c0] via-[#159d87]",
    blue: "from-[#75c8f5] via-[#178bd0]",
    green: "from-[#9bdd91] via-[#4caf45]",
  }[tone];

  return (
    <div
      ref={cardRef}
      className={`e1 stat-card group relative min-w-[7.5rem] flex-1 origin-center snap-center overflow-hidden rounded-[18px] px-4 py-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md sm:min-w-0 sm:!scale-100 sm:!opacity-100 ${
        active ? "scale-[1.045] opacity-100 shadow-md" : "scale-[0.94] opacity-70"
      }`}
    >
      <span aria-hidden className={`absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r ${toneClass} to-transparent`} />
      <span className="block min-w-0">
        <span className="block truncate text-[0.66rem] font-bold text-ink-3">{label}</span>
        <span className="mt-0.5 flex items-baseline gap-1">
          <span className="numeral text-title leading-none text-ink">
            <Tick value={value} />
          </span>
          <span className="text-eyebrow font-semibold text-ink-3">{unit}</span>
        </span>
      </span>
    </div>
  );
}

function StatBand({
  totalPlayers,
  waiting,
  playing,
  games,
  courtsActive,
  totalCourts,
}: {
  totalPlayers: number;
  waiting: number;
  playing: number;
  games: number;
  courtsActive: number;
  totalCourts: number;
}) {
  // Mobile: a swipeable carousel, spring-weighted by scroll-snap, where the
  // centred card stands out from its neighbours — tracked via
  // IntersectionObserver rather than a scroll listener, so it costs nothing
  // between swipes and never fights the browser's own momentum scrolling.
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el != null);
    if (cards.length === 0) return;
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best = 0;
        let bestRatio = 0;
        cards.forEach((el, i) => {
          const r = ratios.get(el) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = i;
          }
        });
        setActiveIndex(best);
      },
      { root: track, threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] },
    );
    cards.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const stats: Array<{ label: string; value: number | string; unit: string; tone: "sky" | "coral" | "teal" | "blue" | "green" }> = [
    { label: "ผู้เล่นทั้งหมด", value: totalPlayers, unit: "คน", tone: "sky" },
    { label: "กำลังรอ", value: waiting, unit: "คน", tone: "coral" },
    { label: "สนามทั้งหมด", value: totalCourts, unit: "คอร์ต", tone: "teal" },
    { label: "กำลังเล่น", value: playing, unit: "คน", tone: "blue" },
    { label: "เล่นแล้ว", value: games, unit: "เกม", tone: "green" },
    { label: "คอร์ตใช้งาน", value: `${courtsActive}/${totalCourts}`, unit: "คอร์ต", tone: "teal" },
  ];

  return (
    <div
      ref={trackRef}
      className="scroll-pane anim-enter flex w-full min-w-0 shrink-0 snap-x snap-mandatory gap-2 overflow-x-auto px-[6vw] pb-1 sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-6"
    >
      {stats.map((s, i) => (
        <Stat
          key={s.label}
          {...s}
          active={i === activeIndex}
          cardRef={(el) => {
            cardRefs.current[i] = el;
          }}
        />
      ))}
    </div>
  );
}

type AppView = "courts" | "queue";

function MobileTabBar({
  active,
  onChange,
  waitingCount,
  courtCount,
}: {
  active: AppView;
  onChange: (view: AppView) => void;
  waitingCount: number;
  courtCount: number;
}) {
  const tabs: Array<{ id: AppView; label: string; count: number; icon: React.ReactNode }> = [
    {
      id: "courts",
      label: "สนาม",
      count: courtCount,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 4v16M3 12h18" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      id: "queue",
      label: "คิว",
      count: waitingCount,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 18c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5M11.5 18c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="app-bottom-nav fixed inset-x-3 z-50 mx-auto max-w-sm xl:hidden" aria-label="เมนูหลัก">
      <div className="grid grid-cols-2 gap-1 rounded-[24px] border border-white/10 bg-accent/95 p-1.5 shadow-[0_18px_42px_-12px_rgba(16,35,24,0.62)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={press}
              onClick={() => onChange(tab.id)}
              aria-current={selected ? "page" : undefined}
              className={`relative flex h-14 items-center justify-center gap-2 rounded-[18px] text-caption font-extrabold transition-all duration-200 ${
                selected ? "text-accent-deep" : "text-white/55 hover:bg-white/8 hover:text-white"
              }`}
            >
              {/* The lime pill slides to the tab you picked instead of blinking across. */}
              {selected && (
                <motion.span
                  layoutId="tab-pill"
                  transition={glide}
                  aria-hidden
                  className="absolute inset-0 rounded-[18px] bg-mint shadow-sm"
                />
              )}
              <span className="relative flex">{tab.icon}</span>
              <span className="relative">{tab.label}</span>
              <span className={`numeral relative grid h-5 min-w-5 place-items-center rounded-full px-1 text-eyebrow ${selected ? "bg-accent/10" : "bg-white/10"}`}>
                <Tick value={tab.count} />
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * The pick bar rises in from the bottom edge and sinks away when the pick is
 * cleared or sent. While it is leaving it no longer takes taps, so a stale
 * button can never act on a selection that is already gone.
 */
function SelectionTray({ className, children }: { className: string; children: React.ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: popIn }}
      exit={{ opacity: 0, y: 14, transition: popOut }}
      style={present ? undefined : { pointerEvents: "none" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { isAdmin } = useAdmin();
  const {
    loading,
    error,
    session,
    courts,
    matches,
    fairHistoryReady,
    fairHistoryError,
    waiting,
    resting,
    assignable,
    nextUpTeamA,
    nextUpTeamB,
    nextUpCount,
    players,
    playersById,
  } = useKortq();
  const modal = useModal();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRegistry, setShowRegistry] = useState(false);
  // Read-only session play history — open to every role while a session runs.
  // Stored as the createdAt of the session it was opened for (null = closed), so
  // it derives shut when the session ends or a new one starts (createdAt changes)
  // without an effect: a stale-session open can never leak into the next session.
  const [historyForSession, setHistoryForSession] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<AppView>("courts");
  // A player picked on a not-yet-started court, waiting for a second tap to
  // swap with (another court player, or a waiting player). Null = idle.
  const [swapSel, setSwapSel] = useState<{ courtId: string; playerId: string } | null>(null);
  // A player picked inside the staged Next Up, awaiting a second tap to swap
  // (another Next Up player) or substitute (a queue player). Null = idle.
  const [nextUpSel, setNextUpSel] = useState<string | null>(null);
  // Manual "เลือกเอง" mode: admin is picking 4 from the queue to stage as the
  // next game (reuses the normal selection + the bottom bar to confirm).
  const [nextUpPicking, setNextUpPicking] = useState(false);
  // One in-flight Fair action per device, including the reroll confirmation.
  const fairInFlight = useRef(false);

  const sessionActive = session?.active ?? false;
  // Derived open-state: true only while THIS session (by createdAt) is the one
  // history was opened for. Ends the drawer on session end / new session with no
  // setState-in-effect.
  const showHistory = session != null && historyForSession === session.createdAt;
  // Rule 1: a next game can only be booked once every open court already has
  // players (each court either playing or waiting-to-start).
  const allCourtsAssigned =
    courts.length > 0 && courts.every((c) => c.teamA.length + c.teamB.length > 0);

  // Permanent roster — only subscribed during an admin session (admin-only).
  const profiles = useProfiles(isAdmin && sessionActive);
  // Profiles already checked into today's session (block re-adding — req 10).
  const sessionProfileIds = useMemo(
    () => new Set(players.map((p) => p.profileId).filter((id): id is string => !!id)),
    [players],
  );

  // Never leave the registry drawer open outside an admin session.
  useEffect(() => {
    if (!isAdmin || !sessionActive) {
      setShowRegistry(false);
    }
  }, [isAdmin, sessionActive]);

  useEffect(() => {
    // Keep only players who are still selectable — i.e. still in the open queue
    // and not swept into Next Up.
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const okIds = new Set(assignable.map((p) => p.id));
      const next = new Set([...prev].filter((id) => okIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [assignable]);

  useEffect(() => {
    if (!isAdmin || !sessionActive) {
      setSelectedIds(new Set());
      setNextUpPicking(false);
    }
  }, [isAdmin, sessionActive]);

  // Leave manual-pick mode if the create-gate closes (a court freed up) or a
  // next game already got staged — the mode no longer makes sense.
  useEffect(() => {
    if (nextUpPicking && (!allCourtsAssigned || nextUpCount > 0)) setNextUpPicking(false);
  }, [nextUpPicking, allCourtsAssigned, nextUpCount]);

  // Drop the Next Up selection when it no longer points at a staged player
  // (removed, substituted, promoted, or session/admin ended).
  useEffect(() => {
    if (!nextUpSel) return;
    if (!isAdmin || !sessionActive) {
      setNextUpSel(null);
      return;
    }
    const ids = new Set([...(session?.nextUp?.teamA ?? []), ...(session?.nextUp?.teamB ?? [])]);
    if (!ids.has(nextUpSel)) setNextUpSel(null);
  }, [nextUpSel, isAdmin, sessionActive, session]);

  // Drop the swap selection whenever it no longer points at a swappable
  // player: session/admin ended, the game already started, or the player left
  // that court (e.g. substituted out on another device).
  useEffect(() => {
    if (!swapSel) return;
    if (!isAdmin || !sessionActive) {
      setSwapSel(null);
      return;
    }
    const court = courts.find((c) => c.id === swapSel.courtId);
    const stillSwappable =
      court != null &&
      court.startedAt == null &&
      [...court.teamA, ...court.teamB].includes(swapSel.playerId);
    if (!stillSwappable) setSwapSel(null);
  }, [swapSel, isAdmin, sessionActive, courts]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }, []);

  const handleEndSession = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Captured before the confirm dialog opens — the button itself may no
      // longer be under the cursor by the time the admin answers "ปิดสนาม".
      const origin = { x: e.clientX, y: e.clientY };
      const ok = await modal.confirm({
        title: "ปิดสนามวันนี้?",
        message: "ข้อมูลคิว คอร์ต และประวัติเกมวันนี้จะถูกล้าง บันทึกวิเคราะห์การจับแฟร์ยังเก็บไว้",
        confirmLabel: "ปิดสนาม",
      });
      if (!ok) return;
      setClose({ count: session?.courtCount ?? 0, origin, status: "closing" });
      try {
        await endSession();
      } catch (err) {
        setClose((cur) => (cur ? { ...cur, status: "error", error: err instanceof Error ? err.message : undefined } : cur));
        throw err;
      }
    },
    [modal, session],
  );

  const handleRandom = useCallback(
    async (courtId: string) => {
      try {
        await randomAssign(courtId, assignable);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "สุ่มผู้เล่นไม่สำเร็จ");
      }
    },
    [assignable],
  );

  const handleFair = useCallback(
    async (courtId: string) => {
      if (fairInFlight.current) return;
      fairInFlight.current = true;
      try {
        if (!session?.active) throw new Error("ยังไม่ได้เปิดสนาม");
        if (!fairHistoryReady) throw new Error(fairHistoryError ?? "กำลังโหลดประวัติ กรุณารอก่อนจับแฟร์");
        await fairAssign(courtId, session.createdAt);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "จับแฟร์ไม่สำเร็จ");
      } finally {
        fairInFlight.current = false;
      }
    },
    [session, fairHistoryReady, fairHistoryError],
  );

  const handleAssignSelected = useCallback(
    async (courtId: string) => {
      const chosen = assignable.filter((p) => selectedIds.has(p.id));
      if (chosen.length < 2) return;
      await assignToCourt(courtId, chosen);
      setSelectedIds(new Set());
    },
    [assignable, selectedIds],
  );

  const handleStart = useCallback(
    async (courtId: string) => {
      setSwapSel(null);
      const court = courts.find((c) => c.id === courtId);
      if (!court) return;
      try {
        // Pass the exact teams the admin sees; the DB transaction re-validates so
        // a stale start can't begin a different assignment now on this court.
        await startGame(courtId, court.teamA, court.teamB);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "เริ่มเกมไม่สำเร็จ");
      }
    },
    [courts],
  );

  // Tap a player on a not-yet-started court: first tap selects, a second tap on
  // another player of the SAME court swaps their teams; tapping the same player
  // again clears the selection. Tapping a queue player while one is selected is
  // handled by handleWaitingTap (substitution).
  const handleCourtPlayerTap = useCallback(
    (courtId: string, playerId: string) => {
      setNextUpSel(null); // court and Next Up picks are mutually exclusive
      if (!swapSel) {
        setSwapSel({ courtId, playerId });
        return;
      }
      if (swapSel.playerId === playerId) {
        setSwapSel(null); // tapping the same player clears the selection
        return;
      }
      if (swapSel.courtId === courtId) {
        const court = courts.find((c) => c.id === courtId);
        if (court) {
          void swapCourtPlayers(courtId, court.teamA, court.teamB, swapSel.playerId, playerId).catch(
            (e) => window.alert(e instanceof Error ? e.message : "สลับผู้เล่นไม่สำเร็จ"),
          );
        }
        setSwapSel(null);
        return;
      }
      // Different court → swap the two players across courts. Both courts are
      // pre-game by construction (taps are only enabled on not-yet-started
      // courts); the DB transaction re-validates state for multi-device safety.
      void swapAcrossCourts(swapSel.courtId, courtId, swapSel.playerId, playerId).catch(
        (e) => window.alert(e instanceof Error ? e.message : "สลับผู้เล่นข้ามคอร์ตไม่สำเร็จ"),
      );
      setSwapSel(null);
    },
    [swapSel, courts],
  );

  // A tap in the waiting queue is dispatched by whatever pick is in progress,
  // in priority order: (1) finish a court substitution, (2) finish a Next Up
  // substitution, (3) fill an incomplete Next Up, else (4) normal 2–4 selection.
  const handleWaitingTap = useCallback(
    (id: string) => {
      if (swapSel) {
        const court = courts.find((c) => c.id === swapSel.courtId);
        if (court) {
          void substituteCourtPlayer(
            swapSel.courtId,
            court.teamA,
            court.teamB,
            swapSel.playerId,
            id,
          ).catch((e) => window.alert(e instanceof Error ? e.message : "เปลี่ยนตัวไม่สำเร็จ"));
        }
        setSwapSel(null);
        return;
      }
      if (nextUpSel) {
        void substituteNextUpPlayer(
          session?.nextUp?.teamA ?? [],
          session?.nextUp?.teamB ?? [],
          nextUpSel,
          id,
        ).catch((e) => window.alert(e instanceof Error ? e.message : "เปลี่ยนตัวไม่สำเร็จ"));
        setNextUpSel(null);
        return;
      }
      if (nextUpCount > 0 && nextUpCount < 4) {
        void addToNextUp(session?.nextUp?.teamA ?? [], session?.nextUp?.teamB ?? [], id).catch(
          (e) => window.alert(e instanceof Error ? e.message : "เพิ่มผู้เล่นไม่สำเร็จ"),
        );
        return;
      }
      toggleSelect(id);
    },
    [swapSel, nextUpSel, nextUpCount, session, courts, toggleSelect],
  );

  // ── Next Up handlers ─────────────────────────────────────────────
  const handleNextUpPlayerTap = useCallback(
    (playerId: string) => {
      setSwapSel(null); // court and Next Up picks are mutually exclusive
      if (!nextUpSel) {
        setNextUpSel(playerId);
        return;
      }
      if (nextUpSel === playerId) {
        setNextUpSel(null);
        return;
      }
      void swapNextUpPlayers(
        session?.nextUp?.teamA ?? [],
        session?.nextUp?.teamB ?? [],
        nextUpSel,
        playerId,
      ).catch((e) => window.alert(e instanceof Error ? e.message : "สลับผู้เล่นไม่สำเร็จ"));
      setNextUpSel(null);
    },
    [nextUpSel, session],
  );

  const handleRemoveFromNext = useCallback(
    (id: string) => {
      void removeFromNextUp(session?.nextUp?.teamA ?? [], session?.nextUp?.teamB ?? [], id).catch(
        (e) => window.alert(e instanceof Error ? e.message : "เอาผู้เล่นออกไม่สำเร็จ"),
      );
      setNextUpSel((prev) => (prev === id ? null : prev));
    },
    [session],
  );

  // Enter manual-pick mode: choose 4 from the queue, confirm in the bottom bar.
  const handleStartManual = useCallback(() => {
    setSwapSel(null);
    setNextUpSel(null);
    setSelectedIds(new Set());
    setNextUpPicking(true);
    setActiveView("queue");
  }, []);

  const handleCancelManual = useCallback(() => {
    setNextUpPicking(false);
    setSelectedIds(new Set());
  }, []);

  const handleStageFair = useCallback(async () => {
    if (fairInFlight.current) return;
    fairInFlight.current = true;
    try {
      if (!session?.active) throw new Error("ยังไม่ได้เปิดสนาม");
      if (!fairHistoryReady) throw new Error(fairHistoryError ?? "กำลังโหลดประวัติ กรุณารอก่อนจับแฟร์");
      // Creating (0 -> set) requires filled courts; reroll is an edit.
      if (nextUpCount === 0 && !allCourtsAssigned) {
        window.alert("จัดผู้เล่นลงคอร์ตให้ครบก่อน จึงจะตั้งเกมถัดไปได้");
        return;
      }
      if (nextUpCount > 0) {
        const ok = await modal.confirm({
          title: "มีเกมถัดไปอยู่แล้ว",
          message: "คำนวณเกมถัดไปใหม่? อาจได้ผู้เล่นชุดเดิมหากยังเหมาะสมที่สุด",
          confirmLabel: "แทนที่",
        });
        if (!ok) return;
      }
      // Re-roll draws from the whole queue (staged players are released back).
      // The DB loads current queue/history AFTER confirmation; only the expected
      // reservation/session identity is captured here, to reject stale replacements.
      await setNextUpFair(session.createdAt, session.nextUp ?? { teamA: [], teamB: [] });
      setNextUpSel(null);
      setNextUpPicking(false);
      setSelectedIds(new Set());
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "จับแฟร์ไม่สำเร็จ");
    } finally {
      fairInFlight.current = false;
    }
  }, [nextUpCount, allCourtsAssigned, session, fairHistoryReady, fairHistoryError, modal]);

  const handleStageSelected = useCallback(async () => {
    if (!allCourtsAssigned) return;
    const chosen = assignable.filter((p) => selectedIds.has(p.id));
    if (chosen.length !== 4) return;
    if (nextUpCount > 0) {
      const ok = await modal.confirm({
        title: "มีเกมถัดไปอยู่แล้ว",
        message: "แทนที่ด้วยชุดใหม่?",
        confirmLabel: "แทนที่",
      });
      if (!ok) return;
    }
    try {
      await setNextUpManual(chosen);
      setSelectedIds(new Set());
      setNextUpSel(null);
      setNextUpPicking(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "ตั้งเกมถัดไปไม่สำเร็จ");
    }
  }, [allCourtsAssigned, assignable, selectedIds, nextUpCount, modal]);

  const handleClearNext = useCallback(() => {
    if (!window.confirm("ล้างเกมถัดไป?")) return;
    void clearNextUp().catch((e) => window.alert(e instanceof Error ? e.message : "ล้างไม่สำเร็จ"));
    setNextUpSel(null);
  }, []);

  const handlePromote = useCallback(
    async (courtId: string) => {
      if (nextUpCount !== 4) return;
      try {
        // Pass the ids the admin currently sees; the DB transaction re-validates
        // court/nextUp state to block a double-promote across devices.
        await promoteNextUp(
          courtId,
          nextUpTeamA.map((p) => p.id),
          nextUpTeamB.map((p) => p.id),
        );
        setNextUpSel(null);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "ส่งเกมถัดไปไม่สำเร็จ");
      }
    },
    [nextUpCount, nextUpTeamA, nextUpTeamB],
  );

  // In-flight finishes, keyed by courtId. The ref is the reliable re-entrancy
  // guard (survives re-renders, no async gap); the state mirror only drives the
  // button's disabled state. Correctness itself lives in the finishGame
  // transaction — this is just a UI safety layer to avoid a wasted round-trip.
  const finishingRef = useRef<Set<string>>(new Set());
  const [finishingIds, setFinishingIds] = useState<Set<string>>(new Set());
  const handleFinish = useCallback(
    async (courtId: string) => {
      const court = courts.find((c) => c.id === courtId);
      if (!court || court.startedAt == null) return; // only a started game can finish
      if (finishingRef.current.has(courtId)) return; // already finishing this court
      finishingRef.current.add(courtId);
      setFinishingIds(new Set(finishingRef.current));
      try {
        await finishGame(courtId, court.startedAt);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "จบเกมไม่สำเร็จ");
      } finally {
        finishingRef.current.delete(courtId);
        setFinishingIds(new Set(finishingRef.current));
      }
    },
    [courts],
  );

  const handleRemove = useCallback(
    async (courtId: string) => {
      const court = courts.find((c) => c.id === courtId);
      if (!court) return;
      try {
        // Cancel the assignment the admin sees; the DB transaction re-validates
        // (stale cancel can't wipe a new assignment) and tolerantly resets only
        // the players still on this court.
        await removeFromCourt(courtId, court.teamA, court.teamB, court.startedAt);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ");
      }
    },
    [courts],
  );

  const handleRest = useCallback(
    (id: string) =>
      void setPlayerResting(id, true).catch((e) =>
        window.alert(e instanceof Error ? e.message : "พักไม่สำเร็จ"),
      ),
    [],
  );
  const handleResume = useCallback(
    (id: string) =>
      void setPlayerResting(id, false).catch((e) =>
        window.alert(e instanceof Error ? e.message : "กลับมาเล่นไม่สำเร็จ"),
      ),
    [],
  );
  const handleDelete = useCallback((id: string) => deletePlayer(id), []);

  // Add from the "type a name" form. Blocks duplicate names against BOTH today's
  // session players and the member roster (same normalizeNameKey), then routes:
  // existing member → reuse (never a second Profile — req 8); otherwise new.
  // Returns true only when a player was actually added, so the form resets.
  const handleAddPlayer = useCallback(
    async (name: string, skill: Skill): Promise<boolean> => {
      if (!session) return false;
      const key = normalizeNameKey(name);
      try {
        // Already in this session by name — covers the case where the member's
        // Profile was deleted but their session Player is still in play.
        if (players.some((p) => normalizeNameKey(p.name) === key)) {
          await modal.alert({
            title: `${name.trim()} อยู่ในคิววันนี้แล้ว`,
            message: "มีผู้เล่นชื่อนี้อยู่แล้ว ไม่ต้องเพิ่มซ้ำ",
          });
          return false;
        }
        // In the member roster (not in session) — add the existing person.
        const existing = profiles.find((p) => p.nameKey === key);
        if (existing) {
          const ok = await modal.confirm({
            title: "มีชื่อนี้อยู่ในสมาชิกก๊วนแล้ว",
            message: `ใช้ ${existing.name} คนเดิมจากสมาชิกก๊วนเพิ่มลงคิวไหม (จะไม่สร้างชื่อซ้ำ)`,
            confirmLabel: "เพิ่มคนเดิม",
          });
          if (!ok) return false;
          await addPlayerFromProfile(existing.id, session.createdAt);
          return true;
        }
        await addPlayer(name, skill, session.createdAt);
        return true;
      } catch (e) {
        await modal.alert({ title: "เพิ่มไม่สำเร็จ", message: e instanceof Error ? e.message : undefined });
        return false;
      }
    },
    [session, players, profiles, modal],
  );

  const playingCount = players.filter((p) => p.status === "playing").length;
  const totalGamesPlayed = Math.floor(
    players.reduce((sum, p) => sum + (p.gamesPlayed ?? 0), 0) / 4,
  );
  const activeCourts = courts.filter((c) => c.teamA.length + c.teamB.length > 0).length;

  const selectedPlayers = useMemo(
    () => assignable.filter((p) => selectedIds.has(p.id)),
    [assignable, selectedIds],
  );

  // Repeat-teammate ("คู่ซ้ำ") warning. Derived purely from finished matches of
  // THIS session via the existing stable-identity flow — no Firestore read/write,
  // no Fair-engine input. teamPairWarn() returns how many finished games the
  // team's two CURRENT members already spent together (0 = none). Because it
  // reads live player identities, it re-derives on every swap/substitute.
  const teammatePairCounts = useMemo(
    () => buildTeammatePairCounts(matches, playersById, session),
    [matches, playersById, session],
  );
  const teamPairWarn = useCallback(
    (ids: string[]): number => {
      if (ids.length !== 2) return 0; // only a full pair can repeat
      const a = playersById.get(ids[0]);
      const b = playersById.get(ids[1]);
      if (!a || !b) return 0;
      const k = teammatePairKey(stablePlayerIdentity(a), stablePlayerIdentity(b));
      return teammatePairCounts.get(k) ?? 0;
    },
    [teammatePairCounts, playersById],
  );

  // What a tap in the queue currently means, for the queue banner + row taps.
  const queuePick = swapSel
    ? { active: true, label: "แตะเพื่อนในคิวเพื่อเปลี่ยนตัวลงคอร์ต" }
    : nextUpSel
      ? { active: true, label: "แตะเพื่อนในคิวเพื่อเปลี่ยนตัวในเกมถัดไป" }
      : nextUpCount > 0 && nextUpCount < 4
        ? { active: true, label: `เติมเกมถัดไป — แตะเพื่อเพิ่ม (${nextUpCount}/4)` }
        : nextUpPicking
          ? { active: true, label: `เลือก 4 คนเพื่อตั้งเป็นเกมถัดไป (${selectedPlayers.length}/4)` }
          : { active: false, label: null };

  // Where every player stands right now. When this changes (locally or via a
  // realtime snapshot), players glide / fly from their old spot to the new one.
  // Selection, typing and timer ticks leave it untouched, so they animate nothing.
  const placementSig = useMemo(
    () =>
      [
        courts.map((c) => `${c.id}:${c.teamA.join(",")}/${c.teamB.join(",")}`).join("|"),
        `n:${nextUpTeamA.map((p) => p.id).join(",")}/${nextUpTeamB.map((p) => p.id).join(",")}`,
        `q:${assignable.map((p) => p.id).join(",")}`,
        `r:${resting.map((p) => p.id).join(",")}`,
      ].join("#"),
    [courts, nextUpTeamA, nextUpTeamB, assignable, resting],
  );
  const shellRef = useRef<HTMLDivElement>(null);
  usePlayerFlights(shellRef, placementSig);

  // Cinematic hand-off on first paint only — a real reload later in the same
  // tab skips straight to the app. Never gates data loading (useKortq keeps
  // fetching underneath); it only holds back when the hall's own entrance
  // starts playing, so the curtain lifting and the page revealing are one
  // continuous beat instead of two unrelated animations.
  const [revealed, setRevealed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("kq-intro-seen") === "1";
    } catch {
      return false;
    }
  });
  const reveal = useCallback(() => {
    try {
      sessionStorage.setItem("kq-intro-seen", "1");
    } catch {}
    setRevealed(true);
  }, []);

  // "Opening the hall" — the launch curtain owns this window so it can hold
  // the old screen in place (StartSession keeps rendering, just hidden
  // underneath) until Firestore genuinely confirms the session is live, then
  // hands off to the dashboard in the same beat the CourtCard/QueuePanel
  // entrances fire. MIN_OPEN_MS is the floor for the curtain's own reveal
  // (ring + court lines) to finish even when the write itself is instant;
  // it never adds delay beyond a real write that's actually slower than that.
  const [launch, setLaunch] = useState<{
    count: number;
    origin: { x: number; y: number } | null;
    status: "opening" | "ready" | "error";
    error?: string;
  } | null>(null);

  const handleLaunch = useCallback((count: number, origin: { x: number; y: number }) => {
    setLaunch({ count, origin, status: "opening" });
  }, []);
  const handleLaunchSettled = useCallback((ok: boolean, message?: string) => {
    if (ok) return; // success is read off `sessionActive` below, not the promise alone
    setLaunch((cur) => (cur ? { ...cur, status: "error", error: message } : cur));
  }, []);
  const retryLaunch = useCallback(() => setLaunch(null), []);

  const MIN_OPEN_MS = 1100;
  const READY_HOLD_MS = 380;
  useEffect(() => {
    if (!launch || launch.status !== "opening" || !sessionActive) return;
    const t = window.setTimeout(
      () => setLaunch((cur) => (cur && cur.status === "opening" ? { ...cur, status: "ready" } : cur)),
      MIN_OPEN_MS,
    );
    return () => window.clearTimeout(t);
  }, [launch, sessionActive]);
  useEffect(() => {
    if (!launch || launch.status !== "ready") return;
    const t = window.setTimeout(() => setLaunch(null), READY_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [launch]);

  // "Closing the hall" — the mirror hand-off. `close` keeps <main> mounted
  // (hidden under the curtain) until it lifts, so StartSession's own entrance
  // only starts the instant the curtain is ready to reveal it, and never
  // shows "closed" if endSession actually failed (sessionActive stays true,
  // so the ternary below keeps the dashboard, not StartSession, underneath).
  const [close, setClose] = useState<{
    count: number;
    origin: { x: number; y: number } | null;
    status: "closing" | "done" | "error";
    error?: string;
  } | null>(null);
  const retryClose = useCallback(() => setClose(null), []);

  const CLOSE_MIN_MS = 1000;
  const CLOSE_HOLD_MS = 380;
  useEffect(() => {
    if (!close || close.status !== "closing" || sessionActive) return;
    const t = window.setTimeout(
      () => setClose((cur) => (cur && cur.status === "closing" ? { ...cur, status: "done" } : cur)),
      CLOSE_MIN_MS,
    );
    return () => window.clearTimeout(t);
  }, [close, sessionActive]);
  useEffect(() => {
    if (!close || close.status !== "done") return;
    const t = window.setTimeout(() => setClose(null), CLOSE_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [close]);

  return (
    <div ref={shellRef} className="app-shell flex min-h-dvh flex-col xl:h-dvh xl:min-h-0 xl:overflow-hidden">
      <Header
        session={session}
        onEndSession={handleEndSession}
        onOpenHistory={() => setHistoryForSession(session?.createdAt ?? null)}
      />

      <AnimatePresence>{!revealed && <IntroCurtain key="intro" onSkip={reveal} />}</AnimatePresence>
      <AnimatePresence>
        {launch && (
          <LaunchCurtain
            key="launch"
            courtCount={launch.count}
            status={launch.status}
            errorMessage={launch.error}
            origin={launch.origin}
            onRetry={retryLaunch}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {close && (
          <CloseCurtain
            key="close"
            courtCount={close.count}
            status={close.status}
            errorMessage={close.error}
            origin={close.origin}
            onRetry={retryClose}
          />
        )}
      </AnimatePresence>

      {revealed && (error ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className={`${E2} anim-enter relative w-full max-w-sm overflow-hidden rounded-[28px] p-8`}>
            <div aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-alert-wash blur-2xl" />
            <span className="relative grid h-12 w-12 place-items-center rounded-[16px] bg-alert-wash text-xl text-alert">!</span>
            <span className="relative mt-4 block text-xs font-extrabold tracking-[0.12em] text-alert">เชื่อมต่อไม่สำเร็จ</span>
            <h2 className="display relative mt-3 text-h2 leading-none text-ink">ตอนนี้ออฟไลน์อยู่</h2>
            <p className="mt-3 text-body text-ink-2">{error}</p>
            <motion.button
              whileTap={press}
              onClick={() => window.location.reload()}
              className="shine-button mt-6 h-12 w-full rounded-[16px] bg-gradient-to-r from-accent to-accent-2 text-caption font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(108,92,231,0.8)] transition-all duration-200 hover:-translate-y-0.5"
            >
              ลองใหม่อีกครั้ง
            </motion.button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="relative grid h-16 w-16 place-items-center rounded-[22px] bg-white shadow-[0_18px_36px_-22px_rgba(108,92,231,0.65)]">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-accent-wash border-t-accent" />
          </div>
          <span className="text-xs font-extrabold tracking-[0.12em] text-accent">กำลังเตรียมสนาม</span>
        </div>
      ) : launch || (!sessionActive && !close) ? (
        <StartSession onLaunch={handleLaunch} onLaunchSettled={handleLaunchSettled} />
      ) : (
        <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col gap-3 overflow-x-hidden px-3 pb-28 pt-3 sm:px-5 xl:min-h-0 xl:pb-4">
          <div className="flex items-end justify-between xl:hidden">
            <div>
              <span className="text-eyebrow font-extrabold tracking-[0.14em] text-mint-deep">KD CLUB · LIVE</span>
              <h1 key={activeView} className="display sport-title anim-status mt-1 text-title leading-none text-ink">{activeView === "courts" ? "สนามวันนี้" : "เพื่อนในคิว"}</h1>
            </div>
            <span key={activeView} className="anim-status rounded-full bg-mint-wash px-3 py-1.5 text-[0.68rem] font-extrabold text-mint-deep">
              {activeView === "courts" ? `${activeCourts}/${courts.length} กำลังใช้` : `${assignable.length} คนกำลังรอ`}
            </span>
          </div>

          {/* Two independent columns: roster on the left, courts on the right.
              Each scrolls in its own pane on large screens, so a long queue
              can never stretch the courts beside it. */}
          <div className="grid min-w-0 flex-1 gap-4 xl:min-h-0 xl:grid-cols-[21rem_minmax(0,1fr)]">
            <aside className={`${activeView === "queue" ? "view-from-right block" : "hidden"} order-2 xl:order-1 xl:block xl:min-h-0`}>
              <QueuePanel
                waiting={assignable}
                resting={resting}
                isAdmin={isAdmin}
                selectedIds={selectedIds}
                pickActive={queuePick.active}
                pickLabel={queuePick.label}
                onAddPlayer={handleAddPlayer}
                onOpenRegistry={() => setShowRegistry(true)}
                onToggleSelect={handleWaitingTap}
                onRest={handleRest}
                onResume={handleResume}
                onDelete={handleDelete}
              />
            </aside>

            <section className={`${activeView === "courts" ? "view-from-left flex" : "hidden"} order-1 min-w-0 flex-col gap-3 xl:order-2 xl:flex xl:min-h-0`}>
              <StatBand
                totalPlayers={players.length}
                waiting={assignable.length}
                playing={playingCount}
                games={totalGamesPlayed}
                courtsActive={activeCourts}
                totalCourts={courts.length}
              />

              <div className="dashboard-title hidden shrink-0 items-end justify-between px-2 xl:flex">
                <div>
                  <span className="text-eyebrow font-extrabold tracking-[0.18em] text-mint-deep">KD CLUB · LET&apos;S PLAY</span>
                  <h1 className="display sport-title mt-1 text-h3 leading-none text-accent-deep">เลือกคอร์ต แล้วไปตีด้วยกัน!</h1>
                </div>
                <span className="rounded-full border border-mint-deep/15 bg-white/75 px-3 py-1.5 text-[0.68rem] font-extrabold text-mint-deep shadow-sm backdrop-blur-sm">
                  พร้อมเมื่อไหร่ กดเลือกผู้เล่นได้เลย 🏸
                </span>
              </div>

              {/* Courts first, then the staged next game beneath them — the
                  member reading order: playing/starting → เกมถัดไป → queue. */}
              <div data-flip-scroll className="scroll-pane flex flex-col gap-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1.5">
                {/* Courts and the staged next game share ONE grid so "เกมถัดไป"
                    tracks the real court count instead of stretching full-width:
                    with 2 courts it spans 2 columns (aligned under them, the 3rd
                    column left open); with 3 it spans all three. Column count and
                    the Next Up span are driven purely by CSS off data-courts. */}
                <div className="court-grid grid auto-rows-min gap-3 sm:grid-cols-2" data-courts={courts.length}>
                  {courts.map((court, i) => (
                    <CourtCard
                      key={court.id}
                      court={court}
                      byId={playersById}
                      isAdmin={isAdmin}
                      waitingCount={assignable.length}
                      selectedCount={selectedIds.size}
                      swapSelectedId={swapSel?.courtId === court.id ? swapSel.playerId : null}
                      nextUpCount={nextUpCount}
                      pairWarn={teamPairWarn}
                      finishing={finishingIds.has(court.id)}
                      onFair={handleFair}
                      onRandom={handleRandom}
                      onAssignSelected={handleAssignSelected}
                      onPromote={handlePromote}
                      onStart={handleStart}
                      onPlayerTap={handleCourtPlayerTap}
                      onFinish={handleFinish}
                      onRemove={handleRemove}
                      index={i}
                    />
                  ))}

                  <div className="next-up-cell" data-courts={courts.length}>
                    <NextUpCard
                      isAdmin={isAdmin}
                      teamA={nextUpTeamA}
                      teamB={nextUpTeamB}
                      count={nextUpCount}
                      pairWarn={teamPairWarn}
                      selectedId={nextUpSel}
                      canStageFair={waiting.length >= 4}
                      canCreate={allCourtsAssigned}
                      picking={nextUpPicking}
                      swapActive={nextUpSel != null}
                      onStageFair={handleStageFair}
                      onStartManual={handleStartManual}
                      onCancelManual={handleCancelManual}
                      onClear={handleClearNext}
                      onPlayerTap={handleNextUpPlayerTap}
                      onRemovePlayer={handleRemoveFromNext}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      ))}

      {/* ── Selection bar — names, not just a count ────────────────── */}
      <AnimatePresence>
      {isAdmin && sessionActive && selectedPlayers.length > 0 && (
        <SelectionTray key="tray" className="sticky bottom-[calc(5.2rem+env(safe-area-inset-bottom))] z-30 shrink-0 px-3 pb-3 sm:px-5 xl:bottom-0">
          <div className="club-panel mx-auto flex max-w-[1700px] items-center gap-3 rounded-[22px] px-3 py-2.5 sm:px-4">
            <span className="numeral grid h-11 min-w-11 shrink-0 place-items-center rounded-[15px] bg-mint text-lede leading-none text-accent-deep shadow-[0_10px_20px_-12px_rgba(121,174,12,0.8)]">
              <Tick value={selectedPlayers.length} />
              <span className="sr-only"> จาก 4</span>
            </span>

            <div className="scroll-pane flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {selectedPlayers.map((p) => (
                <span
                  key={p.id}
                  className="anim-pop flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/8 py-1.5 pl-3 pr-2"
                >
                  <span className="text-caption font-bold text-white">{p.name}</span>
                  <SkillBadge skill={p.skill} />
                </span>
              ))}
            </div>

            <span className="hidden shrink-0 text-caption text-white/55 xl:block">
              เลือกแล้ว {selectedPlayers.length}/4 · แตะคอร์ตว่างเพื่อส่งลงสนาม
            </span>

            {allCourtsAssigned && (
              <motion.button
                key={selectedPlayers.length === 4 ? "ready" : "wait"}
                whileTap={selectedPlayers.length === 4 ? press : undefined}
                onClick={() => handleStageSelected()}
                disabled={selectedPlayers.length !== 4}
                className={`${selectedPlayers.length === 4 ? "anim-ready" : ""} relative h-10 shrink-0 rounded-full border border-mint/30 bg-white/8 px-4 text-caption font-extrabold text-mint transition-all duration-200 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[''] hover:-translate-y-0.5 hover:bg-white/14 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/35 disabled:hover:translate-y-0 disabled:hover:bg-white/8`}
              >
                ตั้งเป็นเกมถัดไป
              </motion.button>
            )}

            {!nextUpPicking && (
              <motion.button
                whileTap={press}
                onClick={() => setActiveView("courts")}
                className="lime-button relative h-10 shrink-0 rounded-full px-4 text-caption font-extrabold before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[''] xl:hidden"
              >
                ไปสนาม
              </motion.button>
            )}

            <motion.button
              whileTap={press}
              onClick={() => {
                setSelectedIds(new Set());
                setNextUpPicking(false);
              }}
              className="relative h-10 shrink-0 rounded-full border border-line bg-white px-4 text-caption font-bold text-ink-2 shadow-sm transition-colors duration-200 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[''] hover:border-alert/25 hover:bg-alert-wash hover:text-alert"
            >
              ล้าง
            </motion.button>
          </div>
        </SelectionTray>
      )}
      </AnimatePresence>

      {sessionActive && (
        <MobileTabBar
          active={activeView}
          onChange={setActiveView}
          waitingCount={assignable.length}
          courtCount={courts.length}
        />
      )}

      {isAdmin && sessionActive && (
        <PlayerRegistryDrawer
          open={showRegistry}
          onClose={() => setShowRegistry(false)}
          profiles={profiles}
          sessionProfileIds={sessionProfileIds}
          sessionCreatedAt={session?.createdAt ?? 0}
        />
      )}

      {/* Read-only play history — every role, no admin gate. */}
      {sessionActive && (
        <MatchHistoryDrawer
          open={showHistory}
          onClose={() => setHistoryForSession(null)}
          matches={matches}
          players={players}
          playersById={playersById}
          session={session}
          courts={courts}
        />
      )}
    </div>
  );
}
