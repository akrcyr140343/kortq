import type { Player } from "./types";

export interface TeamSplit {
  teamA: Player[];
  teamB: Player[];
  diff: number; // absolute score difference between the two teams
}

function sum(players: Player[]): number {
  return players.reduce((total, p) => total + p.score, 0);
}

/**
 * Split exactly 4 players into two 2-player teams so the total-score
 * difference between the teams is as small as possible.
 * There are only 3 distinct ways to pair 4 players, so we check all of them.
 */
export function bestSplitOfFour(four: Player[]): TeamSplit {
  const [a, b, c, d] = four;
  const options: Array<[Player[], Player[]]> = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];

  let best: TeamSplit | null = null;
  for (const [teamA, teamB] of options) {
    const diff = Math.abs(sum(teamA) - sum(teamB));
    if (best === null || diff < best.diff) {
      best = { teamA, teamB, diff };
    }
  }
  return best!;
}

/**
 * Balance an arbitrary (even) selection of players into two teams.
 * For the common case of 4 players this finds the optimal pairing;
 * for 2 it is a single-vs-single game.
 */
export function balanceTeams(players: Player[]): TeamSplit {
  if (players.length === 4) {
    return bestSplitOfFour(players);
  }
  const half = Math.ceil(players.length / 2);
  const teamA = players.slice(0, half);
  const teamB = players.slice(half);
  return { teamA, teamB, diff: Math.abs(sum(teamA) - sum(teamB)) };
}
