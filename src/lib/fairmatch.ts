// Pure Fair engine. Manual/random balancing never imports this policy.
import type { Match, Player } from "./types";
import type { TeamSplit } from "./matchmaking";

export const FAIR_ALGORITHM_VERSION = "fair-v4";
export const FAIR_SCHEMA_VERSION = 1;
export const FAIR_PARAMETERS = {
  overdueAfterSkips: 2,
  recentPlayerGames: 3,
  skillSlack: 2,
  alternativeCount: 5,
  relationshipFormula: "lifetimeCount + max(0, recentPlayerGames - age)^2",
  ageDefinition: "min(completed games each player played since their latest encounter in this role)",
  overdueOrder: ["fairSkips descending", "queuedAt ascending", "player ID ascending"],
  skipPolicy: "fairSkips change only at game start (startGame): the four who start reset to 0, each eligible waiting player not in that game +1; Fair/manual/promote/substitute/cancel/finish never change it; Next Up reservations are excluded",
  selectionOrder: ["forced membership", "coPlayer", "queueTimeSum", "gamesPlayedSum", "player IDs"],
  splitOrder: ["skillDiff <= bestSkillDiff + skillSlack", "relationshipRepeat", "skillDiff", "option index"],
} as const;
export const NOT_ENOUGH_WAITING = "ต้องมีผู้เล่นในคิว 'รอ' อย่างน้อย 4 คน";

export const stablePlayerIdentity = (p: Pick<Player, "id" | "profileId">): string =>
  p.profileId ? `profile:${p.profileId}` : `player:${p.id}`;
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const key = (ids: string[]) => JSON.stringify([...ids].sort(compareId));

interface Encounter {
  count: number;
  lastAppearances: [number, number];
  lastMatchId: string;
}
export interface RelationshipScore {
  count: number;
  age: number | null;
  recentBonus: number;
  total: number;
  lastMatchId: string | null;
}
interface PairHistory {
  identities: [string, string];
  coPlayer?: Encounter;
  teammate?: Encounter;
  opponent?: Encounter;
}
export interface IndexedPair {
  identities: [string, string];
  coPlayer: RelationshipScore;
  teammate: RelationshipScore;
  opponent: RelationshipScore;
}
export interface FairHistoryIndex {
  pairs: Map<string, IndexedPair>;
  foursomes: Map<string, number>;
}
const emptyScore = (): RelationshipScore => ({ count: 0, age: null, recentBonus: 0, total: 0, lastMatchId: null });

/** Scan the whole session once. Recency uses personal appearances, not gamesPlayed
 * (which can reset on re-add), wall time, or unrelated games on other courts.
 * One encounter costs 10/5/2/1 after 0/1/2/3+ intervening games for BOTH players.
 * Every occurrence contributes 1; the latest encounter adds one recency bonus.
 */
