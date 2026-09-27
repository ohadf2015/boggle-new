# Admin Game Log — Grouping, Attribution, Platform, Errors + Live Monitor enrichment

**Date:** 2026-05-30
**Status:** spec → implementation
**Source of truth for game log:** `analytics_events` (single-table, captures guests + mode + attribution + device). See memory `admin-game-log-overhaul-2026-05-30`.

## Problem

Current admin "Today's Games" log shows **one row per player per game** off `event_type='game_completed'` only. Founder wants to investigate games as games, not as scattered per-player rows. Concretely:

1. **Group players of the same game into one row**, expandable to show every player.
2. Show **where the host came from** (acquisition source: google / chatgpt / direct / invite …).
3. Keep **guest display names** (not just `guest_…` session ids) and show them.
4. Show each player's **country**.
5. Show **native-app vs web** per player.
6. Show **device** per player.
7. **Audit + fix game-type classification** gaps.
8. **Save more data to the DB** if needed to satisfy the above.
9. **Audit the LIVE games display** — surface more live data for investigation.
10. Show if a game **ended with an error / had errors** during the session.

## Key facts from live DB (30-day window, verified 2026-05-30)

- `game_started`: 2086 rows, **867** carry `role='host'`. `game_completed`: 1766 rows, **1** host row.
  → **Host acquisition source lives on `game_started`, not `game_completed`.** Current route (completed-only) cannot show it. **MUST query `game_started` too.**
- 2086 starts vs 1766 completions ⇒ ~320 started-but-never-completed. `game_abandoned` fires only **2×/30d**.
  → **"Incomplete / errored" must be derived from started-without-a-terminal-event**, not from `game_abandoned`.
- Solo plays sometimes carry a `gameCode` (e.g. `6QT6J7` ×71 = many distinct solo plays sharing a puzzle/seed code).
  → **Group key must gate on `isMultiplayer`, never on gameCode presence.**
- `platform`, `guest_name`, `reason`/`error_reason`: **0 rows** have them today. All new fields are **forward-only**; UI must render "—/unknown" for historical rows and never imply backfill.

## Design

### Grouping (req 1)
A **game group** = the set of analytics rows for one play session.
- **Group key:**
  - Multiplayer (`isMultiplayer === true` OR `engineMode === 'multiplayer'`): `mp:{gameCode}:{YYYY-MM-DD}` (date-scoped — 6-char codes recycle).
  - Otherwise (solo/practice/etc): `solo:{event id of the terminal row}` — **each solo play is its own group**.
- **Per-player merge inside a group:** key by `player_id ?? session_id`. Collapse that player's `game_started` + `game_completed`/`game_abandoned` into one **GamePlayer**, preferring the terminal (completed > abandoned > started) row for score/word/duration, but pulling host `role` + `utm_source` from whichever row carries them (host info is on `game_started`).
- A group row shows: time, game-type label, MP/ranked badges, player count, host name + **host acquisition source chip**, status (completed / partial / errored), aggregate (top score, total words). Expanding shows the **GamePlayer** list.

### Host acquisition (req 2)
Host = player whose row has `role==='host'` (fallback: earliest `game_started` in the group). Host source = `classifyAcquisition(host.utm_source/medium/campaign/referrer)`. Existing `classifyAcquisition` util already maps search/social/ai/portal/email/push/ads/referral/direct/unknown — reuse, extend the `ai`/`portal` host maps if gaps found (chatgpt.com seen in data). "No host row" → "unknown".

### Guest names (req 3) — write-path + display
- Write path: capture the guest's chosen display name into `metadata.guest_name` on game events. Source is the same guest username the live monitor already shows (server-side guest username / `wordcraft-duel-name` / profile-less display name). Inject in the MP + solo track wrappers.
- Display: `displayName = profile.username ?? metadata.guest_name ?? 'Guest ' + short(session_id)`. Never show a bare `guest_169…` if a name exists.

