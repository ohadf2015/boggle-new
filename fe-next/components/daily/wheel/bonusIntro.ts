import { hasWheelBonuses } from '@/utils/dailyChallenge/wordWheelScoring';

const SEEN_KEY = 'lc:wheel-bonus-intro-seen';

/** A returning player meets combo and gold once on the ready card instead of skipping straight in. */
export function needsBonusIntro(puzzleDate: string): boolean {
  if (!hasWheelBonuses(puzzleDate)) return false;
  try { return localStorage.getItem(SEEN_KEY) !== '1'; } catch { return false; }
}

export function markBonusIntroSeen(): void {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage off */ }
}
