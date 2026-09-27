# Shared-code audit — reuse for stability, maintainability, consistent feel

**Date:** 2026-06-12
**Goal:** find logic + components that can be shared/reused so the app is more stable, easier to maintain, and keeps the same feel. Then run the code simplifier.

## Guiding rule used

Extract ONLY where behavior is verified-identical (pure logic) or a genuine single-look
primitive (UI). "Near-duplicate" means the variants **differ** — force-merging them
changes the feel of every divergent site, which is the opposite of "stable + same feel."
Everything that only *rhymes* is documented here and deferred, not merged.

---

## DONE — shipped this pass

### `lib/rng/seededRandom.ts` (NEW) — seeded PRNG + FNV-1a hash

Consolidated **16 call sites**:

- `mulberry32` — **11 copies**, textually divergent (`>>>0` vs `|0` init, hex vs decimal
  constants, reordered loop) but **empirically output-identical** across edge seeds incl.
  `0xFFFFFFFF`. Now one exported `mulberry32(seed)`.
- FNV-1a string hash — **5 copies** (named `hashSeed` ×3, `hashString` ×2), all the exact
  canonical FNV-1a (`2166136261` / `16777619` / `>>>0`). Now one exported `fnv1aHash(s)`.

Call sites rewired: crossword/daily, connections/daily, wordTower/{dailyMutators,
wordTowerManager}, adventure/weeklyChallenge, word-craft/{tileBag, gems/shopRoll,
gems/gemPlacement}, components/wordTower/useWordTowerPerks, blast legacy
{blastChocolateEngine, blastLetterGenerator (keeps its exported `createSeededRandom`,
now delegating)}.

Why it matters: every one seeds a **deterministic daily puzzle / loot roll** — same day +
locale must give every player the same game or the leaderboard compares different games.
Output is locked by golden-value tests (`lib/rng/__tests__/seededRandom.test.ts`) captured
from pre-consolidation production output. tsc0/lint0; 3400+ affected-domain tests green.

**Deliberately NOT merged** (rhyme but produce different output — would break determinism):
- `lib/daily/chestPrizePool.ts` `hashSeed` — DJB2, different algorithm.
- `lib/word-craft/modifiers.ts` `hashSeed` — SplitMix32, takes a `number` not a string.
- `lib/blast/blastTreasureRoll.ts` `hashSeed` — signed FNV (`h|0`), different output domain.

---

## DEFERRED — logic (extract only after per-pair behavioral diff)

| Candidate | Sites | Why deferred |
|---|---|---|
| `useSocketEvent(socket, evt, handler, deps)` — wrap the `socket.on/off` + cleanup pattern | ~17 hooks (useHints, useDuelSocket, useLobbyAutoStart, useAchievementSocketBridge, …) | High value (listener-cleanup is a real bug class — see `useMultiplayerSocket.sharedListenerClobber.test.ts`) BUT a large uncommitted MP/socket feature is in the working tree. Touching shared socket wiring now risks collision. Do AFTER that feature lands. |
| `computeRankings(entries, tiebreak?)` — sort-desc-by-score → rank map | `selectClosestRivals`, `selectMyBlastScore`/`selectMyBlastRank`, education leaderboard | Call sites differ in tiebreak (`selectClosestRivals` uses `inputIdx`; blast does not). Only share if a single tiebreak contract is proven equivalent at each site; else share just the core. |
| Rival normalizers | `rosterToRivals` / `blastEntriesToRivals` / `playersToRivals` | Already extracted in `lib/leaderboard/rivalNormalizers.ts`, but each has DIFFERENT `isMe` logic — correct as-is. Work here is *application* (route all leaderboard sources through them before `selectClosestRivals`), not extraction. |
| Sound-wrapper composition | `useBlastSounds` (~150 lines) re-implements dispatch that `useSoundPlayFunctions` already centralizes | Extend `useSoundPlayFunctions` with a `tileTypeSoundMap` param so blast/TV hooks become thin config. Defer: the sound/drill bookend feature is uncommitted in-tree. |

---

## DEFERRED — UI (gate on pixel-identity; near-dup ≠ identical)

These were flagged by recon as **near**-duplicates. They differ per site, so merging forces
one canonical look and changes the feel — defer until a specific site is being changed
anyway, then extract the truly-identical primitive.

| Candidate primitive | Representative sites |
|---|---|
| `NeoBadge` (variant/size) | daily ScoreBadge/RankBadge, multiplayer EloRankBadge/WinStreakBadge, ui TierBadge/GameBadge |
| `PlayerCard` (compact/expanded) | results ResultsPlayerCard/ConsolidatedPlayerCard, GameLeaderboard row, ClosestRivalsPanel, ResultsRivalsPanel |
| `NeoModalFrame` (Dialog + neo header + close) | ~7 modals: CreateChallenge, WeeklyChest, EmailCapture, Onboarding, ProfileCustomization, Prestige, SeasonClaim |
| `CelebrationOverlay` + `lib/party/confettiConfig` | InlineConfetti, PartyConfettiBurst, NewYearFireworks, BossDefeatFireworks, PreResultFanfare (centralize color arrays + intensity presets first — that's pure and low-risk) |
| `GameOverlay` (AnimatePresence backdrop) | PauseOverlay, ComboMilestoneOverlay, RoundEventOverlay, WordHuntGameOverlay, BlastChocolateOverlay |
| `ScoreChip` / `BonusBadge` | results WordChip, WordPointsGroup, BonusBadgesRow, BlastComboStreakBadge |
| `CircularGauge` | CircularTimer, ScoreGaugeRing |

**Lowest-risk UI first step (when picked up):** centralize the confetti color arrays +
intensity presets into `lib/party/confettiConfig.ts` — pure data, no markup change, no feel
change, used by 5 effect components.

---

## Note on running the simplifier

`/simplify` and `/code-review` scope to the **diff**. The working tree already carries a
large uncommitted feature (brain-training / drills / results-rivals / sound / socket). Run
the simplifier on the **RNG refactor commit's diff only**, not the whole tree, or it will
chew on unrelated in-flight work.
