# Rank-over-Streak Audit — 2026-08-01

Goal: reduce streak emphasis app-wide, raise "your position vs other players", and make
that position **motivating** (a closable gap), not just a stat.

## 1. Live data (Supabase, queried 2026-08-01)

### Leaderboard denominators — last 14 days, entries per puzzle-day per language

| mode | lang | days | avg players/day | max | min |
|---|---|---|---|---|---|
| word_hunt | he | 14 | 6 | 8 | 2 |
| word_wheel | he | 14 | 6 | 8 | 2 |
| word_wheel | en | 14 | 3 | 5 | 1 |
| word_hunt | en | 11 | 2 | 6 | 1 |
| word_hunt | sv | 13 | 2 | 4 | 1 |
| word_wheel | sv | 13 | 2 | 3 | 2 |

connections / daily_puzzle / buzz daily boards: below the >5-total cutoff (effectively empty).

Population: **294 total users, 62 signed in within 14 days.** 144 word-hunt attempts / 38
distinct players over 14 days. All-time boards: word hunt 55 rows, word wheel 30 rows.

**Decision this forces:** percentile framing ("you beat 96% of players", "top 4%") is
**noise at N=2–8** and would read as fake. Position must be expressed **relative to named
people on a small, fully-visible board**, not to a distribution.

Corollary: boards are split by language *and* mode, which fragments N further. Do not add
more slicing.

### Streak distribution — `player_engagement` (192 rows)

| bucket | count | share |
|---|---|---|
| current_streak >= 2 | 43 | 22% |
| current_streak >= 5 | 23 | 12% |
| current_streak >= 10 | 15 | 8% |

max current 106, avg 3.50.

**~78% of players see a streak of 0 or 1.** Every hero-sized streak surface is, for four
out of five players, a hero slot rendering a nothing-number. That is the data case for
demotion, independent of taste.

## 2. Design consequence

Kill the percentile idea. Ship the **closable gap**, which works at any N >= 2:

> **#3 of 6 · 40 points behind Maya — one 5-letter word passes her.**

Small boards are intimate, not shameful: with 2–8 entries, render the *whole* board rather
than a rank chip, and anchor the eye on the row directly above the player.

Guests: use `hooks/useIsGuest.ts` (never bare `isAuthenticated` — Class 1 flash). Guests get
the same gap line plus "sign in to claim #3".

## 3. Scope boundary (assumption — say so in the writeup)

"Reduce streak emphasis" = **presentation layer only**.

Do NOT touch: streak persistence, `shared/weeklyQuestTemplates.ts` reward math,
`shared/utils/giftingRules.ts`, chest/season logic, migrations, or analytics event names.
Breaking those breaks the economy and the dashboards, and was not asked for.

Outward-facing surfaces needing explicit user confirmation before edit:
`emails/reengagement-streak.tsx` and push-notification copy. Audit + propose, do not send.

## 4. Constraints

- 6 locale files: `translations/{en,he,sv,ja,es,ru}.js`. Client `t()` has no en-fallback and
  a Sentry translation ratchet gate exists — every new key lands in all six.
- Hebrew RTL: rank chips and any up/down delta arrow need `DirectionalIcon`.
- Rank resolves async while local score is instant → **Class 1 dual-source**. Render a
  skeleton until rank resolves; never render an optimistic `#1` the server later flips.
- Word Tower is still admin-gated (2026-07-22) — audit, do not invest polish.
- `npm install` broken here (ENOTDIR redlock symlink) → `npm pack`. `next build --webpack`.
- TDD per `.claude/rules/22-tdd-strict.md`.

## 5. Streak surface inventory

### 5.0 CRITICAL: "streak" is two unrelated mechanics

The grep conflates them. Only one is in scope.

**A. Daily / win streak — RETENTION OBLIGATION — IN SCOPE (demote).**
Consecutive-days counter, at-risk pulses, freezes, wagers, milestone modals. This is what
"reduce emphasis on the streak" means. 78% of players see 0 or 1.

