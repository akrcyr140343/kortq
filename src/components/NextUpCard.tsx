"use client";

import { motion } from "framer-motion";
import type { Player } from "@/lib/types";
import { SkillBadge } from "./SkillBadge";
import { press, staggerDelay } from "./motion";
import { E2 } from "./ui";

/**
 * One team of the staged next game. Mirrors CourtCard's `Side`: while editing
 * (admin, pre-promote) each chip is a touch target for swap/substitute, plus a
 * small ✕ to drop the player back to the queue. Members see static chips.
 */
function NextUpSide({
  players,
  label,
  align,
  isAdmin,
  selectedId,
  warnCount,
  onPlayerTap,
  onRemove,
}: {
  players: Player[];
  label: string;
  align: "left" | "right";
  isAdmin: boolean;
  selectedId: string | null;
  warnCount: number; // finished games this team's pair already played together (0 = none)
  onPlayerTap: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const right = align === "right";
  const warn = warnCount > 0;
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2.5 ${right ? "items-end" : "items-start"}`}>
      <span className={`rounded-full px-2.5 py-1 text-eyebrow font-extrabold ${right ? "bg-sky-wash text-sky-deep" : "bg-coral-wash text-coral-deep"}`}>{label}</span>
      <div className="flex w-full flex-col gap-2">
        {players.map((p, i) => {
          const chosen = selectedId === p.id;
          return (
            <motion.div
              key={p.id}
              whileTap={isAdmin ? press : undefined}
              onClick={isAdmin ? () => onPlayerTap(p.id) : undefined}
              style={staggerDelay(i, 0.06)}
              className={`anim-pop flex min-h-11 min-w-0 items-center gap-2 rounded-[13px] border px-2.5 py-2 shadow-[0_8px_18px_-16px_rgba(32,35,63,0.45)] transition-all duration-150 ${
                right ? "flex-row-reverse" : ""
              } ${
                chosen
                  ? "border-accent bg-accent-wash ring-2 ring-accent"
                  : warn
                    ? "border-amber-300 bg-amber-50 ring-1 ring-amber-300"
                    : "border-white/80 bg-white/72"
              } ${isAdmin ? "cursor-pointer" : ""}`}
            >
              <SkillBadge skill={p.skill} />
              {/* Name is the priority datum. On narrow mobile (two teams share a
                  row) it keeps full size and wraps to 2 lines before truncating,
                  with "· N เกม" demoted to a quieter line below. From sm up there
                  is room, so it collapses back to the original single inline row. */}
              <div
                className={`flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2 ${
                  right ? "items-end sm:flex-row-reverse sm:justify-end" : "items-start"
                }`}
              >
                <span
                  className={`line-clamp-2 text-body font-extrabold leading-tight text-ink [overflow-wrap:anywhere] sm:line-clamp-none sm:min-w-0 sm:flex-1 sm:truncate ${
                    right ? "text-right sm:text-left" : ""
                  }`}
                >
                  {p.name}
                </span>
                {/* Finished-games count — always shown (incl. 0), quieter than the
                    name and never truncated. Sits before the ✕. */}
                <span className="shrink-0 text-eyebrow font-semibold tabular-nums text-ink-4">· {p.gamesPlayed ?? 0} เกม</span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  aria-label="เอาออกจากเกมถัดไป"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(p.id);
                  }}
                  className="group -my-2 grid h-11 w-11 shrink-0 place-items-center text-ink-4"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full transition-colors duration-200 group-hover:bg-alert-wash group-hover:text-alert">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
      {/* Repeat-teammate warning — advisory only, never blocks promote/swap. */}
      {warn && (
        <span className={`flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[0.6rem] font-bold text-amber-700 ring-1 ring-amber-200 ${right ? "self-end" : "self-start"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />คู่ซ้ำ · เคยคู่กัน {warnCount} เกม
        </span>
      )}
    </div>
  );
}

