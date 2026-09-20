'use client';

import { useMasteryRatingData } from '@/hooks/useMasteryRatingData';
import { MasteryRating } from './MasteryRating';
import type { Language } from '@/types';

type TFunction = (
  path: string,
  fallbackOrParams?: string | Record<string, string | number>,
  paramsWhenFallback?: Record<string, string | number>,
) => string;

export interface MasteryRatingSectionProps {
  playerId?: string | null;
  guestFingerprint?: string | null;
  language: Language;
  t: TFunction;
}

/**
 * Mastery Rating Section — loads player's attempt history and displays rolling rating
 * Wraps the MasteryRating component with data fetching logic
 *
 * Always mounts and always renders something (never `null`): it must be
 * reachable above the fold for guests and authed players alike, on day one
 * and every day after. `MasteryRating` owns the pending/day-one/rated shell
 * states so nothing here pops in late.
 */
export function MasteryRatingSection({
  playerId,
  guestFingerprint,
  language,
  t,
}: MasteryRatingSectionProps) {
  // `guestFingerprint` starts `null` and is set later by an effect upstream
  // (DailyWordHuntResults) — on first paint neither identity is known yet.
  // Treat that as pending too, not as "day one": otherwise a RETURNING guest
  // briefly sees "Play today to start your rating" before the fingerprint
  // resolves and the real rating pops in (rules/60 Class 1 — pessimistic
  // state until every source of truth resolves, never an optimistic wrong
  // default that a later source flips).
  const identityKnown = !!(playerId || guestFingerprint);
  const { attempts, loading, error } = useMasteryRatingData({
    playerId,
    guestFingerprint,
    language,
    enabled: identityKnown,
  });

  return (
    <div className="w-full">
      <MasteryRating attempts={attempts} pending={!identityKnown || loading || !!error} t={t} />
    </div>
  );
}
