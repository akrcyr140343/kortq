import type { ReactNode } from "react";
import { Tick } from "./Tick";

/** Column heading (คิวเกม / กำลังเล่น): a tilted icon sticker, the title and a live count. */
export function SectionHeader({
  eyebrow,
  title,
  count,
  of,
  unit,
  icon,
  tone,
}: {
  eyebrow: string;
  title: string;
  count: number;
  of: number;
  unit: string;
  icon: ReactNode;
  tone: string; // sticker colours
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className={`sticker grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <span className="eyebrow block text-ink-3">{eyebrow}</span>
          <h2 className="mt-1 font-display text-title font-semibold leading-none text-ink">{title}</h2>
        </div>
      </div>
      <span className="chip shrink-0 bg-paper py-1.5 text-ink-2 shadow-[0_2px_0_var(--line-2)] ring-2 ring-inset ring-line">
        <span className="num text-body leading-none text-ink">
          <Tick value={count} />
          <span className="text-ink-4">/{of}</span>
        </span>
        {unit}
      </span>
    </div>
  );
}
