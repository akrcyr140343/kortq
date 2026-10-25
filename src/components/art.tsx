import { useId } from "react";

/**
 * Hand-built illustrations for the Court Board look. Pure SVG (no network, no
 * layout cost) and decorative: every use is aria-hidden next to real text.
 */

/** A safe SVG id from React's useId (which may contain ":" or "«»"). */
function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * The club's shuttle mascot — a white feather skirt over a lime cork with a
 * tiny face. Moods change only the face.
 */
export function ShuttleBuddy({
  className = "h-12 w-12",
  mood = "happy",
}: {
  className?: string;
  mood?: "happy" | "sleepy" | "wow";
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M15 6 H49 L42 33 H22 Z" fill="#ffffff" stroke="#191a28" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M23 6 L26.5 33 M32 6 V33 M41 6 L37.5 33" stroke="#a4a6b4" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22.2 27.6 H41.8" stroke="#45a8ff" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M19.5 33 H44.5 V36.5 C44.5 44.3 38.9 50 32 50 C25.1 50 19.5 44.3 19.5 36.5 Z"
        fill="#c5f03c"
        stroke="#191a28"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <ellipse cx="24.4" cy="43" rx="2" ry="1.2" fill="#ff6f5b" opacity="0.7" />
      <ellipse cx="39.6" cy="43" rx="2" ry="1.2" fill="#ff6f5b" opacity="0.7" />
      {mood === "sleepy" ? (
        <>
          <path d="M25.6 39.6 Q27.6 41.4 29.6 39.6 M34.4 39.6 Q36.4 41.4 38.4 39.6" fill="none" stroke="#191a28" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M30.2 44.6 H33.8" stroke="#191a28" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : mood === "wow" ? (
        <>
          <circle cx="27.4" cy="39.6" r="1.9" fill="#191a28" />
          <circle cx="36.6" cy="39.6" r="1.9" fill="#191a28" />
          <ellipse cx="32" cy="45" rx="1.9" ry="2.3" fill="#191a28" />
        </>
      ) : (
        <>
          <circle cx="27.4" cy="39.6" r="1.9" fill="#191a28" />
          <circle cx="36.6" cy="39.6" r="1.9" fill="#191a28" />
          <path d="M29.4 43.6 Q32 46.2 34.6 43.6" fill="none" stroke="#191a28" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/**
 * The markings of a doubles court seen from above, landscape (net vertical in
 * the middle). Stretches to fill its box; strokes stay crisp at any size.
 * `draw` strokes the lines on as it mounts; `dashed` makes them chalk marks
 * that march slowly (an empty court).
 */
export function CourtLines({
  draw = false,
  dashed = false,
  color = "rgba(255,255,255,0.75)",
  className = "absolute inset-0 h-full w-full",
}: {
  draw?: boolean;
  dashed?: boolean;
  color?: string;
  className?: string;
}) {
  const mode = draw ? "anim-draw" : dashed ? "anim-march" : undefined;
  const lines = [
    "M4 4 H196 V96 H4 Z", // outer (doubles sideline + back line)
    "M4 12 H196 M4 88 H196", // singles sidelines
    "M70 4 V96 M130 4 V96", // short service lines
    "M14 4 V96 M186 4 V96", // doubles long service lines
    "M4 50 H70 M130 50 H196", // centre lines
  ];
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="none" className={className} aria-hidden>
      <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {lines.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={draw ? 1 : undefined}
            vectorEffect="non-scaling-stroke"
            className={mode}
            style={draw ? { animationDelay: `${(0.05 + i * 0.08).toFixed(2)}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * A small court tile seen from above: lit (green mat, white lines — ready to
 * play) or off (pale mat, chalk lines). Used on the court-count choice, the
 * curtains and the loading screen.
 */
export function CourtArt({
  lit = true,
  draw = false,
  className = "w-full",
}: {
  lit?: boolean;
  draw?: boolean; // stroke the lines on as it mounts
  className?: string;
}) {
  const mat = useSvgId("mat");
  const d = draw ? "anim-draw" : undefined;
  const delay = (i: number) => (draw ? { animationDelay: `${(0.08 + i * 0.07).toFixed(2)}s` } : undefined);
  return (
    <svg viewBox="0 0 160 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={mat} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={lit ? "#1f9f71" : "#cfeee0"} />
          <stop offset="0.5" stopColor={lit ? "#2bb886" : "#dcf5e9"} />
          <stop offset="1" stopColor={lit ? "#1f9f71" : "#cfeee0"} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="156" height="88" rx="12" fill={`url(#${mat})`} />
      <g
        fill="none"
        stroke={lit ? "#ffffff" : "#0b7049"}
        strokeOpacity={lit ? 0.85 : 0.35}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray={lit ? undefined : "4 4"}
      >
        <path pathLength={draw ? 1 : undefined} className={d} style={delay(0)} d="M12 10 H148 V82 H12 Z" />
        <path pathLength={draw ? 1 : undefined} className={d} style={delay(1)} d="M12 17 H148 M12 75 H148" />
        <path pathLength={draw ? 1 : undefined} className={d} style={delay(2)} d="M58 10 V82 M102 10 V82" />
        <path pathLength={draw ? 1 : undefined} className={d} style={delay(3)} d="M12 46 H58 M102 46 H148" />
      </g>
      {/* Net */}
      <path d="M80 6 V86" stroke={lit ? "#ffffff" : "#0b7049"} strokeOpacity={lit ? 1 : 0.4} strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="6" r="3" fill="#191a28" />
      <circle cx="80" cy="86" r="3" fill="#191a28" />
    </svg>
  );
}
