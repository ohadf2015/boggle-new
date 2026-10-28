/**
 * First-session next-mode bridge (t_b883191f).
 *
 * Players who finish exactly one game almost never return. Players who try a
 * second mode on day 0 return ~22%. The bridge is one tap into a DIFFERENT
 * mode — quick match for solo finishers, today's Word Wheel for classic MP
 * finishers — with no name or settings dialog in between.
 *
 * Assignment is a Growth Radar flag (`first-game-bridge`). Null or `control`
 * is today's screen. Only `bridge` renders the CTA. Exposure is the getFlag
 * call, so callers must pass enabled=false until the player is actually on a
 * first-session results surface.
 */

export const FIRST_GAME_BRIDGE_KEY = 'first-game-bridge';
export const FIRST_GAME_BRIDGE_TREATMENT = 'bridge';

export type FirstGameBridgeSurface = 'singleplayer' | 'classic-mp';

export interface BridgeDestination {
  href: string;
  fromMode: string;
  toMode: string;
  labelKey: string;
}

export function isFirstSessionCompleter(gamesCompleted: number): boolean {
  return gamesCompleted <= 1;
}

/** Solo finishers → MP quick play. No lobby, no name dialog (`?quickPlay=true` auto-fires). */
export function quickMatchHref(locale: string): string {
  return `/${locale || 'en'}/multiplayer?quickPlay=true`;
}

/**
 * Classic MP finishers → today's Word Wheel, skipping the ready card.
 * The live wheel is 2 minutes (WORD_WHEEL_DURATION), not 60s — copy must say so.
 */
export function wordWheelBridgeHref(locale: string): string {
  return `/${locale || 'en'}/daily/word-wheel?start=1`;
}

export function bridgeDestination(surface: FirstGameBridgeSurface, locale: string): BridgeDestination {
  if (surface === 'singleplayer') {
    return {
      href: quickMatchHref(locale),
      fromMode: 'singleplayer',
      toMode: 'classic-mp',
      labelKey: 'results.firstGameBridge.quickMatch',
    };
  }
  return {
    href: wordWheelBridgeHref(locale),
    fromMode: 'classic-mp',
    toMode: 'word-wheel',
    labelKey: 'results.firstGameBridge.wordWheel',
  };
}

/** Treatment only. Classroom and non-classic MP never enter the test. */
export function shouldShowFirstGameBridge(opts: {
  gamesCompleted: number;
  variant: string | null;
  classroom?: boolean;
  classicMp?: boolean;
}): boolean {
  if (!isFirstSessionCompleter(opts.gamesCompleted)) return false;
  if (opts.variant !== FIRST_GAME_BRIDGE_TREATMENT) return false;
  if (opts.classroom) return false;
  if (opts.classicMp === false) return false;
  return true;
}

/** Payload for growth:next_game_picked — readable without a session join. */
export function nextGamePickedPayload(surface: FirstGameBridgeSurface): {
  from_mode: string;
  to_mode: string;
  first_session: true;
  experiment: string;
  variant: string;
} {
  const dest = bridgeDestination(surface, 'en');
  return {
    from_mode: dest.fromMode,
    to_mode: dest.toMode,
    first_session: true,
    experiment: FIRST_GAME_BRIDGE_KEY,
    variant: FIRST_GAME_BRIDGE_TREATMENT,
  };
}

/**
 * Word Wheel ready-card skip. Returning players already skip it. `?start=1`
 * (the bridge) skips it for a first-timer too, so the tap lands in the 2-minute
 * game. Practice and catch-up keep their own gates (untimed wheel / ad).
 */
export function wordWheelBridgeSkipsReady(opts: {
  startParam: boolean;
  hasEverPlayed: boolean;
  isCatchup: boolean;
  isPractice: boolean;
}): boolean {
  if (opts.isPractice || opts.isCatchup) return false;
  return opts.startParam || opts.hasEverPlayed;
}
