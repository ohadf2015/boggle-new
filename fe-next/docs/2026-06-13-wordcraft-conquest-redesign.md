# WordCraft → "Conquest" Redesign Spec

**Date:** 2026-06-13
**Goal (user):** WordCraft looks/feels complicated. Don't stick to Scrabble. Simplify the
rules, focus on **conquering space** and **taking words from the rival**, fewer weird cells,
drop the redundant center star. Make it ours with a cool board UI and smooth experience.

## 1. Diagnosis — why it feels Scrabble-y + complicated

The Territory mode is the only live ruleset (`territoryEnabled = true` hardcoded; the classic
opt-out was retired). Conquest already exists end-to-end — claims, captures, endgame territory
bonus, scoreboard cell counts — but it's **buried under Scrabble grammar**:

1. **Premium "weird cells"** — DL/TL/DW/TW squares painted pink/cyan across the board, with
   multiplier labels + a legend chip. Pure Scrabble; visual noise.
2. **Center star** — `*` cell + "first move must cover center" rule. Redundant Scrabble ritual.
3. **Points headline** — the headline number is abstract letter-value points (× premiums +
   bingo + modifier). Territory is a secondary chip. Backwards for a conquest game.
4. **Modifier banner** — per-game twist (bingo bonanza / long words / rich letters). Extra load.
5. **Heat / Overdrive / Burnout** — a second meter system; *burnout even forces a skip*. Noise.

## 2. Design decision

Strip the Scrabble cruft and **promote conquest to the headline** — do NOT rewrite the scoring
engine. Internal point-scoring stays as invisible plumbing (it ranks the bot's move choice; more
points ≈ longer words + captures ≈ more cells, a fine proxy). This keeps `scoring.ts` + the
reducer's score math + their tests untouched. The territory framing happens at the **display +
win-condition layer**.

### Rules (the simplified game)
- **No premium squares.** Every cell is neutral until claimed.
- **No center star.** First move can go anywhere; just place ≥2 tiles forming a valid word.
- **Connection rule stays.** Every later move must touch an existing tile (`DISCONNECTED`).
  This is what makes stealing possible and the conquest a contest — keep it.
- **Claim:** every cell you place a tile on becomes your color.
- **Steal:** build a word through a rival's tile and it flips to your color (`resolveCaptures`).
- **Win = most cells controlled** when the bag empties. Not points.

### Score reframe (display layer only)
- Headline + scoreboard: `countClaimed(you)` vs `countClaimed(rival)` ("territory").
- Win condition, "new best", duel head-to-head → **territory count**, not `player.score`.
- Feedback popups speak **cells**, not points: ScoreFloat "+3", capture toast "stole 2".

### Visual ("make it ours, cool board, smooth")
Territory ownership becomes the dominant visual language — claimed cells flood with the player's
neon (cyan = you, pink = rival) as the board is conquered. This *replaces* the premium-tint noise
rather than adding more Pixi. Smooth claim/capture transitions, reduced-motion fallbacks.

## 3. Shared-engine guard (landmine)
`board.ts` + `scoring.ts` are shared with admin-gated-but-live **Run** (sizes 7/9) and **Gem**
(size 11 — same as Territory phone) modes. Therefore: add a `premiums` option to `createBoard`
(default `true` — Run/Gem unchanged); Territory's init passes `premiums: false`. Do **not** blank
any premium layout.

## 4. Phases (commit per phase, ask before commit)

**Phase 1 — Logic + rules (TDD).**
- `createBoard(size, { premiums })` — premiums default on; off → cells `premium: null`.
- Territory `buildInitial`/`RESET` pass `premiums: false`.
- `moveValidator`: drop `FIRST_MOVE_MUST_COVER_CENTER`; first move = ≥2 tiles anywhere; keep
  `DISCONNECTED` + linear/contiguous/dictionary checks.
- Reducer: neutralize heat/overdrive/burnout (fields stay 0/false; no transitions). Remove
  modifier from the player's experience (keep field, render nothing).
- Update affected tests; full suite green; bot still plays; captures/endgame intact.

**Phase 2 — Display reframe + win condition (TDD).**
- Win / "new best" / duel comparison → territory counts (`countClaimed`).
- GameOverScene shows territory (cells), relabeled.
- ScoreFloat + ScorePreviewBadge + capture toast speak cells.
- Scoreboard leads with territory.

**Phase 3 — Board UI / "cool + smooth".**
- `WordCraftBoard`: remove premium tints, multiplier labels, center ★; make claimed-cell
  ownership the dominant visual (flooded neon, smooth claim/flip), keep a11y + RTL + reduced
  motion.
- Remove ModifierBanner, HeatMeter, HeatStamp, LegendChip from the Territory page.
- i18n: retire premium/center/heat/modifier strings as they fall out of use; add any new ones ×5.

## 5. Out of scope
Run + Gem modes (admin-gated; left on the classic engine). Backend/MP. Bot ranking algorithm
(stays point-based — a fine territory proxy).
