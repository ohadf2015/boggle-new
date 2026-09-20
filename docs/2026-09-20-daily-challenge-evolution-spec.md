# Daily Challenge Evolution — Spec (2026-09-20)

Gauntlet run. Bar: **NYT Games daily loop** (Wordle / Connections / Strands / Spelling Bee, The New York Times).
Evidence pack: `/tmp/daily-gauntlet/bar/NOTES.md` (+ 43 screenshots, 25 curated).
Measured funnel: `/tmp/daily-gauntlet/data/FUNNEL.md`. Code map: `/tmp/daily-gauntlet/code/MAP.md`.

## 1. The diagnosis is the opposite of the brief

The ask was "daily challenges feel flat, make them more interesting." The data says the opposite
problem: the daily is **over-built and under-sticky**.

| Measured | Number |
|---|---|
| Players who ever played exactly one calendar day | **262/319 = 82.1%** (guests 90.7%) |
| Streak runs that die after exactly 1 day | **452/628 = 72%** all-time; 199/278 in 90d |
| Streak freezes used in 90d | 14, by 6 players — against 199 breaks |
| Daily's share of DAU | 68.9% (June) → **23.5%** (September), while DAU grew 12.2 → 16.1 |
| Weekly plays | 88 (06-29) → 26 (09-14) = **-70%** |
| Start→finish completion | 81.2% → **57.8%** |
| Share rate post-completion | **1/680 = 0.15%** |
| Weekly chests reached in 90d | 9 unique players |
| D7 return, authed, same board | daily word-hunt **34.1%** vs multiplayer word-hunt **57.1%** |
| Median run | 72.6s, 7 words, ~90% solve rate |

Meanwhile the Word Hunt results screen already composes **~15 sub-components** (rank, facts, past-performance
compare, rival compare, emoji share, 10-channel share, coin-gated retry/reveal, rewarded ad, streak freeze,
leaderboard, word suggestion, catch-up, cross-promo, inline signup...). The bar's entire captured copy set
contains one exclamation-free superlative: the word **"Perfect."** Its game-chrome motion is near zero.

**So the job is subtraction to one memorable moment plus a real reason to come back tomorrow — not addition.**

## 2. Hard constraint: population

319 all-time daily players; **12 unique players last week**; DAU 12–16; 9 chest-reachers in 90 days.
Every crowd mechanic makes the product feel deader at this size and is **out of scope**:

- leaderboards as a growth lever, leagues/ladders, cohort promotion
- "X% of players solved it today", global score distribution
- friends/social layers

What works at n=12, both present in the bar pack:
- **Mastery rating** (Chess.com daily-puzzle shape): works with a population of one, answers "am I getting
  better", survives a missed day without zeroing.
- **The share grid**: works at n=1 and *creates* the population the other mechanics need.

## 2b. Three of the numbers were broken instruments (verified in code)

`/tmp/daily-gauntlet/data/TELEMETRY-VERDICT.md`:

- **Share 0.15% = MEASUREMENT ARTIFACT.** No `posthog.capture()` anywhere in the Word Hunt share chain
  (`components/daily/results/useShareHandlers.ts` — all 11 handlers, `ShareSection.tsx`, `SharePanel.tsx`,
  `EmojiShareCard.tsx`, `utils/shareWithFallback.ts`). Sibling games (Quick Play, Blast, Connections Daily) do
  track shares on the same infra. So we do not know the real share rate. Instrument, then judge the redesign on
  merit — not on a number that was never collected.
- **"1042 shown / 0 accepted" = PARTIALLY BROKEN.** `components/growth/DailyChallengeInvite.tsx` fires
  `growth:daily_conversion_shown|_dismissed`, but its CTA click fires `cta_clicked` with `cta_id:'mp_to_daily'`
  in a different namespace (`utils/posthogEngagement.ts:260-272`). Clicks were happening; the query could not
  see them. Component is genuinely visible (not the closed-`<details>` precedent).
