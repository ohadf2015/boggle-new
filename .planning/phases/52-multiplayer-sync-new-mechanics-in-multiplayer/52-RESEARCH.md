# Phase 52: Multiplayer Sync — New Mechanics in Multiplayer - Research

**Researched:** 2026-03-04
**Domain:** Multiplayer blast game sync, seeded random, Supabase persistence
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-01 | All new/reworked tile types available in multiplayer blast games | blastMultiplayerConstants.ts BLAST_TILE_TYPES is stale (missing mirror, silver, diamond, vortex, frost, prism); blastModeManager.ts generateBlastOverlay uses Math.random() directly; calculateBlastTileBonus exists and BLAST_TILE_BONUSES already has all types |
| SYNC-02 | Combination effects synchronized deterministically between clients | Combination effects (Phase 48 blastComboEffects) run only client-side in useBlastGame; server sends blastWordAccepted but NOT combo type data; client combos fire independently per player |
| SYNC-03 | Cascade refill uses seeded random (not Math.random()) for multiplayer determinism | generateBlastLetter() and rollSpecialType() in blastLetterGenerator.ts both call Math.random() directly; computeGravityResult() calls these unconditionally; no seed mechanism exists yet |
| SYNC-04 | Combo Codex progress earned in any session persists to Supabase player profile | useBlastComboDiscovery persists to localStorage only; blast_results and blast_personal_bests Supabase tables exist but no blast_combo_codex or profile column for combos; API route at /api/blast/result has no combo field |
</phase_requirements>

---

## Summary

Phase 52 is the final phase of v3.0. Its four requirements each target a distinct layer of the multiplayer stack. The work is largely additive — no architectural rewrites needed — but each plan touches a different file set.

**SYNC-01** is a constants/manager update: `BLAST_TILE_TYPES` in `blastMultiplayerConstants.ts` is a hardcoded subset (`['standard', 'gold', 'rainbow', 'bomb', 'ice', 'gem', 'lightning', 'magnet']`) that predates the v3.0 tile reworks. The canonical `BLAST_TILE_TYPE_LIST` in `shared/types/blast.ts` already has all 14 types. Updating the constant and the generator in `generateBlastOverlay` to use the wave-aware distribution from `blastWaveConfig.ts` is the right approach. The `BLAST_TILE_BONUSES` record already has all 14 types, so scoring needs no changes.

**SYNC-02** is a server-side emit addition: the server currently sends `blastWordAccepted` with `{ word, score, tileBonus, tilesCleared, movesUsed, bonusMove, comboLevel }` but does not include combo type. Each client independently runs `detectSpecialCombos()` from `blastCombos.ts` on its own tile state, so combo visual effects are already client-side and independent. For deterministic visual sync, the server must broadcast the detected combo type so both clients fire the same `BlastComboFlash` overlay. This requires: (a) detecting the combo server-side in `wordHandler.ts`, and (b) adding `comboType` to `BlastWordAcceptedPayload`.

**SYNC-03** is a seeded-random implementation in `blastLetterGenerator.ts` and `blastGravity.ts`. Currently `generateBlastLetter()` and `rollSpecialType()` both call `Math.random()` — not seedable. A simple Mulberry32 or xoshiro128** PRNG (pure function, ~10 lines) should be added to `blastLetterGenerator.ts`. The seed needs to be agreed upon before the game: generated server-side as part of `initBlastModeState` and broadcast with `startGame`. Clients apply the seeded PRNG for all refill calls. Note: singleplayer blast does NOT share a seed (no other client) so the seed path is multiplayer-only; `computeGravityResult` needs an optional seed parameter.

**SYNC-04** is a new Supabase persistence layer. The current flow: `useBlastComboDiscovery` writes `blast_discovered_combos` array to `localStorage`. To persist cross-device and cross-session, the pattern used by blast results (`/api/blast/result` → `blast_results` table) should be replicated: a new `/api/blast/combo-codex` endpoint that upserts a `blast_combo_codex` table (or a JSONB column on `blast_personal_bests`). The hook must call this endpoint when authenticated, with localStorage as the offline fallback.

