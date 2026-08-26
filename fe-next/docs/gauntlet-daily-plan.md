# Gauntlet — Daily Challenges refresh (2026-08-26)

Goal: daily challenges look better + feel more exciting to return to daily.
Results screens get **simpler and more to the point**. Current behaviour preserved.

## The bar (real captures, on disk)

`<scratchpad>/bar/`

| File | What it is | Use for |
|---|---|---|
| `nyt-hub-desktop-full.png` | NYT Games hub, 1440 | hub piece |
| `nyt-hub-mobile-full.png` | NYT Games hub, 390 | hub piece, mobile |
| `nyt-connections-result.png` | **Real** Connections end-of-game card | results piece |
| `nyt-connections-result-full.png` | same, full page | results piece |
| `nyt-connections-board.png` | live board | board entry |

Bar traits worth stealing, hub: flat saturated colour field behind the grid; one
**owned colour per game**; tall tile cards; the date printed on the card; `Play` /
`Archive` on the card itself; a `NEW` ribbon; a plain `Today's Puzzles` heading.

Bar traits worth stealing, results: **one centred column**; a verdict headline
(`Next Time!`); exactly **one** primary CTA; the emoji grid as the hero artifact;
a single secondary `Share Your Results`; a `PLAY TODAY'S GAMES` strip at the
bottom. No leaderboard, no word list, no XP bar, no ads inside the card.

## Scope — 3 games + hub, NOT 5

`lib/dailyModes.ts:37-70` — `connections` is `adminOnly: true`; crossword is not
in the registry at all. User-visible daily set:

- hub `/daily` → `components/daily/DailyChallengeLanding.tsx` (546)
- word-hunt → `DailyWordHuntResults.tsx` (521) + `WordHuntResultsContent.tsx` (682)
- word-wheel → `WordWheelResults.tsx` (631)
- word-tower → results inline in `components/wordTower/WordTowerPlay.tsx`

Explicitly out of scope, state this in the final report:
`ConnectionsDailyResults.tsx` (318) and `CrosswordView.tsx` (550) — admin-gated /
unregistered, ~870 lines no real user reaches today.

## Reuse before invention (ponytail rung 2)

A lean results layout **already exists** — the guest branch:
`WordWheelResults.tsx:160,401,432,471,522,555,568` and
`WordHuntResultsContent.tsx:146,399` gate 6+ blocks behind `!isGuest`.
Promote/extend that existing path. Do **not** build a second parallel layout.
Both files already exceed the 500-line cap in CLAUDE.md — every diff must make
them **shorter**, never longer.

## THE GATE — a critic cannot see any of this

A blind screenshot critic never runs tests. Every round must pass all four:

1. **Tests.** `npx vitest run --config vitest.config.ts components/daily`
   (165 test files; 20 pin results/share/streak, 16 more in
   `components/daily/results/__tests__/`). Baseline recorded below.
   A deliberate removal updates its test **in the same diff** with a one-line
   rationale. Never a wholesale delete.
2. **Analytics kill-list.** Removing a CTA silently removes its event. Each of
   these is re-homed or *consciously* retired, decided per event:
   - `results_viewed` — `DailyWordHuntResults.tsx:103`, `WordWheelResults.tsx:220`
   - `wordhunt_results_loaded` — `WordHuntResultsContent.tsx:184`
   - `cross_promo_click` — `WordHuntResultsContent.tsx:212,622`, `WordWheelResults.tsx:237`
   - `wordhunt_leaderboard_tap` — `WordHuntResultsContent.tsx:370`
   - `wheel_signup_cta_viewed` / `_clicked` — `WordWheelSignupCta.tsx:156,177`
   - `wheel_practice_cta_clicked` — `WordWheelReplayCta.tsx:48`
