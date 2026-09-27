# WordCraft polish: jokers, easy placement, opponent avatar, bigger board

Date: 2026-05-30
Mode: Territory (the only public WordCraft mode)

## Problems reported

1. **Board too small** — should take the whole available width; the surrounding
   panels eat vertical space so the square board (sized at `100cqmin`) stays small.
2. **"Word Bot" with no avatar even vs a real player** — the scoreboard opponent
   label is hardcoded `WordBot` with no avatar slot.
3. **`.` in the letters** — blank tiles (`_`) render as `·` (U+00B7).
4. **Want a rare joker letter + other modifiers.**
5. **Easier to add more letters** (place several letters in one turn).
6. **Switch horizontal/vertical easily.**
7. **Select a cell for a letter without dragging.**

## Root causes (verified)

- **Blank == broken wildcard.** `BLANK_LETTER='_'`; `moveValidator.buildWordTiles`
  appends the literal `_` to the word, so any placed blank produces an invalid
  word (`C_T`). `value` already uses `isBlank ? 0`. The bot *skips* blanks
  (`botMove.ts`: `if (word.includes('_')) continue`). So blanks are unusable and
  show as `·`. **The joker ask and the dot ask are the same fix.**
- **Async duel.** A duel has no live opponent — the friend already played the
  seed; their score is the target (`WordCraftDuelTargetStrip` + `compareDuel` at
  game over). The on-board sparring side is always a bot. The *scoreboard* has no
  avatar element and always reads `t('wordcraft.bot')`.
- **Placement direction.** `resolveTap` hardcodes horizontal at 1 pending tile;
  the axis chip only renders at 2+ pending. Tap-to-place already works
  (`onCellTap`→`placeOnBoard`). So #7 is essentially done; #5/#6 need a
  pre-selectable, persistent axis.
- **Board height-bound.** Board is `aspect-square` capped at `100cqmin`, centered
  with `max-w-[820px]`. On phones width is already full; height is the limiter.
  Compacting the stacked panels lets the square grow.

## Plan (TDD pure logic, visual-verify UI)

### F1 — Jokers (fixes #3 + #4)
- New pure `lib/word-craft/blankAssign.ts`:
  - `JOKER_GLYPH = '★'` (unassigned-blank display — never `·`).
  - `displayTileLetter({ letter, isBlank })` → assigned letter, else glyph.
  - `assignBlankLetter(placement, letter)` → letter set (upper/normalized),
    `isBlank` stays true, `value` 0.
  - `isUnassignedBlank(p)`, `hasUnassignedBlank(pending)` (submit guard).
- New pure `lib/word-craft/wordCraftAlphabet.ts`:
  `alphabetForLocale(locale)` = `getTileBag(locale).distribution` keys minus `_`.
- Reducer: `ASSIGN_BLANK { rackTileId, letter }` updates the pending placement.
  Hook exposes `assignBlankLetter(rackTileId, letter)`.
- New `WordCraftBlankPicker.tsx` — on-screen alphabet grid, locale-aware, opens
  when a blank is placed; submit blocked while an unassigned blank remains.
- Render: replace `'_' ? '·'` with `displayTileLetter` in WordCraftBoard (×2),
  WordCraftPendingStrip, WordCraftRack; add a small joker badge for `isBlank`.
- "rare" — blanks stay 2/100. "other modifiers" — premium DL/TL/DW/TW already
  exist; no new economy-affecting modifier this pass (deferred, keep it honest).

### F2 — Opponent avatar (fixes #2)
- New pure `lib/word-craft/opponentIdentity.ts`:
  `resolveScoreboardOpponent({ hotseat, botLabel, hotseatLabel })`
  → `{ name, avatar, seed, isBot }`.
- WordCraftScoreboard: small avatars next to both names (Avatar size sm). The
  opponent now always has a seeded face → never a bare faceless "WordBot".
- **Decision (Option A):** the scoreboard opponent is the LIVE on-board side
  (bot / hot-seat human), NOT the async duel friend. A duel has no live friend —
  a bot contests the board while you race the friend's *recorded* score. Hanging
  the friend's name beside the bot's live score would show one person with two
  different numbers. The friend stays solely in `WordCraftDuelTargetStrip`
  (avatar + name + target + "X to go"); `compareDuel` decides the win. This
  satisfies "always show avatar" honestly. Deferred **Option B** (make the
  scoreboard opponent the friend with `duel.score` and retire the duel strip) —
  bigger change, revisit if players still read the bot as "the friend".

### F3 — Easy placement (fixes #5/#6/#7)
- `resolveTap(rackTile, pending, board, chosenAxis?)` — at 0/1 pending honor
  `chosenAxis` ('v' advances down-then-up); at 2+ `inferAxis` still governs.
  Param optional → back-compat.
- PageClient `chosenAxis` state (default 'h') + a persistent axis toggle visible
  before any tile is placed; `handleFastTap` passes `chosenAxis`.
- Tap-to-place already satisfies #7; surface it.

### F4 — Bigger board (fixes #1)
- Compact the scoreboard footprint and keep conditional strips so the square
  board reclaims vertical space and fills the width.

## Out of scope / deferred
- New economy modifiers (bonus tiles beyond premiums) — needs balance work.
- Re-orienting an already-locked 2+ tile line.
- Live remote opponent (architecture is async-by-design).
