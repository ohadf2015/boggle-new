# FTUE Friction Removal — Plan (2026-07-25)

## Problem (measured from code, not guessed)

A brand-new player must clear **six** gates before touching a game:

| # | Surface | File | Friction |
|---|---|---|---|
| 1 | FTUE `language` | `components/onboarding/LanguageSelect.tsx` | Tapping a flag *selects* (+confetti) but does not advance. Must tap the same flag again, or hit "Let's Play". Two affordances for one intent → "how do I continue?" |
| 2 | FTUE `profile` | `components/onboarding/QuickProfileSetup.tsx` | Name + randomize + avatar-edit + hint + char counter + Google signup. Header reads "Nice work!" before the player did anything. The "Skip → Play Now" escape is `text-neo-white/40` **on a cream panel** = invisible. CTA looks disabled until the name validates. |
| 3 | FTUE `style` | `components/onboarding/StyleSelectStep.tsx` | 14-style music/theme grid, pre-first-play decoration. |
| 4 | `PreGameTutorial` | `components/singleplayer/PreGameTutorial.tsx` | Full-screen: 3 tip cards + **avatar builder a second time** + boost + "Let's Play". |
| 5 | `DirectionsTutorialOverlay` | `components/tutorial/DirectionsTutorialOverlay.tsx` | Blocking modal on a **fake 3×3 board**. CTA `disabled={!canDismiss}` for **10 s** (`DIRECTIONS_MIN_VISIBLE_SECONDS`). |
| 6 | `ModeCoach` | `components/tutorial/ModeCoach.tsx` | In-game hint layer. |

Gate 5 is the sharpest: a new player is *forbidden* from continuing for ten seconds, and is taught on a board that is not the board they are about to play.

## Target

**One FTUE screen → the game → a non-blocking hand that traces the real board.**

Tutorial becomes opt-in ("How to play"), never a gate.

---

## Commit 1 — FTUE: three screens → one

New `components/onboarding/QuickStartStep.tsx`:

- Wordmark hero.
- Compact language flag row — **single tap sets the language, no confirm step**.
- Avatar (prefilled random, tap → `AvatarBuilderModal`) beside name (prefilled via `suggestPlayerName(language)`, editable).
- One giant **PLAY** button, **always enabled**. The prefilled name is what makes identity optional rather than a gate.
- Secondary row beneath: "How to play" (opt-in tutorial) · "I have an account".
- `OnboardingGoogleSignup` demoted below PLAY.

`OnboardingFlow.tsx`: base (non-invite, non-CrazyGames) flow becomes `quickStart` → game.

Removed from the base path: `language`, `profile`, `style` steps. `StylePicker` itself is **kept** — it is shared with Settings and the one-time style popup.

### Constraints

- **Five paths reach "onboarding done"** (`handleStyleComplete`, `handleSkipOnboarding`, `handlePlayNow`, `handleInviteTeaserComplete`, `handleCrazyGamesPlay`), each with a different `markOnboardingComplete` payload, and only some call `consumePendingRoomInvite()`. This is Class 3 in `.claude/rules/60-recurring-pitfalls.md` — diff payloads field-by-field. Losing the invite branch is the likely regression.
- `hooks/useInviteOnboardingMode.ts` owns `activeSteps`; the step list is not local to `OnboardingFlow`.
- `utils/growthTracking` types `trackOnboardingStep` against a step enum, and `OnboardingFlow.tsx:113-116` notes a test asserting `toHaveBeenCalledWith('language')`. Dropping a step breaks the type, the test, and the live PostHog funnel — map removed steps rather than deleting the enum members.
- **Do not touch the CrazyGames early-return path** (`OnboardingFlow.tsx:380`). It is already a play-in-seconds flow.
- i18n: 6 locales (`en/es/he/ja/ru/sv`), client `t()` has no en-fallback and `check:translations` ratchets. Every new key needs a real entry in all six; the `t('key', 'Fallback')` second arg does not satisfy the gate.

---

## Commit 2 — In-game hand coach on the real board

New `components/tutorial/BoardHandCoach.tsx`:

