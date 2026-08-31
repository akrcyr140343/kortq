import type { CSSProperties } from "react";

/**
 * Ambient badminton field.
 *
 * Shuttlecocks and rackets drift from below the fold up past the top edge,
 * fading in and out at the extremes. Everything is driven by a single CSS
 * keyframe (`kq-drift`); per-item duration, delay, size, drift and rotation
 * arrive as inline custom properties.
 *
 * The values are hand-tuned rather than generated with Math.random() so the
 * server and client render identical markup (no hydration mismatch) while the
 * field still never settles into a visible rhythm. Negative delays start the
 * items mid-flight so the screen is already populated on first paint.
 *
 * Tuned for the light canvas: dark ink on white needs roughly double the
 * opacity that pale strokes needed on the old night background, and the tints
 * are drawn from the palette (emerald / sky / ink) rather than plain white.
 */
type Item = {
  left: number; // vw position
  size: number; // px
  dur: number; // seconds for a full sweep
  delay: number; // negative = already in flight
  op: number; // peak opacity (kept subtle behind working surfaces)
  drift: number; // horizontal travel in px
  rot: number; // degrees over the sweep
  kind: "shuttle" | "racket";
  tint: "ink" | "accent" | "sky";
};

const ITEMS: Item[] = [
  { left: 4, size: 30, dur: 38, delay: -4, op: 0.15, drift: 26, rot: 34, kind: "shuttle", tint: "accent" },
  { left: 13, size: 52, dur: 57, delay: -23, op: 0.085, drift: -34, rot: -26, kind: "racket", tint: "sky" },
  { left: 21, size: 22, dur: 31, delay: -12, op: 0.16, drift: 18, rot: 52, kind: "shuttle", tint: "accent" },
  { left: 29, size: 40, dur: 47, delay: -35, op: 0.1, drift: -22, rot: 20, kind: "shuttle", tint: "ink" },
  { left: 37, size: 26, dur: 35, delay: -7, op: 0.13, drift: 30, rot: -44, kind: "racket", tint: "accent" },
  { left: 45, size: 46, dur: 62, delay: -41, op: 0.085, drift: 14, rot: 28, kind: "shuttle", tint: "sky" },
  { left: 52, size: 20, dur: 29, delay: -18, op: 0.18, drift: -16, rot: 60, kind: "shuttle", tint: "accent" },
  { left: 60, size: 36, dur: 44, delay: -2, op: 0.1, drift: 24, rot: -30, kind: "racket", tint: "ink" },
  { left: 67, size: 28, dur: 52, delay: -29, op: 0.13, drift: -28, rot: 38, kind: "shuttle", tint: "sky" },
  { left: 74, size: 56, dur: 66, delay: -50, op: 0.08, drift: 20, rot: -18, kind: "racket", tint: "accent" },
  { left: 81, size: 24, dur: 33, delay: -15, op: 0.15, drift: -20, rot: 48, kind: "shuttle", tint: "accent" },
  { left: 88, size: 42, dur: 49, delay: -37, op: 0.1, drift: 32, rot: 24, kind: "shuttle", tint: "ink" },
  { left: 94, size: 18, dur: 27, delay: -9, op: 0.18, drift: -12, rot: -56, kind: "shuttle", tint: "sky" },
  { left: 8, size: 34, dur: 55, delay: -46, op: 0.085, drift: 22, rot: 30, kind: "racket", tint: "ink" },
  { left: 57, size: 32, dur: 41, delay: -26, op: 0.13, drift: -24, rot: -36, kind: "shuttle", tint: "accent" },
  { left: 33, size: 48, dur: 59, delay: -11, op: 0.08, drift: 16, rot: 22, kind: "racket", tint: "sky" },
];

const TINT: Record<Item["tint"], string> = {
  ink: "text-ink",
  accent: "text-accent",
  sky: "text-sky-500",
};

function Shuttlecock({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.2 12.6 12 2l4.8 10.6" />
      <path d="M9.1 8.4h5.8M8.1 10.6h7.8" />
      <path d="M12 2v10.6" />
      <path d="M7.2 12.6h9.6l-1 3.1a3.9 3.9 0 0 1-7.6 0l-1-3.1Z" />
      <circle cx="12" cy="18.6" r="3.2" />
    </svg>
  );
}

function Racket({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="11.5" cy="8" rx="6" ry="7" />
      <path d="M7 4.2v7.6M11.5 2.4v11.2M16 4.2v7.6" />
      <path d="M6 6.2h11M5.8 9.8h11.4" />
      <path d="M9.6 14.6 11.5 18M13.4 14.6 11.5 18M11.5 18v4" />
    </svg>
  );
}

export function FloatingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className={`kq-float ${TINT[it.tint]}`}
          style={
            {
              left: `${it.left}vw`,
              animationDuration: `${it.dur}s`,
              animationDelay: `${it.delay}s`,
              "--kq-op": it.op,
              "--kq-drift": `${it.drift}px`,
              "--kq-rot": `${it.rot}deg`,
            } as CSSProperties
          }
        >
          {it.kind === "shuttle" ? (
            <Shuttlecock size={it.size} />
          ) : (
            <Racket size={it.size} />
          )}
        </span>
      ))}
    </div>
  );
}
