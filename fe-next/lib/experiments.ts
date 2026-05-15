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
   * Blast v2 redesign flag. Controls rollout of new Blast game engine
   * with updated mechanics, UI, and level generation pipeline.
   */
  'blast.v2': defineExperiment({
    variants: ['control', 'v2'] as const,
    default: 'control',
    description: 'Blast v2 redesign rollout — new engine + rendering (control = legacy, v2 = new)',
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
   * MP signup nudge copy + toast suppression. Driven by 28d PostHog data
   * showing the post-sheet toast (`trigger: mp_toast`) fired 58 times and
   * converted 0 — pure dismissal training. Sheet (`mp_sheet`) also 0/19,
   * but kept as the controlled experiment surface.
   *
   * Variants:
   * - `control` — current behavior: sheet at game 2 + toast at game 3+.
   * - `toast-disabled` — sheet only, no follow-up toast. Hypothesis: less
   *   dismissal training without losing signup signal.
   * - `value-prop` — sheet copy emphasizes "save your stats + climb
   *   leaderboard". Wired in MultiplayerSignupSheet (P2 spec).
   * - `social-proof` — sheet copy emphasizes "X players signed up this week".
   *   Wired in MultiplayerSignupSheet (P2 spec).
   *
   * Conversion = signup_completed within 30min of sheet impression.
   */
  'mp-signup-nudge-copy-v1': defineExperiment({
    variants: ['control', 'toast-disabled', 'value-prop', 'social-proof'] as const,
    default: 'control',
    description:
      'MP signup nudge copy + toast gate. control = sheet+toast (status quo, 0/77 converts in 28d). toast-disabled = sheet only. value-prop / social-proof = alternate sheet copy. Conversion = signup_completed within 30min of sheet impression.',
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

  /**
   * Blast Candy-Crush mechanics — per-mechanic kill switch + A/B gate. Each
   * mechanic ships independently so the data team can isolate impact.
   * Conversion = blast wave-completion rate (treatment vs control).
   */
  'blast.jelly': defineExperiment({
    variants: ['control', 'treatment'] as const,
    default: 'control',
    description:
      'Blast jelly clears mechanic. treatment = waves may pull `clear_jelly` objective + jelly-coated cells. control = legacy waves only.',
  }),
  'blast.cake': defineExperiment({
    variants: ['control', 'treatment'] as const,
    default: 'control',
    description:
      'Blast cake-bomb boss mechanic. treatment = waves may spawn 3x3 cake cluster + `kill_cake` objective. control = legacy waves only.',
  }),
  'blast.chocolate': defineExperiment({
    variants: ['control', 'treatment'] as const,
    default: 'control',
    description:
      'Blast chocolate spreader mechanic. treatment = waves may spawn chocolate cells that grow each turn unless touched + `stop_chocolate` objective. control = legacy waves only.',
  }),

  /**
   * Onboarding language-step auto-skip. When the browser locale already
   * matches a supported app locale (en/he/sv/ja/es), skip the picker and
   * persist the detected locale. PostHog 14d showed `language` step at 54
   * users vs `tutorial` at 33 — pruning the picker should compress FTUE
   * without losing intent.
   * Conversion = onboarding_completed.
   */
  'onboarding-language-autoskip': defineExperiment({
    variants: ['control', 'auto-skip'] as const,
    default: 'control',
    description:
      'Onboarding language step. control = always show picker. auto-skip = when navigator.language ∈ supported locales, jump straight to tutorial with detected locale.',
  }),

  /**
   * Onboarding profile→mode auto-route. Profile→onboarding_completed gap
   * was 38% (34u → 21u). Variant routes finished profiles directly into
   * Word Hunt (top-volume mode, 82 14d plays) instead of /practice.
   * Conversion = first_game_played within 30s of profile complete.
   */
  'onboarding-postprofile-autoroute': defineExperiment({
    variants: ['control', 'word-hunt', 'random'] as const,
    default: 'control',
    description:
      'Where to send the user immediately after onboarding profile. control = /practice. word-hunt = /singleplayer?mode=word-hunt&autoStart=1. random = pick one of the top-3 volume modes.',
  }),

  /**
   * Rewarded-ad CTA copy. 14d data: 372 offers, 27 watches (7%). Test
   * value-prop framings — "Double XP", "Skip Cooldown", "Free Hint" —
   * against generic "Watch Ad".
   * Conversion = rewarded_ad_watched / rewarded_ad_offered.
   */
  'rewarded-ad-copy-v1': defineExperiment({
    variants: ['control', 'double-xp', 'skip-cooldown', 'free-hint'] as const,
    default: 'control',
    description:
      'Rewarded-ad button copy. control = "Watch Ad (+N coins)". double-xp = "DOUBLE your XP". skip-cooldown = "Skip the wait". free-hint = "Reveal a hint, free".',
  }),

  /**
   * Rewarded-ad per-user cooldown. Today the ad CTA renders every game-end
   * regardless of recent exposure, yielding offer:user ratio of 11:1 in
   * 14d. Cooldown variant suppresses the offer for N minutes after the
   * last decline so the prompt stays fresh.
   * Conversion = rewarded_ad_watched per user-day.
   */
  'rewarded-ad-cooldown-v1': defineExperiment({
    variants: ['control', '10m-cooldown', '30m-cooldown'] as const,
    default: 'control',
    description:
      'Cooldown after a rewarded-ad decline. control = no cooldown. 10m = hide CTA for 10 min after decline. 30m = hide for 30 min.',
  }),

  /**
   * Signup-prompt timing. Today the prompt fires after first completion.
   * 14d data: prompt shown to 14 users, only 11 signups recorded — the
   * trigger fires too rarely + too early. Variants delay the trigger and
   * tie to behaviour rather than completion count.
   * Conversion = signup_completed within 30 min of trigger.
   */
  'signup-prompt-timing-v1': defineExperiment({
    variants: ['control', 'after-3-games', 'after-first-4-letter-word'] as const,
    default: 'control',
    description:
      'When to show first-win signup nudge. control = first completion. after-3-games = after the 3rd game_completed of the session. after-first-4-letter-word = after the player finds their first ≥4-letter word.',
  }),

  /**
   * Home grid mode-hiding. PostHog 14d: connections=12 plays/5 users,
   * adventure=9/4 users — both effectively dead. Variant hides them
   * from the default grid and exposes via an "all modes" drawer so the
   * top modes get visual real estate.
   * Conversion = home_mode_card_click → game_started.
   */
  'home-hide-dead-modes': defineExperiment({
    variants: ['control', 'hide-low-volume'] as const,
    default: 'control',
    description:
      'Home grid. control = all modes visible. hide-low-volume = connections + adventure tucked into an "all modes" drawer, top-5 modes promoted.',
  }),

  /**
   * Game-end "play one more" CTA. Drives plays/session (3.03 in 14d).
   * Variant adds an oversized 2-tap restart button using random mode
   * (rotates so the user discovers variety).
   * Conversion = next game_started within 30s of game_completed.
   */
  'play-one-more-cta': defineExperiment({
    variants: ['control', 'random-mode', 'same-mode'] as const,
    default: 'control',
    description:
      'Game-end secondary CTA. control = current results screen. random-mode = oversized "Play another (random)" CTA. same-mode = "Play again (same mode)".',
  }),

  /**
   * Streak save modal. Day-streak XP curve drops users at D2/D3.
   * Variant offers a one-time rewarded-ad streak save when the streak
   * would otherwise expire within 4 hours.
   * Conversion = streak_continued event.
   */
  'streak-save-modal': defineExperiment({
    variants: ['off', 'on'] as const,
    default: 'off',
    description:
      'Streak save modal. on = prompt user to watch ad to save expiring streak. off = current (no save).',
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