**Primary recommendation:** Work in plan order (SYNC-01 → 02 → 03 → 04) as they are independent; no plan blocks another.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Socket.IO 4.8.1 | 4.8.1 | Multiplayer event bus | Already used; `broadcastToRoom` pattern established |
| @supabase/supabase-js | existing | Persistence | Already used for blast_results and profiles |
| Jest | existing | Testing | Project-mandatory TDD; all backend tests in `backend/__tests__/` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mulberry32 or xoshiro128** | ~10 lines inline | Seedable PRNG | SYNC-03 only — no npm package needed, embed inline |
| Zod | existing | Socket payload validation | Extend `blastWordAccepted` socket type when adding comboType |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline PRNG | `seedrandom` npm | npm adds bundle weight; inline PRNG is trivially testable and has no deps |
| New Supabase table | JSONB column on `blast_personal_bests` | Column simpler to add; table gives richer query options. Column is sufficient for MVP. |

---

## Architecture Patterns

### Current Multiplayer Blast Flow

```
Server: gameLifecycleHandler.ts
  → initBlastModeState(grid, players)  -- generates overlay via Math.random()
  → stores blastModeState on game object
  → broadcasts startGame + blastTileOverlay to all clients

Client (player): usePlayerGameEvents.ts
  → receives startGame, stores blastTileOverlay

Server: wordHandler.ts (on submitWord)
  → getTilesOnPath(word, positions, overlay)
  → calculateBlastTileBonus(tilesOnPath)
  → recordBlastMove(state, username, comboLevel)
  → emits blastWordAccepted to submitting player only

Client: useBlastGame.ts
  → detectSpecialCombos() on local tile state
  → executeComboEffect() -- client-only, NOT synced
  → discovery banner fires per client independently
```

### Gaps Identified

```
Gap 1 (SYNC-01): BLAST_TILE_TYPES constant excludes mirror, silver, diamond, vortex, frost, prism
Gap 2 (SYNC-01): generateBlastOverlay picks from stale BLAST_TILE_TYPES (not wave-aware)
Gap 3 (SYNC-02): combo detection not on server; blastWordAccepted has no comboType field
Gap 4 (SYNC-03): generateBlastLetter() + rollSpecialType() use Math.random()
Gap 5 (SYNC-04): discoveredCombos persisted to localStorage only, not Supabase
```

### Pattern 1: Updating BLAST_TILE_TYPES (SYNC-01)

**What:** Replace hardcoded `BLAST_TILE_TYPES` subset with import from canonical `BLAST_TILE_TYPE_LIST`.
**When to use:** Whenever multiplayer needs to match singleplayer tile universe.
**Example:**
```typescript
// fe-next/shared/constants/blastMultiplayerConstants.ts
// Before (stale hardcoded subset):
export const BLAST_TILE_TYPES = ['standard', 'gold', 'rainbow', 'bomb', 'ice', 'gem', 'lightning', 'magnet'] as const;

// After (canonical list from shared/types/blast.ts):
import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
export const BLAST_TILE_TYPES = BLAST_TILE_TYPE_LIST;
```

### Pattern 2: Server-side combo detection (SYNC-02)

**What:** Import `detectSpecialCombos` from `blastCombos.ts` into `wordHandler.ts`; include result in `blastWordAccepted`.
**When to use:** When combo visuals must be identical across clients.
**Example:**
```typescript
// fe-next/backend/handlers/wordHandler.ts (inside blast branch)
// After getTilesOnPath:
const { detectSpecialCombos } = require('../../../components/blast/utils/blastCombos');
// Note: blastCombos.ts needs BlastTileState[] not just types;
// pass simplified tile states built from overlay positions
const combos = detectSpecialCombos(tilesOnPathAsStates);
const comboType = combos.length > 0 ? combos[0].type : null;

// Extend blastWordAccepted:
socket.emit('blastWordAccepted', {
  ...existingFields,
  comboType, // null | BlastComboType
});
// Also broadcast to room so other players see same flash:
broadcastToRoom(io, getGameRoom(gameCode), 'blastComboSync', { comboType, username });
```

