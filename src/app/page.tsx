"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { useKortq } from "@/hooks/useKortq";
import {
  assignToCourt,
  autoAssign,
  randomAssign,
  deletePlayer,
  endSession,
  finishGame,
  setPlayerResting,
} from "@/lib/db";
import { Header } from "@/components/Header";
import { StartSession } from "@/components/StartSession";
import { CourtCard } from "@/components/CourtCard";
import { QueuePanel } from "@/components/QueuePanel";

export default function Home() {
  const { isAdmin } = useAdmin();
  const { loading, error, session, courts, waiting, resting, players, playersById } = useKortq();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sessionActive = session?.active ?? false;

  // Drop any selected ids that are no longer waiting (assigned/removed/paused).
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const waitingIds = new Set(waiting.map((p) => p.id));
      const next = new Set([...prev].filter((id) => waitingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [waiting]);

  // Clear selection entirely when admin locks or the session ends.
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
    if (!window.confirm("จบ session และล้างผู้เล่น/คอร์ตทั้งหมด?")) return;
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

  const handleRest = useCallback((id: string) => setPlayerResting(id, true), []);
  const handleResume = useCallback((id: string) => setPlayerResting(id, false), []);
  const handleDelete = useCallback((id: string) => deletePlayer(id), []);

  return (
    <div className="flex min-h-full flex-col">
      <Header session={session} onEndSession={handleEndSession} />

      {error ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg shadow-slate-200/60">
            <div className="text-4xl">⚠️</div>
            <h2 className="mt-3 text-lg font-extrabold text-slate-800">เชื่อมต่อไม่สำเร็จ</h2>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 h-12 w-full rounded-2xl bg-emerald-500 text-base font-bold text-white transition active:scale-[0.98] hover:bg-emerald-600"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
          <span>กำลังโหลด…</span>
        </div>
      ) : !sessionActive ? (
        <StartSession />
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 gap-6 p-4 lg:grid lg:grid-cols-[1fr_360px]">
          {/* Courts */}
          <section className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">คอร์ต</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {courts.map((court) => (
                <CourtCard
                  key={court.id}
                  court={court}
                  byId={playersById}
                  isAdmin={isAdmin}
                  waitingCount={waiting.length}
                  selectedCount={selectedIds.size}
                  onAuto={handleAuto}
                  onRandom={handleRandom}
                  onAssignSelected={handleAssignSelected}
                  onFinish={handleFinish}
                />
              ))}
            </div>
          </section>

          {/* Queue — stacked below on phones, sidebar on iPad landscape */}
          <aside className="mt-6 lg:mt-0">
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
        </main>
      )}

      {/* Sticky selection bar for manual matchmaking */}
      {isAdmin && sessionActive && selectedIds.size > 0 && (
        <div className="animate-fade-in sticky bottom-0 z-20 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <span className="text-sm font-bold text-sky-700">
              เลือกแล้ว {selectedIds.size}/4 คน — แตะปุ่ม &quot;ลงคอร์ตนี้&quot; บนคอร์ตว่าง
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-10 shrink-0 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600 transition active:scale-95 hover:bg-slate-200"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
