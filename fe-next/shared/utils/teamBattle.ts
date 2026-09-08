/**
 * Team Battle — deterministic team assignment + standings.
 *
 * Lives in `shared/` because BOTH sides compute from it:
 *  - the server deals teams once when it builds the classroom summary,
 *  - the client aggregates per-player scores into team totals for display.
 *
 * Assignment is a pure function of (usernames, teamCount, seed) so the host's
 * projected screen and every student's phone agree on the rosters WITHOUT a
 * server round-trip — flaky school wifi is the whole reason this exists.
 */

export type PlayStyle = 'ffa' | 'teams';

export interface TeamBattleSettings {
  playStyle: PlayStyle;
  /** Number of teams when playStyle === 'teams'. Clamped to [2, 4]. */
  teamCount?: number;
}

export interface ClassroomTeam {
  /** 0-based team index — display name is a translation (`Team 1`…). */
  id: number;
  memberNames: string[];
}

export interface TeamStanding {
  id: number;
  memberNames: string[];
  /** Sum of member scores. */
  totalScore: number;
  /** Per-member contribution, highest first. */
  members: Array<{ username: string; score: number }>;
}

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 4;
export const DEFAULT_TEAM_COUNT = 2;

export function clampTeamCount(count: number | undefined): number {
  if (!count || Number.isNaN(count)) return DEFAULT_TEAM_COUNT;
  return Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(count)));
}

/**
 * Deterministic seeded shuffle (mulberry32 — tiny, stable across Node and
 * browsers). Same inputs → same order on the server and every client.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deal players into balanced teams.
 *
 * Usernames are sorted before shuffling so the result does not depend on
 * socket join order (which differs per client); the seed (game code) provides
 * the fairness randomness. Dealing round-robin after the shuffle keeps team
 * sizes within one player of each other.
 */
export function assignTeams(
  usernames: string[],
  teamCount: number,
  seed: string
): ClassroomTeam[] {
  const count = clampTeamCount(teamCount);
  const teams: ClassroomTeam[] = Array.from({ length: count }, (_, id) => ({
    id,
    memberNames: [],
  }));
  // Case-insensitive dedupe: 'Ana' and 'ana' are the same student.
  const seen = new Set<string>();
  const unique = usernames
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const shuffled = seededShuffle(unique, seed || 'lexiclash');
  shuffled.forEach((name, i) => {
    teams[i % count].memberNames.push(name);
  });
  return teams;
}

/**
 * Aggregate per-player final scores into ranked team standings (highest
 * first). Players missing from the score map count as 0 — a student whose
 * wifi dropped mid-game still belongs to their team.
 */
export function computeTeamStandings(
  teams: ClassroomTeam[],
  scores: Array<{ username: string; score: number }>
): TeamStanding[] {
  const byName = new Map(scores.map((s) => [s.username.toLowerCase(), s.score]));
  const standings = teams.map((team) => {
    const members = team.memberNames
      .map((username) => ({
        username,
        score: byName.get(username.toLowerCase()) ?? 0,
      }))
      .sort((a, b) => b.score - a.score);
    return {
      id: team.id,
      memberNames: team.memberNames,
      totalScore: members.reduce((sum, m) => sum + m.score, 0),
      members,
    };
  });
  return standings.sort((a, b) => b.totalScore - a.totalScore);
}
