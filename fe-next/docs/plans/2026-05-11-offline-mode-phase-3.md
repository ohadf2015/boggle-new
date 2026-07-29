# Offline Mode — Phase 3 Plan: MP Reconnect Resume + Slow-Network Polish

**Date**: 2026-05-11
**Depends on**: Phase 0 + 1 + 2 shipped.
**Scope**: Multiplayer cannot run truly offline. This phase makes **brief disconnects** lossless and **slow networks** feel responsive.

---

## Goals
- Disconnect < 60s during MP game → reconnect resumes cleanly, no lost words, no double-count.
- Slow net (rtt > 1000ms, 3G) feels playable via optimistic word-submit UI + delta payloads.
- Disconnect ≥ 60s in MP → graceful abort with "Play Solo on same board" CTA (no data loss).
- Existing `mp-timer-stuck-at-zero-fix-2026-05-04` watchdog precedent: trust server `timeRemaining` on resume.

---

## Tasks

### 3.1 Client socket outbox
- New `lib/multiplayer/socketOutbox.ts`.
- On `socket.disconnected`, all outbound `submitWord` calls enter outbox with `clientSeq` (monotonic counter).
- On `socket.connect` (post-reconnect): emit `resume:{gameId, lastServerSeq}` → server replays missed events → client flushes outbox.
- Server dedupes outbox flush via `(gameId, playerId, clientSeq)`.
- Cap: 30 words outboxed; overflow → drop with toast `t('mp.disconnect.dropped', { count })`.

### 3.2 Server: resume protocol
- Extend Socket.IO handler `backend/handlers/multiplayer.ts`.
- On `resume` event:
  - Look up `gameState:{gameId}` in Redis.
  - If `playerId` still in players list AND game state in {`running`, `pre-round`}: emit `resume:ack { state, serverSeq, timeRemaining }`.
  - Else: emit `resume:reject { reason: 'expired'|'kicked'|'game_over' }`.
- Each word submission gets `serverSeq` (per-game atomic counter in Redis). Client tracks `lastServerSeq` for replay.

### 3.3 Optimistic word submit
- Edit `host/hooks/useHostGameActions.ts` (and equivalent client-side path).
- On submit: render `+points` chip immediately with `pending` style (subtle pulse, lower opacity).
- On server ack: confirm → solid chip.
- On server reject (server-wins): retract chip, micro-shake, toast.
- Tracks pending-word set; clears on round-end.

### 3.4 Delta payloads
- Server emits `scoreUpdate:{playerId, deltaScore, totalScore, lastWord, lastWordScore}` instead of full `scores[]` array.
- ~70% bytes saved with 4-player room.
- Client maintains scores locally, reconciles full `scores[]` on round-end for safety.
- Schema added to `socketSchemas` (per `wheel-rush-mp-audit-2026-04-28` finding).

### 3.5 Connection-quality UI
- New `<ConnectionQualityChip />` mounted in MP HUD.
- Reads from `useNetworkState()`.
- States:
  - `good` (rtt < 300ms): hidden.
  - `degraded` (rtt 300-1000ms): small yellow dot.
  - `weak` (rtt > 1000ms sustained 5s): chip "Connection weak".
  - `offline` (no probe ack 10s): chip "Reconnecting..." + spinner.
- Tooltip on tap shows rtt + last-ack age.

### 3.6 Reconnect overlay
- Edit existing reconnect logic in `SocketContext.tsx`.
- Show `<ReconnectingOverlay attempt={N} maxAttempts={30} />` when MP in flight + disconnected.
- After max attempts (current 30 × ~30s = ~15min): show `<MPGameAbortedModal />` with:
  - "Game ended. Your X words counted toward final score."
  - CTA: "Continue Solo on same board" → routes to SP with seeded grid.
  - CTA: "Return to lobby".

### 3.7 Solo-from-MP-board handoff
- Reuse existing SP board-gen path with deterministic seed = `gameId`.
- Already supported architecturally (see `board-selection-system` memory). Verify on Phase 3 day-1.

---

