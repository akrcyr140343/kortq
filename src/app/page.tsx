"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { useKortq } from "@/hooks/useKortq";
import {
  assignToCourt,
  autoAssign,
  fairAssign,
  randomAssign,
  deletePlayer,
  endSession,
  finishGame,
  removeFromCourt,
  setPlayerResting,
} from "@/lib/db";
import { Header } from "@/components/Header";
import { StartSession } from "@/components/StartSession";
import { CourtCard } from "@/components/CourtCard";
import { QueuePanel } from "@/components/QueuePanel";
import { PaymentDrawer } from "@/components/PaymentDrawer";
import { SkillBadge } from "@/components/SkillBadge";
import { press } from "@/components/motion";
import { E2 } from "@/components/ui";

/* ══ Scoreboard band — figures carry the meaning, no icons ═════════ */
function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="e1 group relative w-[7.4rem] shrink-0 overflow-hidden rounded-[18px] px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-auto">
      <span className="block truncate text-[0.68rem] font-bold text-ink-3">{label}</span>
      <span className="numeral mt-1 block text-title leading-none text-ink">{value}</span>
      <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-mint/45" />
    </div>
  );
}

function StatBand({
  totalPlayers,
  waiting,
  playing,
  resting,
  games,
  courtsActive,
  totalCourts,
}: {
  totalPlayers: number;
  waiting: number;
  playing: number;
  resting: number;
  games: number;
  courtsActive: number;
  totalCourts: number;
}) {
  return (
    <div className="scroll-pane anim-enter flex shrink-0 gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-6">
      <Stat label="ผู้เล่นทั้งหมด" value={totalPlayers} />
      <Stat label="กำลังรอ" value={waiting} />
      <Stat label="ลงสนาม" value={playing} />
      <Stat label="นั่งพัก" value={resting} />
      <Stat label="เล่นแล้ว" value={games} />
      <Stat label="คอร์ตใช้งาน" value={`${courtsActive}/${totalCourts}`} />
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
    <nav className="app-bottom-nav fixed inset-x-3 z-50 mx-auto max-w-sm lg:hidden" aria-label="เมนูหลัก">
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
                selected ? "bg-mint text-accent-deep shadow-sm" : "text-white/55 hover:bg-white/8 hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`numeral grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.62rem] ${selected ? "bg-accent/10" : "bg-white/10"}`}>
                {tab.count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export default function Home() {
  const { isAdmin } = useAdmin();
  const { loading, error, session, courts, matches, waiting, resting, players, playersById } = useKortq();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPayments, setShowPayments] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("courts");

  const sessionActive = session?.active ?? false;

  // Never leave the payment drawer open outside an admin session.
  useEffect(() => {
    if (!isAdmin || !sessionActive) setShowPayments(false);
  }, [isAdmin, sessionActive]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const waitingIds = new Set(waiting.map((p) => p.id));
      const next = new Set([...prev].filter((id) => waitingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [waiting]);

  useEffect(() => {
    if (!isAdmin || !sessionActive) setSelectedIds(new Set());
  }, [isAdmin, sessionActive]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }, []);

  const handleEndSession = useCallback(async () => {
    if (!window.confirm("ปิดสนามและล้างผู้เล่น/คอร์ตทั้งหมด?")) return;
    await endSession();
  }, []);

  const handleAuto = useCallback(
    async (courtId: string) => {
      try {
        await autoAssign(courtId, waiting);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "จับคู่อัตโนมัติไม่สำเร็จ");
      }
    },
    [waiting],
  );

  const handleRandom = useCallback(
    async (courtId: string) => {
      try {
        await randomAssign(courtId, waiting);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "สุ่มผู้เล่นไม่สำเร็จ");
      }
    },
    [waiting],
  );

  const handleFair = useCallback(
    async (courtId: string) => {
      try {
        await fairAssign(courtId, waiting, matches);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "จับแฟร์ไม่สำเร็จ");
      }
    },
    [waiting, matches],
  );

  const handleAssignSelected = useCallback(
    async (courtId: string) => {
      const chosen = waiting.filter((p) => selectedIds.has(p.id));
      if (chosen.length < 2) return;
      await assignToCourt(courtId, chosen);
      setSelectedIds(new Set());
    },
    [waiting, selectedIds],
  );

  const handleFinish = useCallback(
    async (courtId: string) => {
      const onCourt = players.filter((p) => p.courtId === courtId && p.status === "playing");
      await finishGame(courtId, onCourt);
    },
    [players],
  );

  const handleRemove = useCallback(
    async (courtId: string) => {
      const onCourt = players.filter((p) => p.courtId === courtId && p.status === "playing");
      await removeFromCourt(courtId, onCourt);
    },
    [players],
  );

  const handleRest = useCallback((id: string) => setPlayerResting(id, true), []);
  const handleResume = useCallback((id: string) => setPlayerResting(id, false), []);
  const handleDelete = useCallback((id: string) => deletePlayer(id), []);

  const playingCount = players.filter((p) => p.status === "playing").length;
  const totalGamesPlayed = Math.floor(
    players.reduce((sum, p) => sum + (p.gamesPlayed ?? 0), 0) / 4,
  );
  const activeCourts = courts.filter((c) => c.teamA.length + c.teamB.length > 0).length;
  const unpaidCount = players.filter((p) => !(p.paid ?? false)).length;

  const selectedPlayers = useMemo(
    () => waiting.filter((p) => selectedIds.has(p.id)),
    [waiting, selectedIds],
  );

  return (
    <div className="soft-grid flex min-h-dvh flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <Header
        session={session}
        onEndSession={handleEndSession}
        onOpenPayments={() => setShowPayments(true)}
        unpaidCount={unpaidCount}
      />

      {error ? (
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
      ) : !sessionActive ? (
        <StartSession />
      ) : (
        <main className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 px-3 pb-28 pt-4 sm:px-5 lg:min-h-0 lg:pb-4">
          <StatBand
            totalPlayers={players.length}
            waiting={waiting.length}
            playing={playingCount}
            resting={resting.length}
            games={totalGamesPlayed}
            courtsActive={activeCourts}
            totalCourts={courts.length}
          />

          <div className="flex items-end justify-between lg:hidden">
            <div>
              <span className="text-[0.65rem] font-extrabold tracking-[0.14em] text-mint-deep">KD CLUB · LIVE</span>
              <h1 className="display mt-1 text-title leading-none text-ink">{activeView === "courts" ? "สนามวันนี้" : "เพื่อนในคิว"}</h1>
            </div>
            <span className="rounded-full bg-mint-wash px-3 py-1.5 text-[0.68rem] font-extrabold text-mint-deep">
              {activeView === "courts" ? `${activeCourts}/${courts.length} กำลังใช้` : `${waiting.length} คนกำลังรอ`}
            </span>
          </div>

          {/* Two independent columns: courts on the left, roster on the rail.
              Each scrolls in its own pane on large screens, so a long queue
              can never stretch the courts beside it. */}
          <div className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-12">
            <section className={`${activeView === "courts" ? "flex" : "hidden"} flex-col gap-4 lg:col-span-8 lg:flex lg:min-h-0`}>
              <div className="scroll-pane grid auto-rows-min gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1.5">
                {courts.map((court, i) => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    byId={playersById}
                    isAdmin={isAdmin}
                    waitingCount={waiting.length}
                    selectedCount={selectedIds.size}
                    onAuto={handleAuto}
                    onFair={handleFair}
                    onRandom={handleRandom}
                    onAssignSelected={handleAssignSelected}
                    onFinish={handleFinish}
                    onRemove={handleRemove}
                    index={i}
                  />
                ))}
              </div>
            </section>

            <aside className={`${activeView === "queue" ? "block" : "hidden"} lg:col-span-4 lg:block lg:min-h-0`}>
              <QueuePanel
                waiting={waiting}
                resting={resting}
                isAdmin={isAdmin}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onRest={handleRest}
                onResume={handleResume}
                onDelete={handleDelete}
              />
            </aside>
          </div>
        </main>
      )}

      {/* ── Selection bar — names, not just a count ────────────────── */}
      {isAdmin && sessionActive && selectedPlayers.length > 0 && (
        <div className="anim-rise sticky bottom-[calc(5.2rem+env(safe-area-inset-bottom))] z-30 shrink-0 px-3 pb-3 sm:px-5 lg:bottom-0">
          <div className="club-panel mx-auto flex max-w-[1700px] items-center gap-3 rounded-[22px] px-3 py-2.5 sm:px-4">
            <span className="numeral grid h-11 min-w-11 shrink-0 place-items-center rounded-[15px] bg-mint text-lede leading-none text-accent-deep shadow-[0_10px_20px_-12px_rgba(121,174,12,0.8)]">
              {selectedPlayers.length}
              <span className="sr-only"> จาก 4</span>
            </span>

            <div className="scroll-pane flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {selectedPlayers.map((p) => (
                <span
                  key={p.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/8 py-1.5 pl-3 pr-2"
                >
                  <span className="text-caption font-bold text-white">{p.name}</span>
                  <SkillBadge skill={p.skill} />
                </span>
              ))}
            </div>

            <span className="hidden shrink-0 text-caption text-white/55 xl:block">
              เลือกแล้ว {selectedPlayers.length}/4 · แตะคอร์ตว่างเพื่อส่งลงสนาม
            </span>

            <motion.button
              whileTap={press}
              onClick={() => setActiveView("courts")}
              className="lime-button h-10 shrink-0 rounded-full px-4 text-caption font-extrabold lg:hidden"
            >
              ไปสนาม
            </motion.button>

            <motion.button
              whileTap={press}
              onClick={() => setSelectedIds(new Set())}
              className="h-10 shrink-0 rounded-full border border-line bg-white px-4 text-caption font-bold text-ink-2 shadow-sm transition-colors duration-200 hover:border-alert/25 hover:bg-alert-wash hover:text-alert"
            >
              ล้าง
            </motion.button>
          </div>
        </div>
      )}

      {sessionActive && (
        <MobileTabBar
          active={activeView}
          onChange={setActiveView}
          waitingCount={waiting.length}
          courtCount={courts.length}
        />
      )}

      {isAdmin && sessionActive && (
        <PaymentDrawer
          open={showPayments}
          onClose={() => setShowPayments(false)}
          players={players}
          feePerHead={session?.feePerHead ?? 0}
        />
      )}
    </div>
  );
}
