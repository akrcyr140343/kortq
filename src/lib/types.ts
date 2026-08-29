// Domain types for KortQ

// Skill tiers, weakest → strongest. BG = beginner (มือใหม่), S = strongest (เก่งสุด).
export type Skill = "BG" | "BG+" | "N" | "S";

export type PlayerStatus = "waiting" | "playing" | "resting";

export interface Player {
  id: string;
  name: string;
  skill: Skill;
  score: number; // derived from skill: BG=1, BG+=2, N=3, S=4 (used for matchmaking only)
  status: PlayerStatus;
  courtId: string | null; // set while status === "playing"
  gamesPlayed: number; // number of games finished this session
  createdAt: number; // ms — first time added
  queuedAt: number; // ms — last time entered the waiting queue (used for FIFO fairness)
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
}

export const SKILL_SCORE: Record<Skill, number> = {
  BG: 1,
  "BG+": 2,
  N: 3,
  S: 4,
};

// Order shown in the skill picker (weakest → strongest).
export const SKILLS: Skill[] = ["BG", "BG+", "N", "S"];

// Tailwind classes for each skill badge (light theme — soft tint + readable text).
export const SKILL_STYLE: Record<Skill, string> = {
  BG: "bg-sky-100 text-sky-700 ring-sky-300",
  "BG+": "bg-teal-100 text-teal-700 ring-teal-300",
  N: "bg-amber-100 text-amber-700 ring-amber-300",
  S: "bg-rose-100 text-rose-700 ring-rose-300",
};
