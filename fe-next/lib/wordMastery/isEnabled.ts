/**
 * Word-mastery A/B + env gate.
 *
 * Any one of: NEXT_PUBLIC_WORD_MASTERY=1, DB feature flag, PostHog
 * experiment variant `enabled`. Default is off so the main game is untouched.
 */

export type WordMasteryExperimentVariant = 'control' | 'enabled';

export function isWordMasteryEnvEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WORD_MASTERY === '1';
}

export function resolveWordMasteryAccess(input: {
  envEnabled: boolean;
  dbFlagEnabled: boolean;
  experimentVariant: WordMasteryExperimentVariant | string;
}): boolean {
  if (input.envEnabled) return true;
  if (input.dbFlagEnabled) return true;
  return input.experimentVariant === 'enabled';
}
