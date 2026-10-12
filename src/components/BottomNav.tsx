"use client";

import { motion } from "framer-motion";
import { IconCourt, IconPeople } from "./icons";
import { bouncy } from "./motion";
import { Tick } from "./Tick";

export type AppView = "courts" | "queue";

/**
 * The phone tab bar — a floating chunky pill. The sun blob springs to the tab
 * you picked and its icon does a little hop; the counts roll as they change.
 */
export function BottomNav({
  active,
  onChange,
  waitingCount,
  gameCount,
}: {
  active: AppView;
  onChange: (view: AppView) => void;
  waitingCount: number;
  gameCount: number;
}) {
  const tabs = [
    { id: "courts" as const, label: "เกม", count: gameCount, Icon: IconCourt },
    { id: "queue" as const, label: "คิว", count: waitingCount, Icon: IconPeople },
  ];

  return (
    <nav className="app-bottom-nav fixed inset-x-4 z-50 mx-auto max-w-[20rem] xl:hidden" aria-label="เมนูหลัก">
      <div className="grid grid-cols-2 gap-1 rounded-[26px] border-2 border-line bg-paper/95 p-1.5 shadow-[0_4px_0_var(--line-2),0_24px_40px_-18px_rgba(91,62,24,0.45)] backdrop-blur-md">
        {tabs.map(({ id, label, count, Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={selected ? "page" : undefined}
              className={`relative flex h-14 items-center justify-center gap-2 rounded-[20px] font-display text-body font-medium transition-[color,scale] duration-200 active:scale-95 ${
                selected ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="tab-pill"
                  transition={bouncy}
                  aria-hidden
                  className="absolute inset-0 rounded-[20px] bg-sun shadow-[0_3px_0_var(--sun-ledge)]"
                />
              )}
              <span key={selected ? "on" : "off"} className={`relative flex ${selected ? "anim-tada" : ""}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="relative">{label}</span>
              <span
                className={`num relative grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-caption leading-none ${
                  selected ? "bg-ink text-paper" : "bg-sand text-ink-2"
                }`}
              >
                <Tick value={count} />
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
