"use client";

import { useState } from "react";
import { addPlayer } from "@/lib/db";
import { SKILLS, SKILL_SCORE, type Skill } from "@/lib/types";

export function AddPlayerForm() {
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<Skill>("B");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addPlayer(trimmed, skill);
      setName("");
      setSkill("B");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="rounded-2xl border border-white/10 bg-neutral-900/50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อผู้เล่น"
        maxLength={20}
        className="h-12 w-full rounded-xl border border-white/10 bg-neutral-800 px-4 text-base outline-none placeholder:text-neutral-500 focus:border-emerald-500/60"
      />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {SKILLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSkill(s)}
            className={`h-12 rounded-xl border text-sm font-bold transition ${
              skill === s
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                : "border-white/10 bg-neutral-800 text-neutral-300 active:bg-neutral-700"
            }`}
          >
            {s}
            <span className="ml-1 text-xs font-normal text-neutral-500">{SKILL_SCORE[s]}</span>
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="mt-2 h-12 w-full rounded-xl bg-emerald-500 text-base font-bold text-neutral-950 active:bg-emerald-600 disabled:opacity-40"
      >
        + เพิ่มผู้เล่น
      </button>
    </form>
  );
}