export function indexFairHistory(matches: Match[], aliases: Record<string, string>): FairHistoryIndex {
  const appearances = new Map<string, number>();
  const history = new Map<string, PairHistory>();
  const foursomes = new Map<string, number>();
  const ordered = [...matches].sort((a, b) => a.finishedAt - b.finishedAt || compareId(a.id, b.id));
  const identity = (id: string) => aliases[id] ?? `player:${id}`;
  for (const match of ordered) {
    const teamA = match.teamAIdentities ?? match.teamA.map(identity);
    const teamB = match.teamBIdentities ?? match.teamB.map(identity);
    const all = [...teamA, ...teamB];
    if (teamA.length !== 2 || teamB.length !== 2 || new Set(all).size !== 4 || !Number.isFinite(match.finishedAt)) {
      throw new Error("ประวัติเกมไม่สมบูรณ์ จับแฟร์ไม่ได้ — ตรวจสอบประวัติก่อน");
    }
    for (const id of all) appearances.set(id, (appearances.get(id) ?? 0) + 1);
    const fourKey = key(all);
    foursomes.set(fourKey, (foursomes.get(fourKey) ?? 0) + 1);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const identities = [all[i], all[j]].sort(compareId) as [string, string];
      const pairKey = key(identities);
      const pair: PairHistory = history.get(pairKey) ?? { identities };
      const role = (i < 2) === (j < 2) ? "teammate" : "opponent";
      for (const field of ["coPlayer", role] as const) {
        pair[field] = {
          count: (pair[field]?.count ?? 0) + 1,
          lastAppearances: [appearances.get(identities[0])!, appearances.get(identities[1])!],
          lastMatchId: match.id,
        };
      }
      history.set(pairKey, pair);
    }
  }
  const pairs = new Map<string, IndexedPair>();
  for (const [pairKey, pair] of history) {
    const score = (encounter?: Encounter): RelationshipScore => {
      if (!encounter) return emptyScore();
      const age = Math.min(...pair.identities.map((id, i) => appearances.get(id)! - encounter.lastAppearances[i]));
      const recentBonus = Math.max(0, FAIR_PARAMETERS.recentPlayerGames - age) ** 2;
      return { count: encounter.count, age, recentBonus, total: encounter.count + recentBonus, lastMatchId: encounter.lastMatchId };
    };
    pairs.set(pairKey, { identities: pair.identities, coPlayer: score(pair.coPlayer), teammate: score(pair.teammate), opponent: score(pair.opponent) });
  }
  return { pairs, foursomes };
}

export interface SelectionScore {
  coPlayer: number;
  lifetimeOccurrences: number;
  recentBonus: number;
  distinctRepeatedPairs: number;
  exactFoursomeOccurrences: number; // diagnostic only, never an extra penalty
  queueTimeSum: number;
  waitingDeficitMinutes: number; // uncapped, diagnostic only
  gamesPlayedSum: number;
}
interface Alternative {
  players: string[];
  score: SelectionScore;
}
export interface SplitOption {
  teamA: string[];
  teamB: string[];
  repeatTeammate: number;
  repeatOpponent: number;
  totalRepeat: number;
  skillDiff: number;
  passesSkillGuard: boolean;
  chosen: boolean;
}

/** No games-based eligibility gate and no truncated candidate pool. */
export function buildCandidatePool(waiting: Player[]): Player[] {
  const pool = waiting.filter((p) => p.status === "waiting" && p.courtId == null).sort((a, b) => compareId(a.id, b.id));
  if (new Set(pool.map(stablePlayerIdentity)).size !== pool.length) {
    throw new Error("มีผู้เล่นคนเดียวกันซ้ำในคิว กรุณาตรวจสอบก่อนจับแฟร์");
  }
  for (const p of pool) {
    if (!Number.isFinite(p.queuedAt) || !Number.isInteger(p.gamesPlayed) || p.gamesPlayed < 0 ||
        !Number.isInteger(p.score) || p.score < 1 || p.score > 4 ||
        !Number.isSafeInteger(p.fairSkips ?? 0) || (p.fairSkips ?? 0) < 0) {
      throw new Error("ข้อมูลผู้เล่นไม่สมบูรณ์ กรุณาตรวจสอบก่อนจับแฟร์");
    }
  }
  return pool;
}

function* choose<T>(items: T[], count: number, start = 0, prefix: T[] = []): Generator<T[]> {
  if (count === 0) { yield prefix; return; }
  for (let i = start; i <= items.length - count; i++) yield* choose(items, count - 1, i + 1, [...prefix, items[i]]);
}

/**
 * `currentFoursome` (ids of the set already staged) turns a Next Up "จับแฟร์ใหม่"
 * into a cursor over the SAME ranked alternatives instead of always re-picking the
 * best: it advances to the next-ranked candidate after the current one and wraps
 * at the end of the group the engine keeps (alternativeCount + 1). The ranking,
 * forced/overdue guarantee and split logic are untouched, so every candidate —
 * including the rerolled one — still contains all overdue players and is split by
 * the same teammate/opponent-repeat + skill-guard rules. Court Fair and the first
 * Next Up "จับแฟร์" pass no `currentFoursome` and keep the best (top[0]).
 */
