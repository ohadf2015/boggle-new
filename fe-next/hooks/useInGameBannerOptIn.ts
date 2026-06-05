import { useEffect } from 'react';

/**
 * Opt a fullscreen game screen BACK INTO showing the native banner during play.
 *
 * The banner is suppressed by default while `body.screen-fit-locked` is set
 * (fullscreen gameplay) — see `shouldSuppressBanner` — so a new game mode can
 * never accidentally composite an ad over its bottom controls. A screen that
 * genuinely RESERVES room for the banner (today only adventure, via the
 * `--admob-banner-height` CSS var) calls this hook to flag
 * `<html>.banner-allow-in-game`, which `BannerCoordinatorMount` reads to let the
 * banner through. The flag is cleared on unmount so exiting gameplay
 * re-suppresses it automatically.
 *
 * @param enabled - keep the opt-in active (default true). Pass a condition to
 *   scope it to the exact gameplay phase that reserves the banner band.
 */
export function useInGameBannerOptIn(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add('banner-allow-in-game');
    return () => root.classList.remove('banner-allow-in-game');
  }, [enabled]);
}
