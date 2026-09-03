// Domain types for KortQ

// Skill tiers, weakest → strongest. NB = beginner (อ่อนสุด), S = strongest (เก่งสุด).
export type Skill = "NB" | "BG" | "N" | "S";

export type PlayerStatus = "waiting" | "playing" | "resting";

export interface Player {
  id: string;
  name: string;
  skill: Skill;
  score: number; // derived from skill: NB=1, BG=2, N=3, S=4 (used for matchmaking only)
  status: PlayerStatus;
  courtId: string | null; // set while status === "playing"
  gamesPlayed: number; // number of games finished this session
  createdAt: number; // ms — first time added
  queuedAt: number; // ms — last time entered the waiting queue (used for FIFO fairness)
  paid?: boolean; // court-fee settlement for this session (admin-verified, manual)
  paidAt?: number | null; // ms when marked paid
  profileId?: string | null; // link to the permanent roster Profile they were added from
}

/**
 * A permanent roster entry, stored OUTSIDE the session at profiles/{id} so a
 * regular's name + skill survive across sessions and don't have to be retyped.
 *
 * Deliberately separate from the session Player: nothing in Fair Match or Match
 * History reads a Profile, so a Profile can be edited or hard-deleted without
 * ever touching a live game or past record. A session Player only snapshots the
 * Profile's name/skill at add time and keeps its own gamesPlayed (reset to 0
 * every session).
 */
export interface Profile {
  id: string;
  name: string; // display form (trimmed)
  nameKey: string; // normalizeNameKey(name) — used for duplicate detection + search
  skill: Skill; // persistent skill; used when spawning the next session Player
  visitCount: number; // sessions attended (capped at +1 per session via lastCountedSession)
  lastCountedSession: number; // session.createdAt of the session visitCount was last bumped in
  lastJoinedAt: number; // ms — last time added to a queue (drives "เล่นล่าสุด" + sort tiebreak)
  createdAt: number; // ms — first registered
}

/**
 * Normalise a display name into a comparison key for duplicate detection:
 * trim, lowercase, and collapse internal whitespace. The club treats a name as
 * unique (see requirement: same name → never a second Profile).
 */
export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface Court {
  id: string;
  index: number; // 1-based court number
  teamA: string[]; // player ids
  teamB: string[]; // player ids
  startedAt: number | null; // ms when the current game started (drives the court timer)
}

/**
 * The single staged "next game" (เกมถัดไป). Admin sets it in advance so members
 * can see who plays next before a court frees up. Holds player ids already split
 * into the two teams the admin arranged; promotion drops these exact teams onto
 * a court without re-balancing. Cleared on promote and on session start/end.
 */
export interface NextUp {
  teamA: string[]; // player ids
  teamB: string[]; // player ids
}

export interface Session {
  active: boolean;
  courtCount: number; // 2 or 3
  createdAt: number;
  feePerHead?: number; // baht each player owes for the session (0 = not set yet)
  nextUp?: NextUp; // staged "next game" (เกมถัดไป); absent/empty = not set
}

/**
 * A finished game, recorded when finishGame() clears a court. Kept for the
 * whole session (only wiped on End Session) so "จับแฟร์" can avoid repeating
 * the same foursomes and partners. `players` is teamA+teamB flattened for
 * quick membership/pair lookups.
 */
export interface Match {
  id: string;
  courtId: string;
  teamA: string[]; // player ids on team A when the game finished
  teamB: string[]; // player ids on team B when the game finished
  players: string[]; // all ids in the game (teamA + teamB)
  startedAt: number; // ms — from the court when the game began
  finishedAt: number; // ms — when the game was ended
}

export const SKILL_SCORE: Record<Skill, number> = {
  NB: 1,
  BG: 2,
  N: 3,
  S: 4,
};

// Order shown in the skill picker (weakest → strongest).
export const SKILLS: Skill[] = ["NB", "BG", "N", "S"];

// Tailwind classes for each skill badge (light theme — soft tint + readable text).
// Colours stay pinned to the numeric rank: NB keeps the old score-1 tint, BG the
// old score-2 tint, so a player's badge colour is unchanged for a given score.
export const SKILL_STYLE: Record<Skill, string> = {
  NB: "bg-sky-100 text-sky-700 ring-sky-300",
  BG: "bg-teal-100 text-teal-700 ring-teal-300",
  N: "bg-amber-100 text-amber-700 ring-amber-300",
  S: "bg-rose-100 text-rose-700 ring-rose-300",
};