## TDD Tasks

1. **RED** `socketOutbox.enqueue` while disconnected → 3 entries; reconnect → flushed in order with `clientSeq`.
2. **GREEN** implement outbox + flush.
3. **RED** server `resume` event returns `state, serverSeq, timeRemaining` for valid player.
4. **GREEN** implement resume handler.
5. **RED** server rejects expired resume (game over): `reason='game_over'`.
6. **GREEN** implement guard.
7. **RED** optimistic submit renders pending chip; server ack flips to solid; reject retracts.
8. **GREEN** wire pending-word state.
9. **RED** delta payload schema validates; full reconcile occurs on `round-end` event.
10. **GREEN** server emits deltas; client reconciles.
11. **RED** outbox overflow at 31st word drops with toast.
12. **GREEN** implement cap.
13. **RED** `ConnectionQualityChip` transitions good → degraded → weak per rtt thresholds.
14. **GREEN** implement chip.
15. **RED** abort modal renders after max-attempts; "Continue Solo" routes with seeded grid.
16. **GREEN** wire abort flow.
17. **RED** integration: 4s disconnect mid-game → submit 2 words → reconnect → both words counted, server score matches client score.
18. **GREEN** end-to-end test passes.

---

## Acceptance — Phase 3
- Manual 4-player MP test with simulated 30s disconnect on one player:
  - Player submits 2 words while disconnected ✓
  - Both words appear on server after reconnect ✓
  - Other players see no anomaly ✓
- Simulated weak network (Chrome DevTools throttling "Slow 3G"):
  - Word-submit feels instant (optimistic) ✓
  - Quality chip surfaces ✓
- Game-abort flow at max-attempts:
  - Modal renders with correct score ✓
  - "Continue Solo" loads same board seed ✓
- `endGame` watchdog from `mp-timer-stuck-at-zero-fix-2026-05-04` still fires correctly post-resume ✓
- No regression in PostHog `started < completed` gap metric.
- Bytes/round on socket reduced (PostHog event `mp_socket_bytes_round` if not already wired — add).

---

## File-Touch Manifest

**New**:
- `lib/multiplayer/socketOutbox.ts`
- `components/multiplayer/ConnectionQualityChip.tsx`
- `components/multiplayer/ReconnectingOverlay.tsx`
- `components/multiplayer/MPGameAbortedModal.tsx`
- `__tests__/lib/multiplayer/socketOutbox.test.ts`
- `__tests__/integration/mp-resume.test.ts`

**Edited**:
- `backend/handlers/multiplayer.ts` (resume protocol + serverSeq + delta emit)
- `utils/SocketContext.tsx` (resume emit on connect, attempt counter exposed)
- `host/hooks/useHostGameActions.ts` (optimistic + outbox routing)
- `lib/multiplayer/socketSchemas.ts` (add resume, resume:ack, resume:reject, scoreUpdate)
- `backend/redis/gameState.ts` (`serverSeq` atomic counter per game)
- `translations/{en,he,sv,ja,es}.js` (mp.disconnect.*, mp.quality.*)

---

## Risks

| Risk | Mitigation |
|---|---|
| Outbox + server-replay → double-count if clientSeq dedup misses | Strict server-side `(gameId, playerId, clientSeq)` uniqueness. Test with retransmit scenarios. |
| Optimistic UI shows points then retracts → feels janky | Only retract on server `reject`. For network failure, fall back to outbox (pending stays pending until ack or abort). |
| Delta payloads diverge from server truth over long round | Force full reconcile on every round-end. If client/server scores differ >2 points, log Sentry warn. |
| `Continue Solo` seeded grid differs from MP grid (RNG drift) | Use `gameId` as deterministic seed in board-gen; verify client/server agree by hashing first 4 cells in Sentry breadcrumb. |
| 30-attempt reconnect can exceed user patience | Add manual "Give up" button in `ReconnectingOverlay` after 60s. |
| Edge case: host disconnects mid-round | Use existing host-transfer (per `c3e01df46` recent commit). Player outboxes still flush to new host. |
