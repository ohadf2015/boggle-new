# Word Wheel Daily — Retention & Signup Conversion Plan

**Date:** 2026-06-04
**Problem:** Players arrive (mostly SEO/daily-puzzle traffic) for Word Wheel daily, play **one** game, then leave — no signup, no second activity.
**Goal:** (1) retain post-game (2nd session / 2nd activity), (2) convert to signup from the post-game moment. **Every mechanic measurable + A/B testable in PostHog** (nightly-readable via the `lib/experiments.ts` registry contract).

---

## Root-cause findings (code-verified, not guessed)

| # | Finding | Evidence |
|---|---|---|
| **R1** | **Word Wheel completions are invisible to the signup machine.** `useSignupPrompt` gates on `getGuestStats()` games/wins, refreshed by the `guestStatsChanged` event. `updateGuestStatsAfterGame` (which increments games + dispatches that event) is called **only** from `hooks/useResultsSideEffects.ts` (SP/MP results). `components/daily/` has **zero** guest-stats touches. → For a wheel-only visitor `games=0` always, so `qualifies = wins>=1 \|\| games>=5` is **always false**. The global `SignupPromptHost` can never fire for them. | `grep updateGuestStatsAfterGame components/daily hooks` → only `useResultsSideEffects.ts`; `useSignupPrompt.ts:76-86` |
| **R2** | **The daily streak is computed and thrown away.** `getDailyStreak()` returns `{currentStreak, longestStreak, totalDailiesCompleted}`, persisted on completion (`WordWheelChallenge` → `saveWordWheelResult`), but **never shown** in `WordWheelResults`. The single strongest daily-habit lever (Wordle/Duolingo) is dark. | `utils/dailyChallenge/streaks.ts`; `WordWheelResults.tsx` renders score/insights/leaderboard, no streak |
| **R3** | **Word Hunt daily has a full signup-conversion trigger system; Word Wheel has none.** `utils/dailyChallenge/signupConversion.ts` → `getConversionTrigger()` (firstCompletion / streakAtRisk / topPercentile / quickSolve) + `setPendingDailyResult` for OAuth round-trip + `syncGuestDailyResultsToAccount`. Word Wheel results screen uses **none** of it. | `signupConversion.ts`; WordWheelResults imports |
| **R4** | **Returning `already-played` user hits a dead-end.** Same `WordWheelResults` renders for `completed` and `already-played`; no replay/practice CTA. A returning daily player has nothing to do but leave. | `WordWheelChallenge` phase block |

**Implication:** the fix is mostly *wiring existing infra into the wheel flow*, not greenfield. Highest leverage = surface the streak + a streak-anchored signup value-exchange in `WordWheelResults`, plus a second-activity hook for the dead-end.

---

## Constraints (non-negotiable)

- **Non-predatory** (Google Families, many under-18). Lead with **value** ("keep your N-day streak across devices", "save your spot on the board"), **never** loss-aversion pressure ("you'll LOSE everything"). No manipulative A/B variant.
- All UI text `t()` ×5 (en/he/sv/ja/es); Hebrew RTL.
- Component < 300 lines; file < 500.
- TDD (project zero-tolerance). Pure logic (trigger selector, streak-message) test-first.
- Phone **and** TV (focusable CTAs, no hover-only).

---

## Ranked mechanics (impact / effort)

> Each = what the player sees · where it slots · the value-exchange · PostHog experiment (key / variants / primary event / guardrail).

### M1 — Streak surfacing + streak-anchored signup CTA *(SHIP FIRST — highest leverage)*
- **See:** a 🔥 "Day N streak" chip in `WordWheelResults` (uses existing `neo-orange` streak semantic). For guests, a value-led card: *"Keep your N-day streak safe — sign up to play on any device."* For N≥2 it's stronger ("don't break a good run" framed positively). First-ever completion → *"Save today's result + start a streak."*
- **Slot:** new `WordWheelSignupCta` rendered in `WordWheelResults` (guest + non-practice only), driven by a pure selector `selectWheelSignupOffer(streak, isFirstCompletion, score)` reusing `getConversionTrigger`-style priorities. Streak chip rendered for everyone.
- **Exchange:** the streak is *theirs* and only persists across devices/loss with an account → concrete, honest reason to sign up **now**, at the emotional peak.
- **Experiment:** `wheel-signup-offer-v1` · variants `control` (no card) / `streak-value` (streak-anchored) / `board-spot` (leaderboard-rank-anchored) · **primary** `wheel_signup_cta_clicked → signup_completed` within session · **guardrail** `wheel_results_bounced` (left within 5s w/o interaction) must not rise.

