// Domain types for KortQ

// Skill tiers, weakest → strongest. NB = beginner (อ่อนสุด), N = strongest (เก่งสุด).
export type Skill = "NB" | "BG-" | "BG" | "N";

export type PlayerStatus = "waiting" | "playing" | "resting";

export interface Player {
  id: string;
  name: string;
  skill: Skill;
  score: number; // derived from skill: NB=1, BG-=2, BG=3, N=4 (used for matchmaking only)
  status: PlayerStatus;
  courtId: string | null; // the running game's doc id while status === "playing" (field name kept for schema stability)
  gamesPlayed: number; // number of games finished this session
  createdAt: number; // ms — first time added
  queuedAt: number; // ms — last time entered the waiting queue (used for FIFO fairness)
  profileId?: string | null; // link to the permanent roster Profile they were added from
  fairSkips?: number; // eligible Fair decisions missed; frozen in Next Up, cleared on court entry
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

/**
 * A game currently being played ("กำลังเล่น"). Stored in the `courts`
 * subcollection (name kept for schema stability) but NOT tied to a physical
 * court: the doc is created when Q1 is sent and deleted when the game finishes
 * or is cancelled. `index` is the running game number of the session (เกม #n).
 */
export interface Court {
  id: string;
  index: number; // running game number within the session (1, 2, 3, …)
  teamA: string[]; // player ids
  teamB: string[]; // player ids
  startedAt: number | null; // ms when the game was sent to play (drives the timer)
}

/** Two teams of player ids — the shape shared by a queued game and Fair logs. */
export interface NextUp {
  teamA: string[]; // player ids
  teamB: string[]; // player ids
}

/**
 * One game waiting in line (Q1, Q2, Q3). Position in `Session.gameQueue` IS the
 * Q number — it's a place in line, not a court. May hold 1–4 players while it's
 * being arranged; only a full 2v2 Q1 can be sent to play. `id` is stable so a
 * stale action from another device can tell the Q it meant has moved on.
 */
export interface QueuedGame extends NextUp {
  id: string;
}

/** Max games that can wait in line at once (Q1–Q3). */
export const MAX_QUEUED_GAMES = 3;

export interface Session {
  active: boolean;
  courtCount: number; // 2 or 3 — only a cap on how many games may be playing at once
  createdAt: number;
  gameQueue?: QueuedGame[]; // Q1, Q2, Q3 in order; absent/empty = nothing arranged
  gameSeq?: number; // last game number handed out (เกม #n)
  nextUp?: NextUp; // legacy single "next game" — no longer written or read
  fairRevision?: number; // incremented atomically by every app mutation of Fair inputs
  fairPlayerIdentities?: Record<string, string>; // Player ID -> stable identity, retained after removal
}

/**
 * A finished game, recorded when finishGame() clears a court. Kept for the
 * whole session (only wiped on End Session) so "จับแฟร์" can avoid repeating
 * the same foursomes and partners. `players` is teamA+teamB flattened for
 * quick membership/pair lookups.
 */
export interface Match {
  id: string;
  courtId: string; // id of the game doc it was played as (legacy sessions: "court-N")
  teamA: string[]; // player ids on team A when the game finished
  teamB: string[]; // player ids on team B when the game finished
  players: string[]; // all ids in the game (teamA + teamB)
  startedAt: number; // ms — from the court when the game began
  finishedAt: number; // ms — when the game was ended
  teamAIdentities?: string[]; // immutable identities; legacy matches resolve through session aliases
  teamBIdentities?: string[];
}

export const SKILL_SCORE: Record<Skill, number> = {
  NB: 1,
  "BG-": 2,
  BG: 3,
  N: 4,
};

// Order shown in the skill picker (weakest → strongest).
export const SKILLS: Skill[] = ["NB", "BG-", "BG", "N"];

// Tailwind classes for each skill badge (light theme — soft tint + readable text).
// Colours stay pinned to the numeric rank: score 1 keeps the sky tint, score 2 the
// teal tint, and so on, so a player's badge colour is unchanged for a given score.
export const SKILL_STYLE: Record<Skill, string> = {
  NB: "bg-sky-100 text-sky-700 ring-sky-300",
  "BG-": "bg-teal-100 text-teal-700 ring-teal-300",
  BG: "bg-amber-100 text-amber-700 ring-amber-300",
  N: "bg-rose-100 text-rose-700 ring-rose-300",
};
