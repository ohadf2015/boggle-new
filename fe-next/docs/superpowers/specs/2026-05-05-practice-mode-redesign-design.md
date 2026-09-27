# Practice Mode Redesign — Design Spec

**Date**: 2026-05-05
**Author**: Ohad + Claude
**Status**: DRAFT — pending user review
**Scope**: Three practice modes (classic / wordHunt / wheelRush), shared infra, intro micro-bug fix, native-locale tutorial copy
**Drives**: an implementation plan via `superpowers:writing-plans`

---

## 1. Problem statement

Today's three practice modes share three flaws:

1. **Don't simulate the real game.** Each practice mode hand-rolls a parallel implementation that drifts from the real engine. Word-hunt practice (image #3) is a Wordscapes-style letter-fill, not the real word-hunt loop. Classic uses a curated 12-word dictionary so most valid words are rejected. Wheel-rush practice doesn't use the real Pixi ring at all.
2. **Crowded layout, paragraph instructions.** Classic shows a tip-banner card + an instruction paragraph + rotating coach-tip + submit button + reset button + word readout + found list + chain CTA — six competing surfaces simultaneously, each fighting for attention.
3. **No juice.** Found-word feedback is a small lime banner. No particles, no spring physics, no celebration. The mascot reaction is a static webp swap. Practice should feel *better* than the real game (because there's no time pressure to compete with), and it currently feels worse.

Plus a precursor bug: `PracticeMiniDemo` for the wheelRush intro hardcodes Latin letters (image #4 shows English "E" and "C/A/R/T" in a Hebrew session) and the satellite tile geometry overflows the 128×128 demo box on smaller breakpoints.

---

## 2. Goals & non-goals

**Goals**
- Each practice mode mirrors the real game's core mechanic minus pressure (no timer, no scoring, no socket, no monetization).
- Real dictionary validation via `/api/validate-word` — no curated word lists.
- Drag-to-select on grid (classic) and on wheel (wheelRush), tap-letter on hunt — matching the real engines.
- Drop the submit button: drag-release auto-submits. Drop the reset button: pointer-down auto-clears.
- "Extraordinary juicy" feel: PixiJS particles + GSAP timelines on every found word.
- Just-in-time micro-tutorials — short imperative tooltips, never overlapping, never paragraphs.
- All tutorial copy authored natively per locale (en/he/sv/ja/es) — not literal translation.
- Goal-completion celebration that makes finishing the practice feel like a small victory.

**Non-goals**
- Touching the real production engines (PortraitLayout, WheelRushView, WordWheelGame). Practice consumes their *engines* via shared hooks, not the chrome.
- Analytics/telemetry redesign — keep existing `trackPracticeStarted/WordFound/Completed` calls.
- Adventure / Word Vault / Blast practice — they don't exist as practice modes today.
- Achievement / quest unlocking — practice still doesn't grant rewards (per existing design).
- Multiplayer / socket integration in practice — stays single-player solo.

---

## 3. Architecture overview

### 3.1 Shared infrastructure (NEW)

```
fe-next/
├── lib/practice/
│   ├── usePracticeValidator.ts     ← debounced /api/validate-word wrapper + 1-min memo cache + retry-once on 429
│   ├── microTutorial.ts            ← state machine: which hint to show, dismissal, throttle
│   └── practiceCopy.ts             ← typed access to native per-locale tutorial strings
│
├── components/practice/
│   ├── PracticePixiFx.tsx          ← absolute-positioned Pixi overlay (reuses BlastEffectsCanvas pattern)
│   ├── usePracticeJuice.ts         ← GSAP timelines exposed as: triggerWordFound, triggerInvalid, triggerGoalComplete
│   ├── PracticeMicroTip.tsx        ← inline floating tooltip, ≤4 words, fades after 1.6s or on user action
│   ├── usePracticeGridDragSelect.ts  ← extracted from useGridGestures, simplified for 4×4 no-freeze case
│   └── usePracticeWheelDragSelect.ts ← extracted from WordWheelGame pointer handlers, simplified
│
└── translations/{en,he,sv,ja,es}/practice.tutorial.*  ← native-locale copy (ux-writer pass)
```

Every redesigned mode imports from the shared layer. Adding a 4th practice mode in future would be a small wrapper file plus translations.

### 3.2 Per-mode mirrors

| Practice mode | Mirrors | Interaction | Validation | Goal |
|---------------|---------|-------------|------------|------|
| Classic | Real classic 4×4 grid | Drag tile-to-tile (incl. diagonals) | `/api/validate-word` | Find 3 valid words |
| WordHunt | Real word-hunt | Same drag-on-grid + target-word panel above grid (yellow=letter-in-wrong-place, green=correct-position, like real game) | `/api/validate-word` + position match | Hit 1 target word |
| WheelRush | Real `WordWheelGame` Pixi ring | Drag spelling on circular layout + shuffle button | `/api/validate-word` | Find 3 valid words |

Each practice screen is a thin wrapper (~150 lines) that:
1. Builds the engine via shared hook
2. Mounts `<PracticePixiFx/>` overlay
3. Renders mode-specific layout chrome (target word for hunt, ring for wheel, grid for classic)
4. Drives `<PracticeMicroTip/>` via `microTutorial.ts` state
5. Writes progress on goal completion

### 3.3 Tutorial / on-the-way explanations

The micro-tutorial state machine is a sequence of beats:

```
beat 1: "Drag." (1.6s, fades when user starts drag)
beat 2: ghost-finger trace shows diagonal selection (1.5s, fades on first user diagonal hop OR after 4s)
beat 3: on first valid word: "Nice!" (0.8s, fires WITH juice timeline)
beat 4: on second valid word: silent — no tip, just juice
beat 5: on goal complete: "{N} words! ✨" + extra-confetti GSAP timeline
beat 6 (only if no word found in 30s): "Try short words first" (gentle nudge)
```

Per locale, beat 1/2/3/5/6 strings authored natively. No paragraphs, no imperatives longer than 4 words. Hebrew uses `הזיזו`, `יפה`, etc. — short and warm.

### 3.4 Layout decluttering principles (applied to all 3 modes)

**Drop:**
- Rotating `<PracticeCoachTip/>` — replaced by single `<PracticeMicroTip/>` driven by state machine
- The `practice.classic.instruction` paragraph
- Submit button (drag-release auto-submits)
- Reset button (pointer-down auto-clears)
- Found-words list eats vertical space → replaced with compact horizontal pill row directly below the goal indicator

**Keep:**
- Mode tabs (top)
- Mascot reaction (small, top-left of grid)
- The grid / ring (centered, larger now)
- Current-word readout (only visible while dragging, fades out on release)
- Goal indicator: "2/3 words" pill, top-right
- Chain CTA — but ONLY appears once goal is hit, not always-visible

### 3.5 Wheel-rush intro bugfix (`PracticeMiniDemo.tsx`)

- Letters become locale-aware:
  - en/sv: `E` + `C/A/R/T`
  - he: `י` + `ש/ל/ו/ם`
  - ja: `い` + `ね/こ/と/り`
  - es: `O` + `M/A/R/E`
- Demo box: cap satellite `translateY` so it never overflows the `w-32 h-32` frame on small breakpoints. Use `cqmin`-based math (per project responsive-design.md) so it scales fluidly.

---

## 4. Data flow

### 4.1 Validation flow

```
pointer-up
  ↓
buildWord(path) → "STAR"
  ↓
usePracticeValidator.check("STAR")
  ├─ check 1-min in-memory cache → hit? return cached
  ├─ POST /api/validate-word { word, language }
  ├─ on 200 isValid:true → cache + return valid
  ├─ on 200 isValid:false → cache + return invalid (with reason)
  ├─ on 429 → wait 600ms, retry once, then surface "try again" toast
  └─ on 5xx → surface generic "couldn't check" + log
  ↓
juice trigger
  ├─ valid + new   → triggerWordFound(tilePositions)  → confetti + tile-pop + word flies to chip row
  ├─ valid + dup   → triggerDuplicate()                → small bounce + "Already got it!" micro-tip
  └─ invalid       → triggerInvalid()                  → red shake + smoke puff
  ↓
state update (foundWords, microTutorial advance)
  ↓
goal check → if complete: triggerGoalComplete + chain CTA reveal
```

### 4.2 Pixi overlay lifecycle

`PracticePixiFx` mounts a `Pixi.Application` once on practice screen mount, destroys on unmount. Reuses the BlastEffectsCanvas pattern: a transparent canvas absolutely-positioned to the grid bounds, `pointerEvents:none`. Particles emit from world-coordinates passed by the juice hook, which derives them from grid tile DOM rects via `getBoundingClientRect()` (cached and recomputed only on resize).

---

## 5. Error handling

| Failure | Behavior |
|---------|----------|
| `/api/validate-word` 429 | Retry once after 600ms; on second 429 show micro-tip "Slow down a sec" (locale-native), don't add to found list |
| `/api/validate-word` 5xx | Optimistic accept the word, log to Sentry, don't break the practice flow (forgiving practice mode) |
| Pixi init fails (low-end device) | Fall back to GSAP-only DOM animations (still juicy via spring scale + opacity), no Pixi mount |
| `prefers-reduced-motion: reduce` | Disable Pixi confetti and GSAP cascades; keep static "Nice!" micro-tip |
| Word not in dictionary | Red shake + "Not a word — try another" micro-tip; path clears, mascot reacts "wrong" |
| Network offline | Same as 5xx — optimistic accept, log, surface "Offline — accepting all words" tip once |

---

## 6. Testing strategy

Per project TDD-strict rule: tests written FIRST, then implementation.

### Unit (Vitest)
- `usePracticeValidator.test.ts` — caching, retry, 429/5xx paths
- `microTutorial.test.ts` — beat sequencing, dismissal, throttle
- `usePracticeGridDragSelect.test.ts` — diagonal accept, backtrack, deadzone
- `usePracticeWheelDragSelect.test.ts` — angular geometry, tile-snap
- `PracticeMicroTip.test.tsx` — auto-dismiss, RTL placement
- Pixi fx: mocked Pixi.Application — assert lifecycle calls, not particle visuals

### Integration (Vitest + Testing Library)
- `PracticeClassicSandbox.test.tsx` — drag-then-release submits, real-dict accepts STAR / PLAN, rejects ZZZ, no submit button rendered, no reset button rendered, completion fires after 3 valid words (driven by mocked validator)
- `PracticeWordHuntSandbox.test.tsx` — target word visible, drag-on-grid, color-feedback on partial match
- `PracticeWheelRushSandbox.test.tsx` — Pixi ring renders (mocked), drag-spell submits on release, shuffle works

### Visual / manual
- Hebrew RTL screenshot for each mode at 360w mobile + 1024w tablet
- Reduced-motion media query manual check
- 5-locale tutorial copy review (HE flagged for native-speaker review, JA/ES likewise)

### Test API contract changes (breaking)
Existing tests reference `practice.classic.submit` button by role. Those tests get updated in the implementation phase to use `pointerUp(getByTestId('practice-board'))` to drive auto-submit. Per project TDD rule: tests are source of truth, but here tests encoded the OLD UX contract. New contract → new tests. The completion-integration test rewrites cleanly.

---

## 7. Native-locale tutorial copy

Invoke `ux-writer` skill once shared infra is built, with brief: "Write 6 practice tutorial micro-strings (≤4 words each) in en/he/sv/ja/es. Tone: warm, casual, encouraging. No literal translation. Examples: en `Drag.` → he `הזיזו` (not `גרור`). Per beat: drag/diagonals/first-success/duplicate/goal-complete/idle-nudge."

Result lands in `translations/{locale}/practice.tutorial.{beat}` keys.

---

## 8. Out-of-scope follow-ups (deferred)

- Practice for Adventure / Word Vault / Blast modes
- Practice analytics dashboard
- A/B test which goal threshold (3 vs 5 vs 7) lifts completion rate
- Wheel-rush practice "spin" gesture polish (current real game allows but practice can launch with drag-only)

---

## 9. Phasing for the implementation plan

writing-plans skill should produce these phases (in order):

1. **Wheel-rush intro micro-bugfix** — `PracticeMiniDemo` letters locale-aware + overflow fix. Ships independently. ~30 LOC.
2. **Shared infra** — usePracticeValidator + microTutorial + PracticePixiFx + usePracticeJuice + drag-select hooks. Tests first. No mode wiring yet.
3. **Classic mode redesign** — wire shared infra into `PracticeClassicSandbox`. Rewrite tests for new UX contract. Drop curated word list, drop submit/reset buttons, add diagonal-trace ghost demo.
4. **Native-locale tutorial copy pass** — ux-writer skill produces 6 strings × 5 locales. Land in translations.
5. **Word-hunt mode redesign** — mirror real word-hunt. Inherits shared infra.
6. **Wheel-rush mode redesign** — mirror real WordWheelGame. Inherits shared infra. Adds Pixi ring (dynamic import).
7. **Cross-mode polish pass** — viewport audit at 360/1024/HE-RTL, reduced-motion verification, 1-pass copy edit per locale, manual playthrough of all three.

Each phase = one PR, lint+typecheck+test green per phase per project CLAUDE.md.

---

## 10. Open questions / approval gates

Before writing the implementation plan, please confirm:

- [ ] Is the 3-word completion goal correct for classic, or should it scale (3/5/3 for classic/hunt/wheel)?
- [ ] OK to drop the always-visible chain CTA? (Currently always rendered; new design defers reveal until goal hit.)
- [ ] OK that practice optimistically accepts words on 5xx (forgiving > strict)?
- [ ] OK to land phases 1–7 as separate PRs, or merge as a single feature branch?
- [ ] Approve invoking ux-writer skill in phase 4 (writes natively to translations/)?

If yes-to-all (or specify subset) → I invoke writing-plans next.