export function NextUpCard({
  isAdmin,
  teamA,
  teamB,
  count,
  pairWarn,
  selectedId,
  canStageFair,
  canCreate,
  picking,
  swapActive,
  onStageFair,
  onStartManual,
  onCancelManual,
  onClear,
  onPlayerTap,
  onRemovePlayer,
}: {
  isAdmin: boolean;
  teamA: Player[];
  teamB: Player[];
  count: number;
  pairWarn?: (ids: string[]) => number; // finished games this team's pair already played together
  selectedId: string | null;
  canStageFair: boolean; // enough players in the queue to form a game (≥4)
  canCreate: boolean; // every court is already filled → Next Up may be created
  picking: boolean; // manual "เลือกเอง" mode: admin is picking 4 from the queue
  swapActive: boolean; // a Next Up player is picked, awaiting a second tap
  onStageFair: () => void;
  onStartManual: () => void;
  onCancelManual: () => void;
  onClear: () => void;
  onPlayerTap: (id: string) => void;
  onRemovePlayer: (id: string) => void;
}) {
  const empty = count === 0;
  const complete = count === 4;
  // Next Up is always pre-game, so the repeat-teammate warning applies whenever
  // a side holds a full pair (advisory only — never blocks promote).
  const warnA = pairWarn ? pairWarn(teamA.map((p) => p.id)) : 0;
  const warnB = pairWarn ? pairWarn(teamB.map((p) => p.id)) : 0;

  return (
    <section className={`${E2} anim-enter shrink-0 overflow-hidden rounded-[24px] p-4 ${empty ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.72fr)] lg:items-center lg:gap-4" : ""}`} style={staggerDelay(2)}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between gap-3 ${empty ? "mb-3 lg:mb-0" : "mb-3"}`}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint-wash text-2xl shadow-sm ring-1 ring-inset ring-mint/20">🏸</span>
          <div>
            <span className="section-heading block text-sm text-ink">เกมถัดไป</span>
            <span className="mt-0.5 block text-[0.66rem] font-medium text-ink-3">
              {empty ? "ยังไม่ได้กำหนด" : complete ? "พร้อมส่งลงคอร์ตที่ว่าง" : "จัดเตรียมอยู่"}
            </span>
          </div>
        </div>
        <span
          className={`numeral grid h-10 min-w-10 place-items-center rounded-[14px] px-2 text-lede leading-none ring-1 ring-inset ${
            complete ? "bg-mint-wash text-mint-deep ring-mint/25" : "bg-accent-wash text-accent ring-accent/20"
          }`}
        >
          {count}/4
        </span>
      </div>

      {empty ? (
        isAdmin ? (
          !canCreate ? (
            // Gate (rule 1): can't book a next game until every court is filled.
            <div className="rounded-[18px] border border-dashed border-accent/20 bg-accent-wash/50 px-4 py-6 text-center">
              <p className="text-body font-extrabold text-ink-2">จัดผู้เล่นลงคอร์ตให้ครบก่อน</p>
              <p className="mt-1 text-caption text-ink-3">จึงจะตั้งเกมถัดไปได้</p>
            </div>
          ) : picking ? (
            // Manual "เลือกเอง" flow: pick 4 from the queue, confirm in the bar.
            <div className="space-y-2.5">
              <p className="rounded-[12px] bg-accent-wash px-3 py-2 text-[0.68rem] font-semibold leading-relaxed text-accent-deep">
                แตะเลือก 4 คนจากคิว แล้วกด “ตั้งเป็นเกมถัดไป” ด้านล่าง
              </p>
              <motion.button
                whileTap={press}
                onClick={onCancelManual}
                className="h-11 w-full rounded-[14px] border border-line bg-white/80 text-caption font-bold text-ink-3 transition-all duration-200 hover:border-alert/30 hover:bg-alert-wash hover:text-alert"
              >
                ยกเลิกการเลือก
              </motion.button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <motion.button
                whileTap={canStageFair ? press : undefined}
                onClick={canStageFair ? onStageFair : undefined}
                disabled={!canStageFair}
                className="shine-button flex h-12 w-full items-center justify-between rounded-[15px] bg-gradient-to-r from-accent to-accent-2 px-4 text-white shadow-[0_12px_24px_-14px_rgba(108,92,231,0.8)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none"
              >
                <span className="text-caption font-bold">จับแฟร์</span>
                <span className="text-eyebrow opacity-70">เลือกให้ 4 คน · แบ่งทีม</span>
              </motion.button>
              <motion.button
                whileTap={canStageFair ? press : undefined}
                onClick={canStageFair ? onStartManual : undefined}
                disabled={!canStageFair}
                className="flex h-12 w-full items-center justify-between rounded-[15px] border border-accent/25 bg-accent-wash px-4 text-accent-deep transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-ink-4"
              >
                <span className="text-caption font-bold">เลือกเอง</span>
                <span className="text-eyebrow opacity-70">เลือก 4 คนจากคิว</span>
              </motion.button>
              {!canStageFair && (
                <p className="px-1 text-[0.68rem] leading-relaxed text-ink-4">ต้องมีในคิวอย่างน้อย 4 คนก่อนนะ</p>
              )}
            </div>
          )
        ) : (
          <div className="rounded-[18px] border border-dashed border-accent/20 bg-accent-wash/50 px-4 py-6 text-center">
            <p className="text-body font-extrabold text-ink-2">แอดมินยังไม่ได้กำหนดเกมถัดไป</p>
            <p className="mt-1 text-caption text-ink-3">รอประกาศชุดถัดไปได้เลย</p>
          </div>
        )
      ) : (
        <>
          <div className="flex items-start gap-3">
            <NextUpSide
              players={teamA}
              label="ทีม A"
              align="left"
              isAdmin={isAdmin}
              selectedId={selectedId}
              warnCount={warnA}
              onPlayerTap={onPlayerTap}
              onRemove={onRemovePlayer}
            />
            <div className="w-px self-stretch bg-gradient-to-b from-transparent via-line-2 to-transparent" />
            <NextUpSide
              players={teamB}
              label="ทีม B"
              align="right"
              isAdmin={isAdmin}
              selectedId={selectedId}
              warnCount={warnB}
              onPlayerTap={onPlayerTap}
              onRemove={onRemovePlayer}
            />
          </div>

          {!complete && (
            <p className="mt-3 rounded-[12px] bg-alert-wash px-3 py-2 text-[0.68rem] font-semibold text-alert">
              ผู้เล่นไม่ครบ ({count}/4){isAdmin ? " · แตะคนในคิวเพื่อเพิ่ม" : ""}
            </p>
          )}

          {isAdmin && (
            <>
              <p className="mt-3 rounded-[12px] bg-accent-wash px-3 py-2 text-[0.66rem] font-semibold leading-relaxed text-accent-deep">
                {swapActive
                  ? "แตะอีกคนในเกมถัดไปเพื่อสลับทีม หรือแตะคนในคิวเพื่อเปลี่ยนตัว"
                  : "แตะผู้เล่นเพื่อสลับทีม / เปลี่ยนตัว · ✕ เพื่อเอาออก"}
              </p>
              <div className="mt-2.5 flex gap-2">
                <motion.button
                  whileTap={press}
                  onClick={onClear}
                  className="h-11 flex-1 rounded-[14px] border border-line bg-white/80 text-caption font-bold text-ink-3 transition-all duration-200 hover:border-alert/30 hover:bg-alert-wash hover:text-alert"
                >
                  ล้างเกมถัดไป
                </motion.button>
                <motion.button
                  whileTap={canStageFair ? press : undefined}
                  onClick={canStageFair ? onStageFair : undefined}
                  disabled={!canStageFair}
                  className="h-11 flex-1 rounded-[14px] border border-accent/25 bg-accent-wash text-caption font-bold text-accent-deep transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-ink-4"
                >
                  จับแฟร์ใหม่
                </motion.button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
