import type { GuestNameT } from './useGuestNameSave';

/**
 * The guest's own rank, said only while it is something to be proud of (#1, top 10 or top half).
 * Null otherwise, and while the rank is still loading, so the card never swaps its headline.
 */
export function proudRankLine(t: GuestNameT, rank?: number | null, totalPlayers?: number | null): string | null {
  const total = totalPlayers && totalPlayers > 0 ? totalPlayers : null;
  if (rank === 1) return t('wordHunt.results.guestNameProudFirst', "You're #1 today!");
  const proudRank = !!rank && rank > 0 && (rank <= 10 || (!!total && rank <= total / 2));
  if (proudRank && total && rank <= total) {
    return t('wordHunt.results.guestNameProudRank', "You're #{rank} of {total} today!", { rank: rank as number, total });
  }
  if (proudRank) {
    return t('wordHunt.results.guestNameProudRankOnly', "You're #{rank} today!", { rank: rank as number });
  }
  return null;
}
