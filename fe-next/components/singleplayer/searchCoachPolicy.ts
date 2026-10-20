/**
 * Search/SEO landers on the coached first round leave on step 0
 * (trace + held clock): 8s desktop / 22s mobile, 0–1 words, since #1357.
 * Skip the 4-step lesson for them. Explicit in-app `?autoStart=coach`
 * (onboarding) keeps the lesson.
 */
import { isSearchEngineReferrer } from './returningBotsGate';

export function shouldShortenCoach(input: {
  referrer: string;
  autoStart: string | null;
  isBareEntry: boolean;
}): boolean {
  const coachEntry = input.autoStart === 'coach' || input.isBareEntry;
  if (!coachEntry) return false;
  if (isSearchEngineReferrer(input.referrer)) return true;
  // Bare SEO URL with a stripped referrer (Google often sends none).
  // Explicit ?autoStart=coach and an empty referrer is in-app onboarding.
  return input.isBareEntry && input.referrer.trim() === '';
}
