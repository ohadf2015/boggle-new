# Cosy Modes Pass — Rare Gems · Word Tower · WordCraft

**Date:** 2026-05-24
**Goal:** Make three feature-gated solo modes *fun, casual, cosy* and production-ready. Keep them behind their existing gates.
**Source:** game-designer brief (web research: cozy-game design, NYT Spelling Bee genius ladder, reward-loop psychology) + code scouts + advisor scope review.

## Interpretation & scope decisions

- **"Cosy" ≠ soft gradients/glassmorphism** (anti-brand). Cosy here = low-pressure, no-fail framing, generous & escalating reward feedback, clear visible progress, mascot/ambient personality, tactile chunky juice in the existing neo-brutalist palette.
- **"Gems mode" = the Rare Gems brain drill** (`brain/drills/rare-gems`), not the WordCraft Gem Hunt sub-mode. Tiebreak: it was polished *yesterday* (CLS/next-up) yet "still not fun"; game-designer + scout both deep-diagnosed the drill.
- **WordCraft is structurally competitive** (territory, bot, heat/overdrive/burnout). We do **not** rebuild it cosy — that fights its core. WordCraft gets a *feel pass* only.
- **Ship order = priority order.** Descope from the bottom if session budget runs out. Gems is the deep dive; it must land.

## Constraints

- TDD mandatory (RED→GREEN→REFACTOR). Pure logic in libs, tested first.
- Preserve data contracts. Rare Gems `onComplete({score, rareWordsFound, totalWordsFound, timeSpent, level})` feeds brain-score — **unchanged**.
- ≤500 lines/file → extract presentational pieces.
- i18n: `t()` only. Add `en` + reasonable he/sv/ja/es, flagged `native-review pending`.
- Zero new art/audio assets — reuse the existing rich sound library.

---

## Phase 1 — Rare Gems (DEEP) 💎

### Fun-killers (from code)
1. Goal invisible — progress is a tiny `3/3` chip; no felt progress.
2. Common/uncommon finds score points but **don't advance the goal** → "why find short words?" friction.
3. Flat feedback — one generic popup for every tier; a legendary find feels like a common one.
4. No win beat — target hit → instant phase flip; no payoff moment.
5. "Game Over" framing on timeout feels punishing for a cosy drill.

### Design
Reframe as **"fill your gem pouch."** Every word is a gem; longer word = rarer/bigger gem. Transparent rule (length→tier) — clarity over linguistic realism is the *cosy* choice.

1. **Gem Pouch meter** (highest-leverage): prominent horizontal fill bar toward the rare-gem target, with a live total-gems count. Replaces the tiny chip. Player *sees* the pouch fill.
2. **Tiered find ceremony** — escalating by tier using existing sounds (`playWordAcceptedSound` → `playRareWordSound` → `playLegendaryWordSound`) and scaled popup intensity (bigger scale + star burst for legendary). Reduced-motion safe via `AdaptiveMotion`.
3. **"Pouch Full!" win beat** — brief (~900 ms) celebration overlay + `playChestOpenSound`/`playCoinCascadeSound` before flipping to complete. Time bonus scoring preserved.
4. **No-fail framing** — every find is a gem in your haul; timeout copy softened from "Game Over" to "Time's up — here's your haul."
5. **Clear goal copy** — "Find {target} rare gems — longer words are rarer."

### Files
- NEW `lib/drills/rareGems.ts` — pure: `classifyGem`, `GEM_POINTS`/`gemValue`, `isRareGem`, `computeGemProgress`, `celebrationFor`. (moves inline length-rarity logic, behaviour-neutral)
- NEW `lib/drills/__tests__/rareGems.test.ts`
- NEW `components/drills/GemPouchMeter.tsx` — presentational progress bar (keeps `RareGems.tsx` < 500).
- NEW `components/drills/__tests__/GemPouchMeter.test.tsx`
- EDIT `components/drills/RareGems.tsx` — use lib, mount meter, tiered ceremony, win beat.
- EDIT `components/drills/RareGemsCompletePhase.tsx` — softer timeout copy.
- EDIT `translations/{en,he,sv,ja,es}.js` — ~6 new keys under `brain.drills` / `brain.drills.rare-gems`.

---

## Phase 2 — Word Tower (MEDIUM) 🗼 cosy ambient layer

Already feature-rich (hazards, rivals, biomes, minimap, free-rebuild). Add a **cosy landmark moment**: when the climber crosses an existing landmark (`landmarks.ts`), surface a brief, calm lore beat ("Cloud Base — where sky-sailors rest") — a non-blocking toast, not a forced pause. Reuses existing landmark data; no new world content.

### Files
- NEW pure `lib/wordTower/landmarkMoment.ts` — given prev/next height + landmarks, return the just-crossed landmark (fire-once). Tested.
- EDIT `WordTowerPlay.tsx` — wire a calm landmark toast (reuse existing toast system).
- i18n: landmark lore lines reuse/extend `wordTower.landmark.*`.

---

## Phase 3 — WordCraft (LIGHT) 🔤 feel pass

No cosy rebuild. Small delight + gentler messaging in run mode:
- Mascot/encouragement reaction on a strong word.
- Soften burnout copy (it currently reads punishing).
- Reuse existing `wordcraft.encouragement.*`.

(Descope candidate if budget runs out.)

---

## Test plan
- Pure libs: full unit coverage (classification thresholds, progress fractions, celebration tiers, landmark-cross fire-once).
- Components: GemPouchMeter renders fill % + counts; win beat shows on target; landmark moment toast fires once per crossing.
- `npm run test:frontend` for touched suites; `tsc --noEmit` (full `next build` OOMs per memory).

## Commit plan (ask before each)
- `feat(brain-drills): cosy Rare Gems — gem pouch meter, tiered ceremony, win beat`
- `feat(word-tower): cosy landmark moments`
- `feat(word-craft): run-mode feel pass`
