# Competitive Landscape — Word Games (2026-08-25)

Research-only. No product code changed. Scope: what Zynga (Words With Friends), Scopely
(Scrabble GO) and NYT Games have shipped recently, versus what LexiClash's own marketing
pages currently claim about them.

Sourcing note: every external claim below carries a URL. `WebFetch` was not permitted in this
session, so claims are search-index-derived (title + snippet from the linked primary page), not
full-page reads. Anything marked ⚠ should be re-read against the primary page before it goes
into user-facing copy. **App Store / Play Store review-sentiment trends were not obtained** —
the proposal's own evidence records those pages returning 404/blocked, and nothing in this
session changed that. Skipped rather than guessed.

---

## Headline finding: WWF moved onto our stated differentiation

LexiClash's positioning in the comparison posts is **"depth and variety"** — many modes, solo
modes filling the multiplayer gap:

- `fe-next/app/[locale]/blog/best-boggle-alternatives-2026/content.ts:139` — *"Wordle for logic
  puzzles, Word Blitz for pure speed, LexiClash for depth and variety."*
- `fe-next/app/[locale]/blog/best-boggle-alternatives-2026/content.ts:130` — *"it's newer, so
  during off-peak hours you might wait for a match. **Solo modes fill the gap** … Words With
  Friends still wins on player count. For now."*

Words With Friends has since shipped a single-player daily-puzzle suite that lands squarely on
that turf:

| Competitor move | Date | Source |
|---|---|---|
| Four single-player mini-games: **Word Search, Crosswords, Word Wheel, Guess Word** (Wordle-alike, 6 attempts, daily, shareable result) | 2024-11-14 | [Take-Two IR](https://www.take2games.com/ir/news/words-friends-launches-new-suite-game-modes) · [Zynga blog](https://www.zynga.com/blog/words-with-friends-launches-new-suite-of-game-modes/) |
| **Letter Lock** — daily single-player column-sliding word puzzle | 2025-04-30 | [Zynga blog](https://www.zynga.com/blog/words-with-friends-adds-letter-lock-mode-your-newest-daily-wordplay-obsession/) |
| **Lightning Duels** — head-to-head, winner-takes-all | ⚠ undated in index | [Zynga blog](https://www.zynga.com/blog/words-with-friends-launches-new-suite-of-game-modes/) |

Two of those four names collide directly with modes we already ship — Crosswords ↔
`app/[locale]/crossword`, Word Wheel ↔ `app/[locale]/daily-word-wheel` (full route listing
checked; we have no word-search mode). Guess Word is a Wordle clone shipped *inside* the app with
the biggest word-game install base, which is the fourth-mode problem in a different form.
**"More modes than WWF" is no longer a defensible line.** The mode-count axis is now table
stakes.

Scopely is on the same trajectory for Scrabble GO — Duels, Word Drop, Tumbler, Rush (solo, 11×11
board), plus Practice Mode and Leagues
([Scopely](https://www.scopely.com/en/games/scrabble-go)). Same shape: a classic turn-based core
plus a bolted-on suite of solo/fast modes.

NYT Games is the daily-ritual competitive set, not the mode-variety one: Wordle, Spelling Bee,
Connections, Strands, Mini, Letter Boxed, at **$4.99/mo or $39.99/yr**
([Google Play listing](https://play.google.com/store/apps/details?id=com.nytimes.crossword));
last notable format extension was Connections Sports Edition, 2025-02-09
([Wikipedia](https://en.wikipedia.org/wiki/The_New_York_Times_Connections)). No 2026 launch
surfaced. ⚠ price and roster from the store listing snippet.

### What is left as differentiation

Every rival's solo suite is **single-player and asynchronous**. Nobody shipped *live, same-board,
same-second* multiplayer with a shared party/TV surface — that is the axis LexiClash already owns
in code and does not lead with in copy. Hebrew RTL + 5 locales is the second candidate axis; WWF
has expanded languages before ([Adweek](https://www.adweek.com/performance-marketing/words-with-friends-new-languages-fast-play-hit-zyngas-word-game/)).
⚠ **No search was run on rival Hebrew support** — "nobody else serves Hebrew" is our working
assumption, not a verified finding, and it is load-bearing for the recommendation below. Verify
before it goes in copy.

**Proposed differentiation move (next slice, not this one):** rewrite the comparison posts'
positioning line from *mode variety* to *live shared-screen multiplayer + Hebrew/RTL*, and stop
conceding solo-mode ground we no longer uniquely hold.

---

## In-repo finding: the comparison posts display a frozen byline date

All four comparison posts hardcode the **published** date in the rendered byline while the
structured data separately advertises a later `dateModified`. The visible date can never move:

| Post | Byline (hardcoded) | `DATE_MODIFIED` in `page.tsx` |
|---|---|---|
| `best-boggle-alternatives-2026/PageClient.tsx:146` | `new Date('2025-12-01')` | `2026-05-19` (`page.tsx:16`) |
| `boggle-vs-scrabble/PageClient.tsx:97` | `new Date('2026-03-28')` | `2026-05-19` (`page.tsx:20`) |
| `boggle-vs-wordle/PageClient.tsx:97` | `new Date('2026-03-28')` | `2026-05-19` (`page.tsx:16`) |
| `boggle-vs-words-with-friends/PageClient.tsx:96` | `new Date('2026-03-28')` | `2026-05-19` (`page.tsx:16`) |

Two consequences: a post titled *"best boggle alternatives **2026**"* renders a **December 2025**
byline to every reader, and the JSON-LD `dateModified` we emit to Google disagrees with the date
on the page. Plain duplication — the same value maintained in two places, only one of which
anyone updates.

Not fixed here: the fix is threading the `DATE_MODIFIED` constant from `page.tsx` into
`PageClient` across four posts, which is a code change and outside this proposal's
"research-only, no code changes yet" scope.

## Correction of the proposal's premise

The proposal assumed the in-repo comparison posts "may be stale" in the sense of *wrong*. They
are not — nothing found here contradicts them. `content.ts:130`/`:154` claim WWF wins on player
count and turn-based community, which remains true. They are stale in **positioning**, not in
fact. No prose correction is warranted; a positioning rewrite is.

## Next actions

1. Positioning rewrite — live shared-screen multiplayer as the lead differentiator, drop the
   mode-variety claim. Scope is bigger than the four blog posts the proposal named: there are
   also ~19 `app/[locale]/lexiclash-vs-*` comparison landings (incl. `lexiclash-vs-wordfeud`,
   `lexiclash-vs-apalabrados`, `lexiclash-vs-puzzly-words`) plus
   `app/[locale]/words-with-friends-alternative`, all carrying positioning copy. Audit those for
   the same claim before rewriting anything.
2. Fix the frozen byline date across the four `PageClient.tsx` files.
3. Re-verify the ⚠ rows against the primary pages when `WebFetch` is available.
