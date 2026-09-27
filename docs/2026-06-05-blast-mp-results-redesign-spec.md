# Blast MP Results Redesign — Spec (2026-06-05)

## Problem
Blast multiplayer results page is overloaded and the standings aren't clear:
- For a non-winner the **winner is shown 3×**: generic `ResultsPodium` + `BlastMpResults` list + `BlastResultsScene` opponents. Blast never adopted the wheel-rush "replace" pattern (it renders its custom list *on top of* the generic podium).
- `BlastMpResults` rows show two **always-zero** stat boxes (`tilesCleared`, `bestCombo` are hardcoded `0` in the builder) → literal noise.
- No clear first-place treatment, no "YOU" highlight, avatar never rendered (builder drops it), and a non-top-3 player can't find their own rank without scrolling.

## Goals (from user)
1. Make **first place obvious**.
2. Make the **player's own position obvious** (incl. when not top-3).
3. Look **good / satisfying** (need not match Word Wheel — distinct blast flavor).
4. **Clear & simple — not data overload.**
Skills requested: `/impeccable` (neo-brutalist brand), `/pixijs-2d`, `/gsap-core`.

## Approach — mirror wheel-rush "replace" pattern
1. **Suppress the generic podium for blast MP.** In `ResultsPage.tsx` L868 widen `hideStandings` to also cover `resolvedGameMode === 'blast' && sortedScores.length > 1`. This removes `ResultsPodium` + `ConsolationRows` for blast (one winner-dupe gone, generic look gone). `ResultsHeroSection` stays — it shows the *current player's* personal rank/score (a feature, not a winner-dupe).
2. **`BlastMpResults` becomes the single authoritative, satisfying standings scene** that owns first-place + your-position.

## New `BlastMpResults` scene (neo-brutalist, blast-flavored)
- **Header row:** Bomb icon + `blast.results.sceneTitle`, and a pinned **YOUR-POSITION chip** (`#N` big + `of M`) — lime, always visible = the load-bearing "find my rank" element.
- **Winner hero:** crown + gold glow + avatar (xl) + name (underlined lime + YOU if it's you) + animated `ScoreCountUp` + secondary line (words found, best word if available) + board-cleared badge.
- **Runner-up rows (lean):** rank chip (gold/cyan/pink/purple by place) · avatar · name (+YOU badge) · score · words. The current player's row gets a lime ring + subtle tint + slight scale so it's findable in a long list.
- **Pixi backdrop:** `BlastSparksCanvas` — drifting neo-colored ember sparks rising + fading. Defensive: own file, `ssr:false`, inits **only when container size > 0** (the hidden desktop/mobile duplicate is `display:none` → never inits → no double WebGL context), destroys on unmount, **skips on reduced-motion**. Garnish — disposable if fiddly.
- **GSAP entrance** scoped to a ref (not document selectors → safe under double-mount): winner hero pop (`back.out`) → rows stagger up. Reduced-motion → no animation.
- **No new confetti** — `ResultsHeroSection` already fires first-win confetti; a second would double-fire under the two-mount layout.

## Data / builder changes (`blastMpRanking.ts`, re-exported from `BlastMpResults.tsx`)
- `BlastMpPlayerResult`: drop bogus `avatar?: {type,color}` → real `avatar?: Avatar` (`customAvatar`); drop `tilesCleared`/`bestCombo`; add `isCurrentPlayer?`, optional `bestWord?`/`maxCombo?`.
- `buildBlastMpResults(scores, opts)`: map `avatar` through, set `isCurrentPlayer = username === localUsername`, pull `bestWord`/`maxCombo` from optional `opts.playerStats[username]`.
- Pure `rankBlastMpPlayers(results)` → `{ ranked(+rank), winner, runnersUp, currentPosition, totalPlayers }`. Unit-tested RED-first.
- `ResultsPage.tsx` builder call passes `playerStats: blastPlayerStats`.

## i18n (5 langs: en/he/sv/ja/es)
- New: `blast.mpResults.yourPosition`, `blast.mpResults.champion`.
- Reuse: `results.you` (YOU badge), `blast.mpResults.boardCleared`, `blast.results.sceneTitle`, `common.score`, `common.words`.

## Files
- NEW `components/blast/legacy/blastMpRanking.ts` (+ test) — type, builder, pure ranking.
- NEW `components/blast/legacy/BlastSparksCanvas.tsx` — Pixi backdrop.
- REWRITE `components/blast/legacy/BlastMpResults.tsx` (<300 lines) — scene; re-exports builder+type.
- REWRITE `components/blast/legacy/__tests__/BlastMpResults.test.tsx`.
- EDIT `components/views/ResultsPage.tsx` — `hideStandings`, builder `playerStats`.
- EDIT `translations/{en,he,sv,ja,es}.js`.

## Verification
- `rankBlastMpPlayers` unit tests (sort, winner, currentPosition for non-top-3, null when no me).
- Component: renders winner name, YOU badge on current player, your-position chip shows rank when NOT top-3, empty state, board-cleared badge, no zero-stat boxes.
- `npm run lint && test && build`.
- Live: dev server, bust `/_next/static` cache; check Hebrew RTL + reduced-motion + that generic podium is gone for blast.
