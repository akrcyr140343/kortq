"use client";

import { motion } from "framer-motion";
import type { Player, Skill } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";
import { AddPlayerForm } from "./AddPlayerForm";
import { press, staggerDelay } from "./motion";
import { E2 } from "./ui";

/** The one retained icon in the roster: destructive, and needs no label. */
function DeleteButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <motion.button
      whileTap={press}
      onClick={onClick}
      title="ลบผู้เล่น"
      aria-label="ลบผู้เล่น"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors duration-200 hover:bg-alert-wash hover:text-alert"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </motion.button>
  );
}

function TextButton({
  onClick,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={press}
      onClick={onClick}
      className="h-9 shrink-0 rounded-full px-2.5 text-eyebrow font-bold text-ink-3 transition-colors duration-200 hover:bg-accent-wash hover:text-accent-deep"
    >
      {children}
    </motion.button>
  );
}

/** Games played, stated in words instead of a game-controller icon. */
function GamesCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="shrink-0 text-eyebrow tabular-nums text-ink-4">{count} เกม</span>;
}

function WaitingRow({
  player,
  order,
  isAdmin,
  selected,
  selectable,
  pickActive,
  onToggle,
  onRest,
  onDelete,
}: {
  player: Player;
  order: number;
  isAdmin: boolean;
  selected: boolean;
  selectable: boolean;
  pickActive: boolean;
  onToggle: (id: string) => void;
  onRest: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // While a pick is in progress (court/Next Up substitution, or filling an
  // incomplete Next Up) every waiting player is a valid tap target, regardless
  // of the 2–4 selection cap that governs the normal assign flow.
  const clickable = isAdmin && (pickActive || selectable || selected);

  return (
    <li
      onClick={clickable ? () => onToggle(player.id) : undefined}
      className={`anim-enter-x relative flex items-center gap-2.5 overflow-hidden rounded-[16px] border py-2.5 pl-2.5 pr-1.5 transition-all duration-200 ${
        selected
          ? "-translate-y-0.5 border-mint-deep/25 bg-mint-wash shadow-[0_10px_20px_-16px_rgba(84,117,0,0.55)]"
          : "border-transparent bg-surface-2 hover:border-accent/12 hover:bg-white hover:shadow-sm"
      } ${clickable ? "cursor-pointer" : ""}`}
    >
      {/* Selection marker — an emerald rule, not a glow */}
      {selected && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-mint-deep" />}

      <span
        className={`numeral grid h-8 w-8 shrink-0 place-items-center rounded-[11px] text-caption ${selected ? "bg-accent text-mint" : "bg-white text-ink-3 shadow-sm"}`}
      >
        {order}
      </span>

      <span className="min-w-0 flex-1 truncate text-body font-bold text-ink">{player.name}</span>

      <SkillBadge skill={player.skill} />
      <GamesCount count={player.gamesPlayed ?? 0} />

      {isAdmin && (
        <div className="flex shrink-0 items-center">
          <TextButton
            onClick={(e) => {
              e.stopPropagation();
              onRest(player.id);
            }}
          >
            พัก
          </TextButton>
          <DeleteButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player.id);
            }}
          />
        </div>
      )}
    </li>
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
    <li className="anim-enter-x flex items-center gap-2.5 rounded-[16px] border border-dashed border-sky/25 bg-sky-wash/60 py-2.5 pl-3 pr-1.5">
      <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink-3">
        {player.name}
      </span>
      <SkillBadge skill={player.skill} />
      <GamesCount count={player.gamesPlayed ?? 0} />
      {isAdmin && (
        <div className="flex shrink-0 items-center">
          <TextButton onClick={() => onResume(player.id)}>เล่นต่อ</TextButton>
          <DeleteButton onClick={() => onDelete(player.id)} />
        </div>
      )}
    </li>
  );
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <span className="block text-sm font-extrabold text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.66rem] font-medium text-ink-3">เรียงตามเวลาที่เข้าคิว</span>
      </div>
      <span className="numeral grid h-10 min-w-10 place-items-center rounded-[14px] bg-mint-wash px-2 text-lede leading-none text-mint-deep ring-1 ring-inset ring-mint/25">{count}</span>
    </div>
  );
}

export function QueuePanel({
  waiting,
  resting,
  isAdmin,
  selectedIds,
  pickActive,
  pickLabel,
  onAddPlayer,
  onOpenRegistry,
  onToggleSelect,
  onRest,
  onResume,
  onDelete,
}: {
  waiting: Player[];
  resting: Player[];
  isAdmin: boolean;
  selectedIds: Set<string>;
  pickActive: boolean; // a tap-to-pick flow is active (court/Next Up sub or fill)
  pickLabel: string | null; // banner text for the active pick flow
  onAddPlayer: (name: string, skill: Skill) => Promise<boolean>;
  onOpenRegistry: () => void;
  onToggleSelect: (id: string) => void;
  onRest: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const selectionFull = selectedIds.size >= 4;

  return (
    <div className="anim-enter flex flex-col gap-4 lg:h-full lg:min-h-0" style={staggerDelay(3)}>
      {isAdmin && (
        <div className="shrink-0">
          <AddPlayerForm onAddPlayer={onAddPlayer} onOpenRegistry={onOpenRegistry} />
        </div>
      )}

      {/* The rail scrolls on its own so a long queue never stretches the
          courts column beside it. */}
      <div className="scroll-pane flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1.5">
        <section className={`${E2} shrink-0 rounded-[24px] p-4`}>
          <SectionHead title="คิวรอ" count={waiting.length} />

          {isAdmin && waiting.length > 0 && (
            <p
              className={`mb-3 rounded-[12px] px-3 py-2 text-[0.68rem] font-semibold ${
                pickActive ? "bg-accent-wash text-accent-deep" : "bg-mint-wash text-mint-deep"
              }`}
            >
              ● {pickActive ? pickLabel : "แตะชื่อเพื่อเลือกลงคอร์ตได้ 2–4 คน"}
            </p>
          )}

          {/* No AnimatePresence on these lists on purpose: exit animations gate
              DOM removal, and a backgrounded tab (this app lives on a courtside
              iPad) freezes the timeline — which leaves players who are already
              on court still listed in the queue. Removal must be immediate. */}
          {waiting.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-mint-deep/20 bg-gradient-to-br from-mint-wash/70 to-sky-wash/60 px-4 py-8 text-center">
              <p className="mt-3 text-body font-extrabold text-ink-2">คิวยังโล่งอยู่</p>
              <p className="mt-1 text-caption text-ink-3">เพิ่มเพื่อนคนแรกได้เลย!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {waiting.map((p, i) => (
                <WaitingRow
                  key={p.id}
                  player={p}
                  order={i + 1}
                  isAdmin={isAdmin}
                  selected={selectedIds.has(p.id)}
                  selectable={!selectionFull}
                  pickActive={pickActive}
                  onToggle={onToggleSelect}
                  onRest={onRest}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </section>

        {resting.length > 0 && (
          <section className={`${E2} shrink-0 rounded-[24px] p-4`}>
            <SectionHead title="นั่งพัก" count={resting.length} />
            <ul className="space-y-2">
              {resting.map((p) => (
                <RestingRow
                  key={p.id}
                  player={p}
                  isAdmin={isAdmin}
                  onResume={onResume}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
