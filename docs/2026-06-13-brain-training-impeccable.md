# Brain Training — Impeccable Overhaul (2026-06-13)

Register: **product** (in-task game surface), neo-brutalist playful identity preserved.

## User asks (verbatim, distilled)
1. Reduce word count significantly on hub + drills.
2. Remove redundant parts (dup "Let's Train" cards; stats-heavy hub).
3. Bring up the action — game picker is at the BOTTOM under ~7 stat sections; move to top.
4. Fix in-game screens: more intuitive.
5. Fix layout shifting / bad UX when finding a letter/word.
6. More rewarding + celebration.
7. Remove the "scary" drill sound; add satisfying SFX + music **inside the game**.
8. Add satisfying GSAP animations when getting rewards / collecting things **inside the game**.

## Plan (phase = commit when green)

### Phase 1 — Hub reorder + word-count + dedup (serves asks 1,2,3,6)
- `app/[locale]/brain/PageClient.tsx`: move `QuickDrillsSection` (picker) ABOVE the stats stack. Play-first, stats-below.
- Kill duplicate "Let's Train" card (two code paths `:334` early-return + `:503`).
- Trim verbose hub copy → tighter `brain.*` keys, ×5 locales.

### Phase 2 — Layout-shift fix (ask 4,5) — phone-first
- ComboMaster feedback: wrap in fixed `min-h` reserved slot (currently unprotected AnimatePresence).
- PatternSwitcher feedback (WordFormingArea wrapper): reserve height.
- Keyboard typed-word display (RareGems/Lightning/Combo): reserve slot or overlay (desktop-only → lower pri).
- GemFindPopup wrapper: confirm zero-height/absolute, fix if it occupies flow.
- TDD: extend `DrillLayoutStability.test.tsx` RED-first — assert reserved slots / zero-height wrappers structurally. Plus phone-viewport screenshot.

### Phase 3 — Sound + music (ask 7)
- Soften/replace BOTH `timerUrgent` AND `comboBreak`(error) — disambiguate the "scary" sound by covering both.
- Add satisfying SFX inside drills reusing existing assets (coinCollect, xpSparkle, crownSparkle, chestOpen…).
- Add in-game background music via MusicContext `fadeToTrack('inGame')` on playing, restore on complete.

### Phase 4 — GSAP reward/collect animations (ask 6,8)
- Satisfying collect animation on word/gem found (overlay/absolute — must NOT add reflow).
- Reward burst on milestones/level-up.
- Route through existing AdaptiveMotion / enableComplexAnimations / prefers-reduced-motion gate, not raw tweens.

## Constraints
- All copy via `t()`, ×5 locales (en/he-RTL/sv/ja/es). Fold in audit's brain.* he/sv/ja/es gaps.
- Reuse existing audio; no new sourcing.
- Commit each phase the moment green (daemon wipes uncommitted).
- Neo tokens only; BLACK ink on accent fills; ≥44px targets; RTL parity.
