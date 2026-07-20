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
   * Word Wheel drag-hint coachmark. Hypothesis: the wheel's drag-to-spell
   * mechanic is not tap-discoverable → confused/idle players rage-click and
   * abandon (PostHog: word-wheel is the most rage-clicked SP surface). The
   * drag-hint arm surfaces the animated "swipe to spell" coachmark after a
   * short idle; control shows nothing. Win = higher word-wheel completion /
   * lower abandonment. Auto-suppresses once a word is found.
   */
  'exp-wordwheel-drag-hint-v1': defineExperiment({
    variants: ['control', 'drag-hint'] as const,
    default: 'control',
    description:
      'Word Wheel idle drag-hint coachmark. control = no hint, drag-hint = animated "swipe to spell" coachmark after idle. Targets the wheel rage-click/abandonment problem.',
  }),

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
   * Homepage mode-section layout redesign. The current `LandingChallengeCards`
   * renders same-shaped icon+heading+long-description cards in repeated grids
   * (the "identical card grid" anti-pattern). `cubes` swaps the mode section
   * for a compact bento of small mode "cubes" (arena = 2×2 anchor, others 1×1)
   * with generated icons + one scroll-reveal. Both variants consume the SAME
   * computed/ordered/gated mode list inside LandingChallengeCards, so the test
   * compares layout only — no mode-logic drift.
   *
   * control = current card grid. cubes = bento cube layout.
   * SHIPPED TO ALL: default flipped to `cubes` so every visitor gets the cube
   * homepage (the A/B concluded). `control` is kept in the variant list only as
   * a remote kill-switch — set the PostHog flag to `control` to roll back without
   * a deploy. No email force needed anymore: the default already serves cubes.
   */
  'landing-modes-cubes-v1': defineExperiment({
    variants: ['control', 'cubes'] as const,
    default: 'cubes',
    description:
      'Homepage mode section layout. SHIPPED: cubes (default) = compact bento of mode cubes (arena 2×2 anchor) with generated icons + scroll reveal. control = legacy LandingChallengeCards grid, retained as a PostHog kill-switch only.',
  }),

  /**
   * Daily-challenge hero treatment INSIDE the `cubes` homepage arm. banner =
   * the legacy gradient banner with the floating mascot. cube = the new bento
   * daily tile (full-bleed daily cube art, neo tile, shared idle sheen) so the
   * daily hook joins the cube design language. Only consulted when the cubes
   * layout renders; exposure fires only when both flags resolve to the new arm.
   */
  'landing-daily-cube-v1': defineExperiment({
    variants: ['banner', 'cube'] as const,
    default: 'cube',
    description:
      'Daily hero style in the cubes homepage arm. SHIPPED: cube (default) = bento daily tile with cube art, joining the cube design language. banner = legacy gradient + mascot, retained as a PostHog kill-switch only. Conversion = daily_banner CTA → daily start.',
    forceVariantByEmail: {
      'ohadf2015@gmail.com': 'cube',
      'eden320@gmail.com': 'cube',
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

  /**
   * Invite arrival clarity for returning users. When a returning user lands
   * on the homepage with ?room=XXX, the current flow renders a blank navy div
   * (line 130 PageClient.tsx) while the client-side redirect fires. On slower
   * connections the SSR HTML is visible before hydration, causing rage clicks.
   *
   * control = current blank navy overlay (status quo).
   * status-card = a "Connecting…" card with spinner so the user knows the
   *   redirect is in flight — reduces confusion rage-clicks on invite URLs.
   *
   * Conversion: invite_redirect_fired → invite_consumed (successful room join).
   * Guardrail: invite_room_dead must not rise (don't mask failures).
   * Ship to PostHog: flag key = 'exp-invite-arrival-clarity-v1', 50/50 rollout.
   */
  'exp-invite-arrival-clarity-v1': defineExperiment({
    variants: ['control', 'status-card'] as const,
    default: 'control',
    description:
      'Invite arrival for returning users. control = blank navy overlay while redirect fires. status-card = "Connecting…" card + spinner so user knows redirect is in flight. Targets rage clicks on ?room= invite URLs. Conversion = invite_redirect_fired → invite_consumed.',
  }),

  /**
   * WheelRush practice completion retry CTA. PostHog 7d: 43% of practice
   * sessions on /practice/wheelRush drop before completion (47 started → 27
   * completed). No retry affordance exists after a failed attempt — player
   * must navigate back to the hub and tap the tile again.
   *
   * `retry-cta` variant adds a primary "Try Again" button at the wheel-game-over
   * screen so re-engagement is one tap. control = current (no explicit retry).
   *
   * Conversion: practice_started within 60s of prior practice_abandoned or
   * practice_completed (same mode, same person).
   * Guardrail: practice_chain_clicked must not fall (don't cannibalize chain).
   * Ship to PostHog: flag key = 'exp-practice-wheel-cta-v1', 50/50 rollout.
   * Wire: PracticeWheelSandbox.tsx — game-over state, show retry button.
   */
  'exp-practice-wheel-cta-v1': defineExperiment({
    variants: ['control', 'retry-cta'] as const,
    default: 'control',
    description:
      'WheelRush practice retry CTA. retry-cta = "Try Again" primary button on wheel game-over screen. control = current hub-back flow. Targets 43% drop on /practice/wheelRush. Conversion = practice_started within 60s of abandon/complete (same mode+person). Guardrail = practice_chain_clicked.',
  }),

  /**
   * Mid-game quit-confirm stats reveal. 7d funnel: game_started=320 → game_completed=135
   * (58% completion, 185 silent abandons). Back-button intercept fires via
   * useNavigationGuard.onAbandonAttempt → game_abandon_attempted event (wired 2026-06-15).
   *
   * control = current quit-confirm dialog (no stats context).
   * stats-shown = quit-confirm dialog surfaces current score + words found so the
   *   player sees concrete progress they'd lose — making the quit cost tangible.
   *
   * Hypothesis: Showing "You found 12 words (280 pts) — quit?" cuts confirmation
   * abandonment by ≥15% vs the context-free dialog.
   * Conversion: game_completed / (game_abandon_attempted - game_abandon_confirmed).
   * Guardrail: game_abandon_confirmed must not rise (don't suppress legitimate exits).
   * Ship to PostHog: flag key = 'exp-game-abandon-confirm-v1', 50/50 rollout.
   * Wire: pass useExperiment('exp-game-abandon-confirm-v1') variant to quit-confirm
   *   modal in DailyChallengeGame.tsx / useSinglePlayerCore.ts + ExitConfirmation.tsx.
   */
  /**
   * MP round GameFeedback prompt position. PostHog 24h: mp_round sentiment
   * avg 1/3 (bad) — but only 1 response in 24h, suggesting the feedback card
   * is rarely seen (buried below series standings + consolation rows). The
   * `top-prompt` variant renders the card BEFORE the podium so it's above the
   * fold on mobile, increasing response rate and giving us signal to understand
   * WHY mp_round feels bad before investing in a fix.
   *
   * control: current position (below series standings, line 360 ResultsMainContent).
   * top-prompt: GameFeedback rendered at top of results (before NearRankTeaser).
   *
   * Primary metric: game_feedback rate on mp_round (responses / mp_results_viewed).
   * Guardrail: mp_results_exit_clicked must not rise (don't tank results experience).
   * Ship to PostHog: flag key = 'exp-mp-round-feedback-top-v1', 50/50 rollout.
   */
  'exp-mp-round-feedback-top-v1': defineExperiment({
    variants: ['control', 'top-prompt'] as const,
    default: 'control',
    description:
      'MP round GameFeedback card position. top-prompt = card above podium (above the fold). control = current below-series-standings position. Lifts mp_round feedback response rate to improve signal quality before investing in sentiment fixes.',
  }),

  'exp-game-abandon-confirm-v1': defineExperiment({
    variants: ['control', 'stats-shown'] as const,
    default: 'control',
    description:
      'Quit-confirm dialog with/without score+words context. stats-shown = surfaces current score + word count so player sees concrete sunk-cost before quitting. control = current generic dialog. Targets 42% game completion drop. Conversion = game_completed after game_abandon_attempted.',
  }),

  /**
   * Word Hunt results leaderboard tap-hint. PostHog rage-click signal on
   * /he/daily/word-hunt (score 0.693). Root cause: line in results page
   * reads "Tap a player to see their path" but TabbedDailyLeaderboard has
   * NO onClick handlers — the promised interaction is dead, causing users
   * to tap repeatedly with zero feedback.
   *
   * control = keep the misleading hint text (status quo).
   * hide-hint = remove the hint text so nothing promises a non-existent interaction.
   *
   * Conversion: wordhunt_results_rage_click rate (guardrail metric — must drop).
   * Guardrail: wordhunt_leaderboard_tap must not rise (no more attempts).
   * Ship to PostHog: flag key = 'exp-wordhunt-hint-v1', 50/50 rollout.
   * Wire: WordHuntResultsContent.tsx — conditional render of the hint p tag.
   */
  'exp-wordhunt-hint-v1': defineExperiment({
    variants: ['control', 'hide-hint'] as const,
    default: 'control',
    description:
      'Word Hunt leaderboard tap-hint A/B. control = shows "Tap a player to see their path" (dead interaction → rage clicks). hide-hint = removes the hint. Targets rage-click regression on /he/daily/word-hunt (score 0.693). Conversion = wordhunt_leaderboard_tap drops.',
  }),

  /**
   * MP between-round score-gap nudge. Signal: mp_round feedback avg 1.5
   * (bad) + mp_player_dropped rate > completions in 24h (16 drops / 10
   * completions). Hypothesis: showing a concrete "you're X pts behind the
   * lead — keep pushing!" pill between rounds anchors the player to a
   * catchable goal, reducing mid-series abandonment.
   *
   * control = no gap nudge (current).
   * gap-nudge = small pill below the hero block; only shown when player
   *   is NOT the round winner AND the series isn't over yet.
   *
   * Conversion = mp_round_ready_clicked (player stays for next round).
   * Guardrail = mp_player_dropped (must not rise).
   * Ship to PostHog: flag key = 'exp-mp-score-gap-nudge-v1', 50/50 rollout.
   */
  'exp-mp-score-gap-nudge-v1': defineExperiment({
    variants: ['control', 'gap-nudge'] as const,
    default: 'control',
    description:
      'MP between-round score-gap nudge. gap-nudge = show "X pts behind lead" encouragement pill when player lost the round and the series continues. Targets mp_player_dropped rate. Conversion = mp_round_ready_clicked.',
  }),

  /**
   * Landing page quick-play CTA. Hypothesis: rage-clicks on /es (and other
   * locales) signal decision paralysis — the mode grid offers too many choices
   * with no clear primary action. The `quick-play` arm adds a high-contrast
   * "Play Now →" button below the hero that links directly to multiplayer,
   * giving first-time visitors a single unambiguous action.
   *
   * Conversion = game_started within 2min of landing_view.
   * Guardrail = bounce_rate (must not rise vs control).
   * Ship to PostHog: flag key = 'exp-landing-quick-play-v1', 50/50 rollout.
   */
  'exp-landing-quick-play-v1': defineExperiment({
    variants: ['control', 'quick-play'] as const,
    default: 'control',
    description:
      'Landing page quick-play CTA. quick-play = prominent "Play Now" button below hero linking to multiplayer. Targets rage-click drop on /es and other locales. Control = current mode grid only.',
  }),

  /**
   * Word Craft step-hint duration experiment. PostHog rage-click data shows
   * 5 rage clicks on /en/word-craft (top signal). The coaching pill currently
   * retires after 3 player turns — but turns 4-6 are the next friction window
   * where players have "learned to place" but still struggle with axis / blank
   * selection / word validity. The `extended-hints` arm extends the coaching
   * pill through turn 6, keeping the live pick→place→submit feedback visible
   * until the player has developed their own pattern.
   *
   * control = pill retires after 3 player turns (current behaviour).
   * extended-hints = pill retires after 6 player turns.
   *
   * Conversion = word_craft_turn_submitted rate (more turns = fewer ragers).
   * Guardrail = rage clicks on /en/word-craft (must drop or hold).
   * Ship to PostHog: flag key = 'exp-wordcraft-hint-duration-v1', 50/50.
   */
  'exp-wordcraft-hint-duration-v1': defineExperiment({
    variants: ['control', 'extended-hints'] as const,
    default: 'control',
    description:
      'Word Craft step-hint duration. control = coaching pill retires after 3 turns, extended-hints = retires after 6 turns. Targets /en/word-craft rage-click rage signal (top PostHog priority). Conversion = word_craft_turn_submitted.',
  }),

  /**
   * Classic/survival word-count goal badge. Classic mode 7d completion = 16%
   * (73 started, 12 completed) — worst of all modes. Hypothesis: players
   * abandon because there is no concrete progress anchor (only a timer). The
   * `word-goal` arm overlays a "X / 10" progress badge in the bottom-right
   * corner during classic/survival games, giving a tangible milestone to hit.
   * Midway (≥5 words) the badge shifts to a warm colour to signal momentum.
   *
   * Conversion = game_completed for classic/survival modes.
   * Guardrail = game_abandoned must not rise.
   * PostHog flag key = 'exp-singleplayer-word-goal-v1', 50/50 rollout.
   */
  'exp-singleplayer-word-goal-v1': defineExperiment({
    variants: ['control', 'word-goal'] as const,
    default: 'control',
    description:
      'Classic/survival SP word-count goal badge. word-goal = shows "X / 10 words" progress badge bottom-right. Targets 16% classic completion by anchoring players to a concrete word-count goal. Conversion = game_completed (classic/survival). Guardrail = game_abandoned.',
  }),

  /**
   * Connections hint fallback after 3 wrong attempts. PostHog rage-click data
   * (2026-07-08) shows connections/play is the #1 rage-click surface. Current
   * UX: hint button only visible when an ad is available (`canShowAd`). Users
   * without ad eligibility have zero help affordance → frustration → abandon.
   *
   * control = current behavior (hint gated behind ad eligibility).
   * after-3-wrong = after 3+ wrong attempts, hint button surfaces regardless
   *   of ad eligibility; clicking it calls onRevealHint() directly (free hint),
   *   bypassing the ad offer. Hypothesis: reduces rage-clicks and lifts
   *   connections game_completed by reducing stuck-with-no-help abandons.
   *
   * Conversion: game_completed (connections). Guardrail: connections_hint_used
   *   must rise (confirms treatment is actually engaging the hint, not just
   *   clicking through to next puzzle without it).
   * PostHog flag key = 'exp-connections-hint-gate-v1', 50/50 rollout.
   */
  'exp-connections-hint-gate-v1': defineExperiment({
    variants: ['control', 'after-3-wrong'] as const,
    default: 'control',
    description:
      'Connections hint fallback after 3 wrong attempts. after-3-wrong = hint button surfaces after 3+ wrong attempts even without ad eligibility (free hint). Targets rage-click #1 surface connections/play. Conversion = game_completed (connections). Guardrail = connections_hint_used must rise.',
  }),

  /**
   * MP between-round progress header. Baseline: mp_round sentiment avg 1.5/3
   * (game_feedback, 2026-07-10). Hypothesis: players feel disoriented because
   * round progress context (SeriesStandingsBanner) sits mid-page — below the
   * fold on mobile. Surfacing a compact "Game X of Y" pill at the TOP of mp
   * results before the hero section helps players orient → improves sentiment.
   *
   * Wire: ResultsMainContent — pill shown when variant='progress-header' +
   *   isMultiplayer + seriesRoundNumber != null + not the final round.
   * Primary metric: game_feedback avg rating on mp_round (surface='mp_round').
   * Guardrail: mp_results_exit_clicked must not rise.
   */
  'exp-mp-round-progress-header-v1': defineExperiment({
    variants: ['control', 'progress-header'] as const,
    default: 'control',
    description:
      'MP between-round progress header. progress-header = compact series-progress pill at top of mp results (above hero). Targets mp_round sentiment (baseline 1.5/3 avg). Conversion = game_feedback avg rating on mp_round. Guardrail = mp_results_exit_clicked stable.',
  }),

  /**
   * Homepage mode-card click feedback. Baseline: 27 rage clicks on lexiclash.live
   * homepage in 7d (2026-07-14 PostHog), 20/27 with null el_text (icon/card clicks
   * getting no visual response). Hypothesis: adding immediate press feedback
   * (scale + brightness pulse on click) makes cards feel responsive → reduces
   * rage-clicks and improves homepage→game_started conversion.
   *
   * Wire: LandingModesSection / mode-card component — apply `animate-neo-press`
   *   + `active:scale-95 transition-transform` on click when variant='click-feedback'.
   * Primary metric: homepage rage-click count (PostHog $rageclick on /en, /).
   * Guardrail: game_started count must not fall.
   */
  'exp-homepage-click-feedback-v1': defineExperiment({
    variants: ['control', 'click-feedback'] as const,
    default: 'control',
    description:
      'Homepage mode-card click feedback. click-feedback = immediate press animation (scale+brightness) on card click. Targets homepage rage-clicks (27 in 7d, 20 null-el_text). Conversion = rageclick rate falls on /en + /. Guardrail = game_started stable.',
  }),

  /**
   * MP lobby join eager-feedback. ES multiplayer is the #1 rage-click surface
   * (6 rageclicks/24h, 2026-07-18 PostHog). When users tap "Join" while the
   * socket is still connecting, the current flow silently waits up to 5s
   * before showing feedback — the button looks frozen. This causes rage-clicks.
   *
   * control = current behavior (5s silent wait → error toast on timeout).
   * eager-feedback = immediately on join attempt with disconnected socket:
   *   setIsJoining(true) to show button loading state + brief "Connecting…"
   *   toast so users know we're trying. Join completes normally if socket
   *   connects within 5s; existing error toast fires if it doesn't.
   *
   * Conversion: rageclick rate falls on /es/multiplayer (PostHog rageclicks).
   * Guardrail: mp_join_attempted must not fall.
   * PostHog flag key = 'exp-mp-lobby-connect-feedback-v1', 50/50 rollout.
   */
  'exp-mp-lobby-connect-feedback-v1': defineExperiment({
    variants: ['control', 'eager-feedback'] as const,
    default: 'control',
    description:
      'MP lobby join eager-feedback. eager-feedback = on join tap with disconnected socket, immediately sets joining state + shows "Connecting…" toast (vs 5s silent wait). Targets /es/multiplayer rageclicks (6/24h, #1 signal 2026-07-18). Conversion = rageclick rate falls. Guardrail = mp_join_attempted stable.',
  }),

  /**
   * MP results "I'm Ready" micro-delight. Hypothesis: after clicking ready the
   * player stares at a disabled button waiting for the host — low-engagement dead
   * time. A brief emoji burst (🎯 shown for 1s before settling to the ✓ state)
   * acknowledges the tap with positive feedback and reduces perceived wait.
   * Conversion = mp_round_ready_clicked → game_feedback avg rating on mp_round.
   * Guardrail = mp_results_exit_clicked must not rise.
   * Wire: ResultsActionButtons.tsx — onClick handler for "I'M READY" button.
   */
  'exp-mp-round-reaction-v1': defineExperiment({
    variants: ['control', 'emoji-burst'] as const,
    default: 'control',
    description:
      'MP results ready-button micro-delight. emoji-burst = show 🎯 emoji for 1s after clicking ready (before settling to ✓ disabled state). control = immediate checkmark. Targets mp_round sentiment (avg 1.5/3). Conversion = game_feedback avg on mp_round improves.',
  }),

  /**
   * Show rival's highest-scoring word in the 2-player round results stat strip.
   * Hypothesis: knowing the word the opponent scored most on ("Rival's best: QUARTZ")
   * makes the score gap feel earned and gives players a concrete takeaway, improving
   * mp_round sentiment from its current 1.43/3 avg.
   * Conversion: game_feedback avg rating on mp_round (surface='mp_round') rises.
   * Guardrail: mp_results_exit_clicked must not rise (players shouldn't bail faster).
   * PostHog flag key = 'exp-mp-results-rival-best-word-v1', 50/50 rollout.
   * Wire: ResultsMainContent.tsx — highlightStats, 2-player only (showRivals=true).
   */
  'exp-mp-results-rival-best-word-v1': defineExperiment({
    variants: ['control', 'show-rival-word'] as const,
    default: 'control',
    description:
      'MP 2p results: show-rival-word = add rival\'s highest-scoring word as a stat chip ("Rival\'s best: WORD"). control = no change. Targets mp_round avg 1.43/3. Only shown when allPlayerWords data is present for the opponent.',
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