**B. Combo streak — IN-ROUND SCORING MULTIPLIER — OUT OF SCOPE (do not touch).**
`components/game/ComboDisplay.tsx`, `components/blast/legacy/BlastComboStreakBadge.tsx`,
`components/word-craft/WordCraftComboBadge.tsx`, `components/connections/ConnectionsMomentumChip.tsx`,
`components/game/ComboMilestoneAnnouncement.tsx`, `components/wordTower/WordTowerHud.tsx`
(steady-hand), `components/drills/ComboMaster.tsx`, `components/drills/LightningRound.tsx`,
`components/earthquake/FireRoundIndicator.tsx`.
This is the juice — the reason a long word feels good, and itself a *competitive* mechanic.
Demoting it would remove the thing that makes players push to outscore someone.

**C. Education / teacher / classroom streak — SEPARATE PRODUCT — OUT OF SCOPE.**
`components/student/StreakCalendar.tsx`, `components/education/**`,
`components/teacher/analytics/StudentProgressTable.tsx`. Classroom consistency tracking is a
teacher-facing feature with a different purpose; leave it.

### 5.1 Bucket A — in-scope daily/win streak surfaces, by prominence

| # | path | renders | now |
|---|---|---|---|
| 1 | components/engagement/StreakBar.tsx:83 | global chrome bar: flame + streak + level/XP/gold, red pulse at risk | hero, every screen |
| 2 | components/daily/landing/StreakCounter.tsx:33 | tiered flame stack, daily-landing centerpiece | hero |
| 3 | components/daily/StreakMilestoneCelebration.tsx:154 | fullscreen modal + confetti at 7/14/30/50/100/365 | hero |
| 4 | components/adventure/StreakMilestoneCelebration.tsx:13 | same, adventure mode | hero |
| 5 | components/daily/DailyChallengeBanner.tsx:398 | animated flame + count + countdown | hero |
| 6 | components/lobby/LobbyDailyEmber.tsx:78 | MP lobby chip: secured / at_risk / invite | secondary |
| 7 | components/daily/WordWheelResults.tsx:321 | results streak chip, spring bounce | secondary |
| 8 | components/streaks/StreakWager.tsx:20 | coin-wager-on-streak modal | modal |
| 9 | components/profile/StreakFlame.tsx:28 | profile flame badge | secondary |
| 10 | components/header/DrawerProfileHero.tsx:89 | drawer profile flame + count | secondary |
| 11 | components/header/HeaderDesktopControls.tsx:33 | desktop header streak link | secondary |
| 12 | components/daily/StreakFreezeIndicator.tsx + results/StreakFreezeIndicator.tsx | ice-crystal freeze slots | secondary |
| 13 | components/daily/StreakSavedCelebration.tsx:72 | freeze-saved modal | modal |
| 14 | components/daily/StreakFreezeEarnedToast.tsx:20 | freeze-earned toast | toast |
| 15 | components/landing/home/HomeDailyHero.tsx:144 | landing daily hero streak text | secondary |
| 16 | components/daily/DailyChallengeLanding.tsx | quest hub streak counter | secondary |
| 17 | components/daily/DailyChallengeResults.tsx:280 | results streak status text | secondary |
| 18 | components/daily/DailyWordHuntResults.tsx | results streak display | badge |
| 19 | components/singleplayer/results/PracticeResults.tsx:353 | practice results streak | badge |
| 20 | components/multiplayer/WinStreakBadge.tsx:21 | MP win-streak badge (>=2 wins) | secondary |
| 21 | components/onboarding/ScoreRevealV2.tsx:178 | FTUE "Streak Started!" | copy |
| 22 | components/auth/SignupToast.tsx:71 | "your N-game streak won't be saved" | toast |
| 23 | components/daily/WordWheelSignupCta.tsx:81 | signup CTA leads with streak protection | secondary |
| 24 | components/results/CoinRewardDisplay.tsx:180, RewardsSummary.tsx:110, MobileCompactRewards.tsx:49, ResultsPlayerCard.tsx:262 | "+N streak bonus" coin line | badge |
| 25 | components/growth/PlayerRecapCard.tsx:76, CrazyGamesRetentionCard.tsx:91, ReengagementBanner.tsx | recap/retention streak copy | copy |
| 26 | components/modals/UnifiedShareModal.tsx:313 | share card flame + days | badge |
| 27 | components/engagement/ComebackBonusModal.tsx:180 | comeback bonus = freezes | modal |
| 28 | components/daily/WeeklyChestModal.tsx | chest tied to streak | modal |
| 29 | components/engagement/WordPactCard.tsx:152 | word-pact streak count | badge |
| 30 | components/game/in-game/components/GameLeaderboard.tsx:207 | in-game leaderboard flame | badge |

