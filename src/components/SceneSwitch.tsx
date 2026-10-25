"use client";

import { motion } from "framer-motion";
import { IconCourt, IconPeople } from "./icons";
import { bouncy } from "./motion";
import { Tick } from "./Tick";

export type AppView = "courts" | "queue";

/**
 * Phones & portrait tablets: the board is two scenes — the hall (courts and
 * the line of tickets) and the bench. A sticky switch under the header; the
 * ink blob springs to the scene you picked and the scene slides in from its
 * own side. Large screens show both scenes at once and hide this.
 */
export function SceneSwitch({
  active,
  onChange,
  liveCount,
  courtCount,
  waitingCount,
}: {
  active: AppView;
  onChange: (view: AppView) => void;
  liveCount: number;
  courtCount: number;
  waitingCount: number;
}) {
  const scenes = [
    { id: "courts" as const, label: "สนาม", count: `${liveCount}/${courtCount}`, Icon: IconCourt },
    { id: "queue" as const, label: "คิวรอ", count: waitingCount, Icon: IconPeople },
  ];

  return (
    <nav
      aria-label="เมนูหลัก"
      className="sticky top-[var(--kq-header-h)] z-30 -mx-3 bg-canvas/85 px-3 pb-2 pt-2 backdrop-blur-md sm:-mx-5 sm:px-5 lg:hidden"
    >
      <div className="grid grid-cols-2 gap-1 rounded-full bg-paper p-1.5 shadow-soft">
        {scenes.map(({ id, label, count, Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={selected ? "page" : undefined}
              className={`relative flex h-12 items-center justify-center gap-1.5 rounded-full px-1 font-display text-body font-semibold sm:gap-2 transition-[color,scale] duration-200 active:scale-95 ${
                selected ? "text-white" : "text-ink-3 hover:text-ink"
              }`}
            >
              {selected && <motion.span layoutId="scene-blob" transition={bouncy} aria-hidden className="absolute inset-0 rounded-full bg-ink" />}
              <span key={selected ? "on" : "off"} className={`relative flex ${selected ? "anim-stamp text-lime" : ""}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="relative">{label}</span>
              <span
                className={`num relative grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-caption leading-none tracking-normal ${
                  selected ? "bg-lime text-ink" : "bg-mist text-ink-2"
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