### Country (req 4)
Already on `analytics_events.country_code` per row. Show flag + ISO per GamePlayer. No write change.

### Native vs web (req 5) — write-path
- Inject `platform: getPlatform()` (`'ios' | 'android' | 'web'`) into **every** analytics event metadata at `utils/growthTracking.ts` `persistToSupabase` (single choke point). Do **NOT** infer native from UA — Capacitor's webview UA reads as mobile web.
- Display: per GamePlayer, `platform==='web' ? 🌐 Web : 📱 Native (ios/android)`; historical `undefined` → "—".

### Device (req 6)
Parse `metadata.user_agent` via existing `parseUserAgent` → device_type/os/browser. Already wired in mapper; surface per GamePlayer in the expanded view.

### Classification audit/fix (req 7)
DB modes with **no bucket** today (all fall to 'other'): `adventure-boss, arena, blast_multiplayer, brainGym, practice, quickPlay, solo-bots, tutorial, wordCraft, wordCraftCards, wordCraftGems` (+ `daily-*` handled only by a route `ilike`, no bucket).
- Game **type** and **multiplayer-ness** are orthogonal. Stop using `'multiplayer'` as a type bucket; derive MP from `isMultiplayer`/`engineMode`. Type buckets key off `gameMode`/`mode` only (so `blast` and `blast_multiplayer` map to the same `blast` type).
- Add buckets + labels for all real modes. Add a **dev guard / surfaced list** of raw modes hitting `'other'` so future gaps are visible (log + optional admin badge), instead of silently rotting.

### Errors / abandonment (req 10)
Per group, compute **status**:
- `completed` — has a `game_completed` terminal row.
- `errored` — has a row with `metadata.error_reason` / `metadata.reason` set (new field; see write-path).
- `abandoned` — has `game_started` but no terminal `game_completed` within the window (started-without-completion).
- Show as a colored status pill on the group row; per-player error reason in the expanded view.
- Write path: add optional `errorReason` passthrough to `trackGameEnd`/abandon wrappers; emit it on socket disconnect / catastrophic client error so future games carry it.

### Live monitor enrichment (req 9) — independent workstream
Source: in-memory `gameStateManager.getDetailedGames()` via `GET /api/admin/live-games` (NOT analytics_events). Component `components/admin/LiveMonitor.tsx`.
- **Cheap wins (already in `DetailedGame`/transform, just hidden or one-line add):** surface `gameMode`, `hostUsername`, `createdAt` (absolute + relative), `isPrivate`, explicit player count, presence breakdown.
- **Status/error live:** presence `disconnected` red-dot already exists; add a per-room "stalled/validating too long" hint and surface disconnected-count on the card.
- **Stretch (more invasive — capture at socket connect):** per-player country / device / platform live. Scoped as stretch; not blocking.

## Pagination
analytics_events ≈ 15k rows, view is date-scoped. Fetch date-windowed rows, **group in TS in the route, sort groups, slice the page**. `totalCount` = group count (update StatsBar/counts). Postgres RPC with JSON-path GROUP BY is the 100x scale path — noted, not built.

## Phasing (per-phase commit, ask before each commit)
1. **Classification fix** (pure, isolated): expand `modeBuckets`/`gameDisplay`, orthogonal MP, 'other' guard. + tests.
2. **Write-path enrichment** (forward-only): `platform`, `guest_name`, `errorReason` into metadata. + tests.
3. **Grouping route + UI** (centerpiece): broaden query to `game_started`+`game_completed`+`game_abandoned`; group module; host attribution; status derivation; per-player display (name/country/platform/device); group-level pagination; expandable UI. + tests.
4. **Error display** in the grouped log (status pill + per-player reason). + tests.
5. **Live monitor enrichment** (independent): surface hidden fields + disconnect visibility. + tests.

TDD mandatory (RED→GREEN→REFACTOR). Pure logic in `lib/admin/gameLog/` leaves; thin React shells. Max 500 lines/file. i18n any new UI strings ×5 langs.
