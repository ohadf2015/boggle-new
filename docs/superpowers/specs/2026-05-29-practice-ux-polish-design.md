# Practice UX Polish — Design

**Date:** 2026-05-29
**Goal:** Make the Practice experience more attractive, simple, clear, and fun, with an uncomplicated flow.
**Scope:** The three practice **sandboxes** (`PracticeClassicSandbox`, `PracticeWordHuntSandbox`, `PracticeWheelSandbox`) and their shared chrome. Hub + flow orchestrator are confirmed good (screenshot-verified) and are **out of scope**.

---

## Evidence (live phone-width screenshots, localhost prod components, LTR + RTL `/he`)

Verified by driving the real flow at 390×844 through onboarding → hub → all 3 sandboxes + `/he` RTL.

1. **The exit button dominates every play screen.** All 3 sandboxes render an *identical* full-width, saturated `bg-neo-pink border-3 shadow-hard` "Skip to real game" button pinned at thumb height. On a calm, no-stress practice board it is consistently the loudest, heaviest element on screen — the most prominent CTA is the way *out*. Undercuts "fun & simple."

2. **Wrong CTA copy (real bug).** All 3 sandboxes use `practice.wordHunt.playRealCta` / `practice.wordHunt.bailoutCta`. So completing **Classic** or **Wheel Rush** shows **"Play Word Hunt now"** (routing correctly to that mode's real game, but with Word-Hunt wording). `practice.classic.playRealCta` ("Play Classic now") exists but is unused; `practice.wheelRush.playRealCta` ("Play Wheel Rush now") exists but is unused. No classic/wheel `bailoutCta` keys exist.

3. **Contradictory / redundant guidance.**
   - Wheel: coach banner says "**Tap** the lime center letter" while the hint below the wheel says "**Drag** letters to build a word."
   - Word Hunt: a lime "Tap letters to guess" banner *and* a coach banner "**Drag** connected letters to spell the target word" (tap vs drag), plus "**10/10** tries left" directly above "You get **7** tries" — three different tries numbers with no explanation.
   - Classic: the coach banner sits exactly where the `0/3` goal pill lives, **covering the goal**.

4. **Goal / progress is weak or invisible.** Wheel shows no `0/3` progress at all; Classic's `0/3` is obscured by the coach banner; Word Hunt over-explains with conflicting counts. A new player often can't tell *what the goal is* or *how close they are*.

5. **Dead vertical space.** Wheel content lives in the top third with a large empty gap above the pink button; Classic floats a small `max-w-xs` board mid-screen with heavy margins. Screens feel sparse, not inviting.

RTL (`/he`) is structurally correct — all issues above are universal, not RTL-specific.

---

## What we keep (fun is a requirement, not noise)

Per the "simple **and** fun" mandate, the diagnosis is mostly subtractive but **must not gut delight**:
- **Keep** per-word celebration: confetti, floating "+N pts" pop, Pixi juice, accept/reject SFX, mascot. These are the fun.
- **Cut** chrome: tame the exit button, remove redundant/contradictory instruction lines.
- **Curate**: one clear instruction source per mode, one always-visible goal indicator.

---

## Design

### 1. Shared `PracticeBailoutCta` component (fixes bug #2, declutters #1)

New `components/practice/PracticeBailoutCta.tsx`. Props: `mode: PracticeMode`, `solved: boolean`, `locale`.

- **Resolves the correct per-mode key** — kills the wordHunt-copy bug for all 3 modes:
  - `solved` → `practice.{mode}.playRealCta` ("Play Classic now" / "Play Word Hunt now" / "Play Wheel Rush now")
  - not solved → `practice.{mode}.bailoutCta`
- Routes via the existing per-mode real-game URL (each sandbox already knows its target; pass an `href` prop to keep routing where it lives).
- **Restyled as a quiet secondary control**, not the hero: a centered, underlined/ghost text link or a slim outline pill (`text-neo-white/70`, no saturated fill, no `border-3`, no hard shadow). It remains a reliable one-tap escape but stops competing with the board. Keeps `data-testid="practice-bailout-cta"` so existing tests pass.
- Replaces the 3 duplicated inline buttons.

### 2. Shared `PracticeGoalIndicator` (fixes #3 coverage, #4 clarity)

New `components/practice/PracticeGoalIndicator.tsx`. Props: `mode`, `found: number`, `goal: number` (+ optional `targetWord` for Word Hunt).

- One prominent, **always-visible** goal+progress chip that is **never covered** by the coach banner — place it in a dedicated HUD row above/beside coach, or give it higher stacking + its own row.
- Shows both intent and progress: e.g. Classic/Wheel "Find 3 words · **1/3**" with 3 dots/slots filling in (reuse existing `PracticeTargetBoxes`); Word Hunt "Guess the word" with the `?`-slot row as the single tries/goal display.
- Keeps `data-testid="practice-goal-indicator"` (referenced by `PracticeClassicSandbox.test`, `PracticeWheelSandbox.test`).

### 3. De-duplicate / de-conflict guidance (fixes #3)

- **One instruction source per mode.** Keep the inline coach micro-tip that retires after first success; remove the secondary static hint that contradicts it. Standardize verb to match the real input affordance ("Drag to connect letters" — the grid/wheel use drag; tap-to-spell is also supported, so use the neutral "Connect letters").
- **Word Hunt tries:** show a single, honest tries display. Remove the "∞ · 7 Real game" cryptic pill and the duplicate "You get 7 tries" line; show only the practice tries (the `?`-slot row already conveys word length). If we want to hint the real game is harder, do it in the bailout/complete copy, not as a raw "7".
- Ensure the coach banner cannot overlap the goal indicator (layout order, not z-index hacks).

### 4. Spacing / inviting layout (fixes #5)

- Vertically center the primary play element (wheel/board) in the available space; collapse the large empty gap above the exit link. Reduce the number of stacked chrome rows so the game sits higher and reads as the focus.
- No change to the shared `GridComponent` or wheel internals — only the sandbox wrapper layout.

---

## Out of scope (YAGNI)

- Hub (`PracticeHubClient`), flow orchestrator (`[mode]/PageClient`), tutorial sheet, completion popup — all screenshot-verified as good.
- Orphaned `PracticeModeSelector` (304) — `page.tsx` renders `PracticeHubClient`; leave it.
- No new game mechanics, no XP/economy changes, no backend changes.

---

## Translations

Add per-locale (en/he/sv/ja/es), following native-copy guidance (not literal):
- `practice.classic.bailoutCta`
- `practice.wheelRush.bailoutCta`
(Existing `practice.{mode}.playRealCta` reused. `practice.wordHunt.bailoutCta` already exists.)
`__tests__/practice-locale-parity.test.ts` enforces parity across all 5.

---

## Testing (TDD, RED→GREEN per phase)

- `PracticeBailoutCta.test.tsx`: renders `playRealCta` when solved, `bailoutCta` when not, **per mode** — asserts Classic shows "Play Classic now" (regression test for the wordHunt-copy bug), Wheel shows "Play Wheel Rush now".
- Update/extend `PracticeClassicSandbox.test`, `PracticeWheelSandbox.test`, `PracticeWordHuntSandbox.test`: goal indicator present + correct progress; bailout testid present; no contradictory tries text.
- `PracticeGoalIndicator.test.tsx`: shows intent + `found/goal`.
- Locale parity test stays green with new keys.

## Verification

- `npm run lint && npm run test:frontend` (scoped to practice) green.
- Re-screenshot all 3 sandboxes LTR + `/he` RTL at 390×844; confirm: exit button quiet, goal clear & uncovered, no tap/drag or tries contradictions, no dead-space dominance, celebration intact.
