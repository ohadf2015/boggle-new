'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasEverPlayedWordHunt } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/shared/types/game';

/**
 * NYT-style auto-start: for a returning visitor the homepage IS the game.
 * Anyone who has ever completed a Word Hunt on this device (localStorage)
 * is sent straight to today's puzzle instead of the marketing hero — and
 * the daily screen itself already skips its ready/intro screen for them
 * (DailyChallenge auto-starts when hasEverPlayedWordHunt is true), so the
 * grid is the first thing they see. `replace`, not `push`, so the back
 * button doesn't trap them in a landing → game → landing loop.
 *
 * New visitors (no stored play) keep the hero + onboarding untouched.
 * Signed-in users keep the home hub — we wait for auth to resolve
 * (`authLoading`) so a signed-in session isn't redirected mid-resolution.
 */
export function useAutoStartDaily({
  language,
  authLoading,
  isAuthenticated,
}: {
  language: Language;
  authLoading: boolean;
  isAuthenticated: boolean;
}): void {
  const router = useRouter();

  useEffect(() => {
    if (authLoading || isAuthenticated) return;
    if (!hasEverPlayedWordHunt(language)) return;
    router.replace(`/${language}/daily/word-hunt`);
  }, [authLoading, isAuthenticated, language, router]);
}
