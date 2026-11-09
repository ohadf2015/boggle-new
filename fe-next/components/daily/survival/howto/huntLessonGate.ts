import type { Language } from '@/types';
import { hasEverPlayedWordHunt } from '@/utils/dailyChallenge/storage';
import { COACH_VERSION, hasSeenCoach, markCoachSeen } from '@/lib/tutorial/modeCoachStore';

/**
 * The Word Hunt lesson opens by itself once per device, wherever a player first meets the mode
 * (the daily page or a quick-play round). Both places share the `wordHunt` coach flag, so a player
 * who took it on one never gets it again on the other.
 */
export function claimHuntLesson(language: Language): boolean {
  if (typeof window === 'undefined') return false;
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return false;
  }
  if (!storage || hasEverPlayedWordHunt(language) || hasSeenCoach('wordHunt', COACH_VERSION, storage)) return false;
  markCoachSeen('wordHunt', COACH_VERSION, storage);
  return true;
}
