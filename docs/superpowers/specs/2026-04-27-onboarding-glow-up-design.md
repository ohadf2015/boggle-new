# Onboarding Glow-Up — Design Audit

**Date:** 2026-04-27
**Author:** Ohad + Claude
**Goal:** Make first-time user experience celebrating, dopamine-rich, and *not feel like a tiring task*.
**Scope:** First-time user from landing → first game played (FTUE 6-step flow).

---

## TL;DR

LexiClash onboarding is structurally sound but **emotionally flat**. The dopamine primitives exist (`fireOnboardingBurst`, mascot, count-up, `AMAZING!` toast, victory confetti) but are sparse, predictable, and over-engineered around an *assessment* frame ("here's your score vs the average") instead of a *reward* frame ("here's what you got").

Three layers of fix, prioritized:

1. **Frame fix** — replace assessment language with reward language across ScoreReveal, ModeFork, and tutorial transitions. Lowest cost, highest behavioral lift.
2. **Friction cuts** — remove name-required gate, soften retry loop, shrink ModeFork to 2 cards.
3. **Surface polish** — add tier titles, mascot reactivity, streak start, daily-challenge hook on score reveal.

---

## Current Flow (As-Built)

Source: `fe-next/components/onboarding/OnboardingFlow.tsx` and children. State machine:

| Step | Component | Purpose | Time |
|---|---|---|---|
| 0 | `LanguageSelect` | Pick language | ~5s |
| 1 | `ReturningUserStep` | Account vs new player gate (CrazyGames skips) | ~5s |
| 2 | `TutorialGame` | 4×4 guided grid, find 3 words | ~30-90s |
| 3 | `QuickProfileSetup` | Name + avatar | ~15-30s |
| 4 | `ScoreReveal` | Show tutorial score vs average | ~5s |
| 5 | `ModeFork` | Pick first real mode | ~10s |

Total: 90-120s before player picks own destiny. Drop-off telemetry tracked via `trackOnboardingStep()` and `trackOnboardingFirstWord()` in `utils/growthTracking.ts:797-823`.

State persisted to `localStorage` (keys `ONBOARDING_COMPLETED`, `ONBOARDING_DATA`) via `utils/onboardingStorage.ts:31-82`, with parallel write to `profileStorage`.

---

## Friction Findings (the "tiring" sources)

Each finding has: location, why it's tiring, recommended fix.

### F1. Name input is hard-required and form-shaped
**Location:** `components/onboarding/QuickProfileSetup.tsx:24-56`
**Why tiring:** First "form" feeling in the flow. Required field, regex validation, shake on fail, focus on retry. Reads like a sign-up form, not a game beat.
**Fix:** Auto-suggest a name (`PIZZA-FAN`, `WORD-CAT`, `LIME-TIGER` style — pick from a pool of word + animal combos seeded from the device). Default state = filled. Field becomes editable, not required. Add a small "🎲" reroll button next to the input.

### F2. Retry loop wipes progress
**Location:** `components/onboarding/ScoreReveal.tsx:244-255` + `TutorialGame.tsx:150`
**Why tiring:** Hitting *Try Again* drops the player back to a blank tutorial grid. The whole flow restarts. PostHog `attemptNumber` tracks this — there's already evidence of pain.
**Fix:** Remove "Try Again" button entirely. The tutorial is *guaranteed-success* (3 words on a curated grid). If the player fails to find 3 words, advance anyway with a forgiving copy ("nice start!" instead of pass/fail). Replace the button slot with a secondary "Skip to mode picker" if anything.

### F3. Tutorial → profile transition is silent
**Location:** `components/onboarding/TutorialGame.tsx:71` (advances step on completion)
**Why tiring:** Player just performed a small win and gets dropped into a name form. The momentum dies in the gap.
**Fix:** Insert a 1.2s celebration beat between tutorial finish and profile step — mascot reacts to the *actual* word the player played ("PIZZA?! Iconic.") via a canned reaction map keyed off common 4-7 letter words. Falls back to generic "Nice find!" otherwise.

### F4. ModeFork = decision paralysis right when player wants to play
**Location:** `components/onboarding/ModeFork.tsx`
**Why tiring:** 4 cards, all unfamiliar names, no clear "best for you." Player has just spent 90s in tutorial; cognitive budget is empty.
**Fix:** Collapse to 2 cards: *Daily Wheel* (recommended, with a reward preview "Win up to 50 🪙 in 60s") + *Surprise Me* (random mode). Move the rest to a "More modes" expandable below. Ship with the recommended card visually 2× larger and pulse-animated.

