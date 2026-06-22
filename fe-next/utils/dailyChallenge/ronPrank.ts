/**
 * Ron prank — a harmless, DISPLAY-ONLY easter egg.
 *
 * When one specific player (Ron) finishes a daily challenge, the results screen
 * shows a fake "+1,000,000" bonus chip next to his real score chips. It is
 * purely cosmetic: no real points are awarded, and the stored score, streak,
 * and leaderboard standings are completely untouched — Ron's points still
 * accumulate exactly as normal. Nobody else ever sees it.
 */

/** Ron's Supabase user id — the only account that sees the joke bonus. */
export const RON_PRANK_USER_ID = 'hdtmpkicuxvtmvrmtybx';

/** The obviously-a-joke bonus amount shown to Ron (display only). */
export const RON_PRANK_BONUS_POINTS = 1_000_000;

/**
 * True only for Ron. Guests, unknown users, and everyone else get false, so the
 * prank never leaks beyond the intended account.
 */
export function isRonPrankUser(userId: string | null | undefined): boolean {
  return !!userId && userId === RON_PRANK_USER_ID;
}