**Alternative simpler path:** Instead of running full combo detection server-side (which needs tile states), trust the submitting client to report the detected comboType in `submitWord` payload. Server re-broadcasts it. Risk: client could spoof. For this game, spoofing combo visuals is low-stakes.

**Recommendation:** Trust client report (simpler, avoids needing full tile state on server). Add `comboType?: BlastComboType` to `submitWord` payload; server re-broadcasts via `blastComboSync` room event.

### Pattern 3: Seeded PRNG (SYNC-03)

**What:** Mulberry32 PRNG seeded from game seed; replaces `Math.random()` in letter and tile type generation.
**When to use:** Any call that must produce identical output on all clients.
**Example:**
```typescript
// fe-next/components/blast/utils/blastLetterGenerator.ts

/** Mulberry32: fast, seedable, ~10 lines, no deps */
export function createSeededRandom(seed: number): () => number {
  let s = seed;
  return function() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Updated signatures:
export function generateBlastLetter(
  language: Language,
  vowelModifier = 1.0,
  rng: () => number = Math.random,  // default preserves singleplayer behavior
): string { ... }

export function rollSpecialType(
  specialTileChance: number,
  customDistribution?: Record<string, number>,
  spawnModifier = 0,
  rng: () => number = Math.random,  // default preserves singleplayer behavior
): BlastTileType { ... }
```

Seed generated server-side in `initBlastModeState`:
```typescript
// fe-next/backend/modules/blastModeManager.ts
export function initBlastModeState(grid, players): BlastModeState {
  const seed = Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF);
  const overlay = generateBlastOverlay(grid, BLAST_SPECIAL_TILE_CHANCE);
  return { overlay, playerMoves, playerBonusMoves, seed };
}
```

Seed broadcast in `startGame` payload alongside `blastTileOverlay`. Clients use same seed for all refills.

### Pattern 4: Supabase Combo Codex persistence (SYNC-04)

**What:** Upsert discovered combos to Supabase when authenticated; localStorage as offline/unauthenticated fallback.
**When to use:** End of game, or when a new combo is discovered (fire-and-forget on discovery).
**Example:**
```typescript
// NEW: fe-next/app/api/blast/combo-codex/route.ts
// POST { discoveredCombos: BlastComboType[] }
// → upsert blast_combo_codex table row for user_id
// → merge with existing (union, never shrink)
// → return merged set

// Schema:
// blast_combo_codex (user_id uuid PK, discovered_combos text[], updated_at timestamptz)
// OR: add discovered_combos jsonb column to blast_personal_bests

// Hook change in useBlastComboDiscovery.ts:
// After saveToStorage(), if authenticated:
// fetch('/api/blast/combo-codex', { method: 'POST', body: JSON.stringify({ discoveredCombos: [...combos] }) })
//   .catch(() => {}) // non-fatal, localStorage already saved
```

**Merge on load:** When hook initializes, if user is authenticated, GET `/api/blast/combo-codex` and merge with localStorage (union of both sets). This handles cross-device sync.

### Anti-Patterns to Avoid

