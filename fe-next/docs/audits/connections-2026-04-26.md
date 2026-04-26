# Connections Audit — 2026-04-26

**Scope:** `components/connections/*`, `lib/connections/*`, `app/[locale]/connections/*`. Compound-word "bridge" puzzle (word1 + ? + word2 → guess middle). Level-based progression, lives gate, ad-revive, XP rewards.

**Method:** 7-lens audit (gameplay, HUD/visibility, mobile, RTL, a11y, telemetry, edge-cases).

**Files reviewed:**
- `ConnectionsGame.tsx` (374 LOC) — orchestrator, header HUD
- `PuzzleCard.tsx` (450 LOC) — chain display, input, give-up flow
- `OutOfLivesModal.tsx` (111 LOC)
- `ConnectionsEffectsCanvas.tsx` (175 LOC) — particle bursts via window events
- `gameLogic.ts` (138 LOC) — pure reducer
- `livesStore.ts`, `levelStore.ts`, `puzzles.ts`

---

## Findings

### P0 — Fix this pass

**C-001 — HUD scrolls away on mobile / when keyboard up**
*Location:* `ConnectionsGame.tsx:252-344`
*Symptom:* Header (lives + level + score) is a non-sticky flex row inside `containerRef`. On phones, focused input opens keyboard → page reflows → header scrolls past viewport top. Player loses sight of remaining lives mid-guess.
*Fix:* Make header `sticky top-0 z-30` with backdrop. Solo games hide nav (`ae9cb94f2`) so `top-0` is unobstructed. Particle-burst math uses `getBoundingClientRect()` minus container rect — sticky-positioned header still resolves correctly since both rects are viewport-relative.

**C-002 — Level-complete falls through to "noAccess" message**
*Location:* `ConnectionsGame.tsx:226-232` + `puzzles.ts` (`getPuzzleForLevel` returns null past pack)
*Symptom:* When `level > totalLevels`, `getPuzzleForLevel` returns null → component renders generic `connections.noAccess` ("This game mode is not available."). Same fallback as feature-flag-off / locale-without-puzzles. Player who cleared the whole pack sees a dead-end error message instead of a victory screen.
*Fix:* Distinguish terminal-success state from no-content state. Render celebration card with final session score + XP + "Play again" CTA that resets `setCurrentLevel(language, 1)`.

### P1 — Shipped this pass

**C-003 — Reduced-motion guard (FIXED)**
`ConnectionsGame.tsx` now reads `useReducedMotion()` and skips dispatching all five `connections:*` window events when the user prefers reduced motion. Suppresses particle bursts, full-screen flash, and screen shake at the source — no GameCanvas API change needed. WCAG 2.3.3 satisfied for this surface. Test: `ConnectionsGame.hud.test.tsx` "skips life-loss particle bursts when prefers-reduced-motion is set".

**C-004 — UI test coverage gap (PARTIAL)**
Added `ConnectionsGame.hud.test.tsx` (6 tests): sticky HUD class, label rendering, victory-card render, Play Again resets storage, no-puzzles fallback, reduced-motion suppression. Outstanding: OutOfLivesModal flow + give-up path tests.

**C-005 — `xpAwardedIdsRef` cleared only on language change**
After 1000 levels the Set holds 1000 strings. Negligible memory; correctness is fine because puzzle ids are unique. Drop unless we ship infinite-mode.

### P2 — Open design questions

**C-006 — Difficulty badge spoils difficulty pre-guess**
`PuzzleCard.tsx:149-160` shows easy/medium/hard label before the player commits. May reduce challenge perception. Design call, not a defect.

**C-007 — `giveUp` doesn't decrement lives**
By design (`gameLogic.ts:74-79`): lives are spent only on wrong guesses, give-up is ad-gated for non-admin. Documented in code. Confirm intent matches monetization plan.

**C-008 — No "skip puzzle without losing streak" affordance**
A bad puzzle (e.g., locale-mistake bridge) forces give-up which resets streak. Could add a one-shot skip but adds complexity. Defer.

---

## What works well

- Pure reducer in `gameLogic.ts` — clean state transitions, easy to test.
- Per-locale level + lives persistence in `localStorage` (`levelStore`, `livesStore`).
- Particle bursts anchored to actual DOM rects (`heartsRef`, `levelBadgeRef`) rather than viewport center — feels connected to the action.
- Effects canvas is `pointer-events-none` + transparent — never occludes HUD permanently.
- Color-coded HUD: pink lives / cyan level / lime score matches design-system family palette.
- Ad-gated reveal-hint / reveal-answer / revive — three monetization touchpoints, all with admin-free fallback.
- IME-safe submit (`isComposing` + `keyCode === 229` guard).

---

## Telemetry notes

- `connections:correct/wrong/lifeLost/levelUp/gameOver` — window CustomEvents, consumed only by EffectsCanvas. PostHog/Sentry not wired here. If retention analysis is needed, hook these to an analytics emitter.
- XP records POST to `/api/education/record-xp` with `lessonId: 'connections-game'`.
- Feedback POST via `submitConnectionsFeedback` on rate.

---

## Verification

- `npm run build:fast` — green
- `npm run lint` — green
- Manual: tested HUD visibility scroll behavior in Chrome devtools mobile emulator (375×667 + soft keyboard sim), RTL mode `?locale=he`.
