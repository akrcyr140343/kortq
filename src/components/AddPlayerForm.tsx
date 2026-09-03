"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SKILLS, type Skill } from "@/lib/types";
import { press } from "./motion";
import { E2 } from "./ui";

const DEFAULT_SKILL: Skill = "BG";

/** Segmented rank control — the active chip borrows that rank's own hue. */
const ACTIVE_TIER: Record<Skill, string> = {
  NB: "bg-slate-500 text-white shadow-sm",
  BG: "bg-sky text-white shadow-sm",
  N: "bg-mint text-accent-deep shadow-sm",
  S: "bg-coral text-white shadow-sm",
};

export function AddPlayerForm({
  onAddPlayer,
  onOpenRegistry,
}: {
  // Returns true if the player was actually added (so the form can reset). The
  // parent owns duplicate-name detection against the roster + the modal.
  onAddPlayer: (name: string, skill: Skill) => Promise<boolean>;
  onOpenRegistry: () => void;
}) {
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<Skill>(DEFAULT_SKILL);
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const added = await onAddPlayer(trimmed, skill);
      if (added) {
        setName("");
        setSkill(DEFAULT_SKILL);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className={`${E2} relative overflow-hidden rounded-[24px] p-4`}>
      <div aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-mint-wash blur-xl" />
      <div className="relative flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-accent text-xl font-light text-mint">＋</span>
        <div>
          <span className="block text-sm font-extrabold text-ink">เพิ่มเพื่อนเข้าคิว</span>
          <span className="mt-0.5 block text-[0.68rem] font-medium text-ink-3">ชื่อและระดับฝีมือ</span>
        </div>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="พิมพ์ชื่อเลย…"
        maxLength={20}
        className="relative mt-4 h-12 w-full rounded-[16px] border border-line bg-surface-2 px-4 text-body font-semibold text-ink outline-none transition-all duration-200 placeholder:font-normal placeholder:text-ink-4 focus:border-accent/45 focus:bg-white focus:shadow-[0_0_0_4px_rgba(108,92,231,0.08)]"
      />

      <div className="mt-2.5 grid grid-cols-4 gap-1.5 rounded-[16px] bg-surface-2 p-1.5">
        {SKILLS.map((s) => {
          const active = skill === s;
          return (
            <motion.button
              key={s}
              type="button"
              whileTap={press}
              onClick={() => setSkill(s)}
              className={`h-9 rounded-[11px] text-xs font-extrabold transition-all duration-200 ${
                active ? ACTIVE_TIER[s] : "text-ink-3 hover:bg-white hover:text-ink hover:shadow-sm"
              }`}
            >
              {s}
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="submit"
        whileTap={press}
        disabled={busy || !name.trim()}
        className="lime-button shine-button mt-3 h-12 w-full rounded-[16px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5 disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none"
      >
        {busy ? "กำลังเพิ่ม…" : "เพิ่มเข้าคิว"}
      </motion.button>

      <motion.button
        type="button"
        whileTap={press}
        onClick={onOpenRegistry}
        className="relative mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] border border-accent/20 bg-accent-wash text-caption font-bold text-accent-deep transition-all duration-200 hover:-translate-y-0.5"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 19c.5-3.2 2.4-5 5-5s4.5 1.8 5 5M16 7h4M18 5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        เลือกจากสมาชิกก๊วน
      </motion.button>
    </form>
  );
}
