/**
 * Team Battle — deterministic team assignment + standings.
 *
 * Lives in `shared/` because BOTH sides compute from it:
 *  - the server deals teams once when it builds the classroom summary,
 *  - the client aggregates per-player scores into team totals for display.
 *
 * Assignment is a pure function of (usernames, teamCount, seed, abilities) so the host's
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

/** Lowercased username → ability rating (higher = stronger). */
export type TeamAbilities = Record<string, number>;

function hasAbilitySpread(names: string[], abilities: TeamAbilities | undefined): abilities is TeamAbilities {
  if (!abilities) return false;
  const known = names.map((n) => abilities[n.toLowerCase()]).filter((v) => typeof v === 'number');
  return known.length > 0 && new Set(known).size > 1;
}

function abilityOf(name: string, abilities: TeamAbilities | undefined): number {
  const value = abilities?.[name.toLowerCase()];
  return typeof value === 'number' ? value : 0;
}

/**
 * Deal players into balanced teams.
 *
 * Usernames are sorted before shuffling so the result does not depend on
 * socket join order (which differs per client); the seed (game code) provides
 * the fairness randomness. With ability data the shuffled roster is ranked
 * strongest first and snake-drafted (A B B A A B…), so no team stacks the
 * strong readers; without it, round-robin over the shuffle. Either way sizes
 * stay within one player of each other.
 */
export function assignTeams(
  usernames: string[],
  teamCount: number,
  seed: string,
  abilities?: TeamAbilities
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
  if (!hasAbilitySpread(shuffled, abilities)) {
    shuffled.forEach((name, i) => {
      teams[i % count].memberNames.push(name);
    });
    return teams;
  }
  const ranked = shuffled
    .map((name, order) => ({ name, order, ability: abilityOf(name, abilities) }))
    .sort((a, b) => b.ability - a.ability || a.order - b.order);
  ranked.forEach(({ name }, i) => {
    const lap = Math.floor(i / count);
    const slot = i % count;
    teams[lap % 2 === 0 ? slot : count - 1 - slot].memberNames.push(name);
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

/**
 * Keep an existing team assignment and seat only the students it does not know.
 *
 * `assignTeams` sorts and seeded-shuffles the WHOLE roster, so it is stable for
 * a fixed set of names and violently unstable for a growing one: one student
 * arriving late re-deals every other child. That was harmless while teams
 * existed only on the results screen — the roster was final by then — and is
 * not harmless now that the projector paints them live. A class would watch
 * itself change colour mid-round.
 *
 * So the first deal of a session is the assignment, and every later reconcile
 * is additive:
 *  - a student already seated NEVER moves, whatever else changed;
 *  - a student absent this round keeps their seat (wifi drops, bathroom passes);
 *  - a newcomer joins the smallest team; among equal sizes the weaker one
 *    (lowest ability total) when ability is known, then the lowest team id, so
 *    the result is a pure function of the inputs on every client.
 *
 * The one case that re-deals is the teacher changing the team count between
 * rounds: there is no honest way to map 2 teams onto 4, and the class expects a
 * fresh split.
 */
export function reconcileTeams(
  existing: ClassroomTeam[] | undefined,
  usernames: string[],
  teamCount: number,
  seed: string,
  abilities?: TeamAbilities
): ClassroomTeam[] {
  const count = clampTeamCount(teamCount);
  if (!existing?.length || existing.length !== count) {
    return assignTeams(usernames, count, seed, abilities);
  }

  const teams: ClassroomTeam[] = existing.map((team) => ({
    id: team.id,
    memberNames: [...team.memberNames],
  }));
  const seated = new Set(
    teams.flatMap((team) => team.memberNames.map((name) => name.toLowerCase()))
  );

  // Sorted so the seating order — and therefore which newcomer lands on which
  // team — does not depend on socket join order.
  const newcomers = usernames
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seated.has(key)) return false;
      seated.add(key);
      return true;
    })
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const strength = (team: ClassroomTeam) =>
    team.memberNames.reduce((sum, member) => sum + abilityOf(member, abilities), 0);
  for (const name of newcomers) {
    const target = teams.reduce((best, team) => {
      const sizeDiff = team.memberNames.length - best.memberNames.length;
      if (sizeDiff !== 0) return sizeDiff < 0 ? team : best;
      return strength(team) < strength(best) ? team : best;
    });
    target.memberNames.push(name);
  }

  return teams;
}
