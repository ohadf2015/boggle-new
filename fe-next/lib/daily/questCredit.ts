/**
 * Decides whether a daily-challenge submission counts as a *completed* daily
 * challenge for the `daily_challenges` weekly quest.
 *
 * Each mode defines "completed" differently — and this MUST stay in sync with
 * the weekly-chest streak filters (status/claim routes) so a submission never
 * credits the quest but not the streak (or vice versa):
 * - puzzle: at least one word found (matches chest `word_count > 0` filter); first attempt only.
 * - word_hunt: transitions the row to solved=true (matches chest `solved = true` filter).
 *   A retry that flips solved=false → solved=true counts; re-submitting an already-solved
 *   attempt does NOT double-credit.
 * - word_wheel: at least one word found (matches chest `word_count > 0` filter); first attempt only.
 *
 * Guests (no playerId) never credit the quest.
 */
export interface DailyQuestCreditInput {
  mode: 'puzzle' | 'word_hunt' | 'word_wheel';
  playerId?: string | null;
  isRetry?: boolean;
  solved?: boolean;
  /** word_hunt only: was the existing row already solved=true before this write? */
  wasAlreadySolved?: boolean;
  wordCount?: number;
}

export function shouldCreditDailyChallengeQuest(input: DailyQuestCreditInput): boolean {
  if (!input.playerId) return false;
  switch (input.mode) {
    case 'word_hunt':
      // Credit on the submission that transitions the attempt to solved.
      return input.solved === true && !input.wasAlreadySolved;
    case 'word_wheel':
    case 'puzzle':
      if (input.isRetry) return false;
      return (input.wordCount ?? 0) > 0;
  }
}
