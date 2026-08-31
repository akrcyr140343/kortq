"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Player } from "@/lib/types";
import { resetPayments, setPlayerPaid, setSessionFee } from "@/lib/db";
import { SkillBadge } from "./SkillBadge";
import { press } from "./motion";

const FEE_PRESETS = [80, 100, 120, 150];
const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

type Filter = "all" | "unpaid";

export function PaymentDrawer({
  open,
  onClose,
  players,
  feePerHead,
}: {
  open: boolean;
  onClose: () => void;
  players: Player[];
  feePerHead: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [feeInput, setFeeInput] = useState(String(feePerHead || ""));

  // Portal target (document.body) only exists on the client.
  useEffect(() => setMounted(true), []);

  // Keep the fee field in step with the live session value (fresh session,
  // or an edit made on another device).
  useEffect(() => setFeeInput(feePerHead ? String(feePerHead) : ""), [feePerHead]);

  // Lock background scroll + allow Esc to close while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const fee = feePerHead || 0;

  const { paidCount, total, received, totalDue, remainingCount } = useMemo(() => {
    const total = players.length;
    const paidCount = players.filter((p) => p.paid).length;
    return {
      total,
      paidCount,
      received: paidCount * fee,
      totalDue: total * fee,
      remainingCount: total - paidCount,
    };
  }, [players, fee]);

  // Unpaid float to the top so the admin's "who still owes" list is the default
  // reading order; the search + filter narrow it further.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => (filter === "unpaid" ? !p.paid : true))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => Number(a.paid ?? false) - Number(b.paid ?? false));
  }, [players, filter, search]);

  const pct = total > 0 ? Math.round((paidCount / total) * 100) : 0;

  function commitFee() {
    const n = parseInt(feeInput, 10);
    const next = Number.isFinite(n) ? Math.max(0, n) : 0;
    if (next !== fee) setSessionFee(next);
  }

  function applyPreset(n: number) {
    setFeeInput(String(n));
    if (n !== fee) setSessionFee(n);
  }

  function handleReset() {
    if (!window.confirm("ล้างสถานะการจ่ายของทุกคน?")) return;
    resetPayments(players);
  }

  if (!mounted) return null;

  const drawer = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="absolute inset-y-0 right-0 flex h-full w-full flex-col bg-canvas shadow-[0_0_60px_-10px_rgba(16,35,24,0.5)] sm:max-w-md"
          >
            {/* ── Header strip ─────────────────────────────────────── */}
            <div className="club-panel relative shrink-0 overflow-hidden px-5 pb-5 pt-5">
              <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-mint/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <span className="text-[0.64rem] font-extrabold tracking-[0.16em] text-mint">เก็บค่าคอร์ต</span>
                  <h2 className="display mt-1.5 text-h3 leading-none text-white">ใครจ่ายแล้วบ้าง</h2>
                </div>
                <motion.button
                  whileTap={press}
                  onClick={onClose}
                  aria-label="ปิด"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/8 text-white transition-colors duration-200 hover:bg-white/16"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </div>

              {/* Progress — proof of "ครบหรือยัง" at a glance */}
              <div className="relative mt-5 flex items-end justify-between">
                <div>
                  <span className="numeral text-h2 leading-none text-white">
                    {baht(received)}
                  </span>
                  <span className="ml-1.5 text-caption font-semibold text-white/55">
                    / {baht(totalDue)}
                  </span>
                </div>
                <span className="text-caption font-bold text-mint">
                  {paidCount}/{total} คน
                </span>
              </div>
              <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mint to-[#d6ff7a] transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* ── Fee setter ───────────────────────────────────────── */}
            <div className="shrink-0 border-b border-line px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block text-sm font-extrabold text-ink">ราคาต่อคน</span>
                  <span className="mt-0.5 block text-[0.68rem] text-ink-3">หารเท่ากันทุกคนในก๊วน</span>
                </div>
                <div className="flex items-center rounded-[14px] border border-line bg-surface-2 px-3 focus-within:border-accent/45 focus-within:bg-white">
                  <span className="text-lede font-bold text-ink-3">฿</span>
                  <input
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={commitFee}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    inputMode="numeric"
                    placeholder="0"
                    maxLength={5}
                    className="numeral h-11 w-20 bg-transparent text-right text-lede text-ink outline-none placeholder:text-ink-4"
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {FEE_PRESETS.map((n) => {
                  const active = fee === n;
                  return (
                    <motion.button
                      key={n}
                      whileTap={press}
                      onClick={() => applyPreset(n)}
                      className={`h-9 rounded-[11px] text-caption font-extrabold transition-all duration-200 ${
                        active
                          ? "bg-accent text-mint shadow-sm"
                          : "bg-surface-2 text-ink-3 hover:bg-white hover:text-ink hover:shadow-sm"
                      }`}
                    >
                      {n}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── Filter + search ──────────────────────────────────── */}
            <div className="flex shrink-0 items-center gap-2 px-5 pb-3 pt-4">
              <div className="flex rounded-[13px] bg-surface-2 p-1">
                {(["all", "unpaid"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`h-9 rounded-[10px] px-3 text-caption font-bold transition-all duration-200 ${
                      filter === f ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    {f === "all" ? "ทั้งหมด" : `ค้างจ่าย ${remainingCount > 0 ? remainingCount : ""}`}
                  </button>
                ))}
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ…"
                className="h-11 min-w-0 flex-1 rounded-[13px] border border-line bg-surface-2 px-3.5 text-caption font-semibold text-ink outline-none transition-all duration-200 placeholder:font-normal placeholder:text-ink-4 focus:border-accent/45 focus:bg-white"
              />
            </div>

            {/* ── Roster ───────────────────────────────────────────── */}
            <div className="scroll-pane min-h-0 flex-1 overflow-y-auto px-5 pb-3">
              {shown.length === 0 ? (
                <div className="mt-8 rounded-[18px] border border-dashed border-line-2 bg-surface-2 px-4 py-10 text-center">
                  <p className="text-body font-extrabold text-ink-2">
                    {total === 0
                      ? "ยังไม่มีผู้เล่นในก๊วน"
                      : filter === "unpaid"
                        ? "เก็บครบทุกคนแล้ว 🎉"
                        : "ไม่พบชื่อที่ค้นหา"}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {shown.map((p) => (
                    <PaymentRow key={p.id} player={p} fee={fee} />
                  ))}
                </ul>
              )}
            </div>

            {/* ── Footer ───────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-line bg-white/70 px-5 py-3.5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {remainingCount > 0 ? (
                    <>
                      <span className="block text-caption font-extrabold text-ink">
                        เหลือเก็บอีก {remainingCount} คน
                      </span>
                      <span className="mt-0.5 block text-[0.68rem] text-ink-3">
                        รวม {baht(remainingCount * fee)}
                      </span>
                    </>
                  ) : (
                    <span className="block text-caption font-extrabold text-mint-deep">
                      ครบแล้วทุกคน · {baht(received)}
                    </span>
                  )}
                </div>
                <motion.button
                  whileTap={press}
                  onClick={handleReset}
                  disabled={paidCount === 0}
                  className="h-10 shrink-0 rounded-full border border-line bg-white px-4 text-caption font-bold text-ink-3 transition-colors duration-200 hover:border-alert/25 hover:bg-alert-wash hover:text-alert disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-white disabled:hover:text-ink-3"
                >
                  ล้างสถานะ
                </motion.button>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(drawer, document.body);
}

/** One settle row. The whole row is the toggle — a big courtside tap target. */
function PaymentRow({ player, fee }: { player: Player; fee: number }) {
  const paid = player.paid ?? false;
  return (
    <li>
      <motion.button
        whileTap={press}
        onClick={() => setPlayerPaid(player.id, !paid)}
        className={`flex w-full items-center gap-3 rounded-[16px] border py-2.5 pl-3 pr-2.5 text-left transition-all duration-200 ${
          paid
            ? "border-mint-deep/20 bg-mint-wash"
            : "border-line bg-surface-2 hover:border-accent/15 hover:bg-white hover:shadow-sm"
        }`}
      >
        {/* Check mark — pops in on paid, hollow ring while owing */}
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
            paid ? "bg-mint text-accent-deep" : "border-2 border-line-2 bg-white"
          }`}
        >
          {paid && (
            <svg viewBox="0 0 24 24" className="anim-pop h-4 w-4" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <span className={`min-w-0 flex-1 truncate text-body font-bold ${paid ? "text-mint-deep" : "text-ink"}`}>
          {player.name}
        </span>

        <SkillBadge skill={player.skill} />

        <span className={`numeral shrink-0 text-caption tabular-nums ${paid ? "text-mint-deep/70" : "text-ink-3"}`}>
          {fee > 0 ? baht(fee) : "—"}
        </span>
      </motion.button>
    </li>
  );
}
