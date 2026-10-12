/**
 * A round initial avatar with a pastel colour picked deterministically from a
 * stable seed (the roster Profile id when there is one), so the same person
 * keeps the same colour all evening — and across sessions. Pure presentation.
 */

// [background, initial] — every pair keeps the initial above AA contrast.
const PALETTE: Array<[string, string]> = [
  ["#ffe08a", "#7a4a00"],
  ["#bdefe6", "#0b6b61"],
  ["#cfe5ff", "#174e9c"],
  ["#ffd0dc", "#a3183f"],
  ["#e3d6ff", "#5330b0"],
  ["#d7f2c2", "#2f6a10"],
  ["#ffd9b8", "#8a3f00"],
  ["#f6d4f2", "#8a1f7d"],
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
