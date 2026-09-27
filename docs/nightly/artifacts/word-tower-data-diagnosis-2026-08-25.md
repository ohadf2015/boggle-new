# Word Tower — what the player data says (2026-08-25)

Mode published 2026-08-14. Population is small but the signal is unambiguous and
consistent across three independent sources (PostHog funnel, `word_tower_progress`,
`daily_word_tower_attempts`).

## Population

| Source | Number |
|---|---|
| Users reaching a tower page (14d) | 27 (`/word-tower` 20, `/daily/word-tower` 7) |
| `game_started` mode=word-tower (14d) | 24 events / **15 users** |
| Lifetime tower rows ever (`word_tower_progress`) | 21 |
| Daily players (8d, since 08-18) | 16 players / 20 attempts |

For scale: `classic` had 248 users start a game in the same 14 days. Word Tower is
the 9th of 12 modes by starts.

## Finding 1 — 100% abandon. Zero completions. Ever.

```
game_started    mode=word-tower   24 events / 15 users
game_completed  mode=word-tower    0 events /  0 users
game_abandoned  mode=word-tower   24 events / 15 users
rage_quit       mode=word-tower    7 events /  5 users
```

Every session that has ever started has ended in abandonment. `rage_quit` is a
behavioural trigger, not a score heuristic — `trackRageQuit` fires on *abandoning
within ~15s of starting* (`utils/posthogEngagement.ts:125`) — so 5 of 15 players
left inside fifteen seconds.

**Root cause is in the code, not the players.** `WordTowerPlay.tsx:230` passes
`completed: false` to `trackGameEnd` unconditionally, with the comment *"Endless mode
has no completion"*. And it is literally true: `applyTowerWord`
(`wordTowerManager.ts:440`) has no failure branch — every word adds a floor,
the combo always increments, nothing ever ends the run.

**The unintended consequence is worse than the missing event.** `trackGameEnd` gates
all lifetime credit behind `completed === true` (`growthTracking.ts:1185`). So Word
Tower players never receive `incrementGamesPlayed()`, `total_games_played`,
`last_played_at`, `first_mode_played`, or `markFirstGameActivation()`. A player whose
first LexiClash experience is Word Tower is **invisible to activation tracking** and
is skipped by every downstream system keyed on those person properties.

## Finding 2 — the median daily player places ONE 3-letter word and leaves

11 of 20 daily attempts have `best_height_m <= 3`. Base floor is 2.0m and the
3-letter length bonus is 0 (`wordTowerConstants.ts`), so **2.0m is exactly one
3-letter word.**

This is real behavior, not a broken write. The discriminator:

- **0 of those 11 low rows ever improved later** (`completed_at == created_at`) —
  they submitted once and never came back to the board.
- 3 high rows *did* improve later, so the submit/merge path demonstrably works.
- `word_tower_progress` (same game, same wheel, different write path) has a healthy
  tail — 113 / 106 / 79 / 61 / 56 / 29 / 25 / 23 / 15 / 13 / 10 / 8 floors — with no
  cliff at 2. The two paths agree; the cliff is only in the daily entry point.

Daily best heights, all 16 players: `1, 2, 2, 2, 2, 2, 3, 3, 31, 99, 160, 383, 453`
(+3 more). Bimodal: place one word and quit, or climb for real. Nothing in between.

## Finding 2b — there is no "today" in the daily challenge (the deepest one)

The tower persists across UTC days, and `persistDailyBest` submitted
`game.heightM` — the **cumulative** tower. So the daily leaderboard was a lifetime
board wearing a daily label. The repeat players show it directly:

| player | 08-19 | 08-20 | 08-23 | 08-24 | 08-25 |
|---|---|---|---|---|---|
| `9b0c910c` | 334 | **334** | 401 | 453 | |
| `ea714e59` | | | | 99 | **99** |

Both came back on a later day and the board recorded an **unchanged number**. Two
consequences, and they cover both halves of the goal:

- **A newcomer cannot compete.** Their first word scores 2m against a veteran's
  453m — on a board that is nominally "today's challenge".
- **A returner cannot progress.** Their score already includes every previous
  day, so a day's work moves it a fraction of a percent. Nothing you do today
  reads as progress.

It is worse than inert. `onNewDailyBest` fired from a mount-time effect gated on
`beatsDailyBest(personalBestM, game.heightM)`, where `personalBestM` was read from
`wt-daily-best-<today>` — a key that is **absent every morning** and therefore `0`.
Against a restored 334m tower that test is true at mount, so on day 2 the game
submitted 334m again *and* fired a 120-particle confetti burst with a "NEW BEST!"
toast **for placing zero words**. The one celebration the mode owns was being spent
on nothing. (The same mount-vs-play confusion credited the daily streak for merely
opening the page: `daily && floorsCount >= 1` is true at mount for any resumed
tower.)

