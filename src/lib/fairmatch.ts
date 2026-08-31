// Fair matchmaking — the "จับแฟร์" button.
//
// Pure, Firestore-free scoring/selection so weights are easy to tune and unit
// test. The existing FIFO (autoAssign), random (randomAssign) and manual paths
// are untouched; this is an additional strategy layered on top of the same
// Player/Match data.
//
// Goal, in three stages:
//   1. Fairness  — players who have played less and waited longer go first.
//   2. Variety   — avoid replaying the same foursomes / partners.
//   3. Balance   — split the chosen four into skill-even teams.

import type { Match, Player } from "./types";
import type { TeamSplit } from "./matchmaking";

// ---- Tunable weights -------------------------------------------------------
// Higher weight = the factor matters more. Kept as named constants (no magic
// numbers) so the club can re-balance behaviour later without touching logic.

/** Penalty weights when choosing WHICH four players play next. */
export const FAIR_WEIGHTS = {
  sameFoursome: 100, // the exact same 4 recently played together — punish hard
  coPlayer: 12, // per pair that keeps meeting (decayed by recency)
  // Inside the candidate pool everyone is already within 1 game of the minimum
  // (see buildCandidatePool), so waiting time is the primary fairness signal and
  // must outweigh the small remaining games gap — otherwise a just-arrived
  // 0-game player could jump ahead of someone who waited through a whole game.
  waiting: 6, // per MINUTE waited less than the longest waiter in the pool
  gamesPlayed: 4, // per game already played — favours those who played less
};

/** Penalty weights when splitting the chosen four into team A / team B. */
export const TEAM_WEIGHTS = {
  skillDiff: 10, // per point of skill-score gap between the teams
  repeatPartner: 6, // per past game the pairing were partners (decayed)
};

// Only the most recent games carry weight; older ones matter little and this
// bounds the work. C(MAX_POOL,4) combinations are scored, so keep the pool
// small enough to stay trivial (C(12,4) = 495).
const RECENT_WINDOW = 20;
const MAX_POOL = 12;

// Waiting is measured in minutes waited *less* than the longest waiter in the
// pool. Sub-minute gaps are effectively equal (so near-equal waits let variety
// decide the pick); the cap stops a just-joined player from being frozen out
// forever once others rack up games.
const WAIT_UNIT_MS = 60_000;
const WAIT_CAP_MINUTES = 15;

/** Standard "not enough players" error — matches the wording used elsewhere. */
export const NOT_ENOUGH_WAITING = "ต้องมีผู้เล่นในคิว 'รอ' อย่างน้อย 4 คน";

// ---- Small helpers ---------------------------------------------------------

function scoreSum(players: Player[]): number {
  return players.reduce((total, p) => total + p.score, 0);
}

/**
 * age 0 = most recent finished game. Gentle linear falloff to 0 at the window
 * edge (1.0, 0.95, 0.90, …). Deliberately shallow: a steep decay would make
 * reusing an *older* pair as cheap as splitting up a very recent one, which
 * hides the difference between clustering the same group and cross-mixing.
 */
function recencyWeight(age: number): number {
  return Math.max(0, (RECENT_WINDOW - age) / RECENT_WINDOW);
}

/**
 * Minutes each pool player waited *less* than the longest waiter (0 = the
 * longest waiter), capped. Near-equal queue times collapse to ~0 for everyone,
 * so variety — not a rank artefact — decides between otherwise-fair picks.
 */
function waitPenalties(pool: Player[]): Map<string, number> {
  const oldest = Math.min(...pool.map((p) => p.queuedAt));
  const out = new Map<string, number>();
  for (const p of pool) {
    const minutes = (p.queuedAt - oldest) / WAIT_UNIT_MS;
    out.set(p.id, Math.min(WAIT_CAP_MINUTES, minutes));
  }
  return out;
}

/** Most-recent-first, capped to the recency window, with a cached id set. */
function recentMatches(matches: Match[]): Array<{ set: Set<string>; teamA: Set<string>; teamB: Set<string> }> {
  return [...matches]
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, RECENT_WINDOW)
    .map((m) => ({
      set: new Set(m.players),
      teamA: new Set(m.teamA),
      teamB: new Set(m.teamB),
    }));
}

/** All 4-player combinations of `items` (index order preserved). */
function combinationsOfFour<T>(items: T[]): T[][] {
  const out: T[][] = [];
  const n = items.length;
  for (let a = 0; a < n - 3; a++)
    for (let b = a + 1; b < n - 2; b++)
      for (let c = b + 1; c < n - 1; c++)
        for (let d = c + 1; d < n; d++) out.push([items[a], items[b], items[c], items[d]]);
  return out;
}

// ---- Step 1 — candidate pool ----------------------------------------------

/**
 * Build the pool of players eligible to be picked next.
 *
 * Base rule: everyone whose gamesPlayed ≤ minGames + 1, so heavy players can't
 * jump the fresher ones, but the "+1" keeps long-waiters from being frozen out.
 * If that leaves fewer than 4, widen to the fairest remaining players
 * (fewest games, then longest wait). Finally cap at MAX_POOL by the same
 * fairness order to bound the combination search.
 */
