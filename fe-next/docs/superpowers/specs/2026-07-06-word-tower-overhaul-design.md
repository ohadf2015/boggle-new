# Word Tower Overhaul — Design (2026-07-06)

Ten loosely-coupled changes to the Word Tower game. Shipped as independent, verifiable commits.
Renderer facts: tower = Pixi canvas (`WordTowerScene` + `towerSprites`); crane = DOM/CSS (`WordTowerCrane`).
Letter model = a **persistent reusable wheel** (Spelling-Bee): 8 letters, reused across many words, never consumed.

## 1. Remove share button
Delete the Share2 button (`WordTowerPlay.tsx` ~1100), the `shareTower` callback, and the now-unused `Share2` import + `wordTower.share.*` wiring. No replacement.

## 2. Rival tower always visible, never below our tower
`rivals.ts` / `WordTowerRivalRail.tsx`. Today a rival column is culled off-screen (`visibleRivalMarkers`) and sinks below the build line once passed.
- **Always render** every existing rival (drop the viewport cull for the rail).
- **Clamp** each rival's `screenY` into `[topMargin, buildLineY]` so it never draws *below* our tower's build line ("not lower than our tower"). A rival still above us pins at the top edge; reuse `nearestRivalAbove` → "↑ {name} +Xm" chase chip when pinned.
- Column height stays tied to the rival's record so a taller rival visibly out-towers us.

## 3. Pixelated tower (keep biome color theme)
`towerSprites.ts` `paintTile()`. Keep biome block colors from `biomeTheme.ts`; change the *surface* to read as pixel-art: chunky stepped highlight/shadow (2–3 flat bands, no smooth gradient), a 2px pixel border/stud detail, hard edges. One shared tile-style constant (see #8) so crane + tower match.

## 4. Top section layout
- **Actions row shares the sound-control row.** The global mute FAB = `InGameAudioButton` (fixed top-right, z-70). Move the header actions (upgrades/skin/leaderboard) up to that same top row, ending just left of the FAB — drop the `pt-10` push-down and `me-12` dodge; reserve only the FAB's width.
- **Coins compact + in the top row.** Move `CoinCounterAnimated` into the actions row, smallest size; remove its own centred row.
- **Stats simplified + expandable.** `WordTowerStatHud`: default shows only the hero (altitude + combo). A tap toggles an expanded panel with biome/floors/best/tier. Collapsed by default (less data overload).

## 5. Good daily wheel — no "Scrabble" dumps
Keep `generateWheel` (pure, frequency-weighted) but tighten its heuristics AND select the best candidate against the real dictionary.
- Harden `generateWheel`: enforce vowel floor (exists), duplicate cap (exists), **cap rare/hard letters** (new: ≤1 from a per-language rare set), keep C/V balance.
- New pure `pickBestWheel(gameCode, playerId, language, dict, opts)`: draw N candidate wheels (deterministic, increasing drawIndex), score each with `countBuildableWords`, return the one with the **most** buildable words that also clears a minimum (coverage = "words from all the letters, max possible"). Bounded candidates, deterministic.
- Wire at the init site (`WordTowerGame` has the dictionary). Falls back to plain `generateWheel` if dict absent.
- **TDD**: coverage ≥ threshold, no-excess-rare, determinism (same seed → same wheel), per-language (en/he/ja/ru vowel+rare sets).

## 6. Clues — 1 free/day, rest via rewarded ad
`WordTowerHud` hint + `useRewardedAd`.
- Keep the free "N words possible" **count** always (it doesn't solve).
- The masked word **reveal** (`clueWord`) is the gated clue: **first reveal each UTC day is free**; subsequent reveals require a rewarded ad (reuse `useRewardedAd`, offer via a small modal like `BlastUndoAdModal`).
- Track clues-used per day in localStorage keyed by UTC date.
- **Web fallback** (no rewarded ad): after the free one, reveal stays available for free on web (don't block non-native users).

## 7. Left bar — biome vibe + polish
The left utility rail (`WordTowerPlay` ~919, `start-2 top-36`, holds Sabotage bay / watch-ad / flow / skin / mutator chips). Give it a biome-themed vertical spine (subtle `biomeTheme` gradient/accent behind the chips) and tighter, better-looking chip styling so it reads as part of the current biome, not floating UI.

## 8. Crane blocks look like the falling blocks ("really happening", all blocks)
The felt "separate scenes" = crane (DOM) tiles look nothing like tower (Pixi) tiles, and the drop cuts between them.
- Define **one tile-style spec** (colors, border, stud/pixel shading, glyph) shared by `towerSprites` (Pixi) and the DOM crane beam so a hanging block is visually the same block that lands.
- Style the DOM crane beam to render that pixel tile for **every** letter of the word (remove any preview/beam cap — `WordTowerScene` pending cap ~L119 and beam cap).
- Make the hand-off continuous: the beam block that drops matches the tower block it becomes (same color = `wordColor(floors.length)`, same surface).

## 9. Building word stacks on the crane, not the tower; swing grows per letter
Coupled with #8 (same beam).
- **Delete the pending-ghost stack** drawn on the tower crown (`WordTowerScene` ~230–347 pending branch). The tower shows only *committed* floors.
- The word-in-progress renders as pixel tiles **stacking up onto the crane beam** as letters are selected.
- **Swing scales with letter count**: crane sway amplitude = f(`selected.length`), clamped to a max swing. Each added letter swings a bit more, never past the cap.

## 10. Fix weird sky animations (whale etc.)
`WordTowerSighting.tsx` (+ check biome `galaxyWhale` parallax prop). The whale currently pops in, drifts perfectly linearly for 9s, and hard-flips via `scaleX`.
- Ease-in-out drift, fade in/out at the screen edges (no hard pop), gentle vertical bob.
- Keep it cosmetic, reduced-motion-off, non-deterministic.

## Verification
8/10 are visual — tsc/lint/self-review can't confirm them. Run the app and eyes-on each (playwriter/agent-browser), incl. `?locale=he` for the RTL header row. #5 is unit-test-verifiable. Per repeated incidents: `git diff --cached --name-only` before every commit (tree already has concurrent-session deletions).
