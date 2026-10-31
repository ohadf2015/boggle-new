import type { GuestNameT } from './useGuestNameSave';

/**
 * The line that opens the name prompt: the guest's own result, so the name
 * reads as a claim on something they earned. A rank only shows while it is
 * something to be proud of (top 10 or top half); otherwise the guest still
 * "made the board".
 */
export function proudHeadline(t: GuestNameT, rank?: number | null, totalPlayers?: number | null): string {
  const total = totalPlayers && totalPlayers > 0 ? totalPlayers : null;
  if (rank === 1) return t('wordHunt.results.guestNameProudFirst', "You're #1 today!");
  const proudRank = !!rank && rank > 0 && (rank <= 10 || (!!total && rank <= total / 2));
  if (proudRank && total && rank <= total) {
    return t('wordHunt.results.guestNameProudRank', "You're #{rank} of {total} today!", { rank: rank as number, total });
  }
  if (proudRank) {
    return t('wordHunt.results.guestNameProudRankOnly', "You're #{rank} today!", { rank: rank as number });
  }
  return t('wordHunt.results.guestNameProudOnBoard', "You made today's leaderboard!");
}
