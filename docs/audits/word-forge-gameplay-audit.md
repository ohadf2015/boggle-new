# Word Forge Gameplay Audit
**Date**: 2026-03-31
**Auditor**: Game Design Specialist
**Files Audited**: 15 (design spec, hook, scoring, runeEngine, runeCatalog, bossConstraints, gridGenerator, 8 components)

---

## Summary

The core loop is structurally sound and the UI is well-built. However, three systemic issues hollow out the mode's identity: boss scoring constraints do nothing, a third of all runes are dead code, and every cursed rune's downside is unimplemented. A player picking Berserker gets a free x3 multiplier. A player picking Last Stand gets a free x5. Bosses impose visual drama but no actual gameplay change for scoring. Fix these three and the mode becomes what it was designed to be.

**Severity breakdown**: 5 CRIT, 9 HIGH, 6 MED, 4 LOW

---

## CRITICAL — Game-Breaking Bugs

### CRIT-1: Boss scoring constraints are never applied
**File**: `lib/wordForge/bossConstraints.ts:56` and `lib/wordForge/scoring.ts:89`
**Issue**: `applyConstraintToScore()` is defined at bossConstraints.ts:56 but is never called by `scoreWord()` in scoring.ts. The Censor (vowels worth 0), The Thief (-5 per word), and The Escalator (scaling target) all do nothing. Boss rounds are mechanically identical to normal rounds for every scoring constraint.
**Fix**: Import and call `applyConstraintToScore(constraintId, totalScore, word, wordsThisRound)` at the end of `scoreWord()` in scoring.ts, after all rune effects are applied. The escalator target scaling also needs wiring in `handleRoundEnd`.

---

### CRIT-2: 20 of 60 runes are dead code — players pick them and get zero effect
**File**: `lib/wordForge/runeEngine.ts` — all `// TODO` evaluators
**Runes affected** (all return null unconditionally):
`edgeWalker`, `centerStage`, `precisionShot`, `goldRush`, `letterFeast`, `avalanche`, `loneSurvivor`, `lastWord`, `neverDie`, `wordMirror`, `letterLock`, `doubleOrNothing`, `ricochet`, `catalystTile`, `forgeFrenzy`, `wordDynamite`, `wordAlchemy`, `infiniteGrid`, `timeFreezeSpecial`, `runeResonance`

That is 33% of the catalog. Players can pick any of these, see them in their rune bar, and have them silently do nothing for the rest of the run. There is no visual indication that a rune didn't trigger.
**Fix** (two options):
1. Remove dead runes from `RUNE_CATALOG` until their evaluators are implemented. Keep catalog honest.
2. Filter dead rune IDs out of `generateRuneOffering()` at runeCatalog.ts:129 so they cannot appear in offerings. Add an `enabled: false` field to `RuneCardDef`.

Option 2 is faster. The runes can re-enter the pool as features ship.

---

### CRIT-3: All 5 cursed rune drawbacks are unimplemented — pure upside
**File**: `lib/wordForge/runeEngine.ts` and `hooks/useWordForgeRun.ts`

Every cursed rune's evaluator returns the multiplier bonus but marks the curse "handled by run manager." The run manager never implements any of them:

| Rune | Bonus Given | Curse Promised | Curse Implemented? |
|------|------------|----------------|--------------------|
| glassCannon | x2 always | Miss 1 round = run over | No — handleRoundEnd:137 does not check |
| debtCollector | x1.8 always | -30 pts at round start | No — roundScore initializes to 0 at line 348 |
| timeStarved | x1.5 always | -3s per word submitted | No — submitWord never touches timer |
| oathOfSilence | x4 always | Can't reuse letters from last word | No — no letter ban logic exists |
| lastStand | x5 always | Fail = lose 2 rune slots | No — no slot loss on failure |

`lastStand` is currently an unconditional x5 multiplier on every word with zero drawback. This is the strongest rune in the game and it has a skull icon.
**Fix**: Implement each curse in `useWordForgeRun.ts`. glassCannon requires a flag on state; debtCollector requires initializing `roundScore` to -30; timeStarved requires reducing `timeRemaining` in `submitWord`; oathOfSilence requires tracking a banned letter set; lastStand requires checking the flag in `handleRoundEnd` and reducing `maxRuneSlots`.

---

