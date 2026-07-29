# Profile & Rewards Polish — Design Spec

**Date:** 2026-06-04
**Status:** Draft → implementation
**Scope:** Three cohesive workstreams around player identity & reward feedback.

## Goal (user request, verbatim intent)

1. Whenever a player **earns coins**, a nice effect plays: coins flying + sound.
2. Improve the **profile sections** design (`/impeccable` + `/gsap-core`).
3. Show **badges** and **season ranking** in the **public profile**, and surface ranking in the **side menu** somehow.

## Ground truth (verified before writing)

| Area | Reality | Implication |
|---|---|---|
| Coin FX engine | `GlobalCoinEarnFx` (mounted `app/essential-providers.tsx:218`) listens for `lexiclash:coin-earned`, plays Howler sound + `SharedFxApp.spawnCoinStream` (PixiJS gold coins, bézier arc). Works on web. | Do **not** rebuild web FX. |
| Coin event coverage | All 4 *client* award fns (`awardDailyCompletion/GameCompletion/ComboMilestone/WatchedAd`) fire the event. **Server-side grants do NOT**: Blast chest open, daily missions, Word-of-the-Day, duel wins (all via RPC `sync_coins`). | **Real gap #1**: server grants earn coins with no FX. |
| Native FX | `SharedFxMount` deliberately skips native Capacitor (commit `1567e1196`): fullscreen fixed WebGL canvas punches a transparent compositor hole in the Android WebView. Sound still plays; **no visual coins on native**. | Fallback must be **DOM/framer, never WebGL**. |
| `playerProfile.get` (tRPC) | Returns `achievementCounts` ✓, `currentLevel`, `totalScore`, wins, `percentile`, `totalPlayersAbove`. **No `rank_tier`/`ranked_mmr`.** | Add 2 columns (trivial). |
| Current-season rank | **No RPC** returns a user's current-season leaderboard position. `getPlayerRank` queries bare `leaderboard` (defaults season 1); `getSeasonRecap` = past-season archive; `SeasonTrophyCase`/`useSeasonBadges(playerId)` = past-season trophies (already userId-parameterized, already on public profile). | **Real gap #3**: need a current-season-rank RPC + migration. |
| Public profile | `app/[locale]/u/[username]/PageClient.tsx` (~102 lines): hero (avatar/name/level/games/win%) + `SeasonTrophyCase`. **No** rank chip, **no** achievements. | Add rank + achievements. |
| Side menu | `components/GlobalBottomNav.tsx` — fixed 4–5 tab bottom bar, no account drawer. Profile is a contextual tab. | "Sidemenu rank" = compact tier chip on the profile tab, not a new drawer. |

## Non-goals (YAGNI)

- No new WebGL/particle engine. No account-drawer rebuild. No leaderboard redesign.
- No backfill of historical season ranks. Current-season rank only.
- No change to coin economy / amounts.

## Cross-cutting constraints

- **i18n ×5** (en, he, sv, ja, es) for every new string; **Hebrew RTL** verified (`?locale=he`). Native phrasing, no calques.
- **TDD** RED→GREEN→REFACTOR per behavior. Commit per phase by pathspec (daemon co-edits translations/globals — never `git add -A`).
- **Animations finite** (no `repeat: Infinity`); **gate on `prefers-reduced-motion`**; reduced-motion still gives non-motion feedback (sound/static).
- **Brand:** neo-brutalist — hard pixel shadows, solid borders, electric mode colors (lime/pink/cyan/purple). **No gradients, no glassmorphism.**
- Files ≤500 lines.

---

## Phase 1 — Badges + Season Ranking (lowest risk, mostly wiring)

### 1a. Backend data

- **Migration** `supabase/migrations/<ts>_current_season_rank_rpc.sql`:
  - `get_user_current_season_rank(p_player_id uuid)` → `{ rank_position int, total_score int, games_played int, season_id int, total_players int }`.
  - Resolves current season via existing `get_current_season_id()` / `getCurrentSeasonDynamic()`; ranks within the live `leaderboard` table filtered to that season; `rank_position` via window `RANK() OVER (ORDER BY total_score DESC)`. Returns NULL row if player has no current-season entry (un-ranked → UI shows "Unranked").
  - `SECURITY DEFINER`, read-only. No new table → no realtime publication concern.
- **`playerProfile.ts`**: add `rank_tier`, `ranked_mmr` to `PUBLIC_PROFILE_COLUMNS` + return shape (`rankTier`, `rankedMmr`). Null-safe defaults.
- **`leaderboard.ts` router**: new `getCurrentSeasonRank(input: { playerId })` proc calling the RPC. 60s staleTime client-side. Public (no auth required — public profiles).

### 1b. Components (new, small, pure-ish)

