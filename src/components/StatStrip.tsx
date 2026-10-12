import { Tick } from "./Tick";
import { CARD } from "./ui";

type Tone = "sky" | "sun" | "teal" | "pink" | "grape";

// A coloured blob tucked into each tile's corner — the tile's "team colour".
const BLOB: Record<Tone, string> = {
  sky: "bg-sky/25",
  sun: "bg-sun/40",
  teal: "bg-teal/30",
  pink: "bg-pink/25",
  grape: "bg-grape/20",
};

function StatTile({
  label,
  value,
  unit,
  tone,
  className = "",
  index,
}: {
  label: string;
  value: number | string;
  unit: string;
  tone: Tone;
  className?: string;
  index: number;
}) {
  return (
    <div
      className={`${CARD} anim-pop relative min-w-0 overflow-hidden rounded-[20px] px-2.5 pb-2 pt-2.5 sm:px-3.5 sm:pb-2.5 sm:pt-3 ${className}`}
      style={{ animationDelay: `${(0.05 + index * 0.05).toFixed(2)}s` }}
    >
      <span aria-hidden className={`absolute -right-4 -top-4 h-11 w-11 rounded-full ${BLOB[tone]}`} />
      <span className="relative flex items-baseline gap-1">
        <span className="num text-[1.625rem] leading-none text-ink sm:text-[2rem]">
          <Tick value={value} />
        </span>
        <span className="font-display text-[0.6875rem] font-medium text-ink-3">{unit}</span>
      </span>
      <span className="relative mt-1 block truncate font-display text-[0.6875rem] font-medium text-ink-2 sm:text-caption">{label}</span>
    </div>
  );
}

/**
 * The scoreboard: four tiles that fit one row on any phone, a fifth (courts
 * in use) joins from `sm` up. Every figure rolls when it changes.
 */
export function StatStrip({
  totalPlayers,
  waiting,
  playing,
  games,
  courtsActive,
  totalCourts,
}: {
  totalPlayers: number;
  waiting: number;
  playing: number;
  games: number;
  courtsActive: number;
  totalCourts: number;
}) {
  return (
    <div className="grid shrink-0 grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
      <StatTile index={0} label="ผู้เล่นทั้งหมด" value={totalPlayers} unit="คน" tone="sky" />
      <StatTile index={1} label="กำลังรอ" value={waiting} unit="คน" tone="sun" />
      <StatTile index={2} label="กำลังเล่น" value={playing} unit="คน" tone="teal" />
      <StatTile index={3} label="เล่นแล้ว" value={games} unit="เกม" tone="pink" />
      <StatTile
        index={4}
        label="คอร์ตใช้งาน"
        value={`${courtsActive}/${totalCourts}`}
        unit="คอร์ต"
        tone="grape"
        className="hidden sm:block"
      />
    </div>
  );
}