- Props `{ gridEl, enabled }` — same contract as `components/grid/GridConnectorOverlay.tsx`, which already measures and caches real cell centers relative to the grid and draws a polyline over it. Reuse that measurement approach rather than inventing geometry.
- Animates a hand plus a trailing path across a **fixed 3-cell adjacent path** — `(0,0) → (0,1) → (1,1)` — valid on any grid ≥ 2×2. Deliberately **not** a solved word: reaching for `findAllWords` to pick a real demo word drags in the trie requirement (without a trie, depth-15 DFS hangs in prod *and* vitest) for no user-visible gain. Copy is a gesture instruction, not a spelling claim.
- **Non-blocking**: `pointer-events-none`, no clock pause, no timed lock. Ends on the player's first real touch, or after a few loops.
- Persists "seen" via the existing `lib/tutorial/directionsTutorialStore` — one key, no new persistence system.
- Class 5 (`60-recurring-pitfalls.md`): lazy-mounted fullscreen surface → hardcode `bg-neo-navy`, never `bg-neo-cream dark:bg-neo-navy`; prefer a static appear over an `opacity 0→1` tween on mobile.

Replaces the `DirectionsTutorialOverlay` mounts in `SinglePlayerGame.tsx`, `DailyChallengeGame.tsx`, `MultiplayerInGameView.tsx`. The 10 s lock is removed.

**This reverses an explicit earlier product decision** — `useDirectionsTutorial.ts` documents the un-skippable window as *"per product ask ('10s at least')"*. Flagging it rather than silently dropping it.

---

## Dead code found (report only, not deleted in these commits)

No live importer outside `components/onboarding/` and not in `OnboardingFlow`'s switch:
`OnboardingModal.tsx` (only matched in stale `lighthouse-report*.json` build artifacts), `TutorialGame.tsx`, `ScoreReveal.tsx`, `ScoreRevealV2.tsx`, `QuickTipsStep.tsx`, `ProfileSetupStep.tsx`, plus `components/game/GestureTutorialTooltip.tsx`, `DirectionHintOverlay.tsx`, `GameModeIntro.tsx`, `SwipeTipTooltip.tsx`.

`MiniGrid` / `WelcomeDemoGrid` / `WelcomeDemoStep` **are** live (landing cards, `HowToPlay`, `RedditVSBattle`, CrazyGames flow) — do not remove.

---

---

## What shipped (delta from the plan above)

Two extra gates surfaced during implementation and changed the shape of commit 2:

- **`?play=1` already skips `PracticeTutorialSheet`**, so the FTUE destination has no tutorial sheet. But it also meant `PracticeClassicSandbox` — the literal first board a new player sees — had **no** directions teaching at all. It now mounts the coach.
- **`hooks/useFirstPlayTutorial.ts` already existed** and already highlights a real mixed-direction word on the real board in single player. The hand was the only missing piece, so `BoardHandCoach` consumes `highlightedPath` when present and falls back to a fixed path otherwise.
- **The blocking overlay in multiplayer was a correctness bug, not just friction.** It froze the *local* clock, but an MP round is timed by the server — a first-time player was locked out of a competitive round for 10 s while it counted down against them.
- **The fixed fallback path was wrong on the first attempt.** `(0,0) → (0,1) → (1,1)` contains no diagonal, so it taught nothing new. A test asserting "the last step is diagonal" caught it; the path is now `(0,0) → (1,0) → (0,1)`.

Because nothing referenced them any more, the whole blocking chain was deleted rather than left dormant: `DirectionsTutorialOverlay`, `DirectionsBoardDemo`, `useDirectionsTutorial` (which held `DIRECTIONS_MIN_VISIBLE_SECONDS`), `useDirectionsTutorialPause`, and their tests. `lib/tutorial/directionsTutorialStore` is kept — `BoardHandCoach` reuses it for show-once.

## Verification

TDD per `.claude/rules/22-tdd-strict.md` (zero exceptions). Existing suites that must stay green:
`components/onboarding/__tests__/OnboardingFlow.test.tsx` (361), `StyleSelectStep.test.tsx`, `components/tutorial/DirectionsTutorialOverlay.test.tsx`, `lib/onboarding/__tests__/useFTUEGate.test.tsx`, `e2e/onboarding.spec.ts` (381), `e2e/invite-onboarding.spec.ts`.

Then `npm run lint && npm run test && npm run build`.
