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
}

export interface Court {
  id: string;
  index: number; // 1-based court number
  teamA: string[]; // player ids
  teamB: string[]; // player ids
  startedAt: number | null; // ms when the current game started (drives the court timer)
}

export interface Session {
  active: boolean;
  courtCount: number; // 2 or 3
  createdAt: number;
  feePerHead?: number; // baht each player owes for the session (0 = not set yet)
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
