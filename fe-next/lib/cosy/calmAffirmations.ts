/**
 * Quiet-celebration affirmations for Cosy / Calm Mode.
 *
 * The calm acknowledgement (QuietCelebrationLayer) replaces confetti with a
 * dignified checkmark. It used to always read the same flat "Well done". A cozy
 * experience varies its warmth — so the layer rotates through a small pool of
 * gentle phrases, one per celebration beat.
 *
 * Pure on purpose: a deterministic selector keyed off an incrementing beat
 * index. NO Math.random — rotation must be replayable, test-stable, and (in a
 * mode for the elder / effect-averse audience) never surprising. Beat 0 stays
 * the established "Well done" so the first celebration of a session is unchanged.
 *
 * The keys are i18n keys (translated natively per locale, never calqued — a
 * literal "Lovely" is not warm in Hebrew or Japanese). They live under the
 * `cosy` namespace so the existing `cosyI18n.contract.test.ts` parity check can
 * reach them.
 */

export const CALM_AFFIRMATION_KEYS = [
  'cosy.wellDone',
  'cosy.affirmLovely',
  'cosy.affirmNicely',
  'cosy.affirmGoodWord',
] as const;

export type CalmAffirmationKey = (typeof CALM_AFFIRMATION_KEYS)[number];

/**
 * Pick the affirmation key for a given celebration beat. Cyclic and total:
 * safe modulo keeps the result in range for any integer (including the
 * defensive negative case), so a raw key can never leak onto the calm cue.
 */
export function selectCalmAffirmationKey(beatIndex: number): CalmAffirmationKey {
  const len = CALM_AFFIRMATION_KEYS.length;
  const i = ((Math.trunc(beatIndex) % len) + len) % len;
  return CALM_AFFIRMATION_KEYS[i];
}