- **Don't run full tile state on server for combo detection:** The server does not track `BlastTileState[][]` (cleared, hitsRemaining, etc.) — it only has the initial overlay. Building server tile state to run `detectSpecialCombos` would require duplicating the entire singleplayer game loop on the server. Use client-report pattern instead.
- **Don't replace Math.random() globally:** Only the refill path needs seeded random. Singleplayer DDA, sugar crush, near-miss, etc. should remain unseeded. Use optional `rng` parameter.
- **Don't create a new table for combo codex if JSONB column suffices:** `blast_personal_bests` already has a row per user per difficulty. A JSONB column `discovered_combos` there avoids a new table. However, combos span all difficulties so a standalone table with just `user_id` PK is cleaner.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Seedable PRNG | Complex multi-file RNG class | Mulberry32 inline (~10 lines) | Proven, fast, no deps, deterministic |
| Supabase auth in API route | Custom JWT validation | `createClient()` from `@/utils/supabase/server` | Already used in `/api/blast/result` — identical pattern |
| Combo detection on server | Duplicating useBlastGame logic | Client-report: client sends `comboType` in `submitWord` payload | Server doesn't have tile state; duplication creates drift risk |

---

## Common Pitfalls

### Pitfall 1: BLAST_TILE_TYPES stale subset
**What goes wrong:** After updating constants, `generateBlastOverlay` still picks from the old list — new tile types never appear in multiplayer. Players see only wave-1 tiles.
**Why it happens:** `generateBlastOverlay` filters `BLAST_TILE_TYPES.filter(t => t !== 'standard')` — it takes the full list. If the constant is updated, types like `vortex` and `frost` will appear without wave awareness.
**How to avoid:** Also update `generateBlastOverlay` to use `getWaveDistribution()` rather than uniform random from all types. Multiplayer blast uses a single initial overlay (not wave-based refill), so use wave 1 distribution for the initial overlay, or expose a wave parameter in `initBlastModeState`.
**Warning signs:** Tests showing vortex/frost appearing at wave 1 probability in multiplayer.

### Pitfall 2: Seeded random state drift between clients
**What goes wrong:** Two clients produce different tiles on refill despite using the same seed.
**Why it happens:** One client calls `rng()` more times than the other (e.g., different word paths clear different numbers of tiles, so different numbers of refill calls happen). Clients are NOT calling rng in lockstep.
**How to avoid:** Multiplayer blast does NOT need bitwise identical boards — each client manages their own board. The requirement is that a GIVEN cell's new tile type is the same across clients when both need to refill that cell. This is only possible if both clients know the exact same sequence. Since boards diverge per-player (each player sees their own client-side board), a shared seed is not enough for full determinism. **Reframe SYNC-03:** The real requirement is likely that the SERVER controls which tiles refill (authoritative), not that clients run the same PRNG. See Open Questions.
**Warning signs:** Test comparing two independent clients' boards after same sequence of word submissions shows divergence.

### Pitfall 3: blastWordAccepted only emitted to submitting player
**What goes wrong:** `blastComboSync` event for other players never fires because `socket.emit` (not `broadcastToRoom`) is used.
**Why it happens:** Current `blastWordAccepted` uses `socket.emit` (player-only). Combo sync needs `broadcastToRoom`.
**How to avoid:** Use separate event `blastComboSync` via `broadcastToRoom` for combo visuals; keep `blastWordAccepted` as player-only for move counter.
**Warning signs:** Player A discovers combo, Player B sees nothing.

### Pitfall 4: Supabase combo write race on rapid discovery
**What goes wrong:** Player discovers 3 combos in quick succession; three concurrent POST requests; server merges incorrectly.
**Why it happens:** Each discovery triggers a POST; if requests arrive out of order the last write wins.
**How to avoid:** Server-side merge must be additive (SQL array union or JSONB merge, not replace). On client side, debounce writes or batch at end of game.
**Warning signs:** Discovered combo count drops after a session.

### Pitfall 5: localStorage/Supabase divergence on merge
**What goes wrong:** Player has 15 combos in localStorage (offline play), 8 in Supabase (older device). Merge on login shows 8.
**Why it happens:** GET returns Supabase state; hook overwrites localStorage.
**How to avoid:** Merge must be: `union(localStorage, supabase)` and then write union back to both. Never shrink.
**Warning signs:** Player reports losing discoveries after logging in.

---

## Code Examples

### Key files to modify per plan