Reward math behind these — `lib/streakTierRewards.ts`, `lib/dailyRewards.ts`,
`hooks/useEngagementStatus.ts` (`streakAtRisk`) — **stays intact** per section 3.

### 5.1b Prior-art inventory (superseded as a *diagnosis* by 5.1d — read that first)

A first pass framed this as "competitive UI is buried, relocate it." **Mount verification in
5.1d disproves that** — rank ships in more places than streak does. The components below are
still worth knowing as reusable prior art, but the fix is NOT relocation.

- `components/leaderboard/NearRankIndicator.tsx` (299 lines) — renders the closable-gap
  design: rank, points-to-next-rank, avatar + name of the player above ("Beat: Maya (1,240)"),
  nearby players with +/- deltas. Mounted only on `app/[locale]/leaderboard/PageClient.tsx`.
  **Leave it there.** Good reference for the gap-line copy, not a component to move.
- `hooks/useRankUpDetection.ts` — 0 callers, and **not the hook this goal needs**: it detects
  *ELO tier* changes from a pre/post MMR pair (ranked multiplayer only). It cannot express
  "you passed a player on today's daily board." Do not wire it for this.
- `components/multiplayer/NearRankTeaser.tsx` — behind a `lib/experiments.ts` flag.
- `hooks/usePlayerPercentile.ts` — single consumer, `components/multiplayer/GlobalRankBadge.tsx`.

### 5.1c Keep, do not demote: `WinStreakBadge`

`components/multiplayer/WinStreakBadge.tsx` is a **consecutive-wins-against-other-players**
badge. That is the goal's own currency, not retention guilt. Keep it; consider promoting it.

### 5.1d MOUNT VERIFICATION — several "hero" surfaces are dead code

The inventory's prominence column describes the component, not whether it ships. Verified
mount counts (non-test, non-doc importers):

**Streak — DEAD (0 mounts, do not spend effort here):**
`StreakBar` (136 lines, 10 passing tests, docstring claims "on every screen"),
`StreakCounter`, `StreakWager`, `StreakFreezeEarnedToast`, `WinStreakBadge`.

**Streak — LIVE:**
| component | mounts |
|---|---|
| `useEngagementStatus` (streak data source) | 7 |
| `DailyChallengeBanner` | 4 |
| `StreakMilestoneCelebration` (daily + adventure) | 3 |
| `StreakFlame` | 2 |
| `StreakFreezeIndicator` | 2 |
| `LobbyDailyEmber` | 1 |
| `StreakSavedCelebration` | 1 |

**Rank — DEAD:** `RankHighlight`, `hooks/useRankUpDetection`.

**Rank — LIVE:**
| component | mounts |
|---|---|
| `RankBadge` | 7 |
| `GlobalRankBadge` | 4 |
| `RivalCompareCard`, `ClosestRivalsPanel` | 3 each |
| `NearRankTeaser`, `LandingYourRank`, `WordTowerRivalRail` | 2 each |
| `NearRankIndicator`, `ResultsRivalsPanel`, `GhostRivalWidget`, `MobileRankIndicator`, `HomeRankCard`, `LeaderboardTeaser` | 1 each |
| `usePlayerPercentile` | 1 |