### F5. Language step feels like settings
**Location:** `components/onboarding/LanguageSelect.tsx`
**Why tiring:** Cold-start admin task. Player came to play, gets a config screen first.
**Fix:** Auto-detect from `navigator.language`. Show a small inline pill at the top of step 1 ("Playing in **English** — change?") instead of a dedicated step. Saves ~5s and removes a "settings" flavor moment.

---

## Dopamine Gaps (the "boring" sources)

Already-celebratory moments left flat. Each gap is a place to add reward signal cheaply.

### D1. Score reveal shows a number, not a *win*
**Location:** `ScoreReveal.tsx:148-188`
**Gap:** Player sees a count-up number + comparison bar + retry button. The frame is *grade*, not *gain*.
**Fix:** Reframe to show **what you got**, not what you scored:
- 🪙 38 gold (animated coin tick to wallet)
- 🔥 Day 1 streak begins
- ⭐ Achievement unlocked: "First Words"
- Title earned: "Word Hunter" (pulled from a tier table keyed on score)
- Then, smaller, almost as a footer: "Score: 180" (tabular, secondary)

The current count-up animation can stay — just animate the *coins* not the score number.

### D2. Mascot is decorative, not reactive
**Location:** Throughout `OnboardingFlow.tsx`, used as static illustration.
**Gap:** The mascot is the brand voice and never speaks *to* the player. It's wallpaper.
**Fix:** Add a `mascotReactions.ts` helper that picks a speech-bubble line based on:
- Words played (specific reaction for "PIZZA", "EPIC", "WIN", etc. — fun-list of ~30 common words)
- Score tier (low/mid/high → different vibes)
- Time of day (`good evening, word hunter` after 6pm)

Render reactions in 1.5s float-up bubbles at: tutorial first-word, tutorial complete, score reveal, mode pick.

### D3. No streak / momentum carry into first real game
**Gap:** Score reveal is terminal. No promise of tomorrow, no thread to next session.
**Fix:** On score reveal, show "🔥 Day 1 — come back tomorrow for **+50 bonus 🪙**" as a small persistent banner. This is a forward-pointing dopamine hook, not a backward-looking grade.

### D4. Mode fork has no reward preview
**Location:** `ModeFork.tsx`
**Gap:** Cards say what mode it is, not what you get. Curiosity gap closed by labels alone.
**Fix:** Each card shows a small "earn up to: 🪙 50" + a teaser ("Beat today's average to climb the leaderboard"). Specifics matter — generic "play to earn" doesn't trigger curiosity, specific stakes do.

### D5. Avatar shuffle has confetti, but final pick doesn't
**Location:** `QuickProfileSetup.tsx:62` (shuffle burst exists), `:90` (submit burst exists, but flat)
**Gap:** The randomization is celebrated; the *commitment* isn't.
**Fix:** When player taps "Looks good" / submits the avatar, fire a stronger burst (`fireFireworks(2, 800)` instead of single burst), and mascot says the player's chosen name out loud in speech bubble ("Welcome, **Pizza-Cat**!").

---

## Three Strategic Approaches

### A. "Already Playing" — patches, not rewrite (~3-5 days)
Keep the 6-step state machine. Land all F1-F5 + D1-D5 fixes in place. Lowest risk, ships fast, captures ~80% of the lift.

**Wins:**
- Reuses every existing primitive (`fireOnboardingBurst`, mascot, count-up, confetti).
- Backward-compatible — can A/B-flag via existing analytics infra.
- One sprint of work.

**Loses:**
- Still 6 steps. Still ~90s. The structural "why are you making me do all this before I can play" question is unanswered.

**Recommendation: SHIP THIS AS THE BASELINE.** It's the obvious fix and there's no reason to wait.

---

### B. "Game-as-Onboarding" — structural rewrite (~2 weeks)
Tutorial becomes the entire onboarding. No separate name/avatar/language steps; they happen *inside* the game.

- First word found → mascot pops up, "Yo, what should I call you?" → name captured in speech bubble (diegetic, not a form).
- Second word → avatar materializes from the letters you played (letters fly into a hat → mascot wears it).
- Third word → score reveal *is* the daily-challenge entry ("Today's leaderboard locked at 240 — beat 5 friends?").

**Wins:**
- Removes the "form" feeling entirely. Onboarding feels like the first level.
- Very high "wow" moment for first-time impressions / store reviews.

