import { useId } from "react";

/**
 * Hand-built illustrations for the Pop Court look. Pure SVG (no network, no
 * layout cost) and decorative: every use is aria-hidden next to real text.
 */

/** A safe SVG id from React's useId (which may contain ":" or "«»"). */
function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * "Shuttle buddy" — the club's little mascot: a shuttlecock whose cork is a
 * smiling face. Moods change only the face.
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
      {/* Feather skirt */}
      <path d="M15 6 H49 L42 33 H22 Z" fill="#ffffff" stroke="#23263b" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M23 6 L26.5 33 M32 6 V33 M41 6 L37.5 33" stroke="#c3c6d4" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M22.4 28.4 H41.6" stroke="#ffc83d" strokeWidth="3.2" strokeLinecap="round" />
      {/* Cork = face */}
      <path
        d="M19.5 33 H44.5 V36.5 C44.5 44.3 38.9 50 32 50 C25.1 50 19.5 44.3 19.5 36.5 Z"
        fill="#ffc83d"
        stroke="#23263b"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <ellipse cx="24.4" cy="43" rx="2.1" ry="1.25" fill="#ff6a8e" opacity="0.75" />
      <ellipse cx="39.6" cy="43" rx="2.1" ry="1.25" fill="#ff6a8e" opacity="0.75" />
      {mood === "sleepy" ? (
        <>
          <path d="M25.6 39.6 Q27.6 41.4 29.6 39.6 M34.4 39.6 Q36.4 41.4 38.4 39.6" fill="none" stroke="#23263b" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M30.2 44.6 H33.8" stroke="#23263b" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : mood === "wow" ? (
        <>
          <circle cx="27.4" cy="39.6" r="1.9" fill="#23263b" />
          <circle cx="36.6" cy="39.6" r="1.9" fill="#23263b" />
          <ellipse cx="32" cy="45" rx="2" ry="2.4" fill="#23263b" />
        </>
      ) : (
        <>
          <circle cx="27.4" cy="39.6" r="1.9" fill="#23263b" />
          <circle cx="36.6" cy="39.6" r="1.9" fill="#23263b" />
          <circle cx="28" cy="39" r="0.6" fill="#ffffff" />
          <circle cx="37.2" cy="39" r="0.6" fill="#ffffff" />
          <path d="M29.4 43.6 Q32 46.2 34.6 43.6" fill="none" stroke="#23263b" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/**
 * A small court seen from the baseline: lit (teal, ready to play) or dim
 * (lilac, lights off). Used on the court-count choice, the launch/close
 * curtains and the free-court card.
 */
export function CourtArt({ lit = true, className = "w-full" }: { lit?: boolean; className?: string }) {
  const grad = useSvgId("court");
  const top = lit ? "#7ee2d2" : "#d9d5f2";
  const bottom = lit ? "#2bc4ae" : "#aea8dc";
  const edge = lit ? "#14a08c" : "#8b84c6";
  return (
    <svg viewBox="0 0 220 96" className={className} aria-hidden>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="88" rx="104" ry="7" fill={lit ? "rgba(20,160,140,0.16)" : "rgba(91,75,196,0.12)"} />
      <path d="M40 22 H180 L210 82 H10 Z" fill={`url(#${grad})`} stroke={edge} strokeWidth="2.6" strokeLinejoin="round" />
      <g stroke="#ffffff" strokeOpacity={lit ? 0.92 : 0.75} strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M51 22 L25.5 82 M169 22 L194.5 82" />
        <path d="M110 22 V82" />
        <path d="M32.5 37.5 H187.5 M23 56.5 H197 M13.5 76 H206.5" />
      </g>
      {/* Net: posts, mesh, white top tape */}
      <path d="M28 46 H192 V34 H28 Z" fill="#ffffff" fillOpacity="0.45" />
      <path d="M28 40 H192" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M28 34 H192" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 47 V31 M192 47 V31" stroke="#23263b" strokeWidth="3" strokeLinecap="round" />
      {lit && (
        <g fill="#ffc83d">
          <path d="M60 8 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6Z" />
          <path d="M164 4 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2Z" />
        </g>
      )}
    </svg>
  );
}
