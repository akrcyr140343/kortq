// Domain types for KortQ

export type Skill = "S" | "A" | "B" | "C";

export type PlayerStatus = "waiting" | "playing" | "resting";

export interface Player {
  id: string;
  name: string;
  skill: Skill;
  score: number; // derived from skill: S=4, A=3, B=2, C=1
  status: PlayerStatus;
  courtId: string | null; // set while status === "playing"
  createdAt: number; // ms — first time added
  queuedAt: number; // ms — last time entered the waiting queue (used for FIFO fairness)
}

export interface Court {
  id: string;
  index: number; // 1-based court number
  teamA: string[]; // player ids
  teamB: string[]; // player ids
  startedAt: number | null;
}

export interface Session {
  active: boolean;
  courtCount: number; // 2 or 3
  createdAt: number;
}

export const SKILL_SCORE: Record<Skill, number> = {
  S: 4,
  A: 3,
  B: 2,
  C: 1,
};

export const SKILLS: Skill[] = ["S", "A", "B", "C"];

// Tailwind classes for each skill badge.
export const SKILL_STYLE: Record<Skill, string> = {
  S: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  A: "bg-rose-500/20 text-rose-300 ring-rose-500/40",
  B: "bg-sky-500/20 text-sky-300 ring-sky-500/40",
  C: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
};
