/**
 * A round initial avatar with a colour picked deterministically from a stable
 * seed (the roster Profile id when there is one), so the same person keeps the
 * same colour all evening — and across sessions. Pure presentation.
 */

// [background, initial] — bright pastel fills with deep initials, all above AA.
const PALETTE: Array<[string, string]> = [
  ["#e7fb9c", "#3d5400"],
  ["#bff0da", "#0b6343"],
  ["#c9e5ff", "#13519e"],
  ["#ffd2c9", "#a32a17"],
  ["#ddd3ff", "#4a2fc0"],
  ["#ffe9a6", "#704a00"],
  ["#ffd9bf", "#8f3d06"],
  ["#f6d0f5", "#85197f"],
];

const SIZES = {
  xs: "h-6 w-6 text-[0.625rem]",
  sm: "h-7 w-7 text-[0.75rem]",
  md: "h-9 w-9 text-[0.875rem]",
  lg: "h-11 w-11 text-[1.0625rem]",
} as const;

function hashOf(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Thai leading vowels (เ แ โ ใ ไ) are written before the consonant they
// follow in speech — skip them so "เอก" shows "อ", not "เ".
const LEADING_THAI_VOWELS = /^[\u0E40-\u0E44]+/;

export function initialOf(name: string): string {
  const trimmed = name.trim().replace(LEADING_THAI_VOWELS, "");
  const first = Array.from(trimmed)[0] ?? "?";
  return first.toUpperCase();
}

export function avatarColors(seed: string): [string, string] {
  return PALETTE[hashOf(seed) % PALETTE.length];
}

/**
 * The avatar seed for a stable identity ("profile:<id>" / "player:<id>") — the
 * same string a live player uses (`profileId ?? id`), so history chips wear
 * the same colour as the player does on court.
 */
export function seedOfIdentity(identity: string): string {
  return identity.replace(/^(profile:|player:)/, "");
}

export function Avatar({
  name,
  seed,
  size = "sm",
  className = "",
}: {
  name: string;
  seed: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [bg, fg] = avatarColors(seed);
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-display font-semibold leading-none ring-2 ring-paper ${SIZES[size]} ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initialOf(name)}
    </span>
  );
}
