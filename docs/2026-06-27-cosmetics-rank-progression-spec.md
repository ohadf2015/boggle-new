# Cosmetics & Rank Progression — Audit + Redesign Spec

**Date:** 2026-06-27
**Goal (user):** Cosmetics section is confusing — unclear *when* you earn items, items don't unlock even after reaching the required level (bug), copy feels machine-translated, players don't know the feature exists / don't know their rank or how far to the next, skins only seem to affect classic mode, visuals are weak (wood), and there's no way to see the rank ladder / future tiers in the profile.

---

## Root-cause findings (verified, file:line)

1. **Unlocks never fire (the #1 bug).** `lib/cosmetics.ts:223` gates rank cosmetics via `rankAtLeast(state.rankTier, cond.tier)`. `rankTier` is fed from `profile?.rank_tier` (`profile/PageClient.tsx:393,473`) but **`rank_tier` is not in `PROFILE_SELECTS.full`** (`lib/supabase.ts:218`) → always `undefined` → falls back to `'Bronze'`. Compounding: `RANK_ORDER` is **capitalized** (`'Silver'`) while the real tier ids are **lowercase** (`'silver'`) → `indexOf` = -1 → comparison broken either way.
2. **Wrong progression axis.** Cosmetics conceptually gate on *ranked ELO* tier — but casual players never play ranked, so they stay Bronze forever despite high XP level. User's mental model = "I reached the level, give me the skin."
3. **Phantom tier.** `tile-fire` requires `'Master'` — no tier system outputs `Master` (ranked tops at Diamond; leaderboard at Grandmaster).
4. **Streak cosmetics same bug.** `board-ocean`@7d / `victory-lightning`@30d read `profile?.streak_days`, also not in the select → stuck at 0. (Streak flame in header equally broken.)
5. **Render gap, not earn gap ("only classic").** Tile skins paint via `GridComponent` (`data-tile-skin`, `cosmetics.css`). Daily `WordWheelGame` renders letters via `WheelLetter` and only applies `boardTheme`, never `tileSkin` → daily shows no skin.
6. **No visibility.** Current rank + progress-to-next is not surfaced near cosmetics; no ladder/roadmap of future tiers.
7. **Hebrew copy.** `cosmetics.equip` = "הצייד" (awkward), `cosmetics.progress.rank` = "כעת {{current}} · יעד {{tier}}" (machine-ish bullet), `rarity.epic` = "אפי" (transliteration).

## Existing assets to REUSE (don't rebuild)

- `lib/ranked/leaderboardTiers.ts`: `GLOBAL_LEADERBOARD_TIERS` (ids `stone→grandmaster`, score thresholds, **images** `/images/tiers/tier-*.webp`, colors, glow), `getGlobalLeaderboardTier`, `getLeaderboardTierProgress`, `getNextTierThreshold`, `LEADERBOARD_TIER_IDS`, `compareTierIds`.
- `components/ui/TierBadge.tsx` (`TierBadge`, `TierPill`) — image-based tier badge.
- `lib/seasons/scoreTier.ts` `scoreTier(total_score)` — already used by `ProfileHeader` for the displayed tier (identical thresholds).

---

## Design

**Single progression axis = leaderboard score tier (from `total_score`).** Every game in every mode adds to `total_score`, so cosmetics now progress through *all* gameplay and the tier names (Bronze/Silver/Gold/Platinum/Diamond) match the catalog. No DB migration — `total_score` is already fetched.

**Tier vocabulary** = `LEADERBOARD_TIER_IDS` (`stone,bronze,silver,gold,platinum,diamond,grandmaster`), lowercase, compared by array index.

### Phase 1 — Fix the gate (TDD, pure logic)
- `cosmetics.ts`: replace `RANK_ORDER` with `LEADERBOARD_TIER_IDS` (import); `rankAtLeast` compares lowercase by index. Remap requirements: neon→`silver`, crystal→`diamond`, fire→`grandmaster` (was phantom Master), galaxy(board)→`platinum`, fireworks→`gold`, frames bronze/silver/gold/diamond→lowercase. `formatUnlockHint`/`formatUnlockProgress` keep tier id; UI resolves a localized tier name.
- `profile/PageClient.tsx`: pass `rankTier={getGlobalLeaderboardTier(profile?.total_score ?? 0).id}` (drop the broken `rank_tier` read). Streak: feed the real source (Phase 1b once located; until then keep `0` fallback — rank cosmetics are the user's actual complaint).
- **Tests first** (`lib/__tests__/cosmetics.test.ts`): a player at score X earning tier T sees tier-T cosmetics unlocked; below-threshold stays locked; grandmaster unlocks legendary; case-insensitivity regression. This is the test the codebase never had.

### Phase 2 — Rank + progress visibility
- A `RankProgressBanner` at the top of the cosmetics screen (and reuse on profile overview): current `TierBadge` (the tier-*.webp image), tier name, progress bar to next tier (`getLeaderboardTierProgress`), and "N points to {nextTier}" (`getNextTierThreshold`). Grandmaster → "max tier" state.

### Phase 3 — Tier roadmap in profile ("how do I get to Diamond")
- A `TierRoadmap` component: all 7 tiers in order with their `tier-*.webp` image, score threshold, locked/current/achieved state, and the cosmetics each tier unlocks (derived from `COSMETICS` filtered by `unlockCondition.type==='rank'`). Lets users see future reachable tiers and their rewards. Mounted in profile (collection or a new ladder tab).

### Phase 4 — Hebrew (and cross-lang) copy via `fe-next:ux-writer` skill
- Fix `cosmetics.equip`, `cosmetics.progress.rank`, `rarity.epic`, unlock/progress sentences across he (+ audit en/sv/ja/es). Add any new keys from Phases 2/3 (`cosmetics.rank.current`, `.toNext`, `.maxTier`, roadmap labels) in all 5 languages. Native, not literal.

### Phase 5 — Visuals
- `app/cosmetics.css`: give `tile-skin-wooden` real grain structure + warmer wood color (layered gradients/box-shadow per neo-brutalist dark theme), polish `neon`/`crystal`/`fire`. Keep hard-shadow / solid-border aesthetic.

### Phase 6 (stretch) — Daily wheel applies tile skin
- Apply `data-tile-skin` (from `useEquippedCosmetic('tileSkin')`) to `WheelLetter` so skins show in daily, closing the "only classic" render gap. Verify CSS selectors target wheel letters.

## Out of scope
- New DB columns / migrations for rank (not needed).
- Refactoring `scoreTier` vs `leaderboardTiers` duplication (identical thresholds; leave).
- Reworking ranked-ELO tiers (`lib/ranked/tiers.ts`) — untouched.

## Verification
- `npm run lint && npm run test && npm run build` after each phase. RTL check with `?locale=he`. Per-phase commits (ask before commit).
