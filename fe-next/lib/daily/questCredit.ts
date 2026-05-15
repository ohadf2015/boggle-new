/**
 * Decides whether a daily-challenge submission counts as a *completed* daily
 * challenge for the `daily_challenges` weekly quest.
 *
 * Each mode defines "completed" differently — and this MUST stay in sync with
 * the weekly-chest streak filters (status/claim routes) so a submission never
 * credits the quest but not the streak (or vice versa):
 * - puzzle: at least one word found (matches chest `word_count > 0` filter)
 * - word_hunt: only when `solved` is true (matches chest `solved = true` filter)
 * - word_wheel: at least one word found (matches chest `word_count > 0` filter)
 *
 * Guests (no playerId) and retries never credit the quest.
 */
export interface DailyQuestCreditInput {
  mode: 'puzzle' | 'word_hunt' | 'word_wheel';
  playerId?: string | null;
  isRetry?: boolean;
  solved?: boolean;
  wordCount?: number;
}

export function shouldCreditDailyChallengeQuest(input: DailyQuestCreditInput): boolean {
  if (!input.playerId) return false;
  if (input.isRetry) return false;
  switch (input.mode) {
    case 'word_hunt':
      return input.solved === true;
    case 'word_wheel':
    case 'puzzle':
      return (input.wordCount ?? 0) > 0;
  }
}
