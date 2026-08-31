"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { addPlayer } from "@/lib/db";
import { SKILLS, type Skill } from "@/lib/types";
import { press } from "./motion";
import { E2 } from "./ui";

const DEFAULT_SKILL: Skill = "N";

/** Segmented rank control — the active chip borrows that rank's own hue. */
const ACTIVE_TIER: Record<Skill, string> = {
  BG: "bg-slate-500 text-white shadow-sm",
  "BG+": "bg-sky text-white shadow-sm",
  N: "bg-mint text-accent-deep shadow-sm",
  S: "bg-coral text-white shadow-sm",
};

export function AddPlayerForm() {
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<Skill>(DEFAULT_SKILL);
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addPlayer(trimmed, skill);
      setName("");
      setSkill(DEFAULT_SKILL);
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
    </form>
  );
}