- **Weekly chest = REAL zero.** No instrumentation at all; 5 events named with insertion points in the verdict file.

Consequence: **P6 (instrument the daily) lands before or alongside the first judged piece**, or every round after
it argues about numbers that do not exist.

## 3. Pieces (ranked by measured headroom)

Scope: **word-hunt + hub + results + streak**. `word-tower` is OFF LIMITS (a separate gauntlet is live on it
in another worktree). Connections/Wheel only where the hub touches them.

| # | Piece | Gap it closes | Target |
|---|---|---|---|
| P0 | Cross-device played status | Word Hunt is server-truth; Wheel/Tower/Connections are localStorage → phone-then-laptop shows "new", silently breaking the streak promise | one server truth for played state, all modes |
| P1 | Day-1 → Day-2 return | 82% one-and-done; 72% of streaks die at day 1 | the end state makes a concrete, specific promise about tomorrow |
| P2 | End state, subtracted | ~15 components, no single payoff; 0.15% share | one payoff you'd remember + one next action; count of CTAs down, not up |
| P3 | One streak number + visible forgiveness | two streak systems (localStorage vs `daily_puzzle_streaks`) with different grace logic and mode scope can show two numbers on one screen; freezes invisible at the moment of the break | one number everywhere; forgiveness offered *when it breaks* |
| P4 | Day-to-day variety | hub layout/card set/copy are static; bar has a Mon→Sun difficulty ramp and Connections alternates format by UTC day | the hub is visibly a different day each day (Higgsfield art) |
| P5 | Mastery signal | streaks only reward showing up; nothing rewards getting better | a rating-shaped number that moves per play and survives a miss |
| P6 | Instrument the daily | share chain emits nothing; invite CTA emits into the wrong namespace; chest emits nothing | every step of hub → play → results → share → return is queryable, `$host` present |

Higgsfield belongs to **P4** (day-of-week / weekly / seasonal art), not to P2 — generated cinematics on the end
state fight both the bar (near-zero chrome motion) and pitfall Class 5 (fullscreen entrance tweens flash on
mobile web).

## 4. Gate (price of entry, not a judged dimension)

While iterating: scoped tests only (`npx --no-install vitest run -t <name>` / path-filtered).
Before a piece is judged, once:

```
cd fe-next && npx --no-install eslint <changed paths> ; echo "RC_LINT=$?"
cd fe-next && npx --no-install tsc --noEmit ; echo "RC_TSC=$?"
cd fe-next && npx --no-install vitest run <scoped paths> ; echo "RC_TEST=$?"
cd fe-next && npm run build ; echo "RC_BUILD=$?"
find fe-next/.next -maxdepth 1 -name BUILD_ID -mmin -5   # build verified by STATE, not reported rc
```

Never trust a wrapper's reported exit code (rules Class 4). `rm -rf .next/dev/types` first if a route moved.
TDD per repo rules: test first, then implement.

## 5. Critic brief (every round)

- Judge the **single-player path**. Population-dependent surfaces are out of scope — we have 12 weekly players,
  NYT has a global crowd; a leaderboard side-by-side is unwinnable and uninformative.
- **Removing something can be the winning move.** A screen with more on it is not a better screen. Every verdict
  names what it would delete.
- Blind A/B, labels stripped. Binary verdict: which one would you open tomorrow? Then the single biggest gap.
- Harsh. Praise is not useful. Judged against store screenshots / video frames where the live product was gated;
  anything the pack does not show is judged on its own merits and flagged "unseen in bar".
- Builder on Opus, critic on Sonnet (or the reverse) — never the same model that built the piece.

## 6. Stall escape

Same gap named 3 rounds running on a piece → stop grinding. Escalate the model, sharpen the bar, or park the
piece and report the gap. Stalling is a result.

---

# Outcomes (as of 2026-09-20 ~04:00)

