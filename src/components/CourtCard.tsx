"use client";

import type { Court, Player } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";
import { CourtTimer } from "./CourtTimer";

function TeamColumn({
  ids,
  byId,
  label,
  accent,
}: {
  ids: string[];
  byId: Map<string, Player>;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex-1">
      <div className={`mb-2 text-xs font-bold uppercase tracking-wide ${accent}`}>{label}</div>
      <div className="space-y-2">
        {ids.map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            <div
              key={id}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
            >
              <SkillBadge skill={p.skill} />
              <span className="truncate text-sm font-semibold text-slate-800">{p.name}</span>
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
  onRandom,
  onAssignSelected,
  onFinish,
}: {
  court: Court;
  byId: Map<string, Player>;
  isAdmin: boolean;
  waitingCount: number;
  selectedCount: number;
  onAuto: (courtId: string) => void;
  onRandom: (courtId: string) => void;
  onAssignSelected: (courtId: string) => void;
  onFinish: (courtId: string) => void;
}) {
  const occupied = court.teamA.length + court.teamB.length > 0;
  const notEnough = waitingCount < 4;

  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        occupied ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-slate-800">คอร์ต {court.index}</h3>
        <div className="flex items-center gap-2">
          {occupied && court.startedAt != null && <CourtTimer startedAt={court.startedAt} />}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
              occupied ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {occupied && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-live" />}
            {occupied ? "กำลังเล่น" : "ว่าง"}
          </span>
        </div>
      </div>

      {occupied ? (
        <>
          <div className="flex items-stretch gap-3">
            <TeamColumn ids={court.teamA} byId={byId} label="ทีม A" accent="text-emerald-600" />
            <div className="flex items-center text-xs font-black text-slate-300">VS</div>
            <TeamColumn ids={court.teamB} byId={byId} label="ทีม B" accent="text-sky-600" />
          </div>
          {isAdmin && (
            <button
              onClick={() => onFinish(court.id)}
              className="mt-4 h-12 w-full rounded-xl bg-slate-800 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-slate-900"
            >
              จบเกม → คืนสู่คิว
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6">
          <p className="text-sm font-medium text-slate-400">คอร์ตว่าง</p>
          {isAdmin && (
            <div className="w-full space-y-2">
              <button
                onClick={() => onAuto(court.id)}
                disabled={notEnough}
                className="flex h-14 w-full flex-col items-center justify-center rounded-xl bg-emerald-500 font-bold text-white transition active:scale-[0.98] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <span className="text-sm">⚡ จับอัตโนมัติ</span>
                <span className="text-[11px] font-medium opacity-80">4 คนแรกในคิว</span>
              </button>
              <button
                onClick={() => onRandom(court.id)}
                disabled={notEnough}
                className="flex h-14 w-full flex-col items-center justify-center rounded-xl bg-indigo-500 font-bold text-white transition active:scale-[0.98] hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <span className="text-sm">🎲 สุ่มผู้เล่น</span>
                <span className="text-[11px] font-medium opacity-80">สุ่ม 4 คนจากทั้งคิว</span>
              </button>
              {selectedCount >= 2 && (
                <button
                  onClick={() => onAssignSelected(court.id)}
                  className="h-12 w-full rounded-xl border-2 border-sky-400 bg-sky-50 text-sm font-bold text-sky-700 transition active:scale-[0.98] hover:bg-sky-100"
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