### CRIT-4: Combo counter and timing refs not reset between rounds via `advanceToNextRound`
**File**: `hooks/useWordForgeRun.ts:326-355`
**Issue**: `startRound()` (line 196) resets `comboRef.current = 0`, `roundStartTimeRef.current`, and `lastWordTimeRef.current`. `advanceToNextRound()` (line 326) — which handles ALL non-boss round transitions — does not reset these. The first word of every non-boss round inherits the combo count and timing from the last word of the previous round.

Concretely: if a player submits 8 words rapidly at the end of round 2, `comboRef.current = 8`. Round 4 starts (non-boss path goes through `advanceToNextRound`). The very first word of round 4 triggers `comboFire` at x1.8, `streakBonus` at +40, etc.
**Fix**: Reset `comboRef.current = 0`, `roundStartTimeRef.current = Date.now()`, `lastWordTimeRef.current = Date.now()` inside `advanceToNextRound()` at line 326 before returning the new state. Also stop the timer inside `advanceToNextRound` for the non-boss path (currently the timer is only stopped in `pickRune`/`skipRune` but `advanceToNextRound` can also set `phase: 'playing'` directly for non-boss rounds, leaving a potential double-timer window).

---

### CRIT-5: Non-boss rounds start with a running timer before the player sees the grid
**File**: `hooks/useWordForgeRun.ts:404-411`
**Issue**: The `useEffect` at line 404 auto-starts the timer whenever `phase === 'playing'` and `timeRemaining > 0` and no timer is running. `advanceToNextRound` (line 326) sets `phase: 'playing'` with `timeRemaining: 60` directly. This means for non-boss rounds, the timer starts ticking the moment the rune pick resolves — before the player sees the new grid. Boss rounds are fine because they go through `bossReveal` phase first with a manual `startRound()` call. Non-boss rounds don't have this gate.
**Fix**: All rounds should route through a `bossReveal`-equivalent "round preview" gate, or `advanceToNextRound` should not set `phase: 'playing'` directly but instead set a `roundReady` phase that requires a player tap to start the timer.

---

## HIGH — Significant Issues

### HIGH-1: Skip rune bonus (+5 pts) is never applied
**File**: `hooks/useWordForgeRun.ts:319-322` and `components/wordForge/RunePicker.tsx:170`
**Issue**: The UI shows "Skip (+5 bonus pts next round)" but `skipRune()` simply calls `advanceToNextRound` with no bonus tracking. The `roundScore` and `roundTarget` are both unmodified. Players are promised a reward and receive nothing.
**Fix**: Add a `pendingSkipBonus: number` field to `WordForgeRunState`. `skipRune` sets it to 5. `startRound` (or `advanceToNextRound`) applies it to the initial `roundScore`.

---

### HIGH-2: Rune descriptions render raw i18n keys, not translated text
**File**: `components/wordForge/RunePicker.tsx:127` and `components/wordForge/RuneBar.tsx:56`
**Issue**: Both components render `{rune.descriptionKey}` and `{runes[inspecting].def.descriptionKey}` directly. Players see strings like `wordForge.rune.vowelMiner` instead of the actual effect description. The `useLanguage` hook is imported in RuneBar but `t()` is never called on the description.
**Fix**: Call `t(rune.descriptionKey)` in both components. Also verify that translation keys exist in all 4 language files for all 60 runes.

---

### HIGH-3: Boss selection is fully deterministic — every run has identical bosses
**File**: `lib/wordForge/bossConstraints.ts:86-89`
**Issue**: `pickBossConstraint(round)` uses `round * 7 % 15` — a fixed formula with no randomness. Round 3 is always index 6 (The Thief), round 6 is always index 12 (The Nullifier), round 9 is always index 3 (The Banisher). Every run across every player always sees the same three bosses in the same order.
**Fix**: Add lightweight seeding. Combine round with a per-run random seed stored on state. Minimum fix: use `Math.floor(Math.random() * BOSS_CONSTRAINTS.length)` but exclude the same boss appearing twice in a run. Better: store a shuffled boss order at run start.

---

### HIGH-4: `wordHoarder` rune scales without bound and becomes dominant
**File**: `lib/wordForge/runeEngine.ts:242-253`
**Issue**: Grants `+2 × allWordsThisRun.length` per word scored. By round 7 a typical player has ~45 total words. Every word submitted in round 7 gets +90 flat chip points before the length bonus. Combined with a x2 multiplier rune, that's +180 per word. This is comparable to the base score of a very long word. The rune silently snowballs into run-deciding power with no indication to the player.
**Fix**: Cap at `Math.min(allWordsThisRun.length, 20) * 2` (+40 max) or change the formula to `+2 per word THIS round` (ctx.wordsThisRound.length) to keep it meaningful but bounded.

