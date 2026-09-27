'use client';

import { useEffect, useState } from 'react';

/**
 * "Is a fullscreen game surface currently on screen?" — the runtime signal, not a route.
 *
 * `NavigationContext` puts `screen-fit-locked` on <body> whenever `isInGame` is true, and
 * `bannerController.shouldSuppressBanner()` already treats that as OPT-OUT suppression: any
 * fullscreen game hides the banner by default, so a new mode can never accidentally paint an ad
 * over its board. The install promo and pill never adopted that signal — they gate on
 * `isAllowedAdBannerRoute()` alone — which is why `/multiplayer` (deliberately absent from
 * GAME_ROUTES so its passive lobby can still monetize) served a full-screen install interstitial
 * and a floating pill over a live board with the round timer running. Measured 2026-08-23 on
 * www.lexiclash.live/he: the pill sat at x37-132 y412-432 across 4 of the 36 board tiles.
 *
 * Adding routes was the old fix and it does not converge — `/word-tower`, `/crossword` and
 * (unmerged) `/word-craft` were each appended after the same bug shipped. This reads the state
 * instead, so every present and future mode is covered by construction.
 *
 * Read via the DOM rather than `useNavigation()` on purpose: these widgets are mounted through
 * `DeferredLayoutWidgets` and are unit-tested in isolation, where that hook throws for want of a
 * provider. Toggling a body class is also how the banner's own tests drive this state.
 */
export const IN_GAME_BODY_CLASS = 'screen-fit-locked';

export function isInGameSurface(): boolean {
  if (typeof document === 'undefined') return false;
  return document.body.classList.contains(IN_GAME_BODY_CLASS);
}

/** Reactive form: re-renders when a round starts or ends. */
export function useInGameSurface(): boolean {
  const [inGame, setInGame] = useState(false);

  useEffect(() => {
    const read = () => setInGame(isInGameSurface());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return inGame;
}
