"use client";

import type { Player } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";
import { AddPlayerForm } from "./AddPlayerForm";

function GamesBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
      🎮 {count}
    </span>
  );
}

function WaitingRow({
  player,
  order,
  isAdmin,
  selected,
  selectable,
  onToggle,
  onRest,
  onDelete,
}: {
  player: Player;
  order: number;
  isAdmin: boolean;
  selected: boolean;
  selectable: boolean;
  onToggle: (id: string) => void;
  onRest: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const clickable = isAdmin && (selectable || selected);
  return (
    <div
      onClick={clickable ? () => onToggle(player.id) : undefined}
      className={`animate-fade-in flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
        selected
          ? "border-sky-400 bg-sky-50 ring-1 ring-sky-300"
          : "border-slate-200 bg-white"
      } ${clickable ? "cursor-pointer hover:border-sky-300 active:scale-[0.99]" : ""}`}
    >
      <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">{order}</span>
      <SkillBadge skill={player.skill} />
      <span className="flex-1 truncate text-sm font-semibold text-slate-800">{player.name}</span>
      <GamesBadge count={player.gamesPlayed ?? 0} />
      {isAdmin && (
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRest(player.id);
            }}
            className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-600 transition active:scale-95 hover:bg-slate-200"
          >
            พัก
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player.id);
            }}
            className="h-9 rounded-lg bg-rose-50 px-3 text-xs font-bold text-rose-600 transition active:scale-95 hover:bg-rose-100"
          >
            ลบ
          </button>
        </div>
      )}
    </div>
  );
}

function RestingRow({
  player,
  isAdmin,
  onResume,
  onDelete,
}: {
  player: Player;
  isAdmin: boolean;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <SkillBadge skill={player.skill} />
      <span className="flex-1 truncate text-sm font-semibold text-slate-500">{player.name}</span>
      <GamesBadge count={player.gamesPlayed ?? 0} />
      {isAdmin && (
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => onResume(player.id)}
            className="h-9 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition active:scale-95 hover:bg-emerald-100"
          >
            กลับเข้าคิว
          </button>
          <button
            onClick={() => onDelete(player.id)}
            className="h-9 rounded-lg bg-rose-50 px-3 text-xs font-bold text-rose-600 transition active:scale-95 hover:bg-rose-100"
          >
            ลบ
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">{title}</h2>
      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
        {count}
      </span>
    </div>
  );
}

export function QueuePanel({
  waiting,
  resting,
  isAdmin,
  selectedIds,
  onToggleSelect,
  onRest,
  onResume,
  onDelete,
}: {
  waiting: Player[];
  resting: Player[];
  isAdmin: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRest: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const selectionFull = selectedIds.size >= 4;

  return (
    <div className="space-y-4">
      {isAdmin && <AddPlayerForm />}

      <section>
        <SectionHeader title={'คิว "รอ"'} count={waiting.length} />
        {isAdmin && (
          <p className="mb-2 text-xs text-slate-400">แตะผู้เล่นเพื่อเลือกลงคอร์ตเอง (เลือกได้ 2–4 คน)</p>
        )}
        {waiting.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/50 py-6 text-center text-sm text-slate-400">
            ยังไม่มีผู้เล่นในคิว
          </p>
        ) : (
          <div className="space-y-2">
            {waiting.map((p, i) => (
              <WaitingRow
                key={p.id}
                player={p}
                order={i + 1}
                isAdmin={isAdmin}
                selected={selectedIds.has(p.id)}
                selectable={!selectionFull}
                onToggle={onToggleSelect}
                onRest={onRest}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </section>

      {resting.length > 0 && (
        <section>
          <SectionHeader title="พัก" count={resting.length} />
          <div className="space-y-2">
            {resting.map((p) => (
              <RestingRow
                key={p.id}
                player={p}
                isAdmin={isAdmin}
                onResume={onResume}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
