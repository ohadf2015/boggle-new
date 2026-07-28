import type { Language } from '@/types';

export interface DailyLandingInputs {
  language: Language;
  /** Has this player engaged with the daily challenge before today? */
  isReturning: boolean;
  /** Today's Word Hunt already played/attempted? */
  wordHuntPlayed: boolean;
  /** Today's Word Wheel already played? */
  wordWheelPlayed: boolean;
  /** Arrived via a rival/share link (whName/whScore/whEmoji) — keep the hub. */
  hasSharedRival: boolean;
  /** Arrived via a scanned QR/barcode (?from=qr) — keep the hub welcome. */
  cameFromQr: boolean;
  /** The once-per-session auto-skip has already fired — don't trap the player. */
  alreadySkippedThisSession: boolean;
}

/**
 * Decide whether a returning player should skip the /daily selection hub and
 * open their next unplayed quest directly ("just start the challenge"), or stay
 * on the hub. Returns the target path to redirect to, or null to keep the hub.
 *
 * Pure + deterministic so the whole gate is unit-testable; the DailyRedirect
 * component only gathers the (async) inputs and gates rendering on a loader
 * until they resolve — see the Class-1 dual-source pitfall.
 */
export function resolveDailyLandingTarget(inputs: DailyLandingInputs): string | null {
  const {
    language,
    isReturning,
    wordHuntPlayed,
    wordWheelPlayed,
    hasSharedRival,
    cameFromQr,
    alreadySkippedThisSession,
  } = inputs;

  // Intentional hub visits: first-timers (learn both quests + see SEO), share/QR
  // arrivals, an already-fired session skip, or both quests done today.
  if (!isReturning || hasSharedRival || cameFromQr || alreadySkippedThisSession) return null;
  if (wordHuntPlayed && wordWheelPlayed) return null;

  // Open the next unplayed quest, Word Hunt first (the primary daily challenge).
  return wordHuntPlayed ? `/${language}/daily/word-wheel` : `/${language}/daily/word-hunt`;
}