### M2 — `already-played` dead-end → "Practice unlimited wheels" second activity *(SHIP FIRST)*
- **See:** returning user (already played today) gets a primary *"Play unlimited practice wheels"* CTA (practice mode already exists — `PracticeChainCta`, `usePracticeFlag`).
- **Slot:** `WordWheelResults` — render practice CTA when `phase==='already-played'` (pass an `isReplayDeadend`/`alreadyPlayed` prop).
- **Exchange:** kills the bounce — gives the engaged returning player an immediate next game.
- **Experiment:** `wheel-replay-cta-v1` · `control` / `practice-cta` · **primary** `wheel_practice_cta_clicked → practice_game_started` · **guardrail** none (pure-additive).

### M3 — "Come back tomorrow" reminder hook (streak continuity)
- **See:** below the streak chip, a quiet *"Next wheel unlocks in HH:MM"* + (guest) *"Sign up for a streak reminder"* / (native) opt-in local notification.
- **Slot:** `WordWheelResults`, reuse `isStreakAtRisk()` (already exists) for hours-remaining math.
- **Exchange:** turns a one-off into a daily habit; the reminder is the signup carrot.
- **Experiment:** `wheel-tomorrow-tease-v1` · `control` / `countdown` / `countdown-reminder` · **primary** `D1_return` (person plays a wheel next day) · **guardrail** notification opt-out rate.

### M4 — Cross-promo ordering (wheel → hunt vs wheel → signup)
- **See:** the existing Word Hunt "STEP 2 OF 2" CTA vs the new signup card — which goes first for a guest who hasn't played hunt?
- **Slot:** `WordWheelResults` ordering, gated by experiment.
- **Exchange:** balances "finish the daily pair" (retention) vs "sign up" (conversion).
- **Experiment:** `wheel-results-cta-order-v1` · `hunt-first` / `signup-first` · **primary** combined `cross_promo_click + wheel_signup_cta_clicked` · **guardrail** neither drops >X%.

### M5 — Personalized "you beat X% of players today" insight → signup to track
- **See:** `DailyInsightStack` already shows analytics; add a guest-only "sign up to keep your stats history" tail.
- **Experiment:** `wheel-insight-signup-v1` · `control` / `track-cta`.

### M6 — Rare-find / "Word Wizard" share → viral loop
- **See:** existing rare-find + exceptional banner already render; add a share-grid CTA (emoji story like Connections) for guests, signup on the share-back.
- **Experiment:** `wheel-share-cta-v1` · `control` / `share-grid` · **primary** `wheel_share_clicked`.

### M7 — Mode-tease: "try Blast / Connections next" launcher strip
- **See:** a small mode launcher under results for the wheel-only player who's done.
- **Experiment:** `wheel-next-mode-strip-v1` · `control` / `strip`.

---

## Single highest-leverage "second activity" hook
**M2 (practice unlimited wheels) for the `already-played`/`completed` dead-end** — it's the cheapest, purely additive, and directly attacks the one-and-done bounce by giving an engaged player an instant next game in the *same* mechanic they just enjoyed. Pair with M1's streak so the *reason to return tomorrow* is established in the same screen.

---

## Anti-patterns to avoid (this audience: kids + casual + RTL + TV)
- **No loss-aversion pressure / dark patterns** (Families policy). Value-led only.
- **No signup wall before play** — wheel stays free/no-gate; CTA is post-game, dismissible.
- **No hover-only CTAs** (TV/remote) — must be focusable + keyboard/dpad navigable.
- **No interstitial that blocks the celebration** — let the score/confetti land first; CTA appears after (≥1.5s), never pre-empting the dopamine.
- **RTL:** streak chip + arrows must mirror (`rtl:rotate-180`, logical props).
- **No nagging:** respect `wasSignupModalDismissedRecently()` (3-day cooldown) — reuse it.
- **No fake scarcity / countdown manipulation** for kids — the "next wheel in HH:MM" is factual (puzzle genuinely unlocks at midnight), not invented urgency.

---

## Measurement plan (nightly-readable funnel)

