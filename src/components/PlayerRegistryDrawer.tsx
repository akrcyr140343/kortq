"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { type Profile, type Skill, SKILLS, normalizeNameKey } from "@/lib/types";
import {
  addPlayerFromProfile,
  addPlayersFromProfiles,
  deleteProfile,
  updateProfileSkill,
} from "@/lib/db";
import { useModal } from "@/context/ModalContext";
import { SkillBadge } from "./SkillBadge";
import { press } from "./motion";

/** Segmented rank control — mirrors AddPlayerForm's active-chip hues. */
const ACTIVE_TIER: Record<Skill, string> = {
  NB: "bg-slate-500 text-white shadow-sm",
  BG: "bg-sky text-white shadow-sm",
  N: "bg-mint text-accent-deep shadow-sm",
  S: "bg-coral text-white shadow-sm",
};

/** Relative "last joined" label, coarse on purpose. */
function lastSeen(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 30) return `${days} วันก่อน`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือนก่อน`;
  return `${Math.floor(months / 12)} ปีก่อน`;
}

export function PlayerRegistryDrawer({
  open,
  onClose,
  profiles,
  sessionProfileIds,
  sessionCreatedAt,
}: {
  open: boolean;
  onClose: () => void;
  profiles: Profile[]; // pre-sorted (most frequent first)
  sessionProfileIds: Set<string>; // profileIds already in today's session
  sessionCreatedAt: number;
}) {
  const modal = useModal();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset transient UI whenever the drawer closes.
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(new Set());
      setEditingId(null);
    }
  }, [open]);

  // Lock background scroll + Esc to close while open.
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

  // Keep the selection valid as profiles/session change under us.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const ok = new Set(profiles.map((p) => p.id));
      const next = new Set([...prev].filter((id) => ok.has(id) && !sessionProfileIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [profiles, sessionProfileIds]);

  const shown = useMemo(() => {
    const q = normalizeNameKey(search);
    return q ? profiles.filter((p) => p.nameKey.includes(q)) : profiles;
  }, [profiles, search]);

  async function addOne(id: string) {
    if (sessionProfileIds.has(id) || busy) return;
    setBusy(true);
    try {
      await addPlayerFromProfile(id, sessionCreatedAt);
    } catch (e) {
      await modal.alert({ title: "เพิ่มไม่สำเร็จ", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function addSelected() {
    const ids = [...selected].filter((id) => !sessionProfileIds.has(id));
    if (ids.length === 0 || busy) return;
    setBusy(true);
    try {
      await addPlayersFromProfiles(ids, sessionCreatedAt);
      setSelected(new Set());
    } catch (e) {
      await modal.alert({ title: "เพิ่มไม่สำเร็จ", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function changeSkill(id: string, skill: Skill) {
    setEditingId(null);
    try {
      await updateProfileSkill(id, skill);
    } catch {
      await modal.alert({ title: "แก้ระดับไม่สำเร็จ" });
    }
  }

  async function remove(p: Profile) {
    const ok = await modal.confirm({
      title: `ลบ ${p.name} ออกจากก๊วน?`,
      message: "ลบถาวร ถ้ากลับมาอีกจะถือเป็นคนใหม่",
      confirmLabel: "ลบ",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteProfile(p.id);
    } catch {
      await modal.alert({ title: "ลบไม่สำเร็จ" });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!mounted) return null;

  const selectableCount = [...selected].filter((id) => !sessionProfileIds.has(id)).length;

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
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="club-panel relative shrink-0 overflow-hidden px-5 pb-5 pt-5">
              <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-mint/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <span className="text-[0.64rem] font-extrabold tracking-[0.16em] text-mint">สมาชิกก๊วน</span>
                  <h2 className="display mt-1.5 text-h3 leading-none text-white">เพื่อนในก๊วน</h2>
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
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ…"
                className="relative mt-4 h-11 w-full rounded-[14px] border border-white/10 bg-white/10 px-4 text-caption font-semibold text-white outline-none transition-all duration-200 placeholder:font-normal placeholder:text-white/40 focus:border-mint/40 focus:bg-white/16"
              />
            </div>

            {/* ── Roster list ───────────────────────────────────────── */}
            <div className="scroll-pane min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {shown.length === 0 ? (
                <div className="mt-8 rounded-[18px] border border-dashed border-line-2 bg-surface-2 px-4 py-10 text-center">
                  <p className="text-body font-extrabold text-ink-2">
                    {profiles.length === 0 ? "ยังไม่มีใครในสมาชิกก๊วน" : "ไม่พบชื่อที่ค้นหา"}
                  </p>
                  <p className="mt-1 text-caption text-ink-3">
                    {profiles.length === 0 ? "เพิ่มเพื่อนเข้าคิวแล้วจะบันทึกให้อัตโนมัติ" : "ลองคำอื่นดู"}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {shown.map((p) => {
                    const inSession = sessionProfileIds.has(p.id);
                    const isSelected = selected.has(p.id);
                    const editing = editingId === p.id;
                    return (
                      <li
                        key={p.id}
                        className={`rounded-[16px] border transition-all duration-200 ${
                          isSelected
                            ? "border-mint-deep/25 bg-mint-wash"
                            : "border-line bg-surface-2"
                        } ${inSession ? "opacity-70" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 py-2 pl-2.5 pr-2">
                          {/* Select toggle (disabled once in session) */}
                          <button
                            type="button"
                            disabled={inSession}
                            onClick={() => toggleSelect(p.id)}
                            aria-label="เลือก"
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected ? "border-mint-deep bg-mint-deep text-white" : "border-line-2 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-body font-bold text-ink">{p.name}</span>
                            <span className="mt-0.5 block text-[0.66rem] text-ink-3">
                              มา {p.visitCount} ครั้ง · มาล่าสุด {lastSeen(p.lastJoinedAt)}
                            </span>
                          </div>

                          {/* Skill — tap to edit */}
                          <button type="button" onClick={() => setEditingId(editing ? null : p.id)} className="shrink-0" aria-label="แก้ระดับ">
                            <SkillBadge skill={p.skill} />
                          </button>

                          {inSession ? (
                            <span className="shrink-0 rounded-full bg-mint-wash px-2.5 py-1 text-[0.6rem] font-extrabold text-mint-deep">อยู่ในคิว</span>
                          ) : (
                            <motion.button
                              whileTap={press}
                              disabled={busy}
                              onClick={() => addOne(p.id)}
                              className="lime-button h-8 shrink-0 rounded-full px-3 text-[0.68rem] font-extrabold disabled:opacity-50"
                            >
                              เพิ่ม
                            </motion.button>
                          )}

                          <button
                            type="button"
                            onClick={() => remove(p)}
                            aria-label="ลบออกจากก๊วน"
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-4 transition-colors duration-200 hover:bg-alert-wash hover:text-alert"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                              <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>

                        {/* Inline skill editor */}
                        {editing && (
                          <div className="grid grid-cols-4 gap-1.5 border-t border-line/70 p-2">
                            {SKILLS.map((s) => {
                              const active = p.skill === s;
                              return (
                                <motion.button
                                  key={s}
                                  type="button"
                                  whileTap={press}
                                  onClick={() => changeSkill(p.id, s)}
                                  className={`h-9 rounded-[10px] text-xs font-extrabold transition-all duration-200 ${
                                    active ? ACTIVE_TIER[s] : "bg-white text-ink-3 hover:text-ink hover:shadow-sm"
                                  }`}
                                >
                                  {s}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* ── Footer — multi-add ────────────────────────────────── */}
            <div className="shrink-0 border-t border-line bg-white/70 px-5 py-3.5 backdrop-blur">
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={selectableCount > 0 ? press : undefined}
                  disabled={selectableCount === 0 || busy}
                  onClick={addSelected}
                  className="lime-button shine-button h-12 flex-1 rounded-[15px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5 disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none"
                >
                  {selectableCount > 0 ? `เพิ่ม ${selectableCount} คนเข้าคิว` : "เลือกคนเพื่อเพิ่มพร้อมกัน"}
                </motion.button>
                {selectableCount > 0 && (
                  <motion.button
                    whileTap={press}
                    onClick={() => setSelected(new Set())}
                    className="h-12 shrink-0 rounded-[15px] border border-line bg-white px-4 text-caption font-bold text-ink-2 shadow-sm transition-colors duration-200 hover:bg-canvas"
                  >
                    ล้าง
                  </motion.button>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(drawer, document.body);
}
