# Redis Game State Migration Plan

> Migrate from in-memory game state to Redis-primary storage, enabling true
> horizontal scaling without sticky sessions.

## Current Architecture

```
Client ──WebSocket──▶ Replica A (in-memory games{})
                       │
                       ├─ getGame() → O(1) JS object read (~0ms)
                       ├─ updateGame() → mutate in-place + debounced Redis write (1s)
                       └─ restoreGameFromRedis() → partial reconstruct on crash
```

**Problems:**
1. Sticky sessions required — load balancer must route all requests for a game to the same replica
2. ~1s data loss window on crash (debounce)
3. Only ~60% of GameState fields persisted (users, spectators, combos, chat, vocab sets all volatile)
4. Non-serializable fields: `letterPositions` (Map), `playerWordsSet` (Record<Set>), `selectedVocabulary`/`lessonVocabulary`/`kickedPlayers` (Sets), 3 timeout handles

## Target Architecture

```
Client ──WebSocket──▶ Any Replica
                       │
                       ├─ getGame() → local LRU cache hit (~0ms) or Redis read (~1ms)
                       ├─ updateGame() → Redis write + invalidate other replicas via pub/sub
                       └─ No restore needed — Redis IS the source of truth
```

## Migration Strategy: 3 Phases

### Phase 1: Full Serialization (LOW RISK)
**Goal:** Persist 100% of GameState fields to Redis. No architecture change yet.

1. **Serialize non-serializable fields:**
   - `letterPositions: Map<string, [number, number][]>` → JSON array of `[key, value]` pairs
   - `selectedVocabulary`, `lessonVocabulary`, `kickedPlayers`: `Set<string>` → JSON string arrays
   - `playerWordsSet`: Skip — already reconstructed from `playerWords` on restore
   - Timeout handles: Skip — these are process-local timers, not state

2. **Persist currently-dropped fields:**
   - `users` (full objects, not just keys), `spectators`, `playerCombos`
   - `aiApprovedWords`, `peerValidationWord`, `peerValidationVotes`
   - `chatHistory`, `cachedResultsPayload`
   - `isRanked`, `allowLateJoin` (currently hardcoded on restore)

3. **Reduce debounce window:** 1000ms → 200ms (acceptable Redis load for <100 concurrent games)

4. **Add restore completeness test:** Assert round-trip serialize→deserialize produces equivalent state

**Files to modify:**
- `backend/redis/gameState.ts` — expand `saveGameState()` whitelist
- `backend/modules/gameState/persistence.ts` — expand `restoreGameFromRedis()`
- `backend/modules/gameState/types.ts` — add serialization helpers

**Risk:** Low. This is additive — existing behavior unchanged, just more data in Redis.

### Phase 2: Read-Through Cache (MEDIUM RISK)
**Goal:** Redis becomes source of truth. In-memory `games{}` becomes an LRU cache.

1. **Replace `games: Record<string, GameState>` with LRU cache:**
   ```typescript
   import { LRUCache } from 'lru-cache';
   const gameCache = new LRUCache<string, GameState>({ max: 200, ttl: 30 * 60 * 1000 });
   ```

2. **Modify `getGame()`:**
   ```typescript
   async function getGame(gameCode: string): Promise<GameState | undefined> {
     let game = gameCache.get(gameCode);
     if (game) return game;
     game = await restoreGameFromRedis(gameCode);
     if (game) gameCache.set(gameCode, game);
     return game;
   }
   ```

3. **Modify `updateGame()`:**
   - Write to Redis immediately (no debounce)
   - Update local cache
   - Publish invalidation event via Redis pub/sub: `game:invalidate:{gameCode}`

4. **Add cache invalidation listener:**
   - All replicas subscribe to `game:invalidate:*`
   - On receiving invalidation for a game in local cache → evict it
   - Next `getGame()` call fetches fresh from Redis

5. **Handle timeout handles locally:**
   - Timers (reconnection, validation) remain process-local
   - Add a `game:timer:{gameCode}` Redis key with the replica ID that owns the timer
   - If that replica dies, another replica's cleanup loop picks up orphaned timers