**Revised diagnosis.** Rank is *more* mounted than streak. The problem is therefore NOT
absence of competitive UI — it is:
1. **Hierarchy inside each screen** — where streak sits relative to rank on the same view.
2. **Copy framing** — streak copy is obligation ("keep the fire burning", "at risk", "won't
   be saved"); rank copy is passive statement of fact, never a challenge.
3. **The rank-up moment is unwired** (`useRankUpDetection` dead) while the streak-milestone
   moment gets a fullscreen confetti modal with 3 mounts.

That last asymmetry is the sharpest lever: the app throws a party for showing up N days in a
row, and stays silent when you actually pass another human being.

### 5.1e Notable: the one *competitive* streak in the app is dead

`components/multiplayer/WinStreakBadge.tsx` counts consecutive **wins against other
players** — the goal's own currency — and has 0 mounts. Flagged for the user; wiring it is a
product call, not part of this change.

## 6. Change plan

Decisions taken without asking (autonomy directive), each with its reason:

| # | change | file(s) | why |
|---|---|---|---|
| C1 | Suppress the percentile pill when `totalPlayers < 20`; keep the `#3 out of 8` pill | `components/daily/results/RankBadge.tsx` | at N=8, rank 3 renders "Top 38%"; at N=3, rank 2 renders "Top 67%" — demotivating and statistically meaningless (section 1) |
| C2 | Add the **gap line** — "N points behind &lt;name&gt;" / "you're #1, &lt;name&gt; is N behind" — to daily results | `components/daily/WordHuntResultsContent.tsx` + new small component | the closable gap is the motivation lever; a rank number alone is a verdict, not a challenge. Works at N>=2 |
| C3 | Demote streak from lead element to a small chip; lead with board position | `components/daily/DailyChallengeBanner.tsx` (4 mounts) | highest-mount live streak hero |
| C4 | Raise streak-milestone fullscreen modal to 30/100/365 only (7/14 become inline) and add a fullscreen celebration for **finishing #1 on the board** | `components/daily/StreakMilestoneCelebration.tsx` + results | fixes the core asymmetry: today the app throws a party for showing up and stays silent when you pass a human |
| C5 | Reframe obligation copy → challenge copy, 6 locales | `translations/{en,he,sv,ja,es,ru}.js` | "keep the fire burning" / "at risk" is loss-aversion; the goal asks for competitive motivation |

**Rank-celebration trigger — decision.** Fire on **#1 on today's board**, not on any rank
improvement. Rationale: at N=2–8, "passed one player" happens constantly and a confetti burst
for #3→#2 becomes cheap within a week — reproducing exactly the fatigue being removed from
streak. #1 is unambiguous, needs no historical snapshot to compute, and is genuinely "beat
the other players". Boards with `totalPlayers < 2` do not fire (beating nobody is not a win).

**Explicitly NOT changed:** dead components (`StreakBar`, `StreakCounter`, `StreakWager`,
`StreakFreezeEarnedToast`, `WinStreakBadge`, `RankHighlight`) — 0 mounts each; editing them
is effort with no player-visible effect and deleting them is unrequested scope with a
lazy-import risk. `useEngagementStatus` shape (7 live consumers). Reward math, analytics
event names, migrations.

## 7. Shipped in this pass

| # | status | what changed |
|---|---|---|
| C1 | done | `components/daily/results/RankBadge.tsx` — new `MIN_PLAYERS_FOR_PERCENTILE = 20`; the "Top X%" pill is suppressed below it. Stops "Top 38%" being shown to a player who came 3rd of 8. The `#3 out of 8` pill is untouched. +3 tests |
| C2 | done | `components/daily/chaseTarget.ts` (new, pure) + `components/daily/ChaseBanner.tsx` (new), mounted in **both** `DailyLeaderboard.tsx` (daily puzzle results) **and** `TabbedDailyLeaderboard.tsx` (word hunt + word wheel results). Renders the closable gap: "42 behind Maya / One good word passes them / #2 of 6", flipping to "You lead Tom by 12 / Hold the top spot" at rank 1. +24 tests |
| C3 | done | `components/daily/DailyChallengeBanner.tsx` — streak chip gated behind new `MIN_STREAK_TO_DISPLAY = 3`, infinite pulse animation removed, flame and text dimmed to 70%. +6 tests |
| C4 | partial | `utils/dailyChallenge/streaks.ts` — new `CELEBRATED_STREAK_MILESTONES = [30, 100, 365]` + `shouldCelebrateStreakMilestone()`, wired into `DailyWordHuntResults`. The fullscreen confetti modal no longer fires at 7 or 14 days. `getStreakMilestone` (analytics) deliberately unchanged. +5 tests. **Not done:** the mirror-image fullscreen celebration for finishing #1 — see section 8 |
| C5 | done | 5 new `daily.chase*` keys × 6 locales (en/he/sv/ja/es/ru), hand-written per language rather than translated literally. `npm run check:translations` → "No new missing translations vs baseline" |

Verification: `npx tsc --noEmit` clean · `npx eslint` clean on all touched files ·
`npx vitest run components/daily utils/dailyChallenge` → **1155 passed / 201 files, 0 failures** ·
`npm run check:translations` → "No new missing translations vs baseline".
(`DailyChallenge.tutorialAutoShow` flaked once under a parallel run and passes in isolation —
pre-existing cross-test pollution, unrelated to this work.)

### 7.1 Three correctness traps caught before shipping

1. **The mount was almost dead.** `ChaseBanner` was first mounted only in `DailyLeaderboard`
   — but Word Hunt and Word Wheel results render `TabbedDailyLeaderboard`, which does **not**
   delegate to it. Only the daily-puzzle path would have shown the banner. Fixed by mounting
   in both, and `TabbedDailyLeaderboard.chaseBanner.test.tsx` now asserts the rendered
   `chase-banner` testid so the mount cannot silently rot — the check that `StreakBar`'s ten
   passing tests never performed.
2. **The gap could point the wrong way.** `daily_word_hunt_leaderboard` ranks by
   `solved DESC, efficiency_score DESC, attempts_used, completed_at`, so an unsolved player
   with a high efficiency score sits *below* a solved player with a low one — diffing the
   visible metric would tell someone they were "40 behind" a player they were beating on the
   only number on screen (Class 3: two sides computing the same number independently).
   `computeChaseTarget` now returns `pointsGap: null` whenever the metric cannot explain the
   ranking, and the banner falls back to "Maya is next" — a target without a wrong number.
   (Word Wheel ranks `score DESC, word_count DESC`, so it is metric-monotonic and unaffected.)
3. **The denominator could lie.** Both leaderboards paginate (`maxVisible`), so
   `participants.length` is a slice, not the board. `totalPlayers` is now passed explicitly
   from each host's fetched `totalCount`, and ignored when smaller than the rows in hand.

`ChaseBanner` renders nothing while `loading` is true, so the async rank never flashes an
optimistic placement the server then corrects (Class 1). It identifies the player by
`player_id` **or** `guest_fingerprint`, so guests get the gap line too. Hebrew drops the bare
`#` from `chaseRank` — a `#` immediately before digits at the start of an RTL run renders as
`2#`.

## 8. Deliberately left open

- **The #1 celebration (other half of C4).** Streak's fullscreen party is now rarer, but
  finishing first on the board still gets no equivalent moment — the asymmetry is reduced,
  not yet inverted. `StreakMilestoneCelebration` takes `emoji`/`title`/`subtitle` as props,
  so it is already a generic shell that can be fed rank content. Trigger should be **#1 with
  `totalPlayers >= 2`**, not any rank improvement (at N=2–8, "passed someone" fires constantly
  and would go stale exactly the way the streak modal did).
- **Email + push.** `emails/reengagement-streak.tsx` and the `streak_warning` push category
  are outward-facing; audited, not edited, pending explicit sign-off.
- **`WinStreakBadge` is dead code** — and it is the one *competitive* streak in the app
  (consecutive wins against other players). Wiring it is a product call.
- **Adventure-mode streak milestone** (`components/adventure/StreakMilestoneCelebration.tsx`)
  still fires at every milestone; only the daily path was gated.
- Other modes' results screens (connections, blast, quick play, practice) were audited but
  not changed — they route through neither daily leaderboard, so each needs its own mount.
- **Multiplayer results got no changes**, and MP is where "beat other players" is most
  literal. That is a judgement call worth stating: `components/results/ResultsRivalsPanel.tsx`
  already ships there and already renders signed head-to-head deltas ("Ann edged you by 5"),
  which is the same lever this change adds to the daily modes. MP arguably already serves the
  goal; if it does not feel that way in play, that is the next place to look.

### 5.2 Email — audit only, needs explicit user sign-off before edit

`emails/reengagement-streak.tsx` (whole template built on the mechanic),
`emails/reengagement-v2.tsx`, `emails/reengagement-mascot-v3.tsx`, `emails/reengagement.tsx`.
Plus the `streak_warning` push category in `user_notification_preferences`.

