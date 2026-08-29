"use client";

import type { Player } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";
import { AddPlayerForm } from "./AddPlayerForm";

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
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
        selected
          ? "border-sky-400 bg-sky-500/15"
          : "border-white/10 bg-neutral-800/60"
      } ${clickable ? "cursor-pointer active:bg-neutral-700/60" : ""}`}
    >
      <span className="w-5 shrink-0 text-center text-xs font-bold text-neutral-500">{order}</span>
      <SkillBadge skill={player.skill} />
      <span className="flex-1 truncate text-sm font-medium">{player.name}</span>
      {isAdmin && (
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRest(player.id);
            }}
            className="h-9 rounded-lg bg-neutral-700 px-3 text-xs font-semibold text-neutral-200 active:bg-neutral-600"
          >
            พัก
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player.id);
            }}
            className="h-9 rounded-lg bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 active:bg-rose-500/25"
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
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-neutral-900/60 px-3 py-2 opacity-70">
      <SkillBadge skill={player.skill} />
      <span className="flex-1 truncate text-sm font-medium">{player.name}</span>
      {isAdmin && (
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => onResume(player.id)}
            className="h-9 rounded-lg bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-300 active:bg-emerald-500/25"
          >
            กลับเข้าคิว
          </button>
          <button
            onClick={() => onDelete(player.id)}
            className="h-9 rounded-lg bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 active:bg-rose-500/25"
          >
            ลบ
          </button>
        </div>
      )}
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">
            คิว &quot;รอ&quot;
          </h2>
          <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-bold text-neutral-300">
            {waiting.length}
          </span>
        </div>
        {isAdmin && (
          <p className="mb-2 text-xs text-neutral-500">
            แตะผู้เล่นเพื่อเลือกลงคอร์ตเอง (เลือกได้ 2–4 คน)
          </p>
        )}
        {waiting.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 py-6 text-center text-sm text-neutral-500">
            ยังไม่มีผู้เล่นในคิว
          </p>
        ) : (
          <div className="space-y-2">
            {waiting.map((p, i) => {
              const selected = selectedIds.has(p.id);
              return (
                <WaitingRow
                  key={p.id}
                  player={p}
                  order={i + 1}
                  isAdmin={isAdmin}
                  selected={selected}
                  selectable={!selectionFull}
                  onToggle={onToggleSelect}
                  onRest={onRest}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        )}
      </section>

      {resting.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">พัก</h2>
            <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-bold text-neutral-300">
              {resting.length}
            </span>
          </div>
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
