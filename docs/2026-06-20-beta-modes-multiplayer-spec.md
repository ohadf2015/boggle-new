# Beta Modes → Multiplayer (invite & play vs other players)

**Date:** 2026-06-20
**Goal:** Make every beta mode that's *relevant for head-to-head* playable as multiplayer with the standard invite flow (room code + invite link/QR), like existing MP modes.

## Scope decision (which beta modes)

| Mode | PvP relevance | Decision |
|------|---------------|----------|
| Word Tower | High (versus tower) | Already wired (admin/exp gated) — **verify, keep** |
| Shiritori | High (turn-based chain) | Backend done, **mount + host-select** |
| Sealed Bid | High (auction; near-meaningless solo) | **Build full MP** (interactive-simultaneous) |
| Crossword | Medium (completion race) | **Build MP race** (parallel-race wrapper) |
| Word Alchemy | **Hollow** (same labeled ops → typing speed only) | **Exclude** — no real competitive surface |
| Word Craft / Word Forge / Wordfall | Solo progression | Out of scope |

## Two MP archetypes

1. **Parallel-race** (Crossword): every player runs the existing solo engine client-side on a *shared seed/puzzle*, submits score; server aggregates → results. Mirrors Blast MP. No per-move server resolution.
2. **Interactive-simultaneous** (Sealed Bid; also Shiritori/Word Tower): per-move server-side resolution because a player's score depends on opponents. Sealed Bid clash/unique is resolved *across all players' bids* at reveal — cannot use the race wrapper.

## Shared scaffolding to reuse (already mode-agnostic)
- Room create (`createGame`), join (`playerJoinHandler`), invite link/QR (`utils/share.ts`, `InviteCard`), lobby, start (`gameStartHandler`), results aggregation, reconnect, rate-limit.

## Gating rule (all new MP modes)
- `GAME_MODE_WEIGHTS` weight **0** (never in random rotation)
- Host-selectable **only** when `canAccessInWorkMode(profile)` (admin OR beta tester)
- Respect language gates where they exist (Shiritori JA-only today)

## Per-mode plans

### 1. Shiritori — connect the seam (lowest cost)
Backend complete (`shiritoriManager`, `shiritoriHandler`, `gameStartHandler` init, Supabase recording). Missing:
- Mount `ShiritoriView`/`useShiritoriGame` in `PlayerInGameView` + `HostInGameView` under `gameMode==='shiritori'`.
- Add `shiritori` chip to host mode selector (`BattleModeCard` / `GameModeSelector`) gated by beta access + availability (`availableMpModes` JA gate).
- Verify socket round-trip with 2 clients.

### 2. Sealed Bid — interactive-simultaneous MP
- Type: add `'sealed-bid'` to `GameMode`; `Game.sealedBidState?` interface (current rack/round, per-player committed bids, phase bidding|revealed, scores).
- Server: `initSealedBidState` (pick rounds, same rack pool as solo `rounds.ts`); new `sealedBidHandler` — `submitSealedBid` (collect per player), when all in (or timer) **resolve across players**: word collisions → clash (split/half), unique → 2×; broadcast reveal + standings; advance round.
- Client: `SealedBidVersusView` (reuse solo rack/tile UI from `lib/sealedBid`), mount in Player/Host InGameView.
- Replace fixed-bot opponent model with live opponents; solo page unchanged.

### 3. Crossword — parallel-race MP
- Type: add `'crossword'` to `GameMode`; `Game.crosswordState?` (shared `puzzleId`/seed, per-player progress/score, finished flags).
- Server: `initCrosswordState` picks one shared puzzle (deterministic), broadcasts puzzleId; players run solo engine; `submitCrosswordProgress`/`submitCrosswordDone` → server tracks completion %/time → standings; first-to-complete + accuracy ranking.
- Client: `CrosswordVersusView` wrapping existing crossword grid + a live opponent-progress rail; mount in Player/Host InGameView.

## Verification
- Unit/TDD per pure module (resolution, init, standings).
- **MP needs 2 clients**: socket-level integration test or two browser contexts (`agent-browser`). Solo single-tab verify insufficient for invite/sync.

## Out of scope / deferred
- Word Alchemy MP (hollow), cross-language Shiritori, ranked/MMR, persistent leaderboards for new modes.
