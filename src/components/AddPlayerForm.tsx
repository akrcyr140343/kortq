"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { SKILLS, type Skill } from "@/lib/types";
import { Confetti } from "./Confetti";
import { IconPeople, IconPlus, IconUserPlus } from "./icons";
import { glide } from "./motion";
import { LevelBars, SKILL_TONE } from "./SkillBadge";
import { CARD } from "./ui";

const DEFAULT_SKILL: Skill = "BG-";

// Label colour of the active tier; its fill rides on the sliding pill.
const ACTIVE_TEXT: Record<Skill, string> = {
  NB: "text-ink",
  "BG-": "text-ink",
  BG: "text-ink",
  N: "text-white",
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
    <form onSubmit={handleAdd} className={`${CARD} relative rounded-[26px] p-3.5`}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="sticker grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal text-ink"
          style={{ boxShadow: "0 3px 0 var(--teal-ledge)" }}
        >
          <IconUserPlus className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lede font-semibold leading-tight text-ink">เพิ่มเพื่อนเข้าคิว</h2>
          <p className="text-caption text-ink-3">ชื่อและระดับฝีมือ</p>
        </div>
      </div>

      <label htmlFor={inputId} className="sr-only">
        ชื่อผู้เล่น
      </label>
      <input
        id={inputId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="พิมพ์ชื่อเลย…"
        maxLength={20}
        autoComplete="off"
        className="mt-3 h-12 w-full rounded-2xl border-2 border-line bg-sand/60 px-4 font-display text-body text-ink outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:font-sans placeholder:text-ink-4 focus:border-teal focus:bg-paper focus:shadow-[0_0_0_4px_rgba(43,196,174,0.18)]"
      />

      <div className="mt-2.5 grid grid-cols-4 gap-1.5 rounded-2xl bg-sand p-1.5" role="group" aria-label="ระดับฝีมือ">
        {SKILLS.map((s) => {
          const active = skill === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSkill(s)}
              aria-pressed={active}
              className={`relative flex h-10 items-center justify-center gap-1 rounded-xl font-num text-[0.8125rem] font-semibold transition-colors duration-200 active:scale-95 ${
                active ? ACTIVE_TEXT[s] : "text-ink-3 hover:bg-paper hover:text-ink"
              }`}
            >
              {/* The tier colour slides to the level you tap. */}
              {active && (
                <motion.span
                  layoutId="add-skill-pill"
                  transition={glide}
                  aria-hidden
                  className={`absolute inset-0 rounded-xl shadow-[0_2px_0_rgba(35,38,59,0.18)] ${SKILL_TONE[s].active}`}
                />
              )}
              <span className="relative">{s}</span>
              <span className="relative">
                <LevelBars level={SKILL_TONE[s].level} small />
              </span>
            </button>
          );
        })}
      </div>

      {/* Each successful add pops a little confetti off the button. */}
      <div className="relative mt-3">
        <button
          key={addedCount}
          type="submit"
          disabled={busy || !name.trim()}
          className={`btn btn-sun ${busy ? "is-busy" : addedCount > 0 ? "ping-once" : ""} h-12 w-full rounded-2xl`}
        >
          <IconPlus className="h-5 w-5" />
          {busy ? "กำลังเพิ่ม…" : "เพิ่มเข้าคิว"}
        </button>
        {addedCount > 0 && <Confetti key={addedCount} pieces={12} spread={0.85} />}
      </div>

      <button type="button" onClick={onOpenRegistry} className="btn btn-teal-soft mt-2.5 h-11 w-full rounded-2xl">
        <IconPeople className="h-5 w-5" />
        เลือกจากสมาชิกก๊วน
      </button>
    </form>
  );
}
