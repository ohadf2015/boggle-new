# Crossword Overhaul — Spec (2026-08-08)

Ledger claimed `crossword — 90% — RELEASED`, with **"Visual QA: not captured"**. Live prod QA
(agent-browser, `www.lexiclash.live/en/crossword`) shows the mode is not playable on the most
common small phone. The code audit was clean because the defects are layout + content, not logic.

## Measured evidence (prod, 2026-08-08)

| Viewport | Result |
|---|---|
| 375×667 (iPhone SE) | Scroller `clientHeight=286`, `scrollHeight=493`. Grid is `345px` tall at `y=143..488` → **bottom row clipped, toolbar (Check/Letter/Word/Restart) entirely below the fold and unreachable.** |
| 390×844 (iPhone 14) | Fits, but the `<details>` "All Clues" band is squeezed to a 44px sliver; toolbar wraps to 2 rows. |
| 1440×900 | Playable. Grid 448px in a 1440px viewport — lots of dead space, but not broken. |

Root cause: `CrosswordGrid` sizes purely off width — `max-w-[min(92vw,28rem)] aspect-square` — and is
nested inside `overflow-y-auto`. Available **height** is never consulted, so on short viewports the
square grid simply overflows the scrollport.

Height-capping alone is not enough: the fixed chrome (masthead + stat bar + clue bar + keyboard)
eats ~381px of 667, so a grid capped to the remainder while still sharing it with the toolbar and
disclosure lands at ~30px cells. **Bands must be removed, not just resized.**

## Scope

### Phase 1 — Playability (blocker)
1. Size the grid by `min(available width, available height)` so it can never clip. Move it out of
   the scrollport into a `flex-1 min-h-0` centering box.
2. Delete the mobile `<details>` "All Clues" band — redundant with the pinned clue bar's prev/next,
   and it is the band eating the fold.
3. Collapse the 4-button toolbar to one compact row that always fits.
4. Sync `max-w`: clue bar + keyboard are `34rem`, grid is `28rem` → they overhang on tablets.
5. Hide the third-party Feedback widget on the crossword route — it overlaps the bottom-left key.

### Phase 2 — Input correctness
6. `CrosswordView.tsx:169-173` — ArrowDown/ArrowUp read `state.dir` from a stale closure after
   `toggleDir()`, so moving down from an across word takes **two** presses.
7. `checks` are cleared on every focus/input while `warmths` are never cleared — check feedback
   vanishes the moment you type, stale warmth lingers forever. Make the lifetimes symmetric.

### Phase 3 — Content quality
8. Swedish clue bank (942 entries) contains machine-generated non-words: `andok`, `apod`, `appe`,
   `arbe`, `arede`, `areia`, `apot` (should be `apotek`), `apel` (should be `äpple`). Swedish has no
   baked pool, so these reach players directly.
9. ~~`HARD` badge is decorative~~ — **investigated, not a bug, left alone.** Difficulty is
   weekday-derived (`dailyDifficulty`, NYT convention) and it *is* wired: `generate.runtime.ts`
   sizes the filler's `prefer` set from it (easy 450 / medium 800 / hard 1600 commonest words).
   The lever lives there, not in `generate.core.ts`, which is why a grep of the core filler for
   `difficulty` comes back empty.
   The real finding is weaker and not worth a risky change: because the whole EN bank is 2,400
   curated common 3–5 letter words, easy and hard both land on common vocabulary, so `HARD`
   overpromises. Genuine mini-crossword difficulty comes from *oblique clueing*, not rarer words —
   which needs difficulty-graded clues the bank does not have. Content project, not a code fix.

### Phase 4 — Feel
10. Autocheck toggle (wraps existing `checkAll`).
11. Word-complete celebration — currently only a progress-bar tick.

## Decisions taken on the two open judgement calls

**Solved-word marking stays always-on; no autocheck toggle.** The stat bar already reports *how
many* words are solved, so withholding *which* was an information asymmetry rather than a
difficulty setting. NYT makes autocheck a toggle because it is a 15×15 for purists with a
solve-time leaderboard; this is a 10-clue mini for a casual audience whose reported complaint was
that it "isn't clear how the words fill the board". A toggle would mean settings UI plus
persistence plus another control on a viewport already fought over — cost with no matching benefit.

**Mobile full clue list stays removed; swipe replaces it.** The real capability lost was not the
list but the ability to *jump* to an arbitrary clue — with the list gone you could only step with
prev/next. Rather than reintroduce a band or a modal for 10 clues, the clue bar now responds to a
horizontal swipe (`ClueBar`, threshold 40px, ignores taps and mostly-vertical drags, direction
follows reading order so it matches the chevrons in both LTR and RTL). This is the gesture
Crosswords Classic uses and it reuses the existing `nextSlot`, which already wraps.

## Explicitly out of scope

- **RTL column mirroring** (`CrosswordCell.tsx:43`). Flagged by the UI audit as "unconventional";
  it is correct — Hebrew crosswords fill right-to-left, and the sofit word-end rendering keys off
  slot last-cell. Changing it silently breaks Hebrew. Screenshot `/he/crossword` to confirm it is
  not visibly broken; change nothing.
- **Grid geometry / puzzle structure.** Verified sound: fully-checked 5×5, 10 clues, 180° symmetric,
  zero isolated letters across 893 generator test cases.
- **Japanese / Russian clue banks.** Absent entirely; both fall back to English. Real gap, but it is
  a content-authoring project, not this change.

## Competitor findings applied

From NYT Mini, Grid Genius, CodyCross, Crosswords Classic:

- Grid must fit the phone without scrolling — CodyCross's cited advantage over NYT is precisely
  "grids sized for portrait".
- Autocheck + reveal + streak are table stakes; we have reveal and streak, we lack autocheck.
- Progressive hints beat binary reveal — we already have a half-wired `cold/warm/hot` warmth system,
  so finishing it beats adding a fourth hint type.
- Swipe the clue bar to advance to the next clue (Crosswords Classic) — `nextSlot` already exists.

## Results (measured after the change)

Board size and clipping, measured live in the browser via `getBoundingClientRect`:

| Viewport | Before | After |
|---|---|---|
| 375×667 | **clipped** (grid 345px in a 286px scrollport), toolbar unreachable, 1 scroller | 265px board / 53px cells, **not clipped, 0 scrollers**, toolbar visible |
| 390×844 | fit, but disclosure squeezed to a 44px sliver, toolbar on 2 rows | 366px board / 73px cells, 0 scrollers, toolbar on 1 row |
| 1440×900 | 448px board | 448px board (unchanged — desktop was never the problem) |
| `/he` 390×844 | not previously captured | 366px board / 73px cells, 0 scrollers, RTL intact |

Nothing on the mobile board scrolls any more, at any of these sizes.

- `moveVertical` + feedback-lifetime: 9 new tests, RED first (8 failing) then GREEN.
- Swedish clue bank: 942 → 786 answers; **156 fabricated entries removed** (16.6%). Survivors keep
  216 three-letter and 374 four-letter words — ample for the 4×4 SV mini. New regression test
  asserts every answer is in `@arvidbt/swedish-words`, so this cannot silently return.
- 1,109 crossword + admob tests green; eslint clean at `--max-warnings=0`; tsc clean.

## Verification

Layout is verified by screenshot at 375×667 / 390×844 / 1440×900 / `/he/crossword`, before and
after. That capture set is the deliverable's proof, and its absence is exactly what let the ledger
record "90% RELEASED" over an unplayable board. State-machine fixes get vitest tests (pure
functions); CSS sizing does not get a jsdom test.