6. **Make `getGame()` async:**
   - This is the biggest refactor — ~60 call sites in handlers need `await`
   - Can be done incrementally: keep sync `getGameLocal()` for hot paths, async `getGame()` for everything else

**Files to modify:**
- `backend/modules/gameStateManager.ts` — replace `games{}` with LRU, make getGame async
- All handler files in `backend/handlers/` — add `await` to getGame calls
- `backend/modules/botBehavior.ts`, `botLifecycle.ts` — async getGame
- `backend/utils/socketHelpers.ts` — async getGame

**Risk:** Medium. The sync→async migration of `getGame()` touches many files. Recommend behind a feature flag (`REDIS_PRIMARY=true`).

### Phase 3: Drop Sticky Sessions (HIGH RISK)
**Goal:** Any replica handles any game. Remove Railway sticky session requirement.

1. **Atomic Redis operations for hot paths:**
   - `playerWords` append → `RPUSH game:{code}:playerWords:{user}`
   - `playerScores` increment → `HINCRBY game:{code}:scores {user} {delta}`
   - `playerCombos` update → `HSET game:{code}:combos {user} {value}`
   - These bypass full serialize/deserialize for the most frequent mutations

2. **Distributed timer coordination:**
   - Use Redis `SET game:{code}:timer:owner {replicaId} EX 120 NX` for timer ownership
   - Heartbeat every 30s to extend TTL
   - If owner dies (TTL expires), any replica can claim via NX

3. **Remove direct mutations:**
   - Audit all `game.playerCombos[x] = y` style mutations (found in wordHandler.ts:336)
   - Route all mutations through `updateGame()` which writes to Redis

4. **Remove `stickySessions = true` from `railway.toml`**

**Risk:** High. Requires thorough testing of all game modes (Classic, Blast, Word Hunt, Adventure) under multi-replica conditions.

## Non-Serializable Field Strategy

| Field | Approach |
|---|---|
| `letterPositions` (Map) | Serialize as `Array<[string, [number, number][]]>`, reconstruct with `new Map()` |
| `selectedVocabulary` (Set) | Serialize as `string[]`, reconstruct with `new Set()` |
| `lessonVocabulary` (Set) | Serialize as `string[]`, reconstruct with `new Set()` |
| `kickedPlayers` (Set) | Serialize as `string[]`, reconstruct with `new Set()` |
| `playerWordsSet` (Record<Set>) | Don't persist — reconstruct from `playerWords` (already done) |
| `reconnectionTimeout` (timer) | Don't persist — re-establish on timer ownership claim |
| `hostReconnectionTimeout` (timer) | Don't persist — re-establish on timer ownership claim |
| `validationTimeout` (timer) | Don't persist — re-establish on timer ownership claim |

## Direct Mutation Audit

These patterns bypass `updateGame()` and will break with Redis-primary:
- `game.playerCombos[username] = ...` in wordHandler.ts
- `game.playerWords[username].push(word)` in wordHandler.ts
- `game.playerScores[username] += score` in scoring paths
- `game.users[username].status = ...` in various handlers

All need to route through `updateGame()` or dedicated atomic Redis ops.

## Performance Budget

| Operation | Current | Phase 2 Target | Phase 3 Target |
|---|---|---|---|
| getGame (cache hit) | ~0ms | ~0ms | ~0ms |
| getGame (cache miss) | N/A | ~1-2ms | ~1-2ms |
| updateGame | ~0ms + 1s debounce | ~1-2ms (immediate) | ~1-2ms (atomic) |
| Word submission (end-to-end) | ~5ms | ~8ms | ~10ms |

## Recommended Execution Order

1. **Phase 1** (1-2 days): Full serialization — safe, no behavior change, validates Redis schema
2. **Phase 2** (3-5 days): Read-through cache behind `REDIS_PRIMARY=true` flag
3. **Load test**: Run both modes side-by-side, compare latency/correctness
4. **Phase 3** (3-5 days): Atomic ops + distributed timers, remove sticky sessions
5. **Soak test**: Run without sticky sessions at scale for 48h before declaring stable

## Dependencies

- Redis must be persistent (RDB or AOF) — Railway Redis supports this
- Redis memory: ~2KB per active game × 200 max games = ~400KB (negligible)
- `lru-cache` npm package (or similar) for Phase 2