- `components/seasons/RankTierChip.tsx` — tier badge (Bronze/Silver/Gold/Platinum/Diamond). Tier→color via **static** `TIER_CLASSES` map (Tailwind only emits literal class strings — no dynamic `bg-${tier}`). Sizes `xs|sm|md`. Accessible label `t('rank.tier.<tier>')`. Renders nothing if no tier.
- `components/seasons/SeasonRankCard.tsx` — "This season: **#42** of 1,204 · Gold" using `getCurrentSeasonRank` + `RankTierChip`. "Unranked" state when null. Neo-brutalist bordered card.
- `components/profile/ProfileAchievementsPublic.tsx` (or reuse `ProfileAchievements` in read-only mode) — compact earned-badge row driven by `achievementCounts`. Reuses `AchievementBadge` + `achievementIcons`.

### 1c. Wiring

- **Public profile** (`u/[username]/PageClient.tsx`): insert `SeasonRankCard` (above `SeasonTrophyCase`) + achievements row. Uses already-fetched `profile.id`.
- **Own profile** (`profile/PageClient.tsx` + `ProfileHeader.tsx`): add `RankTierChip` near level badge; `SeasonRankCard` in overview.
- **Side menu** (`GlobalBottomNav.tsx`): small tier-colored indicator + `aria-label` on the profile tab, fed by current user's `rankTier` (cheap, from auth profile). No layout shift; hidden when no tier.

### Phase 1 tests
- RPC: SQL-level (apply to a branch or assert via integration) — given seeded season rows, returns correct `rank_position`.
- `RankTierChip`: tier→class map, null tier → null render, i18n label.
- `SeasonRankCard`: ranked vs unranked states.
- Public profile: renders rank card + achievements when data present.

---

## Phase 2 — Profile Sections Redesign (`/impeccable` + `/gsap-core`)

Design pass over `ProfileHeader.tsx` + the section cards (`ProfileStatsGrid`, `ProfileXpSection`, `ProfileCoinsSection`, `ProfileRankedProgress`, `ProfileAchievements`, `SeasonRankCard`).

- **`/impeccable`**: tighten hierarchy, spacing, neo-brutalist consistency (solid `border-neo-thick`, hard shadows, mode-color accents). No gradients/glass. Improve scannability on phone AND TV.
- **`/gsap-core`**: finite staggered entrance for section cards (fade/slide-up, `gsap.matchMedia()` with a `(prefers-reduced-motion: no-preference)` branch; reduced-motion branch = no transform, instant). Subtle hover/press on interactive elements only. No infinite loops.
- Keep each section component focused; extract if a file nears 500 lines.

### Phase 2 tests
- Reduced-motion branch renders content immediately (no opacity:0 trap) — assert no permanently-hidden nodes.
- Brand guard: no `gradient`/`backdrop-blur` classes introduced (lint-style test on changed files).
- Visual verify via playwriter (`?locale=he` for RTL).

---

## Phase 3 — Coin FX Coverage + Native Fallback

### 3a. Fire the event for server-side grants

- New shared client helper `utils/coinEarnedFx.ts`: `emitCoinEarned(amount, reason, sourceEl?)` → dispatches `lexiclash:coin-earned` (single source of truth for the event shape; refactor `CoinContext` + `awardWatchedAd` to use it).
- Call `emitCoinEarned` at client receipt of server grants:
  - Blast chest open response (client handler) → emit with chest coin amount.
  - Daily missions claim, Word-of-the-Day claim, duel-win results: emit when the client gets the awarded amount back from the server.
- Only emit on a **positive** awarded delta; never on balance refresh/sync (avoid spurious bursts).

### 3b. Native / WebGL-skipped DOM fallback

- In `GlobalCoinEarnFx`: when `SharedFxApp` is inactive (native, or maxParticles≤0) **and** motion is allowed, render a lightweight **DOM** coin burst (reuse `FloatingCoinAnimation` pattern — framer, 6–8 coins, **finite ~1.2s**, auto-unmount). Sound plays regardless.
- **Reduced-motion**: skip all visual (web + native), keep sound only.
- Web non-reduced keeps existing PixiJS path unchanged.

### Phase 3 tests
- `emitCoinEarned` dispatches correct event detail; ignores ≤0.
- Server-grant handlers emit once on positive award.
- `GlobalCoinEarnFx`: native+motion → DOM fallback mounts then unmounts (finite); reduced-motion → no visual node, sound fn still called; web+motion → PixiJS path (no DOM fallback).

---

## Sequencing

Phase 1 → Phase 2 → Phase 3 (per advisor: wiring-first/lowest-risk → design → FX). Commit per phase by pathspec after tests+lint+tsc+build green (ask before each commit).

## Risks / open items

- Current-season-rank RPC perf at scale — window over `leaderboard` filtered by season; index on `(season_id, total_score desc)` exists / add if missing. Verify in migration.
- Native DOM fallback must not reintroduce the compositor hole — DOM/framer only, no fixed fullscreen WebGL; verify on device if available (else mark device-unverified).
- "Sidemenu rank" is the tentative ask — kept minimal (tier dot on profile tab); easy to drop if it clutters.
