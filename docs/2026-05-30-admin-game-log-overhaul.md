# Admin Game Log Overhaul — Spec

**Date:** 2026-05-30
**Surface:** `/admin` → "Today's Games" (`components/admin/today-games/`) + API `app/api/admin/game-logs/route.ts` + Teacher Access admin view.

## Problem (verbatim goals)
1. Log doesn't show **all** games — non-registered players appear in the **live** view but not the history log.
2. Doesn't show **game mode**; for MP, doesn't show the MP round's mode.
3. Needs **pagination + virtual scroll**.
4. Expandable rows with **details** (devices, # players / bots, etc).
5. **More per-game stats**.
6. **Teacher access requests** viewable in **mobile** view.
7. **Traffic attribution** — how the player arrived (landing page X from ChatGPT / Google / Bing …).

## Root-cause findings (verified live, 2026-05-30)

| Claim | Evidence |
|---|---|
| Non-registered MP games **never persist** | `game_sessions` has **0 guest rows / 30d** (all 190 rows `user_id NOT NULL, completed=true`). Guest branch (`.is('user_id',null)`) is dead. Live view = in-memory room registry (`getDetailedGames()`), gone on disconnect. |
| The real complete log is **`analytics_events`** | 14d: `game_completed` = **1079 rows, 100% anonymous** (player_id NULL, session_id always set), **100% carry `gameMode`**, 100% `country_code`. vs `game_results` = 85 rows. |
| Mode IS available | `game_results.game_mode` populated & varied (word-hunt/classic/wheel-rush/blast/word-tower). Route discards it → stamps `ranked/casual`. `analytics_events.metadata.gameMode` on every play. |
| MP detail in analytics | 110 MP completes carry `isMultiplayer, playerCount, gameCode, role, engineMode`. |
| Attribution exists | `analytics_events.referrer` (508/1079), `utm_source` (165), `country_code` (1079). Registered: `profiles.utm_*`/`referrer`. UI source chip currently **gated to guests only**. |
| **Bots NOT persisted anywhere** | Bots filtered out before any DB write; no `bot_count` column; `playerCount` = humans only. Cannot be shown from existing data. |

### `analytics_events.game_completed` metadata keys (14d)
`mode, gameMode, user_agent, guest_name` (always) · `isGuest, mpSessionGame` (824) · `score, wordCount` (255) · `durationSec, isWinner` (145) · `playerCount, isMultiplayer, engineMode, gameCode, role` (110) · `attemptsUsed, lifeRemaining` (72).

## Design decision
Add **`analytics_events` (event_type=`game_completed`) as the comprehensive log source** — it is the only source that contains non-registered players + mode + attribution + device. Keep existing product-table sources for rich registered stats. Avoid double-counting by making the analytics feed a **distinct, clearly-labelled source** ("All plays · incl. anonymous") selectable via a `source` toggle, default ON. Identity: join `profiles` when `player_id`/metadata `userId` present, else show `guest_name`/short session id.

**Honesty constraints baked in:**
- Bots: show `players: N` (humans). Add forward-looking `botCount` to MP tracking metadata so future games can display it; label "bots: n/a (older games)" when absent. No fabricated counts.
- MP mode is full for analytics + registered; guest legacy `game_sessions` rows degrade to `multiplayer`.
- Pagination: the analytics source is a **single table** → correct server `range()` + exact `count`. The legacy 8-table merge keeps its over-fetch but `totalCount` will reflect fetched rows to kill phantom pages.

## Phases (TDD, per-phase commit)
- **P1 — Server mode + attribution (registered):** select `game_mode` from `game_results`; surface real `mode` + `is_ranked` badge; join + expose `utm/referrer/country` for registered. Pure mapper + tests.
- **P2 — Server analytics_events source (keystone):** pure `analyticsEventMapper.ts` (row→UnifiedGame: UA→device/browser, gameMode, MP fields, attribution, guest identity). Wire into route as `source=analytics` (default), correct range/count pagination. Tests heavy on mapper.
- **P3 — UI:** `@tanstack/react-virtual` rows; expandable detail panel (device/browser, players, mode, attribution, country, duration, winner, score, words); more stats; un-gate source chip for all; mode column always shown. Pure `parseUserAgent.ts` + tests.
- **P4 — Teacher access mobile:** responsive card layout in `TeacherAccessQueue.tsx` (table on `sm+`, cards on mobile).
- **P5 — Bots forward capture:** add `botCount` to `mpGameTracking` payload; display when present; doc the limitation.

## Out of scope / deferred
- Backfilling bot counts for historical games (data does not exist).
- Persisting in-memory live guest MP games to their own table (analytics_events already covers completes).
</content>
</invoke>
