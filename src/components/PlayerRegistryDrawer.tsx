"use client";

import { useEffect, useMemo, useState } from "react";
import { type Profile, type Skill, SKILLS, normalizeNameKey } from "@/lib/types";
import {
  addPlayerFromProfile,
  addPlayersFromProfiles,
  deleteProfile,
  updateProfileSkill,
} from "@/lib/db";
import { useModal } from "@/context/ModalContext";
import { ShuttleBuddy } from "./art";
import { Avatar } from "./Avatar";
import { IconCheck, IconPeople, IconPlus, IconSearch, IconTrash } from "./icons";
import { Sheet } from "./Sheet";
import { LevelBars, SKILL_TONE, SkillBadge } from "./SkillBadge";
import { staggerDelay } from "./motion";
import { Tick } from "./Tick";

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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset transient UI whenever the drawer closes.
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(new Set());
      setEditingId(null);
    }
  }, [open]);

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

  const selectableCount = [...selected].filter((id) => !sessionProfileIds.has(id)).length;

  const toolbar = (
    <label className="relative block">
      <span className="sr-only">ค้นหาชื่อ</span>
      <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-ink-4" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ค้นหาชื่อ…"
        className="field h-11 pl-10 placeholder:font-sans"
      />
    </label>
  );

  // ── Footer — multi-add. The bottom inset keeps it clear of the Home Indicator.
  const footer = (
    <div className="shrink-0 border-t border-line bg-paper/90 backdrop-blur px-5 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] pt-3">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={selectableCount === 0 || busy}
          onClick={addSelected}
          className={`btn btn-lime ${busy && selectableCount > 0 ? "is-busy" : ""} h-12 flex-1 rounded-2xl`}
        >
          {selectableCount > 0 ? (
            <>
              <IconPlus className="h-5 w-5" />
              เพิ่ม <Tick value={selectableCount} /> คนเข้าคิว
            </>
          ) : (
            "เลือกคนเพื่อเพิ่มพร้อมกัน"
          )}
        </button>
        {selectableCount > 0 && (
          <button type="button" onClick={() => setSelected(new Set())} className="btn h-12 rounded-2xl px-4">
            ล้าง
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="สมาชิกก๊วน"
      eyebrow="CLUB ROSTER"
      title="เพื่อนในก๊วน"
      subtitle={`${profiles.length} คนในก๊วน · แตะรูปเพื่อเลือกหลายคน`}
      icon={
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-court-wash text-court-deep ring-1 ring-inset ring-court/30">
          <IconPeople className="h-6 w-6" />
        </span>
      }
      toolbar={toolbar}
      footer={footer}
    >
      <div className="px-5 py-3">
        {shown.length === 0 ? (
          <div className="anim-rise mt-4 flex flex-col items-center rounded-[22px] border border-dashed border-line-2 px-4 py-9 text-center">
            <span className="anim-bob" style={{ ["--bob-y" as string]: "-6px", ["--bob-d" as string]: "3.2s" }}>
              <ShuttleBuddy className="h-12 w-12" mood={profiles.length === 0 ? "happy" : "wow"} />
            </span>
            <p className="mt-3 font-display text-body font-semibold text-ink-2">
              {profiles.length === 0 ? "ยังไม่มีใครในสมาชิกก๊วน" : "ไม่พบชื่อที่ค้นหา"}
            </p>
            <p className="mt-1 text-caption text-ink-3">
              {profiles.length === 0 ? "เพิ่มเพื่อนเข้าคิวแล้วจะบันทึกให้อัตโนมัติ" : "ลองคำอื่นดู"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {shown.map((p, i) => {
              const inSession = sessionProfileIds.has(p.id);
              const isSelected = selected.has(p.id);
              const editing = editingId === p.id;
              return (
                <li
                  key={p.id}
                  // The roster pours in behind the sheet (capped, so long lists stay quick).
                  style={staggerDelay(Math.min(i, 10), 0.025)}
                  className={`anim-rise rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200 ${
                    isSelected
                      ? "border-ink bg-lime shadow-soft"
                      : "border-line bg-paper"
                  } ${inSession ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2 py-1.5 pl-1.5 pr-1">
                    {/* The avatar is the select toggle (disabled once in session). */}
                    <button
                      type="button"
                      disabled={inSession}
                      onClick={() => toggleSelect(p.id)}
                      aria-pressed={isSelected}
                      aria-label={`เลือก ${p.name}`}
                      className="relative shrink-0 rounded-full transition-transform duration-150 active:scale-90 disabled:cursor-not-allowed"
                    >
                      <Avatar name={p.name} seed={p.id} size="lg" />
                      <span
                        key={isSelected ? "on" : "off"}
                        aria-hidden
                        className={`absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full ring-2 ring-paper ${
                          isSelected
                            ? "anim-stamp bg-lime text-ink"
                            : inSession
                              ? "bg-court-wash text-court-deep"
                              : "bg-paper text-transparent shadow-[inset_0_0_0_2px_var(--line-2)]"
                        }`}
                      >
                        <IconCheck className="h-3 w-3" />
                      </span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-display text-body font-medium text-ink">{p.name}</span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-ink-3">
                        มา {p.visitCount} ครั้ง · มาล่าสุด {lastSeen(p.lastJoinedAt)}
                      </span>
                    </div>

                    {/* Skill — tap to edit */}
                    <button
                      type="button"
                      onClick={() => setEditingId(editing ? null : p.id)}
                      aria-expanded={editing}
                      aria-label={`แก้ระดับของ ${p.name}`}
                      className="shrink-0 rounded-full transition-transform duration-150 active:scale-90"
                    >
                      <SkillBadge skill={p.skill} />
                    </button>

                    {inSession ? (
                      <span className="chip shrink-0 border border-court/30 bg-court-wash text-[0.6875rem] text-court-deep">อยู่ในคิว</span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addOne(p.id)}
                        className="btn btn-lime h-9 min-h-9 shrink-0 rounded-lg px-3 text-caption"
                      >
                        เพิ่ม
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => remove(p)}
                      aria-label="ลบออกจากก๊วน"
                      className="btn btn-ghost h-9 min-h-9 w-9 shrink-0 rounded-full px-0 text-ink-3 hover:text-danger-deep"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Inline skill editor */}
                  {editing && (
                    <div className="anim-status grid grid-cols-4 gap-1.5 border-t border-dashed border-line-2 p-2">
                      {SKILLS.map((s) => {
                        const active = p.skill === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => changeSkill(p.id, s)}
                            aria-pressed={active}
                            className={`flex h-10 items-center justify-center gap-1 rounded-full font-num text-[0.8125rem] font-semibold transition-colors duration-200 active:scale-95 ${
                              active ? SKILL_TONE[s].active : "bg-mist text-ink-3 hover:text-ink"
                            }`}
                          >
                            {s}
                            <LevelBars level={SKILL_TONE[s].level} small />
                          </button>
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
    </Sheet>
  );
}
