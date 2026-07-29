# XP-by-Mode Breakdown — Spec (2026-06-07)

## Goal
Show a player **how their XP is split across game modes**, on their own profile AND on any other player's public profile.

## Constraint that shapes the design
XP is a **single global number** (`profiles.total_xp`). Nothing records XP per mode.
`game_results` rows carry `game_mode` + `score` + `player_id` but **no `xp_awarded`**.
Precise historical per-mode XP is **unreconstructable** (daily caps, level diminishing,
prestige multiplier, education/achievement XP all happened outside the per-game path and
aren't logged per row).

## Decision: read-time estimate, share-of-total (no migration)
Estimate each mode's share of `total_xp` from the player's `game_results` history using the
**same base weights** the XP system uses, then normalize so the parts **sum to `total_xp`
by construction** (the level badge stays consistent).

```
weight(mode) = games(mode) * GAME_COMPLETION + SCORE_MULTIPLIER * score(mode)
xp(mode)     = round(total_xp * weight(mode) / Σ weight)
share(mode)  = weight(mode) / Σ weight        (rendered as %)
```
Constants pulled from `backend/modules/xpManager.ts` (`GAME_COMPLETION=50`,
`SCORE_MULTIPLIER=0.15`) — not hardcoded by recall.

Why estimate over a `game_results.xp_awarded` column + backfill: the column would be
precise-going-forward but **estimated-for-history anyway** (same unreconstructable gap),
producing a precise/estimated discontinuity that's worse than one consistent estimate.
A column may be added later **only** if precise per-mode XP is needed beyond display
(per-mode mastery, mode leaderboards).

Presented as **share-of-total** ("where your XP came from"), which is honest about being
an attribution estimate rather than fake-precise accounting.

### Completeness: the "Other" bucket (verified against prod)
`total_xp` is awarded from many paths that **do not write `game_results`**: single-player
adventure/blast/drills/daily, education/practice, and all bonus XP (missions, quests,
engagement, login calendar). Verified by code trace + live query — `game_results` holds
only the competitive flow (`classic, word-hunt, blast, wheel-rush, word-tower`).

So we must NOT normalize the logged modes up to `total_xp` (that smears solo+bonus XP onto
the competitive modes). Instead estimate each logged mode's **absolute** XP
(`games*50 + 0.15*score`) and surface the remainder as an explicit **"Other"** slice:
`other = total_xp − Σ attributed`. If the absolute estimate exceeds `total_xp` (caps/
diminishing reduced the real award below our pre-cap estimate), scale modes down to fit and
drop Other. Σ(all slices incl. Other) === total_xp exactly. Other rendered neutral, last.

## Data flow
- Aggregation lives in the **public endpoint** `GET /api/player-profile/:id`
  (`backend/routes/playerProfile.ts`) — the one place already structured to read a
  player's data server-side. It returns a new `xpByMode` field.
- **Public profile** (`app/[locale]/player/[id]/PageClient.tsx`) already consumes that
  endpoint → renders the breakdown.
- **Own profile** (`app/[locale]/profile/...`) loads `total_xp` from `useAuth()` (no game
  history). It fetches `xpByMode` from the **same** endpoint for its own id via a small
  hook → renders the same component. One aggregation path feeds "me" and "others".

## Realistic mode set
`game_results.game_mode` is only ever written as `'classic' | 'blast' | 'word-hunt'`.
Label surface is tiny. Map via a `getModeLabel(mode, t)` helper reusing existing
`leaderboard.gameModes.*` keys, humanized fallback for anything unseen.

## Pieces
1. **Pure fn** `lib/xp/xpByMode.ts` → `splitXpByMode(rows, totalXp): ModeXpSlice[]`
   - `rows: { mode, games, score }[]`, returns slices `{ mode, xp, share }` sorted desc.
   - Σ xp === totalXp exactly (rounding remainder → largest slice).
   - Σ weight ≤ 0 or totalXp ≤ 0 → `[]`. Drops zero-weight modes.
2. **Mode labels** `lib/xp/modeLabels.ts` → `getModeLabel(mode, t)`.
3. **Backend** aggregate `game_results` (game_mode, count, sum score) for a player →
   feed `splitXpByMode` → add `xpByMode` to response + `PublicProfile` type.
4. **Component** `components/profile/XpByModeBreakdown.tsx` — labelled bars + %/xp, RTL-aware,
   i18n header, hidden when empty.
5. **Own-profile hook** `useXpByMode(playerId)` → GET the endpoint, return `xpByMode`.
6. **Wire** into both PageClients; i18n ×5 (`profile.xpByMode.*`).

## Out of scope
- `game_results.xp_awarded` column / backfill (deferred; estimate is sufficient for display).
- Education-mode XP (separate system, not in `game_results`).
- Per-mode mastery levels / mode leaderboards.

## Tests
- `splitXpByMode`: reconciles to total; share ordering; empty/zero handling; rounding drift
  lands sum exactly on total; single-mode = 100%.
- `getModeLabel`: known modes → localized, unknown → humanized fallback.
- Component: renders slices, hides when empty, percentages shown.
- Backend route: returns `xpByMode` aggregated from game_results (mocked supabase).
