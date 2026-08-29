import { SKILL_STYLE, type Skill } from "@/lib/types";

export function SkillBadge({ skill, className = "" }: { skill: Skill; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-extrabold ring-1 ring-inset ${SKILL_STYLE[skill]} ${className}`}
    >
      {skill}
    </span>
  );
}
