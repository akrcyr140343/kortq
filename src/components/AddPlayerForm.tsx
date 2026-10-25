"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { SKILLS, type Skill } from "@/lib/types";
import { Confetti } from "./Confetti";
import { IconPeople, IconPlus } from "./icons";
import { glide } from "./motion";
import { LevelBars, SKILL_TONE } from "./SkillBadge";

const DEFAULT_SKILL: Skill = "BG-";

// Label colour of the active tier; its fill rides on the sliding pill.
const ACTIVE_TEXT: Record<Skill, string> = {
  NB: "text-ink",
  "BG-": "text-ink",
  BG: "text-ink",
  N: "text-white",
};

/**
 * The bench composer: one big name pill with the add button tucked inside it,
 * the level picked from a sliding row of chips underneath, and the roster one
 * tap away. Every successful add pops confetti off the button.
 */
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
  const [addedCount, setAddedCount] = useState(0); // each successful add celebrates once
  const inputId = useId();

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
        setAddedCount((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="relative rounded-[30px] bg-lime p-3 shadow-soft">
      <div className="flex items-center justify-between gap-2 px-1.5 pb-2.5 pt-0.5">
        <h2 className="display text-lede leading-tight text-ink">เพิ่มเพื่อนเข้าคิว</h2>
        <button type="button" onClick={onOpenRegistry} className="btn btn-ghost h-9 min-h-9 px-3 text-caption text-ink hover:bg-white/50!">
          <IconPeople className="h-4 w-4" />
          สมาชิกก๊วน
        </button>
      </div>

      <label htmlFor={inputId} className="sr-only">
        ชื่อผู้เล่น
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="พิมพ์ชื่อเลย…"
          maxLength={20}
          autoComplete="off"
          className="field pr-[3.75rem] shadow-none! placeholder:font-sans focus:shadow-[inset_0_0_0_2px_var(--ink)]!"
        />
        {/* Each successful add pops a little confetti off the button. */}
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <button
            key={addedCount}
            type="submit"
            disabled={busy || !name.trim()}
            aria-label={busy ? "กำลังเพิ่ม…" : "เพิ่มเข้าคิว"}
            className={`btn btn-ink ${busy ? "is-busy" : addedCount > 0 ? "ping-once" : ""} h-10 w-10 min-h-10 px-0`}
            style={{ ["--ring" as string]: "rgba(25,26,40,0.35)" }}
          >
            <IconPlus className="h-5 w-5" />
          </button>
          {addedCount > 0 && <Confetti key={addedCount} pieces={12} spread={0.8} />}
        </span>
      </div>

      <div className="seg mt-2.5 grid-cols-4 bg-white/45!" role="group" aria-label="ระดับฝีมือ">
        {SKILLS.map((s) => {
          const active = skill === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSkill(s)}
              aria-pressed={active}
              className={`relative flex h-10 items-center justify-center gap-1 rounded-full font-num text-[0.8125rem] font-bold tracking-normal transition-colors duration-200 active:scale-95 ${
                active ? ACTIVE_TEXT[s] : "text-ink-2 hover:bg-white/60"
              }`}
            >
              {/* The tier colour slides to the level you tap. */}
              {active && (
                <motion.span layoutId="add-skill-pill" transition={glide} aria-hidden className={`absolute inset-0 rounded-full shadow-soft ${SKILL_TONE[s].active}`} />
              )}
              <span className="relative">{s}</span>
              <span className="relative">
                <LevelBars level={SKILL_TONE[s].level} small />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1.5 text-[0.6875rem] text-ink/70">{busy ? "กำลังเพิ่ม…" : "เลือกระดับ แล้วกด + เพื่อเพิ่มเข้าคิว"}</p>
    </form>
  );
}