export function buildCandidatePool(waiting: Player[]): Player[] {
  const byFairness = (a: Player, b: Player) =>
    a.gamesPlayed - b.gamesPlayed || a.queuedAt - b.queuedAt;

  const w = waiting.filter((p) => p.status === "waiting");
  if (w.length <= 4) return [...w];

  const minGames = Math.min(...w.map((p) => p.gamesPlayed));
  const pool = w.filter((p) => p.gamesPlayed <= minGames + 1);

  if (pool.length < 4) {
    // Widen: keep the constrained pool, then top up with the next fairest.
    const sorted = [...w].sort(byFairness);
    const seen = new Set(pool.map((p) => p.id));
    for (const p of sorted) {
      if (pool.length >= 4) break;
      if (!seen.has(p.id)) pool.push(p);
    }
  }

  return [...pool].sort(byFairness).slice(0, MAX_POOL);
}

// ---- Step 4 — pick the fairest / most varied four -------------------------

/** Penalty for one foursome. Lower is better. Exported for tuning/tests. */
export function foursomePenalty(
  four: Player[],
  waitMinutes: Map<string, number>,
  recent: ReturnType<typeof recentMatches>,
): number {
  const ids = four.map((p) => p.id);

  // Exact same 4 as a recent game.
  let sameFoursome = 0;
  // Any pair that shared a recent game.
  let coPlayer = 0;
  for (let age = 0; age < recent.length; age++) {
    const m = recent[age];
    if (m.set.size === 4 && ids.every((id) => m.set.has(id))) {
      sameFoursome += recencyWeight(age);
    }
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        if (m.set.has(ids[i]) && m.set.has(ids[j])) coPlayer += recencyWeight(age);
  }

  const waitPenalty = ids.reduce((s, id) => s + (waitMinutes.get(id) ?? 0), 0);
  const gamesPenalty = four.reduce((s, p) => s + p.gamesPlayed, 0);

  return (
    FAIR_WEIGHTS.sameFoursome * sameFoursome +
    FAIR_WEIGHTS.coPlayer * coPlayer +
    FAIR_WEIGHTS.waiting * waitPenalty +
    FAIR_WEIGHTS.gamesPlayed * gamesPenalty
  );
}

/**
 * Choose the four players who should play next. Throws if fewer than 4 are
 * waiting (same contract as autoAssign/randomAssign). With no match history
 * this degrades to pure fairness (waiting + gamesPlayed), i.e. FIFO-ish.
 */
export function selectFairFour(waiting: Player[], matches: Match[]): Player[] {
  const w = waiting.filter((p) => p.status === "waiting");
  if (w.length < 4) throw new Error(NOT_ENOUGH_WAITING);

  const pool = buildCandidatePool(w);
  if (pool.length === 4) return pool; // only one possible foursome

  const waitMinutes = waitPenalties(pool);
  const recent = recentMatches(matches);

  let best: Player[] | null = null;
  let bestScore = Infinity;
  let bestWait = Infinity;
  for (const combo of combinationsOfFour(pool)) {
    const score = foursomePenalty(combo, waitMinutes, recent);
    // Summed wait deficit — smaller means this four waited longer overall.
    const wait = combo.reduce((s, p) => s + (waitMinutes.get(p.id) ?? 0), 0);
    // Tie-break toward the longer waiters (smaller deficit) so fairness never
    // loses to variety when penalties are equal.
    if (score < bestScore || (score === bestScore && wait < bestWait)) {
      best = combo;
      bestScore = score;
      bestWait = wait;
    }
  }
  return best!;
}

// ---- Step 5 — split the four into skill-even, fresh-partner teams ---------

/** How often `pair` were partners (same team) across recent games. */
function partnerRepeat(pair: Player[], recent: ReturnType<typeof recentMatches>): number {
  const [x, y] = pair;
  let n = 0;
  for (let age = 0; age < recent.length; age++) {
    const m = recent[age];
    const together =
      (m.teamA.has(x.id) && m.teamA.has(y.id)) || (m.teamB.has(x.id) && m.teamB.has(y.id));
    if (together) n += recencyWeight(age);
  }
  return n;
}

/**
 * Split exactly four into two pairs. Prefers even skill, then breaks up
 * partners who keep playing together. Only 3 pairings exist, so check all.
 * Falls back gracefully when there's no history (pure skill balance).
 */
export function fairSplitOfFour(four: Player[], matches: Match[]): TeamSplit {
  const recent = recentMatches(matches);
  const [a, b, c, d] = four;
  const options: Array<[Player[], Player[]]> = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];

  let best: (TeamSplit & { penalty: number }) | null = null;
  for (const [teamA, teamB] of options) {
    const diff = Math.abs(scoreSum(teamA) - scoreSum(teamB));
    const repeat = partnerRepeat(teamA, recent) + partnerRepeat(teamB, recent);
    const penalty = TEAM_WEIGHTS.skillDiff * diff + TEAM_WEIGHTS.repeatPartner * repeat;
    if (best === null || penalty < best.penalty || (penalty === best.penalty && diff < best.diff)) {
      best = { teamA, teamB, diff, penalty };
    }
  }
  return { teamA: best!.teamA, teamB: best!.teamB, diff: best!.diff };
}

// ---- Composition -----------------------------------------------------------

/**
 * Full "จับแฟร์" plan: pick four, then split them. Returns a TeamSplit ready
 * for the court, reusing the same shape as balanceTeams(). Throws if fewer
 * than 4 players are waiting.
 */
export function planFairMatch(waiting: Player[], matches: Match[]): TeamSplit {
  const four = selectFairFour(waiting, matches);
  return fairSplitOfFour(four, matches);
}
