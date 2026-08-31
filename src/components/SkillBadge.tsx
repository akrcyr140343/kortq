import type { Skill } from "@/lib/types";

/**
 * Rank chips read by hue, weakest → strongest: slate, sky, amber, violet.
 * Each is a soft tint with its own ring one step darker, so the chip never
 * dissolves into the white card behind it. Emerald is deliberately absent —
 * it belongs to actions, not to people.
 */
const TIER: Record<Skill, string> = {
  BG: "bg-slate-100 text-slate-600 ring-slate-200",
  "BG+": "bg-sky-wash text-sky-deep ring-sky/25",
  N: "bg-mint-wash text-mint-deep ring-mint/35",
  S: "bg-coral-wash text-coral-deep ring-coral/25",
};

export function SkillBadge({ skill, className = "" }: { skill: Skill; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center justify-center rounded-full px-2 text-[0.65rem] font-extrabold tracking-wide ring-1 ring-inset ${TIER[skill]} ${className}`}
    >
      {skill}
    </span>
  );
}
