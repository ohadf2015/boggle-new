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
   * Word Tower solo game mode (Tower Bloxx + Shiritori word-chain). Admin-only
   * during development: the landing-card + route are additionally gated on
   * `isAdmin`, so `on` here only reveals the mode to admins. Flip in PostHog to
   * widen rollout once the mode graduates. Email override keeps it live for the
   * dev account without PostHog config.
   */
  'word-tower': defineExperiment({
    variants: ['off', 'on'] as const,
    default: 'off',
    description: 'Word Tower solo mode — admin-gated dev preview. on = visible to admins.',
    forceVariantByEmail: {
      'ohadf2015@gmail.com': 'on',
    },
  }),
  'landing-variant-homepage-v1': defineExperiment({
    variants: ['control', 'variant'] as const,
    default: 'control',
    description:
      'Homepage hero CTA variant. Adds subtitle + primary CTA button + live player count to hero. Hypothesis: above-fold CTA lifts game-start CVR by reducing scroll-to-action distance.',
    forceVariantByEmail: {
      'ohadf2015@gmail.com': 'variant',
    },
  }),

  /**
   * Post-game quick-replay CTA. After SP game completion (auto-play
   * countdown cancelled), control shows the existing NextStepPrompt
   * only. The `quick-replay` variant adds a prominent "Run it back?"
   * primary button above NextStepPrompt so players can restart the same
   * mode in one tap without returning to the home screen.
   *
   * Hypothesis: reducing friction from results → next game start will
   * lift same-session replay rate (game_started within 10min of
   * game_completed per person) by ≥15%.
   *
   * Conversion: results_cta_clicked { cta: 'quick_replay' } → game_started
   * within 10 min per person_id.
   * Ship to PostHog: flag key = 'exp-results-replay-cta-v1', 50/50 rollout.
   */
  'exp-results-replay-cta-v1': defineExperiment({
    variants: ['control', 'quick-replay'] as const,
    default: 'control',
    description:
      'Post-game quick-replay CTA on SP results page. quick-replay = adds "Run it back?" primary button above NextStepPrompt. control = no change. Conversion = game_started within 10min of game_completed.',
  }),

  /**
   * Leaderboard play-now CTA banner. Targets the rage-click signal on
   * /en/leaderboard (users repeatedly clicking on elements that don't
   * respond). Hypothesis: a sticky "Play to rank up" CTA pinned above the
   * leaderboard table funnels engaged spectators (those who browse the
   * leaderboard without playing) into a game start, lifting
   * leaderboard → game_started same-session CVR.
   *
   * Control = current leaderboard (no additional CTA).
   * play-cta = a slim "Play games to get ranked!" banner with "Play Now"
   *   button pinned above the leaderboard table, visible to all users.
   *
   * Conversion: leaderboard_play_cta_clicked → game_started within 5min.
   * Ship to PostHog: flag key = 'exp-leaderboard-play-cta-v1', 50/50 rollout.
   * Wire: app/[locale]/leaderboard/PageClient.tsx — blocked until file is
   *   refactored below 500 lines (currently 519). See docs/nightly/reports/2026-06-01.md.
   */
  'exp-leaderboard-play-cta-v1': defineExperiment({
    variants: ['control', 'play-cta'] as const,
    default: 'control',
    description:
      'Leaderboard play-now CTA banner. play-cta = slim "Play to rank up" strip above leaderboard table. control = current. Targets rage-click frustration on /leaderboard. Conversion = leaderboard_play_cta_clicked → game_started.',
  }),

  /**
   * Word Wheel daily post-game signup CTA. Word Wheel completions bypass the
   * generic SP/MP signup gate entirely (useSignupPrompt reads guest game/win
   * counts the wheel never writes — see useResultsSideEffects), so a wheel-only
   * SEO visitor is never asked to sign up. This experiment adds a value-led
   * signup card to WordWheelResults for guests, framed by `selectWheelSignupOffer`
   * (streak-value / board-spot / first-completion — never loss-aversion, Families
   * policy). control = no card (status quo). streak-value = render the offer CTA.
   *
   * Conversion: wheel_signup_cta_clicked → signup_completed{source:'word_wheel'}.
   * Guardrail: wheel_results_bounced must not rise (don't tank the experience).
   * Ship to PostHog: flag key = 'wheel-signup-offer-v1', 50/50 rollout.
   */
  'wheel-signup-offer-v1': defineExperiment({
    variants: ['control', 'streak-value'] as const,
    default: 'control',
    description:
      'Word Wheel daily post-game signup CTA for guests. control = no card. streak-value = value-led signup card (streak/board-spot framing via selectWheelSignupOffer). Conversion = wheel_signup_cta_clicked → signup_completed. Guardrail = wheel_results_bounced.',
  }),

  /**
   * Word Wheel "already-played" dead-end → practice-wheel CTA. A returning daily
   * player who already solved today's wheel currently hits a terminal results
   * screen with no next game — pure bounce. The `practice-cta` variant adds a
   * primary "Play unlimited practice wheels" button (→ /daily/word-wheel?practice=1)
   * so the engaged returner gets an instant second activity in the same mechanic.
   *
   * Conversion: wheel_practice_cta_clicked → game_started (practice). Pure-additive
   * (no guardrail needed). Ship to PostHog: flag key = 'wheel-replay-cta-v1', 50/50.
   */
  'wheel-replay-cta-v1': defineExperiment({
    variants: ['control', 'practice-cta'] as const,
    default: 'control',
    description:
      'Word Wheel already-played dead-end CTA. control = no replay option. practice-cta = "Play unlimited practice wheels" button. Conversion = wheel_practice_cta_clicked → practice game_started. Anti-bounce for returning daily players.',
  }),

  /**
   * Quick Play match-seeking overlay. When ?quickPlay=true fires the
   * auto-join useEffect, control shows only the dimmed Quick Start button
   * (opacity-70, cursor-wait). Users rage-click because the minimal visual
   * feedback doesn't signal "I'm finding you a match". The `match-seeking`
   * variant replaces the lobby with a full-screen "Finding a match..."
   * overlay while isJoining=true, eliminating the ambiguity.
   *
   * Hypothesis: explicit "Finding a match..." overlay will cut rage clicks
   * on /es/multiplayer?quickPlay=true by ≥50% (24h: 23 rage clicks, score 0.768).
   *
   * Conversion: mp_quickplay_joined (successful room join).
   * Guardrail: mp_quickplay_initiated count must not fall (don't break the flow).
   * Ship to PostHog: flag key = 'exp-mp-quickplay-wait-v1', 50/50 rollout.
   */
  'exp-mp-quickplay-wait-v1': defineExperiment({
    variants: ['control', 'match-seeking'] as const,
    default: 'control',
    description:
      'Quick Play joining overlay. match-seeking = full-screen "Finding a match..." overlay while isJoining=true during ?quickPlay auto-join. control = dimmed button only. Reduces rage clicks on /multiplayer?quickPlay=true. Conversion = mp_quickplay_joined.',
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
