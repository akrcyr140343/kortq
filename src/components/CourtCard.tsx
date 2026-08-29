"use client";

import type { Court, Player } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";

function teamScore(ids: string[], byId: Map<string, Player>): number {
  return ids.reduce((total, id) => total + (byId.get(id)?.score ?? 0), 0);
}

function TeamColumn({
  ids,
  byId,
  label,
}: {
  ids: string[];
  byId: Map<string, Player>;
  label: string;
}) {
  return (
    <div className="flex-1">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <span>{label}</span>
        <span className="text-neutral-400">{teamScore(ids, byId)} แต้ม</span>
      </div>
      <div className="space-y-2">
        {ids.map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            <div key={id} className="flex items-center gap-2 rounded-xl bg-neutral-800/70 px-3 py-2">
              <SkillBadge skill={p.skill} />
              <span className="truncate text-sm font-medium">{p.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CourtCard({
  court,
  byId,
  isAdmin,
  waitingCount,
  selectedCount,
  onAuto,
  onAssignSelected,
  onFinish,
}: {
  court: Court;
  byId: Map<string, Player>;
  isAdmin: boolean;
  waitingCount: number;
  selectedCount: number;
  onAuto: (courtId: string) => void;
  onAssignSelected: (courtId: string) => void;
  onFinish: (courtId: string) => void;
}) {
  const occupied = court.teamA.length + court.teamB.length > 0;

  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 ${
        occupied ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/10 bg-neutral-900/50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">คอร์ต {court.index}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            occupied ? "bg-emerald-500/20 text-emerald-300" : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {occupied ? "กำลังเล่น" : "ว่าง"}
        </span>
      </div>

      {occupied ? (
        <>
          <div className="flex items-stretch gap-3">
            <TeamColumn ids={court.teamA} byId={byId} label="ทีม A" />
            <div className="flex items-center text-sm font-bold text-neutral-600">VS</div>
            <TeamColumn ids={court.teamB} byId={byId} label="ทีม B" />
          </div>
          {isAdmin && (
            <button
              onClick={() => onFinish(court.id)}
              className="mt-4 h-12 w-full rounded-xl bg-neutral-800 text-sm font-bold active:bg-neutral-700"
            >
              จบเกม → คืนสู่คิว
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4">
          <p className="text-sm text-neutral-500">คอร์ตว่าง</p>
          {isAdmin && (
            <div className="w-full space-y-2">
              <button
                onClick={() => onAuto(court.id)}
                disabled={waitingCount < 4}
                className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-bold text-neutral-950 active:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
              >
                จับอัตโนมัติ (4 คนแรกในคิว)
              </button>
              {selectedCount >= 2 && (
                <button
                  onClick={() => onAssignSelected(court.id)}
                  className="h-12 w-full rounded-xl border border-sky-500/40 bg-sky-500/10 text-sm font-bold text-sky-300 active:bg-sky-500/20"
                >
                  ลงคอร์ตนี้ ({selectedCount} คนที่เลือก)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