3. **i18n.** New copy needs a key in **all 6** files in `translations/`
   (en, he, sv, ja, es, ru — CLAUDE.md's "5 languages" is stale). A missing key
   renders the raw key. `t(key, fallback?, params?)` interpolates — never
   hand-roll fill. Check `?locale=he`; `DirectionalIcon` for any back/exit arrow.
4. **Class-5 flash rules** (`.claude/rules/60-recurring-pitfalls.md`):
   fullscreen results surfaces hardcode `bg-neo-navy` — **never**
   `bg-neo-cream dark:bg-neo-navy` (cream FOUC on lazy mount). No entrance
   opacity tween on a large/fullscreen layer on mobile.

## Dev environment — fixed, do not regress

- `server/index.ts:17` uses bare `import 'dotenv/config'` → reads **`.env` only**.
  `.env` holds a `YOUR_...` placeholder for `SUPABASE_SERVICE_ROLE_KEY` while the
  real key lives in `.env.local`, which the custom server never reads. Symptom:
  `SERVICE KEY VALIDATION FAILED` + `errors.failedToLoadLeaderboard` on the hub.
  Workaround in use: export the key from `.env.local` at launch (process env beats
  dotenv). Both files are git-ignored.
- `lib/i18n/messagesManifest.json` was **stale** → hub rendered raw keys
  (`DAILY.DAILYMISSI...`). Fix: `npm run build:i18n`.
- Dev server: `PORT=3210 NEXT_BUILD_DIR=.next-gauntlet npm run dev`
- **Hydration check before trusting any screenshot:** capture twice ~6s apart and
  diff the countdown timer. Identical = never hydrated (known intermittent fault)
  and the screenshot shows initial state only. Verified hydrating 23:29.

## Verify by state, never by reported status

Agent `<task-notification>` exit codes report the wrapper, not the command, and a
subagent summary can claim a capture it never made — the first `capture-bar` run
reported a Connections result modal and a Wordle stats modal; both files on disk
were ad-and-footer pages. **Open the artifact yourself.**

## Baseline

- daily suite baseline: **184 files / 984 tests green**, full log in
  `docs/gauntlet-daily-baseline.txt`. This is the gate — re-run
  `npx vitest run --config vitest.config.ts components/daily` and compare.

---

# STATE as of 2026-08-26 (resume from here)

## Decisions already made — do not relitigate

1. **Move behind a tap, do not delete.** The audit proposed 20 outright block
   deletions + deleting 7 test files. Rejected: the brief says "without breaking
   the current behaviour too much". The long tail of results blocks moves,
   unchanged, into ONE `CollapsibleSection` labelled `daily.results.fullRecap`,
   collapsed by default. Same first paint, nothing lost.
2. **Keep the leaderboard** (hub + results), compacted, full board behind a tap.
   The bar has none because the bar is not competitive; this game is. Deliberate
   difference, not a gap.
3. **Keep the SEO block** on `app/[locale]/daily/page.tsx`. Below the fold,
   invisible on first paint, feeds an organic channel.
4. **Word Tower results: OUT OF SCOPE**, stated openly in the final report. It has
   no verdict screen — endless climb, results inline in a 1555-line
   `WordTowerPlay.tsx`, and `WordTowerShareCard` is already live (rendered
   server-side by `app/api/word-tower/share/route.ts`). Disproportionate + risky.
5. **Connections / Crossword results: OUT OF SCOPE** — adminOnly / unregistered.

## The headline finding

`components/daily/results/EmojiShareCard.tsx` — a complete, tested Wordle-style
emoji grid with spoiler toggle + copy button — was imported by **nothing but the
barrel `index.ts` and its own test**. The two live emoji-grid consumers use a
*different* component (`components/shared/GameEmojiShareCard.tsx`) on singleplayer
screens. So the daily results had no shareable artifact on screen at all, and the
bar builds its entire result card around exactly that object. Now wired at
`WordHuntResultsContent.tsx:405`. This is reuse, not new code.

## Environment faults — FIXED, do not re-debug

- Stale `lib/i18n/messagesManifest.json` → hub rendered raw keys. Fix: `npm run build:i18n`.
- `server/index.ts:17` bare `import 'dotenv/config'` reads **`.env` only**; `.env`
  holds a `YOUR_...` placeholder for `SUPABASE_SERVICE_ROLE_KEY` while the real key
  is in `.env.local`, which that server never reads → dead leaderboard. Workaround:
  export the key from `.env.local` at launch. Both files are git-ignored.
- Dev: `PORT=3210 NEXT_BUILD_DIR=.next-gauntlet npm run dev`

## Hazards active in this repo right now

- **A second Claude session is editing this repo.** It owns `components/quick-play/**`
  and has modified all six `translations/*.js` + `messagesManifest.json`.
  **NEVER `git add -A`.** Scope every commit to explicit daily paths.
- **Subagents resolve to Haiku** regardless of `model: 'sonnet'` —
  `CLAUDE_CODE_SUBAGENT_MODEL=haiku` outranks the tool param (confirmed in each
  agent's `.meta.json`). Verify/repair builder output in the main thread.
- Daily tests mock `t` as `(k) => k` (identity), so `t('key','Fallback')` renders the
  KEY in tests, not the fallback. Assert on keys, not on fallback text.

## REPAIR LIST — outstanding, verify each by state

- [ ] `WordWheelResults.tsx:350` uses `<PracticeChainCta>` with the import removed —
      **build break**. Restore the import or the usage.
- [ ] `WordWheelFullRecap.tsx:76` passes `{count}` params to a `t` typed
      `(key: string) => string`. Widen the prop type to
      `(key: string, fallback?: string, params?: Record<string, unknown>) => string`
      — never hand-roll fill, `t()` already interpolates.
- [ ] `WordHuntResultsContent.tsx` grew 682 → 711. Must end up SHORTER. Extract a
      `WordHuntFullRecap.tsx` the way word-wheel did.
- [ ] `WordHuntResultsContent.tsx:200` `wheelCtaNode` now unused → the
      `cross_promo_click` event at :212 is DEAD. Re-home it, do not drop it.
- [ ] Dead imports to clean: `DailyChallengeLanding.tsx` (QrWelcomeBanner,
      ConfettiBackground, FloatingDecorations, `cameFromQrScan`),
      `WordWheelResults.tsx` (several), `WordHuntResultsContent.tsx`.
- [ ] `WordHuntResultsContent.test.tsx:85` mock is missing `canAffordReveal` and
      `handleRevealTargetWordViaAd`; also a duplicate property in a mock literal.
- [ ] i18n: add every new key to ALL SIX `translations/*.js`. Use the
      `fe-next:ux-writer` skill for non-English — no literal translation.
      Known new key so far: `daily.results.fullRecap`.
- [ ] Re-run the 984 gate; confirm no regression outside my paths.

## VERIFIED GOOD so far

- Word-wheel moved blocks into `WordWheelFullRecap.tsx` rather than deleting them —
  `DailyInsightStack` :103, `WordWheelReplayCta` :107, `MpModeCrossPromo` :148 —
  so `wheel_practice_cta_clicked` and the cross-promo events survive.
- Recap wired at `WordWheelResults.tsx:295-313`.
- Hub: confetti / floating decorations / QR banner JSX removed; 546 → 516 lines.

## Blind A/B harness (built, smoke-tested)

`<scratchpad>/blind.sh <piece> <ours.png> <bar.png>` → copies both to neutral
`A.png` / `B.png` in a per-piece dir with a coin-flip assignment; the mapping is
written OUTSIDE that dir so a critic listing the dir cannot see it. Strips EXIF.
`<scratchpad>/capture-ours.sh [tag]` captures our hub at both viewports but ABORTS
first if raw i18n keys are on screen or the countdown does not tick (never hydrated).
Run it before every judging round, not once.

Progress artifact: https://claude.ai/code/artifact/0a117849-5ce9-4936-8ffd-bf3b6b4f1d27

---

# RESULT — hub round 1 (2026-08-27)

## Blind verdict: OURS WON

Harsh critic, labels stripped, coin-flip A/B, mapping held outside its directory.
It was told only that both were daily-puzzle hubs and never which was which.

- **WINNER: A** — resolved afterwards as **ours** (`.mapping-hub-mobile.txt` = `A=ours`).
- Reason given: "A isolates three color-coded game cards with massive CTAs above the
  fold and a live countdown timer; B sprawls into a content hub where today's puzzle
  competes with newsletter signup, news, and past puzzles."
- Scannability: **ours 2s, bar 7s.**
- Come back tomorrow: ours "wins decisively" — countdown (urgency) + leaderboard
  (social stakes) vs the bar's passive editorial hooks.

Caveat: judged above-the-fold by instruction, and our page is longer because the SEO
block is deliberately kept. One judge = one data point; confirmation lenses ran after.

## Gate at time of verdict

`npx vitest run --config vitest.config.ts components/daily` → **186 files / 994 tests,
RC=0** (baseline 184/984). Full log `/tmp/gauntlet-gate3.log`.
`npx tsc --noEmit` clean on every changed daily file. `npx eslint` clean.

## What shipped

| Change | Why it mattered |
|---|---|
| `EmojiShareCard` rendered as the results hero (`WordHuntResultsContent.tsx`, both the guest and authed branches) | It was imported by nothing but the barrel + its own test. The bar builds its whole result card around exactly this object. |
| Long tail → one `CollapsibleSection` "Full recap" | 33 blocks → 5 on first paint. Nothing deleted, so no behaviour and no analytics event lost. |
| `QuestCard` colour config 2-way → 3-way | `yellow` fell through to the cyan branch: Word Wheel and Word Tower were the SAME colour. Colour is what makes the hub scannable. |
| Art scrim carries the game hue; title goes white over art | The tint alone put orange-on-orange over busy artwork — below WCAG AA. |
| Hub header "Today's Puzzles" + today's date | The bar's freshness signal, printed on the page. |
| Confetti / FloatingDecorations / QrWelcomeBanner removed from hub | Pure chrome. No logic, no events. |
| 3 i18n keys × 6 locales, written natively | `Los retos de hoy`, `Головоломки дня`, `今日のパズル` — not literal translations. |

Sizes: hub 546→507, WordHuntResultsContent 682→640, WordWheelResults 631→609.

## Regressions caught in builder output (all fixed, all verified)

1. `ShareSection` had fallen INSIDE the collapsed recap — sharing hidden behind a tap,
   the exact opposite of the goal. Lifted out, now sits with the emoji grid.
2. `wheelCtaNode` deleted to satisfy "one primary CTA" → players who had NOT played the
   wheel got no next step at all, and its `cross_promo_click` went dead. The two CTAs are
   guarded by `!wordWheelPlayed` / `wordWheelPlayed` — mutually exclusive siblings are ONE
   control, not two. Restored; the builder's weaker inline duplicate (same testid → two
   nodes) was removed.
3. A WCAG contrast failure introduced by my own colour change (see table above).

## Tests updated, never weakened — each with a written rationale

- `DailyWordHuntResults.emojiCard.test.tsx` — pinned "does NOT render EmojiShareCard".
  Reversed deliberately; the card is the point.
- `WordWheelResults.guestSimplified.test.tsx` — recap now asserted as REACHABLE (one tap)
  rather than immediately visible. Original intent (guest gets none, registered gets it) intact.
- `WordHuntResultsContent.connectionsGate.test.tsx` — same shape; the gating being
  protected is unchanged.

## Committing in this repo

A SECOND Claude session owns `components/quick-play/**` and has in-progress copy in all
six `translations/*.js`. **Never `git add -A`.** A filtered patch of only the daily i18n
hunks (36 additions, 0 deletions) is at `/tmp/daily-i18n.patch` and applies cleanly with
`git apply --cached`. Regenerate it by extracting the hunk containing `todaysPuzzles`
from each locale's diff.

---

# BLIND VERDICTS — 4 of 4 to ours

Every judge saw only `A.png` / `B.png` with a coin-flip assignment, was told both were
the same kind of screen, was told never to guess the brand, and never saw the mapping.

| # | Piece | Lens | Winner | Key line |
|---|---|---|---|---|
| 1 | Hub | general | **ours** | "A isolates three color-coded game cards with massive CTAs above the fold and a live countdown timer; B sprawls into a content hub." Scannability **2s vs 7s**. |
| 2 | Hub | day-30 returning player, told to try to REFUTE "colourful = better" | **ours** | "A's tightness — dark + neon + one tap to play — signals confidence in the core action." Called the bar "over-engineered — five content zones signal the product doesn't trust the puzzles alone." |
| 3 | Hub | design director, craft/typography, legibility a hard requirement | **ours** | "A encodes meaning — orange, yellow, cyan each signal a game type. B uses colour as decoration; players must read labels to distinguish." |
| 4 | Results | simple-and-to-the-point | **ours** | "B displays the score in an unmissable bold circle, delivering the verdict in 300ms. A scatters focus across a puzzle grid, account signup, and three unrelated games." Verdict clarity **0.3s vs 1.5-2s**. |

## Gaps the judges named, and what was done

- (3) "Crack the word, 10 tries." measured ~4.5:1 over the card art — the AA floor, not a
  target. → tagline switched to `text-neo-white/90` when artwork sits behind it.
- (2) All three cards carried identical weight, so finished games competed with unplayed
  ones. → a completed card now recedes (`opacity-70 grayscale-[0.85] saturate-50`);
  `opacity-85` alone was a 15% drop, invisible in practice. Doubles as the cheapest daily
  freshness signal: the hub visibly changes as the day is worked through.
- (4) "No share button, no export path" on the wheel result. → `GameEmojiShareCard`
  (already shipped on singleplayer; its `classic` shape IS a wheel run) now renders under
  the verdict, hidden on an empty run. Reuse, not a second share component.

# QUESTS — related to the daily challenges, and finishable in them

Reported by the user mid-run. It was a real defect, in two parts.

1. **Word Wheel credited nothing.** `wordWheelRoutes.ts` bumped the WEEKLY
   `dailyChallengesCompleted` counter but never called `completeDailyQuestsForResult`,
   so finishing the daily Word Wheel moved no daily mission at all. The hub advertised
   "Daily Missions" above a game that could not advance one.
2. **The pool steered players off the hub.** 10 of 11 quests pointed at `/multiplayer`
   or `/brain`; only `play_wordhunt` pointed at `/daily`.

Fixed:
- `questResultForWordWheel()` — pure, tested helper in `shared/dailyQuestPool.ts`; the
  route calls it in one line.
- `word-wheel` added to `QUEST_PUBLIC_MODES`; new `play_wordwheel` discovery quest → `/daily`.
- `long_word_6` and `words_15` re-pointed to `/daily`: the daily seams DO report a word
  list (`wordHuntRoutes.ts:338`), so those are genuinely finishable there.
- `score_300`, `score_500`, `combo_*`, `mp_win`, `beat_human` deliberately LEFT on
  `/multiplayer` — no daily seam reports score or combo, and the wheel's score ceiling
  (~100) is far below the 300/500 targets. Steering them to /daily would recreate the
  "quest never completes" bug in the opposite direction.
- The existing `SEAM_CREDITS` guard test was updated (not weakened) to match what the
  daily seams actually emit, with the reasoning written in the test.
- `quests.daily.play_wordwheel` copy added natively in all 6 locales.

**Word Tower still credits no quest.** It is in `QUEST_BETA_MODES` and its endless-climb
scoring has no natural mapping to the existing condition types. Left alone deliberately
rather than faked.

# FINAL GATE

- `components/daily` + `shared/dailyQuestPool` → **188 files / 1034 tests, RC=0**
  (baseline 184 / 984). Log: `/tmp/gauntlet-gate7.log`.
- backend `dailyChallenge` routes + `dailyMissionsManager` → **5 files / 60 tests, RC=0**.
- `npx tsc --noEmit` clean on every changed file. `npx eslint` clean.

# NOT DONE — stated plainly

- **The Word Hunt results screen was never judged blind.** Automation could not finish
  that game (the tries counter never decremented across 3 browser sessions), so the
  emoji-grid hero that landed there is verified by tests, not by a blind visual A/B.
  The wheel result was judged instead.
- Word Tower results, Connections results, Crossword results: out of scope, reasons above.
- The captured wheel result was a guest, zero-word run, so it showed the lose state with
  no emoji card. That is the honest worst case for us and it still won.

---

# POST-REVIEW HARDENING (same session)

Five gaps found by a stronger reviewer after the verdicts. All closed.

1. **The i18n patch was stale and would have shipped broken copy.** It was built
   before `play_wordwheel` existed and filtered on `todaysPuzzles` only, so the new
   quest's copy would have been dropped in all six languages. Regenerated to keep any
   hunk containing EITHER marker: now **2 hunks per locale, 57 additions**, and the 6
   deletions were verified to be nothing but the `play_wordhunt` trailing comma.
   `git apply --check --cached` passes.

2. **`words_15 → /daily` was a guess; now it is measured.** The file's own comment warned
   that /daily "can't guarantee 15 words". Queried `daily_word_wheel_leaderboard`:
   **1,115 runs, median 16 words, 55.9% reach 15, 27.4% land a 6-letter word.**
   The warning was about Word Hunt's board, not the wheel. Both re-points stand, and the
   numbers are now written into the source next to the quest.

3. **The route wiring had no test — only the pure helper did.** Deleting the call would
   have passed every test, which is the silent-no-op class this repo keeps getting bitten
   by. Added `backend/routes/dailyChallenge/__tests__/wordWheelQuestCredit.test.ts`: drives
   the real HTTP route through supertest with the seam mocked.
   **Tripwire proven** — disabling the call makes it fail; restoring it makes it pass.

4. **The reused guard was read, not assumed.** `shouldCreditDailyChallengeQuest`
   (`lib/daily/questCredit.ts:26`) requires, for `word_wheel`, a `playerId`, a non-retry,
   and `wordCount > 0`. Those are the right semantics for daily credit too, so the call
   correctly sits inside it. Verified rather than trusted.

5. **Gate items that had been written but not run.**
   - Cream-FOUC grep over `components/daily`: one pre-existing hit,
     `DailyIntroCarousel.tsx:166`, a genuinely theme-responsive carousel (the pair is
     correct there). None of the new surfaces use it.
   - RTL: `/he/daily` loads `dir="rtl"`, heading + date localised, all three cards keep
     distinct colours, accent strips flip correctly, titles legible.
     Screenshot: `<scratchpad>/ours/daily-hub-he.png`.

## FINAL GATE (post-hardening)

- frontend `components/daily` + `shared/dailyQuestPool` → **188 files / 1034 tests, RC=0**
- backend `dailyChallenge` + `dailyMissionsManager` → **6 files / 63 tests, RC=0**
- `tsc --noEmit` clean on all changed files; `eslint` clean.
