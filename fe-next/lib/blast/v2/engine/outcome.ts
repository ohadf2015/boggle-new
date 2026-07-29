import type { CompletionReason } from './completion';

/** The three end-of-level screens the result card can render. */
export type ResultVariant = 'mastered' | 'partial' | 'levelFailed';

/** Primary call-to-action on the result card. */
export type ResultCta = 'next' | 'retry';

/**
 * How loud the result screen should be. The loss MUST be 'none' — a confetti
 * burst on a failure reads as mockery. Mastered earns the full show; a partial
 * (soft-lock rescue, still a win) gets a gentler version.
 */
export type CelebrationLevel = 'full' | 'soft' | 'none';

export interface ResultOutcome {
  variant: ResultVariant;
  cta: ResultCta;
  /** Whether finishing this screen advances the campaign (clear-level on win only). */
  advances: boolean;
  celebration: CelebrationLevel;
}

export interface ResultOutcomeInput {
  status: 'levelComplete' | 'levelFailed';
  completionReason: CompletionReason | null;
}

/**
 * Pure mapping from the reducer's end state to the result-screen shape. Keeping
 * this in one tested place means the card, the CTA wiring, and the celebration
 * intensity can never drift out of agreement.
 */
export function selectResultOutcome({ status, completionReason }: ResultOutcomeInput): ResultOutcome {
  if (status === 'levelFailed') {
    return { variant: 'levelFailed', cta: 'retry', advances: false, celebration: 'none' };
  }
  // A completed level with an unknown reason is treated as a clean win — matches
  // the historical `completionReason ?? 'mastered'` default in BlastGame.
  if (completionReason === 'partial') {
    return { variant: 'partial', cta: 'next', advances: true, celebration: 'soft' };
  }
  return { variant: 'mastered', cta: 'next', advances: true, celebration: 'full' };
}
