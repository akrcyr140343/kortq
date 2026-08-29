"use client";

import { useState } from "react";
import { addPlayer } from "@/lib/db";
import { SKILLS, SKILL_STYLE, type Skill } from "@/lib/types";

const DEFAULT_SKILL: Skill = "N";

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
    <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อผู้เล่น"
        maxLength={20}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
      />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {SKILLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSkill(s)}
            className={`h-12 rounded-xl text-sm font-extrabold transition active:scale-95 ${
              skill === s
                ? `${SKILL_STYLE[s]} ring-2`
                : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="mt-2 h-12 w-full rounded-xl bg-emerald-500 text-base font-bold text-white transition active:scale-[0.98] hover:bg-emerald-600 disabled:opacity-40"
      >
        + เพิ่มผู้เล่น
      </button>
    </form>
  );
}