Blind A/B against the NYT Games bar, builder on Opus, critic on Sonnet, critic never seeing the build log.

| Piece | Result | Rounds | Where it stands |
|---|---|---|---|
| P0 played-state truth | **ours wins** | 3 | server-backed per-mode status; hub Word Wheel row was still localStorage-only — fixed by lead (see below) |
| P3 one streak + forgiveness | **ours wins** | 3 | one number everywhere, freeze announces itself; NYT has no forgiveness at all, which is its loudest complaint |
| P4 hub: a visibly different day | **ours wins** | 3 | `pickPrimaryMode` now drives one hero + three compact rows; net −154 lines |
| P1+P2 end state | **parked, narrow losses** | 7 | see the open gap below |
| P5 mastery signal | shipped, **not reachable** | 1 | rating math correct + tested; widget collapsed, guest-gated, unstyled, unlocalized — fix pass running |
| P6 instrumentation | partial | — | share chain + chest events landed; verify against PostHog after merge |

## What the end state actually achieved before parking

Deleted outright: `CatchUpSuggestion`, both rewarded-ad buttons, `RivalCompareCard`, `MpModeCrossPromo`, the
`MoreOptionsAccordion`, and the 664-line `DailyChallengeInlineSignup` import. Added: auto-firing confetti (was
tap-only), a specific "play tomorrow to reach an N-day streak" promise in BOTH win and loss branches, the countdown
demoted out of the hero slot, and a one-line dismissible signup that opens a minimal modal.

## The one gap it could not close — a design call, not a bug

`gapKey: loss-unreachable-new-player-floor`, named two rounds running, which fired the stall escape.
A new-player life-floor mechanic means the loss branch of the results screen is effectively **unreachable through
normal play** — the critic could not reach a loss in English or Hebrew. So the loss-state work is unverifiable
live, and the piece cannot be judged clean. Two ways out, both yours to pick:
1. Keep the floor (new players never lose) and accept that the loss branch only shows on deliberate failure.
2. Let a genuine loss happen after day one, so the "play tomorrow" hook on a loss is a real, reachable screen.

## Lead-side fixes made between rounds (none of these belonged to a piece)

- **The i18n path trap, three rounds' worth.** Strings existed at `dailyStreak.*` / `auth.dailyChallenge.*` while
  components called them flat, so screens rendered raw keys — and grep, the served-bundle check, and the
  components' own tests (which mock `t` as identity) all passed. Fixed both call sites, then wrote
  `components/daily/__tests__/dailyI18nKeys.test.ts`: it resolves every literal `t()` key in
  `components/daily|growth|streaks` against all six dictionaries. First run caught three live defects including
  one firing on every guest view. Mutation-checked.
- **`{plural}` interpolation** put an English "s" into six languages (`заморозкs`, `הקפאהs`). All six strings
  rewritten count-neutral; two orphaned translation blocks deleted.
- **Hub Word Wheel played-state** read `hasPlayedWordWheelToday()` (localStorage only) while the server knew the
  truth — so a player who finished on their phone saw a green "Play" on their laptop. Now reads
  `dailyPlayedStatus.today.wordWheel` first, with the effect re-running when the server answer lands.
- **A vacuous test deleted**: "Word Hunt hero shifts to Word Wheel after Word Hunt is won" never mocked a won
  state and asserted the same all-unplayed DOM as its siblings. Replaced with one that mocks the win and asserts
  the hero moves; it fails if `pickPrimaryMode` is bypassed.
- Three type errors fixed that three builders had shipped while calling a red `tsc` "an environment issue".

## Still unrun

`npm run build` — the webpack-only gate. `tsc --noEmit` is clean and scoped tests pass, but a concurrent session
has held a build running, and starting a second contends on `.next/lock`. Run it before merging, and verify by
`find .next -maxdepth 1 -name BUILD_ID -mmin -5` rather than by the reported exit code.