## Finding 3 — the daily mode has no rivals

`WordTowerGame.tsx:223` passes `rivals={[]}`. The endless route wires real rivals;
the daily route — the one that *has* a leaderboard and all 16 players — ships the
rival system invisible. `WordTowerPlay.tsx:1178` even documents it: *"displayRivals
is empty in daily anyway"*.

This is the same defect the 08-08 memo recorded (`rivals={[]}` hardcoded); one path
was fixed, the sibling was not. Recurring-pitfalls **Class 3 — asymmetric paths**.

It was doubly dead, and the second lock is the one that matters. Even with rivals
populated, `WordTowerPlay.tsx:1243` gated the rail and the chase chip behind
`{!daily && (…)}` — and `daily` is unconditionally `true`. The stated reason was
*"displayRivals is empty in daily anyway"*, which was only true **because** the
parent hardcoded `rivals={[]}`. Each half justified the other, so fixing either
alone would have shipped nothing visible.

`rivalsFromLeaderboard()` already exists in `lib/wordTower/rivals.ts`, the daily
leaderboard endpoint already returns exactly the rows it needs, and
`useSabotageIntegration` passes the prop straight through (`useSabotage.ts:140` is
a plain `rivals.map`, no daily branch) — the entire chase system was built, wired
downstream, and switched off at two points.

## Finding 4 — the "come back and improve" stat has never incremented

`total_floors_built = 0` for **all 21 players**.

The column has a correct monotonic guard in SQL
(`20260521130000_add_word_tower_progress.sql:31`,
`greatest(coalesce(new, 0), old)`), but the progress upsert
(`app/api/word-tower/progress/route.ts:82-92`) never sets the column and no client
ever sends it. `greatest(0, 0) = 0`, forever.

This is the single lifetime accumulator that would say *"your tower is taller than
it was yesterday"* — the exact axis this work is meant to serve — and it has never
moved.

## Finding 5 — the leaderboard shows 0 floors and no word for everyone

`persistDailyBest` (`WordTowerGame.tsx:171`) posts only
`{ heightM, language, guestFingerprint }`. The route reads `body.floors` and
`body.longestWord`, which are therefore always `undefined`.

Result on all 20 rows: `floors = 0`, `longest_word = NULL`. The daily leaderboard
renders "0" floors for every player and can never show a longest word.

## Finding 6 — combo is a fake tension system

`longest_combo === best_floors` exactly for 12 of the 17 non-zero players.

`applyTowerWord` increments the combo on every single word, and the combo only ever
breaks when the player **pays coins** to spin a new wheel (`spinWheelPaid`). For
anyone who never bought a spin, "longest combo" is just a second name for the floor
count. There is no risk and no tension — the multiplier is a pure escalator.

## Finding 7 — the balance pass was impossible

`shared/constants/wordTowerConstants.ts` opens with: *"All values are first-guess;
balance pass happens in Phase 5 from PostHog telemetry."*

No in-mode telemetry was ever wired — no word-placed, no scramble-spent, and
critically no **coin-paywall-hit** event. `WORD_TOWER_SCRAMBLES_START = 3` free
scrambles, then a fresh wheel costs 30 coins
(`WORD_TOWER_SCRAMBLE_COIN_COST`). Whether players are hitting that wall and leaving
is the leading candidate explanation for Finding 2, and it is currently
unmeasurable.

## Synthesis

Word Tower is an infinite, consequence-free escalator with **no ending, no opponent,
a dead lifetime stat, and a leaderboard that displays zeros.** A player places one
word, nothing happens, there is nothing to chase and nothing that visibly improves —
and 100% of them leave.

The mode does not need more content. It needs a today, a record worth the word,
and somebody to race.

---

# What shipped (2026-08-25)

Five root-cause fixes. No new UI surface — every one of these is a defect with a
measurement behind it, and each is fixed where all callers route through.

### 1. Today's climb is its own number  (Findings 2b, 5)
`lib/wordTower/dayStart.ts` (new, 17 tests): a per-UTC-day baseline in
localStorage. The daily score is now `heightM - startHeightM` — metres built
**today** — so every morning starts everyone at zero and one word is visible
progress. The lifetime tower is untouched and keeps growing.

Baseline authority (this was the Class 1 risk): it lives in localStorage **only**,
never in the tower save blob, because the blob has two sources — the local session
and the DB `current_state` — that resolve at different times. It stays
*re-stampable until the first floor lands*, so the late DB swap can raise the tower
without crediting the player for metres built on another device, and freezes the
moment they actually play.

The storage key was renamed `wt-daily-best-*` → `wt-daily-climb-*` **because the
meaning changed**: a device still holding a cumulative 334 would fail
`merged > stored` against a real 2m climb and silently suppress every submit for
the rest of the day.

