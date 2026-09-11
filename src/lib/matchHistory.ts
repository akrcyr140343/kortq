// Pure, read-only derivations for the in-session "ประวัติการเล่น" view.
//
// Everything here is computed from the finished-game `matches` already streamed
// to every client (sessions/current/matches). It NEVER writes, and it does not
// import or touch any Fair / matchmaking / gameplay logic — only the pure
// `stablePlayerIdentity` helper, which is a plain string function.
//
// Two-stage model, because a Match stores player ids + stable identities but no
// names (names live only on the live Player, and on the roster Profile):
//   A. resolve each match slot -> a stable identity (merges re-adds of the same
//      Profile, survives player deletion),
//   B. resolve an identity -> a display name for the UI only.
import type { Match, Player, Profile, Session } from "./types";
import { stablePlayerIdentity } from "./fairmatch";

export interface NamedIdentity {
  identity: string;
  name: string;
}

export interface RelationStat extends NamedIdentity {
  count: number;
}

export interface PlayerOption extends NamedIdentity {
  gamesPlayed: number;
  inSession: boolean; // still a live Player in this session
}

export interface PlayerSummary extends NamedIdentity {
  gamesPlayed: number;
  partners: RelationStat[]; // teammates, most-frequent first
  opponents: RelationStat[]; // faced across the net, most-frequent first
}

export interface TimelineGame {
  id: string;
  index: number; // 1-based, in finish order
  startedAt: number;
  finishedAt: number;
  teamA: NamedIdentity[];
  teamB: NamedIdentity[];
}

/**
 * Stage A — the stable identity for one slot of a finished game.
 *
 * Priority: the immutable identity snapshotted at finish (present on every
 * modern match) → the live player's identity (still in session) → the alias the
 * session retained when the player was removed → the raw id. The first three all
 * yield the canonical `profile:`/`player:` form, so a Profile re-add collapses
 * to one identity; the last keeps a long-gone, never-rostered player distinct.
 */
export function slotIdentity(
  id: string,
  stored: string | undefined,
  playersById: Map<string, Player>,
  session: Session | null,
): string {
  if (stored) return stored;
  const live = playersById.get(id);
  if (live) return stablePlayerIdentity(live);
  const alias = session?.fairPlayerIdentities?.[id];
  if (alias) return alias;
  return `player:${id}`;
}

/** Resolve a whole team's ids to identities (stored identities aligned by index). */
function teamIdentities(
  ids: string[],
  stored: string[] | undefined,
  playersById: Map<string, Player>,
  session: Session | null,
): string[] {
  return ids.map((id, i) => slotIdentity(id, stored?.[i], playersById, session));
}

/**
 * Stage B — identity → display name. Profiles form the base layer (covers a
 * player removed from the session whose Profile still exists); live players
 * overwrite it so the newest chosen name always wins for a re-add.
 */
export function buildNameByIdentity(
  players: Player[],
  profiles: Profile[],
): Map<string, string> {
  const byIdentity = new Map<string, string>();
  for (const pr of profiles) byIdentity.set(`profile:${pr.id}`, pr.name);
  for (const p of players) byIdentity.set(stablePlayerIdentity(p), p.name);
  return byIdentity;
}

/**
 * A name for an identity that has none resolvable. Keeps every identity visibly
 * distinct (a short id suffix) so two departed players never collapse into one
 * confusing label.
 */
export function fallbackName(identity: string): string {
  const raw = identity.replace(/^(profile:|player:)/, "");
  const tag = raw.length > 4 ? raw.slice(-4) : raw;
  return `ผู้เล่นที่ออกจากก๊วน · #${tag}`;
}

const nameOf = (identity: string, names: Map<string, string>): string =>
  names.get(identity) ?? fallbackName(identity);

const named = (identity: string, names: Map<string, string>): NamedIdentity => ({
  identity,
  name: nameOf(identity, names),
});

/** Per-identity game count across the whole session's finished games. */
function gamesByIdentity(
  matches: Match[],
  playersById: Map<string, Player>,
  session: Session | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const ids = [
      ...teamIdentities(m.teamA, m.teamAIdentities, playersById, session),
      ...teamIdentities(m.teamB, m.teamBIdentities, playersById, session),
    ];
    for (const identity of new Set(ids)) {
      counts.set(identity, (counts.get(identity) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * The people the picker offers: every live player (even with 0 games) plus
 * every identity that appears in match history (so a removed player stays
 * selectable). Sorted most-played first, then by name.
 */
export function buildPlayerOptions(
  players: Player[],
  matches: Match[],
  playersById: Map<string, Player>,
  session: Session | null,
  names: Map<string, string>,
): PlayerOption[] {
  const games = gamesByIdentity(matches, playersById, session);
  const liveIdentities = new Set(players.map((p) => stablePlayerIdentity(p)));
  const identities = new Set<string>([...liveIdentities, ...games.keys()]);

  const options = [...identities].map<PlayerOption>((identity) => ({
    ...named(identity, names),
    gamesPlayed: games.get(identity) ?? 0,
    inSession: liveIdentities.has(identity),
  }));

  return options.sort(
    (a, b) => b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name, "th"),
  );
}

/**
 * Partners and opponents for one identity, with counts. Scans each finished game
 * once: if the target is on a team, its team-mates are partners and the other
 * team are opponents.
 */
export function summarizePlayer(
  targetIdentity: string,
  matches: Match[],
  playersById: Map<string, Player>,
  session: Session | null,
  names: Map<string, string>,
): PlayerSummary {
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  let gamesPlayed = 0;

  const bump = (map: Map<string, number>, identity: string) =>
    map.set(identity, (map.get(identity) ?? 0) + 1);

  for (const m of matches) {
    const a = teamIdentities(m.teamA, m.teamAIdentities, playersById, session);
    const b = teamIdentities(m.teamB, m.teamBIdentities, playersById, session);
    const inA = a.includes(targetIdentity);
    const inB = b.includes(targetIdentity);
    if (!inA && !inB) continue;
    gamesPlayed++;
    const mine = inA ? a : b;
    const theirs = inA ? b : a;
    for (const id of mine) if (id !== targetIdentity) bump(partners, id);
    for (const id of theirs) bump(opponents, id);
  }

  const toStats = (map: Map<string, number>): RelationStat[] =>
    [...map.entries()]
      .map(([identity, count]) => ({ ...named(identity, names), count }))
      .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name, "th"));

  return {
    ...named(targetIdentity, names),
    gamesPlayed,
    partners: toStats(partners),
    opponents: toStats(opponents),
  };
}

/**
 * The whole session as an ordered list of games (Team A vs Team B), oldest
 * first — matches arrive ordered by finishedAt, but this re-sorts defensively.
 */
export function buildTimeline(
  matches: Match[],
  playersById: Map<string, Player>,
  session: Session | null,
  names: Map<string, string>,
): TimelineGame[] {
  return [...matches]
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .map((m, i) => ({
      id: m.id,
      index: i + 1,
      startedAt: m.startedAt,
      finishedAt: m.finishedAt,
      teamA: teamIdentities(m.teamA, m.teamAIdentities, playersById, session).map((id) => named(id, names)),
      teamB: teamIdentities(m.teamB, m.teamBIdentities, playersById, session).map((id) => named(id, names)),
    }));
}