export function planFairMatch(
  waiting: Player[],
  matches: Match[],
  storedAliases: Record<string, string> = {},
  currentFoursome?: string[],
) {
  const pool = buildCandidatePool(waiting);
  if (pool.length < 4) throw new Error(NOT_ENOUGH_WAITING);
  const aliases = { ...storedAliases };
  for (const p of pool) aliases[p.id] = stablePlayerIdentity(p);
  const index = indexFairHistory(matches, aliases);
  const oldest = Math.min(...pool.map((p) => p.queuedAt));
  const overdue = pool.filter((p) => (p.fairSkips ?? 0) >= FAIR_PARAMETERS.overdueAfterSkips)
    .sort((a, b) => (b.fairSkips ?? 0) - (a.fairSkips ?? 0) || a.queuedAt - b.queuedAt || compareId(a.id, b.id));
  const forced = overdue.slice(0, 4);
  const forcedIds = new Set(forced.map((p) => p.id));
  const remaining = pool.filter((p) => !forcedIds.has(p.id));
  const relation = (a: Player, b: Player, role: "coPlayer" | "teammate" | "opponent") =>
    index.pairs.get(key([stablePlayerIdentity(a), stablePlayerIdentity(b)]))?.[role] ?? emptyScore();
  const selectionScore = (four: Player[]): SelectionScore => {
    let lifetimeOccurrences = 0, recentBonus = 0, distinctRepeatedPairs = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const s = relation(four[i], four[j], "coPlayer");
      lifetimeOccurrences += s.count;
      recentBonus += s.recentBonus;
      if (s.count) distinctRepeatedPairs++;
    }
    return {
      coPlayer: lifetimeOccurrences + recentBonus, lifetimeOccurrences, recentBonus, distinctRepeatedPairs,
      exactFoursomeOccurrences: index.foursomes.get(key(four.map(stablePlayerIdentity))) ?? 0,
      queueTimeSum: four.reduce((sum, p) => sum + p.queuedAt, 0),
      waitingDeficitMinutes: four.reduce((sum, p) => sum + (p.queuedAt - oldest) / 60_000, 0),
      gamesPlayedSum: four.reduce((sum, p) => sum + p.gamesPlayed, 0),
    };
  };
  const compare = (a: Alternative, b: Alternative) =>
    a.score.coPlayer - b.score.coPlayer || a.score.queueTimeSum - b.score.queueTimeSum ||
    a.score.gamesPlayedSum - b.score.gamesPlayedSum || compareId(key(a.players), key(b.players));
  const top: Alternative[] = [];
  let candidateCount = 0;
  for (const rest of choose(remaining, 4 - forced.length)) {
    const four = [...forced, ...rest].sort((a, b) => compareId(a.id, b.id));
    const candidate = { players: four.map((p) => p.id), score: selectionScore(four) };
    candidateCount++;
    const at = top.findIndex((other) => compare(candidate, other) < 0);
    if (at >= 0) top.splice(at, 0, candidate);
    else if (top.length < FAIR_PARAMETERS.alternativeCount + 1) top.push(candidate);
    if (top.length > FAIR_PARAMETERS.alternativeCount + 1) top.pop();
  }
  // top is sorted best → worst. Default (initial Fair / Court Fair) takes the best.
  // A Next Up reroll advances the cursor to the candidate after the current staged
  // set and wraps; if the current set isn't among the ranked alternatives it falls
  // back to the best (which necessarily differs); with a single candidate it holds.
  const selectRerolled = (): Alternative => {
    if (!currentFoursome || currentFoursome.length !== 4 || top.length <= 1) return top[0];
    const current = key(currentFoursome);
    const idx = top.findIndex((c) => key(c.players) === current);
    if (idx < 0) return top[0];
    return top[(idx + 1) % top.length];
  };
  const selected = selectRerolled();
  const alternatives = top.filter((c) => c !== selected); // ≤ 5 (top holds ≤ 6)
  const byId = new Map(pool.map((p) => [p.id, p]));
  const [a, b, c, d] = selected.players.map((id) => byId.get(id)!);
  const teams: Array<[Player[], Player[]]> = [[[a, b], [c, d]], [[a, c], [b, d]], [[a, d], [b, c]]];
  const sum = (team: Player[]) => team.reduce((s, p) => s + p.score, 0);
  const bestSkillDiff = Math.min(...teams.map(([ta, tb]) => Math.abs(sum(ta) - sum(tb))));
  const splitOptions: SplitOption[] = teams.map(([ta, tb]) => {
    const repeatTeammate = relation(ta[0], ta[1], "teammate").total + relation(tb[0], tb[1], "teammate").total;
    let repeatOpponent = 0;
    for (const x of ta) for (const y of tb) repeatOpponent += relation(x, y, "opponent").total;
    const skillDiff = Math.abs(sum(ta) - sum(tb));
    return { teamA: ta.map((p) => p.id), teamB: tb.map((p) => p.id), repeatTeammate, repeatOpponent,
      totalRepeat: repeatTeammate + repeatOpponent, skillDiff,
      passesSkillGuard: skillDiff <= bestSkillDiff + FAIR_PARAMETERS.skillSlack, chosen: false };
  });
  let chosen = -1;
  for (let i = 0; i < splitOptions.length; i++) {
    const option = splitOptions[i];
    if (!option.passesSkillGuard) continue;
    if (chosen < 0 || option.totalRepeat < splitOptions[chosen].totalRepeat ||
        (option.totalRepeat === splitOptions[chosen].totalRepeat && option.skillDiff < splitOptions[chosen].skillDiff)) chosen = i;
  }
  splitOptions[chosen].chosen = true;
  const split: TeamSplit = { teamA: teams[chosen][0], teamB: teams[chosen][1], diff: splitOptions[chosen].skillDiff };
  const poolIdentities = new Set(pool.map(stablePlayerIdentity));
  return {
    ...split,
    diagnostics: {
      algorithmVersion: FAIR_ALGORITHM_VERSION, schemaVersion: FAIR_SCHEMA_VERSION, parameters: FAIR_PARAMETERS,
      historyCount: matches.length,
      pool: pool.map((p) => ({ id: p.id, identity: stablePlayerIdentity(p), name: p.name, skill: p.skill, score: p.score,
        gamesPlayed: p.gamesPlayed, queuedAt: p.queuedAt, fairSkips: p.fairSkips ?? 0,
        waitingDeficitMinutes: (p.queuedAt - oldest) / 60_000 })),
      overdueIds: overdue.map((p) => p.id), forcedIds: forced.map((p) => p.id), capacityException: overdue.length > 4,
      candidateCount, selected, alternatives, bestSkillDiff, splitOptions,
      // Missing pairs/roles are zero. Store each relevant aggregate once, not
      // raw history or copies per alternative; these replay every candidate/split.
      pairInputs: [...index.pairs.values()].filter((p) => p.identities.every((id) => poolIdentities.has(id)))
        .map((p) => ({ identities: p.identities, coPlayer: p.coPlayer,
          ...(p.teammate.count ? { teammate: p.teammate } : {}),
          ...(p.opponent.count ? { opponent: p.opponent } : {}),
        })),
      exactFoursomeInputs: [...index.foursomes].filter(([k]) => (JSON.parse(k) as string[]).every((id) => poolIdentities.has(id)))
        .map(([k, count]) => ({ identities: JSON.parse(k) as string[], count })),
    },
  };
}
