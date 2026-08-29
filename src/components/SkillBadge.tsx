import { SKILL_STYLE, type Skill } from "@/lib/types";

export function SkillBadge({ skill, className = "" }: { skill: Skill; className?: string }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1 ring-inset ${SKILL_STYLE[skill]} ${className}`}
    >
      {skill}
    </span>
  );
}
