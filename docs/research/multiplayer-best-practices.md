# Real-Time Multiplayer Web Game Best Practices

> Research document for LexiClash (Socket.IO-based word game)
> Date: 2026-03-15

---

## 1. Connection Management

### Reconnection Strategy
- **Exponential backoff** is mandatory. Socket.IO does this by default (2x delay per attempt). Avoid aggressive reconnection that causes cascading failures under load.
- **Connection State Recovery** (Socket.IO v4.6+): Server buffers events during disconnection and replays them on reconnect. Enable with `connectionStateRecovery` option. Set `maxDisconnectionDuration` to a sensible value (e.g., 30-120s for a word game round), never `Infinity`.
- **Network-specific tuning**: Adjust `pingTimeout` and `reconnectionDelay` based on expected user network quality.

### Heartbeat / Ping-Pong
- Socket.IO v4 sends server-initiated PINGs at `pingInterval` (default 25s). Client must respond with PONG within `pingTimeout` (default 20s).
- **Gotcha**: Browser tab throttling delays timers, causing false disconnects. See [Socket.IO issue #5135](https://github.com/socketio/socket.io/issues/5135). Mitigation: increase `pingTimeout` or use Web Workers for heartbeat.
- Recommended for LexiClash: `pingInterval: 10000, pingTimeout: 15000` (games need faster detection than chat apps).

### Connection State Machine
```
CONNECTED ──timeout──> DISCONNECTING ──retry──> RECONNECTING ──success──> CONNECTED
                                                     │
                                                  max_retries
                                                     │
                                                     v
                                               DISCONNECTED
```
- Track state client-side and show appropriate UI for each state.
- On `RECONNECTING`: show subtle indicator, buffer user inputs locally.
- On `DISCONNECTED`: show modal with "Rejoin" button, stop game timer locally.

### Graceful Degradation
- Degrade from WebSocket to HTTP long-polling (Socket.IO does this automatically via Engine.IO transports).
- For word games specifically: queue word submissions locally and replay on reconnect. Words are timestamped, so the server can validate they occurred during the round.

**Sources:**
- [Socket.IO Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery)
- [Socket.IO How It Works](https://socket.io/docs/v4/how-it-works/)
- [Socket.IO Client Options](https://socket.io/docs/v4/client-options/)
- [VideoSDK Socket.IO Guide](https://www.videosdk.live/developer-hub/socketio/socketio-client)
- [Ably: What is Socket.IO](https://ably.com/topic/socketio)

---

## 2. Inactive/AFK Player Handling

### Detection Strategies

| Method | Pros | Cons |
|--------|------|------|
| **Input-based** (no taps/keystrokes for N seconds) | Accurate for active games | Can't detect "watching but not playing" |
| **Heartbeat-based** (client sends periodic activity signal) | Catches tab switches/closes | Doesn't distinguish "present but slow" |
| **Hybrid** (both) | Best coverage | More complex |

**Recommendation for LexiClash**: Use input-based detection during active rounds (no word submissions for 60s = warning), heartbeat-based between rounds (tab backgrounded = AFK).

### Warning-to-Kick Flow
1. **Soft warning** (60s idle): Toast notification "Are you still playing?" with tap-to-confirm.
2. **Hard warning** (90s idle): Countdown overlay visible to all players "Player X will be removed in 30s".
3. **Kick** (120s idle): Convert to spectator or remove from room. Notify remaining players.
4. **Grace period**: If kicked player returns within the current round, allow rejoin with preserved score.

### How Top Games Handle It
- **Kahoot**: Disconnected players see a reconnection spinner; they can rejoin with the same name and room code. No AFK kick during rounds (rounds are short, ~20s).
- **Jackbox**: Players rejoin via same room code + name. The host device runs game logic. Disconnected players miss their turn but aren't kicked.
- **Key insight for word games**: Rounds are short (60-120s). AFK detection matters more in lobbies than during gameplay. During rounds, simply not submitting words is self-penalizing.

### Anti-Patterns
- Kicking players without warning (frustrating UX).
- Overly aggressive timers that trigger false positives (e.g., player reading the board).
- Not allowing rejoin after kick.

**Sources:**
- [Kahoot Reconnection Support](https://support.kahoot.com/hc/en-us/community/posts/115000985067-Allow-disconnected-players-to-rejoin-with-their-prior-score)
- [Jackbox Architecture](https://explore.st-aug.edu/exp/jackbox-tv-join-explained-how-a-simple-code-unlocks-a-world-of-party-games)
- [SimRail Forum: Aggressive Idle Detection](https://forum.simrail.eu/topic/1367-player-idle-detection-too-aggressive/)

---

## 3. Room/Lobby Patterns

### Room Lifecycle
```
CREATED → WAITING (lobby) → STARTING → IN_PROGRESS → ENDING → RESULTS → CLOSED
```
- Each state transition should be an atomic operation on the server.
- Use Redis for room state with TTL-based cleanup (rooms expire if abandoned).
- Emit state changes to all room members on every transition.

### Host Migration
- **When to trigger**: Host disconnects for >5s, host leaves voluntarily without selecting successor.
- **Selection strategy**: Pick player with lowest latency, longest session, or oldest join time. Random is acceptable for casual games.
- **Implementation**:
  1. Detect host disconnect (heartbeat timeout).
  2. Pause room briefly (~2-3s for word games, not the 15s typical of FPS games).
  3. Assign new host, broadcast `host:migrated` event with new host ID.
  4. New host's client enables host-only controls.
- **Key**: All game state must live on the server, not the host's client. Host is a UI role, not an authority role.

### Matchmaking for Casual Games
- **Room codes** (4-6 chars) for friend-based play (Jackbox/Kahoot model). Best for LexiClash.
- **Quick match**: Server assigns players to open rooms based on skill level or language preference.
- **Lobby pagination**: For large player bases, only send room updates for rooms visible on screen to avoid broadcast storms.

### Room Capacity
- Set hard cap (e.g., 8 players for word games). Reject joins at capacity with clear error.
- Queue system for popular rooms: "You are #3 in line" with estimated wait.
- Spectator slots separate from player slots.

**Sources:**
- [Unity Lobby Host Migration](https://docs.unity.com/ugs/en-us/manual/lobby/manual/host-migration)
- [Photon Host Migration](https://doc.photonengine.com/pun/current/gameplay/hostmigration)
- [Edgegap: P2P & Host Migration Analysis](https://edgegap.com/blog/live-multiplayer-games-p2p-host-migration-a-technical-cost-analysis-of-backend-infrastructures-presentation-by-michal-buras-(lead-network-engineer-at-highwire-games))

---

## 4. State Synchronization

### Authoritative Server (Mandatory for Word Games)
- **Server validates all word submissions**. Client sends the word; server checks dictionary, scoring, and timing. Client never determines its own score.
- Client is a "dumb visual representation" of server state.
- This prevents cheating entirely -- critical for competitive/leaderboard games.

### Optimistic Updates
- **Pattern**: Apply action locally for instant feedback, then reconcile with server response.
- **For LexiClash word submission**:
  1. Player submits word -> immediately show "checking..." state.
  2. Server validates -> emit `word:accepted` or `word:rejected`.
  3. Client updates score/feedback based on server response.
  4. If network fails, word stays in "pending" state until reconnect.
- Optimistic updates matter less for turn-based/word games than for action games, but the "checking" feedback is still important UX.

### Delta Compression
- Send only changed state, not full snapshots. Colyseus framework does this automatically with binary encoding.
- For word games: broadcast only new words found, score deltas, and timer updates -- not the full game state each tick.
- Use Socket.IO rooms to scope broadcasts to relevant players only.

### Conflict Resolution
- **Last-write-wins** is fine for word games (two players finding the same word simultaneously -- server timestamps determine who gets credit).
- **CRDTs** (Conflict-free Replicated Data Types) are overkill for word games but worth knowing about for collaborative features.
- Include sequence numbers/version IDs in all state updates for ordering.

**Sources:**
- [Colyseus Framework](https://colyseus.io/)
- [Ably: WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [GameDev.net: WebSocket Game Communication](https://www.gamedev.net/forums/topic/686253-websocket-based-realtime-multiplayer-game-client-and-server-communication/)

---

## 5. Resilience Patterns

### Idempotent Event Handling
- **Design all events to be idempotent**: Receiving the same event twice should not change state beyond the first application.
- Use event IDs / nonces. Server tracks processed event IDs and ignores duplicates.
- Example: `word:submit { id: "uuid", word: "HELLO", timestamp: 1234 }`. If received twice, second is a no-op.
- **Anti-pattern**: `toggleScore` events. Use `setScore` with absolute values instead.

### Message Ordering
- Socket.IO guarantees ordering within a single connection. But after reconnection, buffered events may interleave with new events.
- Include monotonic sequence numbers. Server rejects/reorders out-of-sequence messages.
- For word games: order matters less than in action games. Timestamp-based ordering is sufficient.

### Split-Brain Prevention
- With Redis Pub/Sub across multiple server instances, a player could theoretically connect to two servers simultaneously.
- **Mitigation**: Store active socket ID in Redis per user. On new connection, check for existing session and disconnect the old one.
- Use Redis `SET ... NX` (set-if-not-exists) for room locks during state transitions.

### Circuit Breaker for External Services
- Wrap Supabase/Redis calls with circuit breaker logic: after N failures in M seconds, stop calling and return cached/default responses.
- For word validation: if dictionary service fails, queue submissions and process when service recovers. Do not block the round.
- States: CLOSED (normal) -> OPEN (failing, use fallback) -> HALF-OPEN (testing recovery).

### Reconnection Storm Protection
- After a server restart, all clients reconnect simultaneously.
- Add jitter to reconnection delay: `delay = baseDelay * (1 + random(0, 0.5))`.
- Socket.IO has `randomizationFactor` option (default 0.5) for this.

**Sources:**
- [Ably: WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [Ably: Scaling Pub/Sub with WebSockets and Redis](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis)
- [Dyte: Scaling WebSockets to Millions](https://dyte.io/blog/scaling-websockets-to-millions/)
- [GoldFire Studios: Scaling Node.js with Redis](https://goldfirestudios.com/horizontally-scaling-node-js-and-websockets-with-redis)

---

## 6. UX Patterns for Multiplayer

### Connection Quality Indicators
- **Simple 3-tier indicator**: Green (RTT <100ms), Yellow (100-300ms), Red (>300ms).
- Show as subtle icon in game HUD, not intrusive. Players below 100ms RTT rarely notice lag.
- For word games: latency is less critical than for action games, but >500ms makes word submission feel broken.

### Latency Compensation UI
- **Animation padding**: Play a local animation (e.g., word "flying" to score area) that takes ~200-300ms, masking the server round-trip.
- **Immediate visual feedback**: Highlight tiles as tapped/swiped before server confirms the word.
- **Optimistic score preview**: Show "+15 pts" immediately, adjust if server disagrees.
- For LexiClash: The "checking" spinner already serves as latency padding. Ensure it has a minimum display time (~300ms) so it doesn't flash.

### Player Presence Indicators
- Show connected/disconnected/reconnecting state per player in lobby and during game.
- Use avatar opacity: full = connected, 50% = reconnecting, grayed out = disconnected.
- Show "last seen" timer for disconnected players: "Disconnected 15s ago".

### Graceful Disconnect Notifications
- **During lobby**: "[Player] left the game" toast. If host, trigger migration with "New host: [Player]" announcement.
- **During round**: "[Player] disconnected" subtle indicator on their avatar. Don't interrupt other players' gameplay with a modal.
- **Post-round**: Include disconnected players in results with note "(disconnected)" next to their score.

### Anti-Patterns to Avoid
- Showing raw ping values to casual players (confusing; use bars/colors instead).
- Blocking all UI during reconnection (let players see the board/scores while reconnecting).
- Abrupt "You were kicked" without explanation or rejoin option.
- Pausing the game for all players when one disconnects (unfair in competitive word games).

**Sources:**
- [Valve: Latency Compensating Methods](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization)
- [Unity: Dealing with Latency](https://docs-multiplayer.unity3d.com/netcode/current/learn/dealing-with-latency/)
- [ACM: Survey of Latency Compensation Techniques](https://dl.acm.org/doi/10.1145/3519023)

---

## 7. LexiClash-Specific Recommendations

### High Priority
1. **Enable Connection State Recovery** with `maxDisconnectionDuration` matching round length (~120s).
2. **Make word submissions idempotent** with UUID-based event IDs.
3. **Add connection quality indicator** to game HUD (3-tier color system).
4. **Implement animation padding** on word submission to mask latency.
5. **Store all game state server-side** -- host is a UI role only, never an authority.

### Medium Priority
6. **AFK detection in lobby only** -- during rounds, not submitting words is self-penalizing.
7. **Host migration with 3s pause** -- select longest-connected player as new host.
8. **Reconnection storm jitter** -- ensure `randomizationFactor` is set (Socket.IO default 0.5 is good).
9. **Redis session locking** -- prevent duplicate connections per user across server instances.

### Low Priority
10. **Circuit breaker for Supabase** -- fallback to cached data on DB failures.
11. **Lobby pagination** -- only needed if room count exceeds ~50.
12. **Spectator mode conversion** for kicked/AFK players.

### Anti-Patterns Already Present in Codebase (from audit notes)
- Timer starts before all players ACK (race condition) -- see `gameLifecycleHandler.ts:337-370`.
- Host reconnection timeout not thread-safe.
- `activeRooms` global broadcast without throttling (now throttled per Sprint 2).
- Socket migration flag unclear.