**52-01 (SYNC-01) — Files:**
```
fe-next/shared/constants/blastMultiplayerConstants.ts  -- update BLAST_TILE_TYPES
fe-next/backend/modules/blastModeManager.ts            -- update generateBlastOverlay distribution
fe-next/backend/modules/__tests__/blastModeManager.test.ts  -- update tests
```

**52-02 (SYNC-02) — Files:**
```
fe-next/shared/types/socket.ts                         -- add comboType to BlastWordAcceptedPayload / submitWord
fe-next/backend/handlers/wordHandler.ts                -- re-broadcast comboType
fe-next/player/hooks/socket/usePlayerGameEvents.ts     -- handle blastComboSync event
fe-next/components/blast/BlastGame.tsx                 -- connect comboSync to BlastComboFlash
```

**52-03 (SYNC-03) — Files:**
```
fe-next/components/blast/utils/blastLetterGenerator.ts -- add createSeededRandom, rng param
fe-next/components/blast/utils/blastGravity.ts         -- pass rng through computeGravityResult
fe-next/backend/modules/blastModeManager.ts            -- add seed to BlastModeState, broadcast seed
fe-next/shared/types/game.ts                           -- add seed?: number to BlastModeState
fe-next/player/hooks/socket/usePlayerGameEvents.ts     -- store blastSeed from startGame
```

**52-04 (SYNC-04) — Files:**
```
fe-next/app/api/blast/combo-codex/route.ts             -- NEW POST/GET endpoint
fe-next/components/blast/hooks/useBlastComboDiscovery.ts -- add Supabase sync
```