---

### HIGH-5: `crescendo` multiplier is unbounded
**File**: `lib/wordForge/runeEngine.ts:375-386`
**Issue**: `mult = 1.0 + (0.15 * wordsThisRound.length)`. After 10 words in a round it is x2.5, after 20 it is x4.0. No cap. With a 60-second round and an average of 1 word every 4 seconds, players reliably reach 12-15 words per round in mid-game — x2.8 to x3.25. Combined with `comboFire` this guarantees hitting targets without needing other runes.
**Fix**: Cap at x3.0 (around 13 words). This still rewards the strategy without making the rune win-alone.

---

### HIGH-6: `grandMaster` rune is unconditional x2.5 — no condition, no counterplay
**File**: `lib/wordForge/runeEngine.ts:433-441`
**Issue**: The evaluator always returns x2.5 with description "x2.5 (always)". There is no trigger condition. It is strictly better than `wordSmith` (x1.5, requires 5+ letters) and `berserker` (x3 with 40s timer). With other mults stacking on top, grandMaster trivializes rounds 7-9 solo.
**Fix**: Add a meaningful condition — e.g., x2.5 only when all rune slots are filled (synergy with late-game), or x2.5 only for words scoring above a threshold before this rune. Alternative: reduce to x1.8 unconditional.

---

### HIGH-7: Big Grid rune does nothing
**File**: `lib/wordForge/runeEngine.ts:483-486` and `hooks/useWordForgeRun.ts:196-226`
**Issue**: `bigGrid` evaluator explicitly returns null (no score effect). `startRound()` only checks `getConstraintGridSize(constraintId)` for grid size, never checks if the player has the bigGrid rune equipped.
**Fix**: In `startRound()` add: `const hasBigGrid = prev.runes.some(r => r.def.id === 'bigGrid'); const gridSize = hasBigGrid ? 6 : getConstraintGridSize(constraintId);`. (Mirror the existing berserker/timeWarp pattern at lines 203-208.)

---