**Funnel events** (person-scoped, mode=`word_wheel`):
1. `wheel_results_viewed { streakDays, score, isFirstCompletion, isGuest, alreadyPlayed }`
2. `wheel_signup_cta_viewed { experiment, variant, offerType }`
3. `wheel_signup_cta_clicked { experiment, variant, offerType }`
4. `signup_completed { source: 'word_wheel', experiment, variant }` (existing event, add source)
5. `D1_return { mode: 'word_wheel' }` (person plays a wheel the next calendar day)

**Guardrails:** `wheel_results_bounced` (left <5s, no interaction); notification opt-out rate (M3).

**Structure for the nightly A/B-reading job:** every experiment conforms to the `lib/experiments.ts` registry shape (`key + variants + default + description`) and fires `experiment_exposed { experiment, variant }` via `useExperiment`. The nightly job reads, per experiment: exposure count by variant → primary-event conversion by variant → guardrail delta → PostHog stats-engine significance. No bespoke wiring; the registry **is** the contract. Add each new key to the registry + mirror the flag in PostHog UI.

---

## Ship-this-week scope
**Implement complete (TDD + experiment + events + i18n×5 + tests): M1 + M2.** Everything else is a follow-up in this doc. Rationale: M1 attacks conversion (the streak exchange the user is pointing at) and M2 attacks the bounce; both are pure additions to one component reusing existing infra, fully measurable, non-predatory.

---

## Council input
> Council (`/claude-council:ask`, gemini-cli + grok-cli) was queried in parallel but **did not return** — the CLI providers hung at 0 bytes for >10 min and were killed. The synthesis above is code-verified (not model-opinion), so this is not blocking. Re-run the council later to pressure-test M3–M7 framing if desired.

---

## SHIPPED 2026-06-04 (M1 + M2, TDD)

**New (pure + tested):**
- `utils/dailyChallenge/wheelSignupOffer.ts` — `selectWheelSignupOffer()` (7 tests). Decides value-led offer framing; null = stay silent.
- `components/daily/WordWheelSignupCta.tsx` — guest signup CTA, experiment `wheel-signup-offer-v1` (6 tests). Reuses `DailyChallengeInlineSignup`.
- `components/daily/WordWheelReplayCta.tsx` — already-played → practice-wheel CTA, experiment `wheel-replay-cta-v1` (3 tests).

**Wired:**
- `WordWheelResults.tsx` — streak chip (always, `streakDays≥1`) + both CTAs (new props optional → existing tests intact).
- `WordWheelChallenge.tsx` — passes `isAuthenticated / streakDays / isFirstCompletion (totalDailiesCompleted≤1) / alreadyPlayed`.
- `DailyChallengeInlineSignup.tsx` — `pendingResult` now optional (wheel syncs server-side by fingerprint), guarded via `savePending()`.
- `lib/experiments.ts` — 2 new experiment keys (mirror in PostHog UI, 50/50).
- `utils/growthTracking.ts` — 3 new GrowthEvents: `wheel_signup_cta_viewed/clicked`, `wheel_practice_cta_clicked`.
- Translations ×5 (`wordWheel.results.streakChip`, `wordWheel.signup.*`, `wordWheel.replay.*`), native (no calques).

**Gates:** tsc 0 · lint 0 · 51 tests green (incl. existing WordWheelResults + WordHunt experiment regressions) · `npm run build` compiled clean.

**Launch caveats (operator, read before flag creation):**
- **Dark by default** — until both PostHog flags exist, `variant` resolves to registry default `control` → both CTAs render nothing. Only the always-on **streak chip** is user-visible from this deploy. The deploy itself is not the experiment.
- **Exposure fires in BOTH arms** for eligible users (control denominator) — `experiment_exposed` is the A/B baseline; `wheel_signup_cta_viewed` is the treatment-only "CTA shown" signal. Don't confuse them when building the read.
- **M1 ships WITHOUT its `wheel_results_bounced` guardrail** (emitter not wired — follow-up). Watch session-length / dwell manually for the first cohort until the guardrail lands.

**PostHog setup still required (manual, by operator):** create flags `wheel-signup-offer-v1` (control/streak-value) and `wheel-replay-cta-v1` (control/practice-cta) at 50/50; build the nightly read off `experiment_exposed` → `wheel_signup_cta_clicked`/`wheel_practice_cta_clicked` → `signup_completed`/practice `game_started`, with `wheel_results_bounced` guardrail.

**Follow-ups (not shipped):** M3 tomorrow-tease, M4 CTA ordering, M5 insight-signup tail, M6 share loop, M7 mode strip; thread `source:'word_wheel'` onto `signup_completed` through the auth callback; add `wheel_results_bounced` emitter.