### Seeded PRNG (Mulberry32)
```typescript
// Source: mulberry32 — well-known 32-bit PRNG, public domain
export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return function mulberry32(): number {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Supabase API pattern (mirrors /api/blast/result)
```typescript
// fe-next/app/api/blast/combo-codex/route.ts
export async function POST(request: Request) {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { discoveredCombos } = await request.json();
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

  // Upsert — array union via Postgres array_cat / jsonb_agg
  const { data: existing } = await supabase
    .from('blast_combo_codex')
    .select('discovered_combos')
    .eq('user_id', user.id)
    .single();

  const merged = [...new Set([...(existing?.discovered_combos ?? []), ...discoveredCombos])];

  await supabase.from('blast_combo_codex').upsert({
    user_id: user.id,
    discovered_combos: merged,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return NextResponse.json({ discoveredCombos: merged });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded 8-type BLAST_TILE_TYPES | Should use BLAST_TILE_TYPE_LIST (14 types) | Phase 52 | New tile types will appear in multiplayer |
| localStorage-only combo discovery | localStorage + Supabase sync | Phase 52 | Cross-device persistence |
| Math.random() for refill | Seeded PRNG | Phase 52 | Deterministic multiplayer board state |

**Deprecated/outdated:**
- `BLAST_TILE_TYPES` in `blastMultiplayerConstants.ts`: replaced by `BLAST_TILE_TYPE_LIST` from `shared/types/blast.ts`
- `BlastModeState` without `seed` field: will grow by one optional field

---

## Open Questions

1. **SYNC-03: Server-authoritative vs. shared-seed**
   - What we know: Each multiplayer player runs their own singleplayer blast engine client-side. Boards diverge naturally per-player (Player A finds "FIRE", Player B finds "RACE" — different tiles clear).
   - What's unclear: Does SYNC-03 require bitwise identical boards (impossible without lockstep) or just that refill tiles are seeded (reducing local randomness but not eliminating divergence)?
   - Recommendation: Interpret as "seeded initial board" (same overlay for all players, which already happens via server-broadcast overlay) + "seeded refill" (same PRNG used per client — reduces wild divergence). Full lockstep would require server-authoritative game loop, a much larger change. **Plan 52-03 should implement shared-seed refill only, document that boards remain client-authoritative.**

2. **SYNC-02: Combo visuals for non-submitting players**
   - What we know: BlastComboFlash fires in `BlastGame.tsx` when `onSynergyDetected` is called. In singleplayer this is driven by the submitting player's combo detection.
   - What's unclear: Should non-submitting multiplayer players see the same combo flash when another player gets a combo?
   - Recommendation: Yes — broadcast `blastComboSync` to room. Non-submitting players render the flash as a spectator-style effect (no board change, just visual). This matches the "identical particle/screen effects" success criterion.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (existing) |
| Config file | `fe-next/jest.config.js` (frontend), `fe-next/backend/jest.config.js` (backend) |
| Quick run command | `npm run test:backend -- --testPathPattern=blastModeManager` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | generateBlastOverlay includes mirror/silver/diamond/vortex/frost | unit | `npm run test:backend -- --testPathPattern=blastModeManager` | ✅ needs update |
| SYNC-01 | BLAST_TILE_BONUSES covers all tile types | unit | same | ✅ exists |
| SYNC-02 | submitWord with comboType propagates blastComboSync to room | unit | `npm run test:backend -- --testPathPattern=wordHandler` | ❌ Wave 0 |
| SYNC-03 | createSeededRandom produces identical sequence for same seed | unit | `npm run test:frontend -- --testPathPattern=blastLetterGenerator` | ❌ Wave 0 |
| SYNC-03 | computeGravityResult with rng param uses it for refills | unit | same | ❌ Wave 0 |
| SYNC-04 | POST /api/blast/combo-codex merges discovered combos (union, never shrink) | unit | `npm run test:frontend -- --testPathPattern=combo-codex` | ❌ Wave 0 |
| SYNC-04 | useBlastComboDiscovery calls API on discovery when authenticated | unit | `npm run test:frontend -- --testPathPattern=useBlastComboDiscovery` | ✅ needs update |

### Sampling Rate
- **Per task commit:** `npm run test:backend -- --testPathPattern=blastModeManager` (SYNC-01/02); `npm run test:frontend -- --testPathPattern=blastLetterGenerator` (SYNC-03)
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `fe-next/backend/handlers/__tests__/wordHandler.blast.test.ts` — covers SYNC-02 (blastComboSync broadcast)
- [ ] `fe-next/components/blast/utils/__tests__/blastLetterGenerator.seeded.test.ts` — covers SYNC-03
- [ ] `fe-next/app/api/blast/combo-codex/__tests__/route.test.ts` — covers SYNC-04 API merge logic
- [ ] Update `fe-next/backend/modules/__tests__/blastModeManager.test.ts` — add SYNC-01 tile type coverage assertions

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `fe-next/backend/modules/blastModeManager.ts` — confirmed Math.random() usage, stale BLAST_TILE_TYPES
- Direct code inspection: `fe-next/shared/constants/blastMultiplayerConstants.ts` — confirmed 8-type stale subset
- Direct code inspection: `fe-next/components/blast/utils/blastLetterGenerator.ts` — confirmed Math.random() in generateBlastLetter and rollSpecialType
- Direct code inspection: `fe-next/components/blast/hooks/useBlastComboDiscovery.ts` — confirmed localStorage-only storage
- Direct code inspection: `fe-next/app/api/blast/result/route.ts` — confirmed Supabase API pattern to replicate
- Direct code inspection: `fe-next/shared/types/blast.ts` — confirmed canonical BLAST_TILE_TYPE_LIST with 14 types

### Secondary (MEDIUM confidence)
- Mulberry32 PRNG algorithm — well-documented public domain PRNG; widely used in game determinism contexts

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all relevant files read directly; no external dependencies introduced
- Architecture: HIGH — existing patterns (API routes, socket handlers, Supabase upsert) are established in codebase
- Pitfalls: HIGH — identified from direct code reading (SYNC-03 drift pitfall) and established multiplayer sync patterns

**Research date:** 2026-03-04
**Valid until:** Stable — no fast-moving dependencies. Valid until tile system changes again.