### 2. A session that builds a floor counts as completed  (Finding 1)
`completed: false` → `floorsBuilt > 0`. This restores `incrementGamesPlayed`,
`total_games_played`, `last_played_at`, `first_mode_played` and
`markFirstGameActivation` for Word Tower players. A true bounce still has
`floorsBuilt === 0` and still books as abandoned, so the cliff signal is preserved.

### 3. Mount is no longer mistaken for play  (Finding 2b)
The streak, the record celebration and the daily submission are all gated on floors
placed **this visit**. The record is now measured against the **lifetime**
high-water mark, so "NEW BEST!" means a genuinely taller tower instead of firing at
mount every morning.

### 4. The leaderboard stops showing zeros  (Finding 5)
`floors` and `longestWord` are now sent. The route always read them; the client
never supplied them.

### 5. Rivals are switched on — at both locks  (Finding 3)
`rivals={[]}` → real rivals from today's board via the already-built
`rivalsFromLeaderboard`, **and** the `{!daily && …}` gate removed so the rail and
the "↑ +12m to pass X" chip actually reach the screen. Fixing only the prop would
have shipped nothing visible.

Rival climbs are rebased onto the viewer's baseline, so a rival who climbed 12m
today draws at the altitude the viewer reaches by climbing 12m — one scale for a
newcomer and a 400m veteran alike. Both layers are `pointer-events-none`, checked
deliberately against the 08-15 incident where a full-width overlay ate every click
on the page.

Side effect worth noting: the `passedRival` achievement
(`WordTowerPlay.tsx:484`) has been unreachable for the mode's entire life, because
`rivals` was always `[]`. It now becomes attainable — and does **not** unlock
instantly for a tall veteran, since `rivalsFromLeaderboard` drops zero-climb rows,
so every rebased rival sits at `baseline + >=1` while the viewer starts at exactly
`baseline`.

The SabotageBay keeps its own `!daily` gate. That system is genuinely dead (10
wrecks ever, 2 defenders, none since 07-13) and turning it on is new scope, not a
fix.

### 6. The wheel economy is measurable  (Finding 7)
Two events: `wordtower_scramble_used` (`banked` | `bought`) and
`wordtower_wall_reached` — 0 banked scrambles **and** not enough coins, so the
scramble button is disabled. The ring is reused and letters are never consumed, so
that state is a dead end with no legal move. It is the leading candidate for the
one-word cliff and was previously unmeasurable.

## Deliberately not done

- **`total_floors_built` (Finding 4) left dead.** It is redundant with
  `best_floors`, which is already monotonic, already populated (113 / 106 / 79 …)
  and already the "your tower grew" number. The two differ only when floors are
  destroyed, and wrecks are dead (10 rows, 2 defenders, none since 07-13). Wiring a
  second lifetime accumulator through state, serialize, restore, route and upsert
  would buy nothing and add a competing source of truth.
- **No "Top Out" / results screen.** Nothing in the data demands a new surface, and
  the completion fix above already restores the credit that was missing. Worth
  revisiting only once the fixed funnel shows whether players still have no moment
  to feel good about.
- **Finding 6 (combo is a fake tension system) is untouched.** `longest_combo`
  equals `best_floors` for 12 of 17 players because the combo only breaks when you
  pay. That is a balance decision, not a defect, and it is exactly what the new
  wheel-economy telemetry is there to inform.

## Known transitional wart

Rows already written for `puzzle_date = 2026-08-25` hold cumulative values, and the
server keeps the MAX — so today's board still shows the old inflated numbers. Left
in place: those are real player rows, and deleting them is a destructive,
outward-facing call. It self-clears at the UTC rollover, when a fresh `puzzle_date`
starts everyone on climbs.

Rebasing those rows would have hung ghost lines ~455m above a new player's head,
making today strictly worse than before the change — so the rival rail is skipped
for that single `puzzle_date` (`CUMULATIVE_SCORE_CUTOVER`). One conditional, it
expires by itself, and no player data is touched.

## Verification

`npx vitest run lib/wordTower components/wordTower` → **RC=0, 1083 passed / 127
files** (17 new in `dayStart.test.ts`, 15 new in
`WordTowerDailyLoop.regression.test.ts`).
`npx tsc --noEmit -p tsconfig.json` → **RC=0, 0 errors**.
`npx eslint --max-warnings=0` on all 9 changed files → **RC=0**.

Exit codes captured directly (`echo "RC=$?"`), never read off a pipeline or a task
notification — see recurring-pitfalls Class 4.

Not verified here: **no visual/browser check** of the newly-rendered rival rail and
chase chip. They are `pointer-events-none` and the chip sits at `top-[30%]`, clear
of the header it once overlapped, but nobody has looked at them on a real screen —
including in RTL Hebrew, where the rail uses logical `start`/`end` insets.
