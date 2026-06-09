# Admin Live Monitor — Clarity Pass (2026-06-08)

## Asks
1. **Player count must not count bots.** The headline "players" stat in the admin
   live monitor currently sums every user in every room — bots included.
2. **Room status should be clearer** — say what is actually going on (playing /
   scoring / waiting for players / empty/bots-only / finished), not the raw
   `gameState` string.
3. **Show players on other pages** — anyone currently on the site but *not* in a
   game (landing page, lobby browse, etc.), and which page they are on.

## Current state (findings)
- `GET /api/admin/live-games` is the only endpoint `LiveMonitor.tsx` fetches.
  `playersInGames` = `Σ game.players.length` → **includes bots** (`gameRoutes.ts:197`).
- `getDetailedGames()` already tags each player with `isBot` — the data is there.
- `getActiveRooms()` (public lobby) already excludes bots+disconnected — reuse pattern.
- `GET /api/admin/realtime` `playersOnline` also counts bots (`getAllGames().playerCount`
  = `Object.keys(users).length`). Endpoint has **no consumer** (dead) but fixed anyway.
- SP heartbeat (`/api/single-player/heartbeat`, in-memory map) is the only existing
  "who's live but not in a multiplayer room" signal — fires only inside an SP game.
- **No generic page-presence signal exists.** Landing-page visitors have no socket
  and no SP heartbeat → invisible. Ask #3 needs a new beacon.

## Design

### #1 Exclude bots
- Live-games stats split into `playersInGames` (humans, `!isBot`) + new `botsInGames`.
- Each room card shows composition "N players · M bots".
- `realtime.playersOnline` recomputed humans-only via same rule.
- Disconnected humans still count as players (they are humans in the room); only
  bots are excluded — matches the literal ask.

### #2 Clearer status
- Pure `roomStatusKey(game, now)` in `liveGameInsights.ts`:
  - `finished` → finished
  - `in-progress` → playing
  - `validating` → scoring
  - `waiting` + ≥1 human → waiting
  - `waiting` + 0 humans → empty (bots only / orphaned)
  - stalled flag stays as a separate overlay badge.
- Component maps key → translated label + color. i18n ×5.

### #3 Players on other pages (new beacon)
- **In-memory only** (mirror `singlePlayer.ts`: `Map` + TTL cleanup interval). No
  Supabase table — presence is ephemeral, a table would breach the realtime/DB-perf
  rules for zero benefit. Multi-instance fragmentation is an accepted limitation
  (SP heartbeat already has it).
- `backend/routes/presence.ts`: `POST/DELETE /api/presence/heartbeat`, getter
  `getActivePagePresence()`. Stores `{ sessionId, path, username?, playerId?,
  isAuthenticated?, timestamp }`.
- Client `PagePresenceReporter.tsx` mounted in `app/[locale]/layout.tsx` beside
  `WebVitalsReporter`. Tab-stable sessionId in `sessionStorage`. Beacons current
  `usePathname()` every 20s + on path change. **Skips `/admin/*`** (don't show the
  watcher) — and the normalizer strips PII.
- `lib/presence/normalizePagePath.ts` (pure): strip `[locale]` prefix, collapse
  high-cardinality dynamic segments (`/admin/players/{id}` → label), → stable label.
- `lib/admin/liveMonitor/playersOnOtherPages.ts` (pure): **identity-based dedupe** —
  drop any presence whose `username`/`playerId` already appears in a live game or SP
  session; group the rest by normalized page. Anonymous landing visitors have no
  username → never collide → always shown (satisfies "even landing page").
- Live-games route adds `pagePresence` (deduped, grouped) to its response.
- `LiveMonitor.tsx` renders a new "On Other Pages" section.

## TDD seams (write tests first)
`playerComposition`, `roomStatusKey`, `normalizePagePath`, `playersOnOtherPages`,
plus the presence-store getter behavior.

## Constraints
- i18n ×5 (he/en/sv/ja/es) for every new admin string.
- No file > 500 lines; pure helpers separate from components.
- In-memory presence, TTL-cleaned; no DB, no realtime publication.
