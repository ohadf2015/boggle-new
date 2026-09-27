// Pure resolver for the exp-game-abandon-confirm-v1 A/B experiment.
// control     → the existing generic quit-confirm message.
// stats-shown → surfaces the player's current score + word count so the sunk cost is
//               concrete before they abandon (targets the ~42% mid-game completion drop).
//
// Kept pure (no React, no t) so it is trivially testable; the caller passes both already-
// translated strings + the live numbers. Interpolation uses literal {placeholder} .replace
// (the proven in-repo pattern, e.g. useOfflineSync) rather than relying on t-param wiring.

export type QuitConfirmVariant = 'control' | 'stats-shown';

export interface QuitConfirmCopyInput {
  /** t('singlePlayer.quitConfirmMessage') — the control/default message. `t` can return
   *  undefined for a missing key, so accept that and coalesce to ''. */
  baseMessage: string | undefined;
  /** t('singlePlayer.quitConfirmMessageWithStats') — has {wordCount} + {score} placeholders. */
  statsTemplate: string | undefined;
  score: number;
  wordCount: number;
}

export function resolveQuitConfirmDescription(
  variant: QuitConfirmVariant,
  input: QuitConfirmCopyInput,
): string {
  if (variant !== 'stats-shown') return input.baseMessage ?? '';
  return (input.statsTemplate ?? '')
    .replace('{wordCount}', String(input.wordCount))
    .replace('{score}', String(input.score));
}
