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
  /**
   * Optional per-email override. When the currently identified PostHog
   * user matches a key here, that variant is forced regardless of the
   * remote flag value. Lowercase the keys — lookup is case-insensitive.
   * Use sparingly: dev/QA pilots, single-user previews, internal demos.
   */
  readonly forceVariantByEmail?: Readonly<Record<string, V[number]>>;
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

  /**
   * CrazyGames onboarding flow. Hypothesis: CG players bounce when
   * forced to pick a mode before seeing gameplay (CG ranks games on
   * 60s-survival rate). `autostart` deep-links straight into Word Hunt
   * SP; `quick-play` shows a single big "Play Now" button above mode
   * grid; `control` keeps the current landing.
   * Conversion = first_minute_retained where platform = crazygames.
   */
  'cg-onboarding-flow': defineExperiment({
    variants: ['control', 'quick-play', 'autostart'] as const,
    default: 'control',
    description:
      'CrazyGames first-paint flow. control = current landing, quick-play = single Play Now CTA above mode grid, autostart = skip landing, deep-link to Word Hunt SP.',
  }),

  /**
   * CrazyGames replay-CTA prominence. Drives plays-per-session — the
   * second CG ranking lever after first-minute survival. Tests whether
   * a pulsing/oversized "Play Again" lifts replay vs the default button.
   * Conversion = next_game_started / game_completed within 30s.
   */
  'cg-replay-cta-style': defineExperiment({
    variants: ['control', 'pulse', 'oversized'] as const,
    default: 'control',
    description:
      'Replay CTA on results screen for CrazyGames. control = current button, pulse = animate-neo-wobble + glow, oversized = 1.5x scale w/ mascot. Drives plays/session.',
  }),

  /**
   * Rewarded-ad revive offer. When player runs out of time / fails a
   * level, offer "Watch ad → +30s / continue". Hypothesis: lifts both
   * session length AND ad-completion-rate without harming retention.
   * Conversion = ad_completed where placement = revive.
   */
  'cg-rewarded-revive': defineExperiment({
    variants: ['off', 'on'] as const,
    default: 'off',
    description:
      'Offer rewarded-ad revive (+30s or continue) on timeout/fail screens. on = show prompt, off = skip. Measures ad-completion lift vs retention impact.',
  }),

  /**
   * Difficulty ramp for first-time CG players. CG players are mostly
   * casual — too-hard first board → bounce. `easy-first-3` forces an
   * easier letter set + longer timer for first 3 games of a CG session;
   * `control` uses the standard board generator.
   * Conversion = first_minute_retained AND session_depth_milestone(3).
   */
  'cg-difficulty-ramp': defineExperiment({
    variants: ['control', 'easy-first-3'] as const,
    default: 'control',
    description:
      'Ease-in difficulty for first 3 games on CrazyGames. control = standard board, easy-first-3 = vowel-rich letter pool + +30s timer. Anti-bounce.',
  }),

  /**
   * Leaderboard tier position panel. Replaces the right-column block
   * of the user-rank card with a tier-rank + percentile + peer list.
   * Hypothesis: surfacing within-tier rank lifts time-on-leaderboard
   * and return rate vs the current global-rank-only treatment.
   * Conversion: tier_position_viewed + leaderboard session length.
   */
  'tier-position-panel': defineExperiment({
    variants: ['control', 'enabled'] as const,
    default: 'control',
    description:
      "Leaderboard user-rank card. control = current (global rank primary), enabled = TierPositionPanel mounted (tier-rank primary, peer list, percentile).",
  }),

  /**
   * Multiplayer desktop chassis kill-switch. When enabled (on), desktop
   * users see the MultiplayerDesktopShell (responsive layout for wide
   * screens). When disabled (off), all users see legacy mobile-stacked
   * layout. Not used for A/B traffic split — flip to off via PostHog if
   * Sentry warnings spike post-deploy.
   */
  'mp.desktop-shell.v1': defineExperiment({
    variants: ['on', 'off'] as const,
    default: 'on',
    description:
      'Multiplayer desktop chassis kill-switch. on = MultiplayerDesktopShell mounts on desktop (default). off = legacy mobile-stacked layout. Flip to off via PostHog if Sentry warnings spike post-deploy. Not used for A/B traffic split.',
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

/**
 * Per-email forced override (case-insensitive). Returns the override
 * variant when the identified email is allowlisted in the registry,
 * else `null` so the caller falls back to the live PostHog variant.
 */
export function experimentEmailOverride<K extends ExperimentKey>(
  key: K,
  email: string | null | undefined,
): ExperimentVariant<K> | null {
  if (!email) return null;
  const map = EXPERIMENTS[key].forceVariantByEmail;
  if (!map) return null;
  const lower = email.toLowerCase();
  for (const [allowedEmail, variant] of Object.entries(map)) {
    if (allowedEmail.toLowerCase() === lower) {
      return variant as ExperimentVariant<K>;
    }
  }
  return null;
}

export function isValidVariant<K extends ExperimentKey>(
  key: K,
  variant: unknown,
): variant is ExperimentVariant<K> {
  if (typeof variant !== 'string') return false;
  return (EXPERIMENTS[key].variants as readonly string[]).includes(variant);
}
