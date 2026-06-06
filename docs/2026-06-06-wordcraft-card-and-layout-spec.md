# WordCraft mode-card asset + in-game layout simplification

**Date:** 2026-06-06
**Goal:** (1) WordCraft mode card image is inconsistent with the other mode cards — replace with a set-matched asset. (2) The in-game UI feels heavy; simplify the layout for easier play.

## Part 1 — Mode card asset (DONE)

**Problem:** `public/modes/word-craft.png` was an 886×665 opaque RGB top-down 3D tile-grid render (604 KB). Every other mode card (`word-tower`, `blast`, `connections`, …) is a **square, transparent-bg, kawaii-marshmallow die-cut sticker**. `ModeCard` floats `modeImage` as a die-cut sticker over a gradient (`object-contain` + drop-shadow + halo) — an opaque render reproduces a dark box in the corner.

**Fix:** Generated a new sticker (image-to-image from `word-tower.png` + character consistency) of the same marshmallow placing a letter tile into a **WORD** crossword cross (cyan/lime/purple/pink — the 4 brand families), ML/flood-fill background removal → transparent, re-added a uniform white die-cut border, normalized to **512×512 8-bit alpha** to match `word-tower.png`. Installed at `public/modes/word-craft.png`.

## Part 2 — In-game layout (the heaviness)

Heaviest state (solo, post-first-move, territory on, heat on) stacks **8 horizontal bands** around the board:
`topbar · scoreboard · territory-strip · heat-meter · [BOARD] · pending-strip · rack · play-friend-CTA · controls`.

Two are redundant/intrusive:
- **Scoreboard + Territory strip** are both player-vs-opponent metrics in separate bands.
- **Play-Friend CTA** (a bordered pink 2-button marketing card) sits between the rack and the Submit button, inside the core action loop.

### Changes
1. **Fold territory into the scoreboard.** Add optional `territory` prop to `WordCraftScoreboard`; render claimed-cell counts as a compact inline chip in the existing meta row (lime = you, pink = opponent — coherent with the scoreboard's own color language). Remove the standalone `<WordCraftTerritoryStrip>` band + component. The verbose "+2 per claimed cell" endgame hint leaves the permanent HUD (educational copy belongs in the tutor, not always-on chrome). **TDD** the scoreboard's new rendering.
2. **Evict the Play-Friend CTA from the action stack.** Move it to a compact Users-icon toggle in the topbar that opens the existing `WordCraftPlayFriendControl` in a small popover. Feature stays discoverable; the play loop (rack → Submit) is uninterrupted. Solo only (`!hotseat && !duel`), unchanged.
3. Net: the board reclaims ~2 bands of vertical space and the HUD reads as fewer, cleaner units.

### Out of scope
- No refactor of the 1152-line `PageClient.tsx` (task is UI-heaviness, not code-heaviness).
- Heat meter, pending strip, axis chip unchanged (already conditional / slot-swapped).

### Verification
- `WordCraftScoreboard` unit tests (territory present/absent, scores/bag still render).
- Visual: baseline vs after in the heaviest state, LTR + `?locale=he` (RTL). Mind `/_next/static` cache-mask (CDP `setCacheDisabled`).
