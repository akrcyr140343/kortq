import type { Skill } from "@/lib/types";

/**
 * Rank chips, weakest → strongest: leaf, sky, sun, grape. The hue is never the
 * only cue — a little "signal" of 1–4 bars repeats the level, so the ladder
 * reads at a glance and for colour-blind players too.
 */
export const SKILL_TONE: Record<Skill, { badge: string; active: string; level: number }> = {
  NB: { badge: "bg-leaf-wash text-leaf-deep ring-leaf/30", active: "bg-leaf text-ink", level: 1 },
  "BG-": { badge: "bg-sky-wash text-sky-deep ring-sky/30", active: "bg-sky text-ink", level: 2 },
  BG: { badge: "bg-sun-wash text-sun-deep ring-sun/50", active: "bg-sun text-ink", level: 3 },
  N: { badge: "bg-grape-wash text-grape-deep ring-grape/30", active: "bg-grape text-white", level: 4 },
};

/** Four rising bars, the first `level` filled. */
export function LevelBars({ level, small = false }: { level: number; small?: boolean }) {
  const heights = small ? [4, 6, 8, 10] : [5, 7, 9, 11];
  return (
    <span aria-hidden className="flex items-end gap-[1.5px]">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`${small ? "w-[2.5px]" : "w-[3px]"} rounded-full bg-current ${i < level ? "" : "opacity-25"}`}
          style={{ height: h }}
        />
      ))}
    </span>
  );
}

export function SkillBadge({
  skill,
  size = "md",
  className = "",
}: {
  skill: Skill;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = SKILL_TONE[skill];
  const small = size === "sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-full font-num font-semibold ring-1 ring-inset ${
        small ? "h-5 px-1.5 text-[0.625rem]" : "h-6 px-2 text-[0.6875rem]"
      } ${tone.badge} ${className}`}
    >
      <span>{skill}</span>
      <LevelBars level={tone.level} small={small} />
      <span className="sr-only">ระดับ {tone.level} จาก 4</span>
    </span>
  );
}