**Loses:**
- 2 weeks of work, more risk.
- Diegetic name capture is harder to localize (5 languages × natural copy).

**Recommendation: DO LATER, not now.** Schedule for post-A. Real test: does A move the needle enough on activation to justify B's cost?

---

### C. "Power Fantasy Cold Open" — boldest reframe (~3 weeks)
Skip name + avatar + language entirely on first visit. Fresh user lands directly in a *rigged* tutorial grid where 7+ words are guaranteed visible. First word → confetti + "AMAZING!" + 50 XP. Score reveal: "🏆 You scored higher than 73% of new players today" (always true, because tutorial is rigged).

*Then* and only then: "Save this score?" → name + avatar = unlocking a profile to *keep the win*. Loss aversion does the conversion work that the form fields couldn't.

**Wins:**
- Reframes onboarding as "you already won, want to save it?" — the strongest possible psychological hook.
- Removes every form-feeling moment from before-the-fun.

**Loses:**
- Server-side rigged-grid logic + new copy + balance review.
- 3 weeks; not next sprint.
- Risk of feeling manipulative if the rigging is detectable (must be invisible).

**Recommendation: DON'T BUILD UNTIL A RESULTS ARE IN.** This is the strategically right destination, but only worth the build cost if A's lift is non-trivial and the activation funnel is genuinely the bottleneck. Re-evaluate in a month.

---

## Recommended Path

1. **Ship Approach A this sprint.** It's tractable, cheap, and lands every finding in this audit using existing primitives.
2. **Instrument the changes.** Add PostHog events for: tier title earned, mascot reaction shown, streak Day 1 banner viewed, suggested-name accepted vs edited. Set up a funnel comparing A-cohort vs control on `first_game_activation` rate.
3. **Re-evaluate in 2 weeks.** If A moves activation > +10% relative, ship B. If it moves > +20%, ship C. If it doesn't move, the bottleneck is upstream of onboarding (acquisition, app-store conversion) — go look there.

---

## Implementation Sketch (Approach A)

For the implementation plan, see the `writing-plans` skill output — to be created next.

High-level files affected:
- `components/onboarding/QuickProfileSetup.tsx` — auto-suggest name, optional field
- `components/onboarding/ScoreReveal.tsx` — reframe as reward summary, drop retry button
- `components/onboarding/ModeFork.tsx` — collapse to 2 cards, add reward previews
- `components/onboarding/LanguageSelect.tsx` — auto-detect, inline pill
- `components/onboarding/TutorialGame.tsx` — guaranteed-pass, mascot reaction trigger
- `components/onboarding/MascotReactions.tsx` *(new)* — speech-bubble reaction map
- `utils/onboardingTitles.ts` *(new)* — score-tier title table
- `utils/onboardingNameSuggestions.ts` *(new)* — random name generator
- `translations/*.json` — copy updates across 5 locales
- `utils/growthTracking.ts` — new events for instrumentation

Test surface:
- New unit tests for title-table, name-suggestion, mascot-reaction map
- Update `OnboardingFlow.analytics.test.tsx` for new events
- Add integration test: tutorial → score reveal → mode fork happy path
- RTL pass for Hebrew (mascot speech bubbles, tier titles)

---

## Out of Scope

- ScoreReveal motion / sound design at the frame-by-frame level — needs a coded prototype, not a spec doc.
- Visual mockup exploration (12 mockups generated via SuperDesign were not faithful to brand colors despite design-system context; not worth more credits — prototype directly in code).
- ReturningUserStep changes (working as intended; CrazyGames skip path is correct).
- Backend score / XP economy changes (separate audit, see `economy-balance-audit-2026-04-22`).

---

## Appendix: SuperDesign Mockups Generated

12 ScoreReveal mockups were explored on the SuperDesign canvas. None landed (color drift from design system, mockups can't show motion). Project URL preserved for reference:

https://app.superdesign.dev/teams/18139703-da30-49d5-b72c-9d4913d0f4d5/projects/207ac378-7b8d-47df-ae3a-db0f2780a76e

Lessons captured for future SuperDesign use:
- AI design tools drift from brand colors even with design-system context loaded; only a coded prototype gives reliable fidelity.
- "Stay in design system" reads as restrictive — must explicitly *license* which accents apply per moment (e.g., yellow + orange for celebration screens).
- Stills cannot communicate motion-based dopamine; reserve mockups for layout exploration only, prototype motion in code.
