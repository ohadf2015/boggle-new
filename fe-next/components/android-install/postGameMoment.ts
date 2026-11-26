import { readGamesCompletedCount } from '@/utils/gamesCompletedCount';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import { isGameplayPath } from '@/lib/gameplayRoutes';
import { isOverlayQuietZoneActive } from '@/lib/overlayQuietZone';
import { wasPromoShownThisSession } from '@/lib/landing/promoOverlaySession';

const BASELINE_KEY = 'games_completed_at_session_start';

/**
 * True once a game has finished in this tab session. The lifetime counter alone
 * let a returning player's first paint show an install promo, so the count is
 * compared with a snapshot taken the first time this is read in the session.
 * Call it at mount so the snapshot predates the game.
 */
export function finishedGameThisSession(): boolean {
  const count = readGamesCompletedCount();
  try {
    const baseline = sessionStorage.getItem(BASELINE_KEY);
    if (baseline === null) {
      sessionStorage.setItem(BASELINE_KEY, String(count));
      return false;
    }
    return count > Number(baseline);
  } catch {
    return false;
  }
}

/** Install promos may appear only here: after a finished game, off every play and results surface. */
export function isPostGameMoment(pathname: string | null): boolean {
  return (
    finishedGameThisSession() &&
    isAllowedAdBannerRoute(pathname) &&
    !isGameplayPath(pathname) &&
    !isOverlayQuietZoneActive()
  );
}

/** True when some other promo (not the Android install popup) already used this session's one slot. */
export function otherPromoTookSession(): boolean {
  try {
    return wasPromoShownThisSession() && !sessionStorage.getItem('android_app_install_promo_shown');
  } catch {
    return true;
  }
}