### HIGH-8: No early-complete when target is hit — dead time
**File**: `hooks/useWordForgeRun.ts:102-114`
**Issue**: When `roundScore >= roundTarget` mid-round, nothing happens. The timer continues running and the player must wait for it to expire with no feedback beyond the progress bar turning green. On round 1 (target: 50 pts) a player can hit the target in under 15 seconds and then wait 45 seconds doing nothing.
**Fix**: In the timer interval callback (line 104), or in `submitWord` when `newRoundScore >= roundTarget`, immediately call `handleRoundEnd(prev)` and stop the timer. Optionally allow an "overshoot bonus" (every point above target adds to the next round's starting score) to reward continued play.

---

### HIGH-9: No invalid word feedback on the grid
**File**: `components/wordForge/WordForgeGrid.tsx:64-76`
**Issue**: When `checkWord` returns false or a submitted word is already used (`prev.wordsThisRound.includes`), the rejection is silent. The path clears and nothing happens. On mobile especially, players won't know if they missed adjacency, spelled an invalid word, or hit a duplicate.
**Fix**: Add a shake animation class to the grid div and a brief "Invalid" or "Already used" label in the word preview area. A simple `useState<'invalid' | 'duplicate' | null>` driving an `animate-neo-shake` class is sufficient.

---

## MEDIUM — Fun-Killers

### MED-1: No celebration when hitting the round target
**File**: `components/wordForge/WordForgeHUD.tsx` — missing trigger
**Issue**: Design spec says "progress bar overflows, confetti" when target is hit. The HUD bar turns green (`bg-neo-lime`) when `isOverTarget` but there is no confetti, score-pop animation, or audio trigger. The single biggest positive feedback moment in each round is silent.
**Fix**: Fire confetti (existing system) and a `animate-neo-pop` on the score number when `isOverTarget` transitions from false to true. A short sound effect would be ideal.

---

### MED-2: Boss reveal feels like reading documentation, not facing a threat
**File**: `components/wordForge/BossReveal.tsx`
**Issue**: The screen shows a card with the boss name and description text. The `animate-neo-pop` entrance is the only effect. There is no screen vignette, no dramatic timing, no boss health or scale indicator. The design calls for "red/pink vignette, constraint card rises from bottom." The reveal is indistinguishable in weight from the rune picker screen.
**Fix**: Add a red vignette overlay (`bg-neo-red/10` ring on the screen edges), a bottom-sheet entrance animation for the card (slide up from bottom), and at minimum a 0.5s pause before the READY button becomes interactive to force players to read the constraint.

---

### MED-3: RunSummary shows no XP earned or meta-progression feedback
**File**: `components/wordForge/RunSummary.tsx`
**Issue**: Design spec shows "Forge XP: +127, Progress: bar, Next Unlock: Cursed Runes!" prominently. The component shows round reached, best word, words found, and total score — but no XP, no unlock bar, no next milestone. After a loss players have no sense of forward progress.
**Fix**: `RunSummary` receives `state` which includes `round`, `allWords.length`, and `totalScore`. Calculate XP display using `calculateRunXp()` from scoring.ts. Pass `progress` from the hook to show the unlock bar. The hook already updates `progress` in `saveRunResults` — just pass it as a prop.

---

### MED-4: Rune picker has no entrance animation
**File**: `components/wordForge/RunePicker.tsx:95-140`
**Issue**: Design spec calls for "3 cards fan in from top" with staggered `animate-neo-slide-in`. Cards appear instantly. The between-round transition is the most impactful UX moment (Balatro's entire feel lives in card reveals) and it is a raw DOM mount.
**Fix**: Wrap each card in a `motion.div` (Framer Motion, already in the stack) with `initial={{ y: -40, opacity: 0 }}` and `animate={{ y: 0, opacity: 1 }}` with staggered `delay={i * 0.08}`.

---

### MED-5: Start screen shows almost no information to motivate a run
**File**: `components/wordForge/WordForgeGame.tsx:33-64`
**Issue**: New players see a title, subtitle, and one button. There is no teaser of rune names, no "what to expect," no round structure preview. For roguelikes, the start screen is where curiosity about "what builds are possible" is established. The existing `progress` data (highestRound, totalRuns) helps returning players but does nothing for first-timers.
**Fix**: Show 3 random rune icons from the starter pool as a teaser ("Find words. Collect these. Break the score."). Consider showing the round target ladder briefly. Low effort, high effect for first-run conversion.

---

### MED-6: `censor` boss constraint calculation is wrong
**File**: `lib/wordForge/bossConstraints.ts:63-69`
**Issue**: The Censor is supposed to make vowels worth 0 points. The implementation subtracts `vowelCount` (number of vowels, each assumed to be 1 point) from `baseScore`. But the scoring formula adds chip bonuses to base points and multiplies: `(basePoints + chipBonus) × lengthBonus × multBonus`. Subtracting 1 per vowel from the multiplied total is not the same as removing vowel points from the base before multiplication. A 5-vowel word that scored (5 base) × 2.0 length × 2.0 mult = 20 would be corrected to 20 - 5 = 15, but the correct value with vowels zeroed is (0 base) × 2.0 × 2.0 = 0.
**Fix** (after wiring CRIT-1): Pass `bossConstraintId` into `scoreWord` and modify `getBasePoints` to zero vowel letter values when `constraintId === 'censor'`, before the multiplication step.

---

## LOW — Polish and Minor Issues

### LOW-1: Two runes share the same icon
**File**: `lib/wordForge/runeCatalog.ts:14` and `lib/wordForge/runeCatalog.ts:87`
**Issue**: `doubleDown` (chip, common) and `gamblerRune` (cursed, rare) both use `🎲`. In the rune bar they are visually identical.
**Fix**: Change `gamblerRune` icon to `🃏` or `🎰`.

---

### LOW-2: No "continue" option — target-met players must wait for timer
**File**: `hooks/useWordForgeRun.ts` — missing early-complete path
**Issue**: Related to HIGH-8 but distinct. Even if overshoot scoring is not desired, a player who has hit the target should be able to tap a "Continue early" button to skip the remaining timer. Waiting is a fun-killer with no agency.
**Fix**: When `isOverTarget` is true in `WordForgeHUD`, show a "Continue →" button that calls a new `completeRoundEarly()` action that calls `handleRoundEnd`.

---

### LOW-3: Hint Whisper rune is not wired to the grid
**File**: `lib/wordForge/runeEngine.ts:463-470` and `components/wordForge/WordForgeGrid.tsx`
**Issue**: The evaluator returns null (correct — no score effect). But `startRound` never detects `hintWhisper` to pre-highlight a word on the grid. The rune is a behavioral effect that needs grid-level wiring.
**Fix**: In `startRound` or in `WordForgeGame`, detect `hintWhisper` rune and pass a `highlightedWord` prop to `WordForgeGrid`. The grid can dim non-highlighted tiles at round start.

---

### LOW-4: RunSummary win condition check can produce false positives
**File**: `components/wordForge/RunSummary.tsx:20` and `hooks/useWordForgeRun.ts:150-159`
**Issue**: `won = state.round >= state.maxRounds && state.roundHistory.every(r => r.passed)`. If a player wins round 9 exactly (passes on the last second), `round` is 9 and `maxRounds` is 9. But the `handleRoundEnd` check at line 151 checks `prev.round >= prev.maxRounds` — meaning it also triggers if somehow `round > maxRounds` (impossible by normal flow but a defensive concern). More concretely: `roundHistory.every(r => r.passed)` iterates all 9 round entries but the final (winning) round is added in `handleRoundEnd` at line 132 to the `roundHistory` before `phase: 'runOver'` is set. This is structurally correct. However, the same `won` check is duplicated in `saveRunResults` (line 360) with a slightly different condition (`finalState.roundHistory.every(r => r.passed)` instead of checking `round >= maxRounds`). These two formulas can diverge. Use a single source of truth.
**Fix**: Compute `won` once in `handleRoundEnd` and store it as `state.runWon: boolean`. Both `RunSummary` and `saveRunResults` read from that field.

---

## Missing Features for Minimum Viable Feel

These are absent from the implementation and required for the mode to feel like a finished product rather than a prototype:

1. **XP display on RunSummary** (MED-3 above) — without it, there is no forward momentum after a run.
2. **Invalid word shake** (HIGH-9 above) — without it, the input loop feels broken.
3. **Target-hit celebration** (MED-1 above) — without it, the moment of success is invisible.
4. **Rune descriptions as translated text** (HIGH-2 above) — without it, the rune system is unreadable.
5. **Dead rune removal from offerings** (CRIT-2 above) — without it, a third of all choices are traps.

Fix these five and the mode crosses the threshold from "prototype" to "real game." The deeper balance work (CRIT-3, HIGH-4, HIGH-5, HIGH-6) makes the mode deep and replayable, but the above five are the prerequisite for any player to have a coherent first session.

---

## One-More-Run Hooks — Currently Absent

For the mode to generate "one more run" behavior it needs:
- **Visible unlock progress on the end screen** (currently missing — MED-3)
- **Run seed sharing** so players can show friends a specific boss sequence
- **Personal best comparison** ("You beat your record by 34 pts!") — totalScore is tracked but never compared or surfaced
- **A "close call" moment** — the mode never shows how close a player was to beating a round they failed (e.g., "You needed 12 more points"). The data is in `roundHistory` but unused.
- **Rune combination discovery** — showing which two runes fired on the best word of the run creates the "aha, these synergize" memory that drives repeated play in Balatro

---

## File Reference Index

| File | Issues |
|------|--------|
| `lib/wordForge/scoring.ts` | CRIT-1 (applyConstraintToScore not called) |
| `lib/wordForge/bossConstraints.ts` | CRIT-1, HIGH-3, MED-6 |
| `lib/wordForge/runeEngine.ts` | CRIT-2, CRIT-3, HIGH-4, HIGH-5, HIGH-6, HIGH-7, LOW-1 |
| `lib/wordForge/runeCatalog.ts` | CRIT-2, LOW-1 |
| `hooks/useWordForgeRun.ts` | CRIT-3, CRIT-4, CRIT-5, HIGH-1, HIGH-7, HIGH-8, LOW-2, LOW-4 |
| `components/wordForge/RunePicker.tsx` | HIGH-1, HIGH-2, MED-4 |
| `components/wordForge/RuneBar.tsx` | HIGH-2 |
| `components/wordForge/WordForgeGrid.tsx` | HIGH-9, LOW-3 |
| `components/wordForge/WordForgeHUD.tsx` | MED-1, LOW-2 |
| `components/wordForge/BossReveal.tsx` | MED-2 |
| `components/wordForge/RunSummary.tsx` | MED-3, LOW-4 |
| `components/wordForge/WordForgeGame.tsx` | MED-5 |
| `lib/wordForge/gridGenerator.ts` | No issues found |
