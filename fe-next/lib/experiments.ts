/**
 * Experiment registry — single source of truth for PostHog A/B tests.
 *
 * Adding an experiment:
 *   1. Add a new key to EXPERIMENTS below with `variants` + `default` + `description`.
 *   2. Mirror the flag in PostHog UI (same key, same variant names) and set rollout.
 *   3. Read it via `useExperiment('your-key')`. The hook is type-safe — TS infers
 *      the variant union and `default` is auto-applied when SDK isn't loaded yet.
 *
 * Naming: kebab-case keys, semantic version suffix when iterating
 *   (e.g. `signup-prompt-copy-v2` once v1 is concluded).
 */

export interface ExperimentConfig<V extends readonly string[]> {
  readonly variants: V;
  readonly default: V[number];
  readonly description: string;
}

function defineExperiment<V extends readonly string[]>(
  cfg: ExperimentConfig<V>,
): ExperimentConfig<V> {
  return cfg;
}

export const EXPERIMENTS = {
  /**
   * First-win signup-modal CTA copy. Hypothesis: value-prop copy
   * outperforms generic "Save Your Progress" by surfacing the concrete
   * benefit (track streak, unlock daily). Conversion = signup_completed
   * within session of first impression.
   */
  'signup-prompt-cta-copy': defineExperiment({
    variants: ['control', 'urgency', 'value-prop'] as const,
    default: 'control',
    description:
      'First-win signup modal CTA wording. control = current copy, urgency = "Don\'t lose your streak", value-prop = "Track progress + unlock daily challenges".',
  }),

  /**
   * Daily landing hero CTA emphasis. /he/daily already 20% CTR; can we
   * lift it further by varying mascot pose / score-tease vs control.
   * Conversion = daily_started.
   */
  'daily-hero-cta-style': defineExperiment({
    variants: ['control', 'mascot-front', 'score-tease'] as const,
    default: 'control',
    description:
      'Daily challenge landing hero treatment. control = current, mascot-front = mascot leads above CTA, score-tease = preview today\'s top score teaser.',
  }),

  /**
   * Word-Hunt results cross-promo placement. Wheel-CTA was promoted
   * above leaderboard 2026-04-29 based on click ratio (4:1). Formalize
   * as proper experiment to validate uplift with stats engine instead
   * of raw funnel comparison.
   */
  'wordhunt-crosspromo-position': defineExperiment({
    variants: ['wheel-first', 'leaderboard-first'] as const,
    default: 'wheel-first',
    description:
      'Word-Hunt results page: cross-promo wheel CTA above leaderboard (wheel-first) vs the historical layout (leaderboard-first). Conversion = cross_promo_click.',
  }),

  /**
   * Boost picker grid order. Hypothesis: top-of-grid placement biases
   * claim rate. Test whether putting scoreMultiplier (offensive) or
   * freezeTime (defensive) first lifts overall boost_claim_completed
   * vs the historical order (control).
   * Conversion: boost_claim_completed / boost_picker_opened.
   */
  'boost-picker-order': defineExperiment({
    variants: ['control', 'score-first', 'freeze-first'] as const,
    default: 'control',
    description:
      'Boost picker grid order. control = BOOST_TYPES order, score-first = scoreMultiplier first, freeze-first = freezeTime first. Affects boost_claim_completed rate.',
  }),

  /**
   * Multi-game signup nudge threshold (existing experiment lifted into
   * registry for type safety). Match the live PostHog flag exactly.
   */
  'mp-signup-nudge-threshold': defineExperiment({
    variants: ['after-1st-game', 'after-2nd-game', 'after-3rd-game'] as const,
    default: 'after-2nd-game',
    description:
      'Multiplayer signup nudge — how many MP games before prompting guest to sign up.',
  }),
} as const;

export type ExperimentKey = keyof typeof EXPERIMENTS;
export type ExperimentVariant<K extends ExperimentKey> =
  (typeof EXPERIMENTS)[K]['variants'][number];

export function experimentDefault<K extends ExperimentKey>(
  key: K,
): ExperimentVariant<K> {
  return EXPERIMENTS[key].default as ExperimentVariant<K>;
}

export function experimentVariants<K extends ExperimentKey>(
  key: K,
): readonly ExperimentVariant<K>[] {
  return EXPERIMENTS[key].variants as readonly ExperimentVariant<K>[];
}

export function isValidVariant<K extends ExperimentKey>(
  key: K,
  variant: unknown,
): variant is ExperimentVariant<K> {
  if (typeof variant !== 'string') return false;
  return (EXPERIMENTS[key].variants as readonly string[]).includes(variant);
}
