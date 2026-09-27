/**
 * Pure helper for the "you vs your league" emphasis on the home screen.
 *
 * Given a player's position in their weekly league, returns which zone they're
 * in and how many positions away they are from the promotion line (climbing)
 * or the relegation line (the drop) — the motivational hook that makes league
 * standing feel actionable rather than abstract.
 *
 * Mirrors backend `leagueManager.getZone` / LEAGUE_CONFIG so client messaging
 * matches server promotion/relegation outcomes.
 */
export type LeagueZone = 'promotion' | 'safe' | 'relegation';

export interface LeagueStandingSummary {
  zone: LeagueZone;
  /** Positions to climb to enter the promotion zone (0 if already in it). */
  toPromotion: number;
  /** Positions of cushion above the relegation line (0 if already in it). */
  aboveRelegation: number;
}

export interface StandingSummaryInput {
  position: number;
  totalPlayers: number;
  promotionCount?: number;
  relegationCount?: number;
}

const DEFAULT_PROMOTION_COUNT = 10;
const DEFAULT_RELEGATION_COUNT = 5;

export function getLeagueStandingSummary({
  position,
  totalPlayers,
  promotionCount = DEFAULT_PROMOTION_COUNT,
  relegationCount = DEFAULT_RELEGATION_COUNT,
}: StandingSummaryInput): LeagueStandingSummary {
  // The first relegation position (players at/after this index drop).
  const relegationLine = totalPlayers - relegationCount + 1;

  let zone: LeagueZone = 'safe';
  if (position <= promotionCount) zone = 'promotion';
  else if (totalPlayers > 0 && position >= relegationLine) zone = 'relegation';

  const toPromotion = position > promotionCount ? position - promotionCount : 0;
  const aboveRelegation =
    zone === 'relegation' ? 0 : Math.max(0, relegationLine - position);

  return { zone, toPromotion, aboveRelegation };
}
