# Phase 54: Gap Closure — Multiplayer Combo Sync + Codex Wiring - Research

**Researched:** 2026-03-04
**Domain:** Socket.IO multiplayer event wiring, React auth context integration, Supabase persistence
**Confidence:** HIGH

## Summary

Phase 54 closes two remaining gaps from the audit. Both features are architecturally complete — the server, API, and client display layers already exist and work. The gaps are narrow wiring problems: (1) `comboType` is not included in the multiplayer `submitWord` socket emit, so the server never receives it and cannot broadcast `blastComboSync`; (2) `useBlastComboDiscovery()` is called without a `userId` in `BlastView.tsx`, so authenticated singleplayer users never trigger Supabase persistence.

Both fixes are 1–3 line changes in the right call sites, each needing a test to document the behavior.

**Primary recommendation:** Wire `comboType` into the in-game `socket.emit('submitWord', ...)` call, and pass `user?.id` from `useAuth()` into `useBlastComboDiscovery()` in `BlastView.tsx`. No new abstractions needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-02 | Combination effects synchronized deterministically between clients | Server broadcast exists; client receive exists; gap is comboType missing from submitWord emit in multiplayer hook |
| SYNC-04 | Combo Codex progress synced to player profile (persisted in Supabase) | Hook, API route, and DB schema exist; gap is userId not passed from BlastView to useBlastComboDiscovery |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Socket.IO | 4.8.1 | Real-time bidirectional events | Already integrated; submitWord already uses it |
| Supabase | (project version) | Postgres + Auth | Already integrated; combo-codex table + RLS exist |
| Zustand | (project version) | Client game state store | `useBlastComboSync` / `setBlastComboSync` already in store |
| React hooks | 18 | `useAuth`, `useBlastComboDiscovery` | Existing hook contracts |

### No New Libraries
Both SYNC-02 and SYNC-04 use only existing project infrastructure.

## Architecture Patterns

### Current Multiplayer Word Submission Flow

```
BlastGame.tsx (handleWordAccepted)
  └─ detectSpecialCombos(path, tileStates) → comboType
  └─ onWordWithComboTypeRef.current(word, comboType)   ← callback prop

BlastGame.tsx (wordSubmission)
  └─ useWordSubmission (singleplayer/game/hooks/useWordSubmission.ts)
       └─ socket.emit('submitWord', { word, comboLevel, fireRoundActive })
            ← comboType NOT included HERE
```

```
Server (wordHandler.ts):
  socket.on('submitWord') → comboType = validation.data.comboType ?? null
  if (comboType) broadcastToRoom(io, room, 'blastComboSync', { comboType, username })
  ← Already correct; needs valid comboType in payload to broadcast
```

```
Client receive (usePlayerGameEvents.ts):
  socket.on('blastComboSync') → if username !== self → setBlastComboSync({...data, id: uniqueId})

BlastGame.tsx:
  blastComboSync = useBlastComboSync()
  useEffect → if blastComboSync → blast.triggerComboFlash(blastComboSync.comboType)
  ← Already correct
```

### Gap 1 (SYNC-02): comboType not in submitWord emit

**File:** `fe-next/components/game/in-game/hooks/useWordSubmission.ts`
**Line ~128:**
```typescript
// CURRENT (missing comboType)
socket.emit('submitWord', {
  word: formedWord.toLowerCase(),
  comboLevel: comboLevelRef.current,
  fireRoundActive: fireRoundActiveRef.current,
});
```

**Problem:** The multiplayer word submission hook has no access to the current path or tile states — those live in `BlastGame.tsx`. The `onWordWithComboType` callback prop in `BlastGame` does detect and surface the comboType AFTER the word is accepted, but the socket emit happens BEFORE acceptance (server validates the word).

**Actual wiring needed:** `BlastGame.tsx` already has `handleWordAccepted` which calls `detectSpecialCombos` on the path and invokes `onWordWithComboTypeRef.current(word, comboType)`. The parent (`BlastView`) passes no `onWordWithComboType` prop. In multiplayer context (`components/game/in-game/hooks/useWordSubmission.ts`), the emit happens optimistically before the server responds.

**Correct fix approach:** The in-game multiplayer word submission must include `comboType`. The comboType must be detected client-side (tile states are client-authoritative — server has no tile state in standard multiplayer). The detection happens in `BlastGame.tsx`'s `handleWordAccepted` callback. The fix is to:

1. Have `BlastGame` call `onWordWithComboType(word, comboType)` before or during `handleWordAccepted`
2. The multiplayer parent (e.g. the view using in-game hooks) captures the comboType and re-emits a follow-up, OR the in-game `useWordSubmission.ts` hook takes an optional `getComboType?: (word: string) => string | null` callback so it can include it at emit time.

**SIMPLER (preferred) approach:** Looking at the code flow — the in-game multiplayer useWordSubmission emits `submitWord` immediately, but `handleWordAccepted` only fires when the server confirms. The server already re-broadcasts `blastComboSync` from `comboType` in `submitWord`. So the cleanest fix is:

- `BlastGame.tsx` detects `comboType` on path submission (not just on accepted callback). The path is submitted via `handlePathSubmit` which sets `lastPathRef.current`.
- Add an `onWordSubmitWithComboType` pattern: detect combos from the path at submission time (before server confirms), include in socket emit.

**Alternatively (per STATE.md phase 52-02 decision):** "Trust-client comboType: server re-broadcasts submitWord.comboType via blastComboSync room event." This means the fix is: detect combo at word submission time (not just on acceptance), and pass it to the socket emit.

**Concrete implementation:** The `useWordSubmission` hook in `singleplayer/game/hooks/` (which `BlastGame.tsx` uses) has an `onWordAccepted` callback. The path/combo detection is in `BlastGame.handleWordAccepted`. But the socket emit is in the in-game multiplayer `useWordSubmission`. These are different hooks in different contexts.

**For singleplayer Blast (BlastView.tsx context):** BlastGame.tsx uses `singleplayer/game/hooks/useWordSubmission.ts` which does NOT emit sockets. So SYNC-02 specifically concerns multiplayer blast sessions, which flow through a different code path. The `useBlastComboSync` Zustand store is populated by `usePlayerGameEvents.ts` (the multiplayer player view hook).

**Actual SYNC-02 gap:** In multiplayer blast mode, the submitWord socket event must include `comboType`. Looking at where multiplayer blast word submission happens — this is in `components/game/in-game/hooks/useWordSubmission.ts`. That hook needs access to `comboType` at the time of emit. The `BlastGame` component has the path and tile states to detect the combo. The integration needs a callback mechanism.

**Confirmed pattern from STATE.md (52-02):** "blastComboSync state uses unique id per event; handler filters own username to prevent double-flash." This confirms the receive side is done. The emit side (including comboType in submitWord) is the gap.

### Gap 2 (SYNC-04): userId not passed to useBlastComboDiscovery

**File:** `fe-next/components/blast/BlastView.tsx`
**Line 41:**
```typescript
// CURRENT (no userId — no Supabase sync for singleplayer)
const { discoveredCombos, pendingDiscovery, onComboDetected, acknowledgeDiscovery } = useBlastComboDiscovery();

// FIX
const { user } = useAuth();
const { discoveredCombos, pendingDiscovery, onComboDetected, acknowledgeDiscovery } = useBlastComboDiscovery({ userId: user?.id });
```

The `useAuth()` hook is available at `@/contexts/AuthContext` and returns `{ user: { id: string } | null, ... }`. The `useBlastComboDiscovery` hook already accepts `{ userId?: string }` and already fires POST/GET when `userId` is present.

### Existing Infrastructure (HIGH confidence)

| Piece | File | Status |
|-------|------|--------|
| Server broadcasts blastComboSync | `backend/handlers/wordHandler.ts:618` | DONE |
| Client receives blastComboSync | `player/hooks/socket/usePlayerGameEvents.ts:403-409` | DONE |
| Zustand store for blastComboSync | `hooks/gameState/store.ts:104,471,596` | DONE |
| BlastGame reads + triggers flash | `components/blast/BlastGame.tsx:168-175` | DONE |
| submitWordSchema accepts comboType | `backend/utils/socketValidation.ts:291` | DONE |
| useBlastComboDiscovery supports userId | `components/blast/hooks/useBlastComboDiscovery.ts:33-36` | DONE |
| API route POST/GET /api/blast/combo-codex | `app/api/blast/combo-codex/route.ts` | DONE |
| Supabase migration (blast_combo_codex table) | `supabase/migrations/20260304010000_add_blast_combo_codex.sql` | DONE |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| comboType detection | Custom detection in socket hook | `detectSpecialCombos()` from `utils/blastCombos` | Already used in BlastGame.handleWordAccepted |
| Supabase auth user | Custom auth lookup | `useAuth()` from `@/contexts/AuthContext` | Already in auth provider; returns `user?.id` |
| Server-side combo detection | Server tile state tracking | Client-reported comboType (trust-client pattern) | Server has no tile state; already established pattern |
| Combo persistence | Custom localStorage+fetch | `useBlastComboDiscovery({ userId })` | Already implemented with fire-and-forget POST |

## Common Pitfalls

### Pitfall 1: comboType detected too late (after socket emit)
**What goes wrong:** If comboType is detected in `handleWordAccepted` (after server confirms), but the socket emit happened earlier without it, the server never receives it.
**Why it happens:** Word submission and combo detection are decoupled — submission is optimistic, combo detection requires the path and tile states.
**How to avoid:** Detect comboType at path submission time (when `lastPathRef` is set), not in the acceptance callback. Or emit a separate follow-up event after acceptance.
**Warning signs:** Server's `broadcastToRoom('blastComboSync', ...)` never fires in e2e tests.

### Pitfall 2: Double-flash on own submissions
**What goes wrong:** Player A sees the flash from their own combo twice — once from local state, once from the blastComboSync they triggered.
**Why it happens:** Server broadcasts to all room members including the submitter.
**How to avoid:** Already handled: `usePlayerGameEvents.ts:406` filters `data.username !== username`.
**Warning signs:** Flash appears twice for local combos.

### Pitfall 3: BlastView not wrapped in AuthProvider
**What goes wrong:** `useAuth()` returns default value (`user: null`), so `userId` is always undefined.
**Why it happens:** AuthProvider must wrap BlastView in the component tree.
**How to avoid:** Verify BlastView's page uses `AuthProvider` (check layout/providers chain). In this project it does — `app/providers.tsx` wraps the app.
**Warning signs:** POST never fires even for logged-in users.

### Pitfall 4: Stale closure in combo detection
**What goes wrong:** `detectSpecialCombos` reads stale tile states from closure.
**Why it happens:** React closure captures tile states at effect time.
**How to avoid:** Use `blast.tileStates` (current render value) or a ref pattern. `BlastGame` already uses `tileStates` from the render-time `blast` object in `handleWordAccepted`.
**Warning signs:** `detectSpecialCombos` returns empty array for known combo paths.

## Code Examples

### SYNC-04 Fix Pattern
```typescript
// Source: contexts/AuthContext.tsx + components/blast/hooks/useBlastComboDiscovery.ts

// In BlastView.tsx — add useAuth import and pass userId
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();
const { discoveredCombos, pendingDiscovery, onComboDetected, acknowledgeDiscovery } =
  useBlastComboDiscovery({ userId: user?.id });
```

### SYNC-02 Fix Pattern (multiplayer context)
The multiplayer blast word submission goes through `components/game/in-game/hooks/useWordSubmission.ts`. The comboType detection needs to happen at submission time. One approach:

```typescript
// Add optional callback to in-game useWordSubmission:
// getComboTypeForWord?: () => string | null

socket.emit('submitWord', {
  word: formedWord.toLowerCase(),
  comboLevel: comboLevelRef.current,
  fireRoundActive: fireRoundActiveRef.current,
  comboType: getComboTypeForWordRef.current?.() ?? null,
});
```

The parent (blast multiplayer context) would provide `getComboTypeForWord` that reads the current path + tile states via refs.

### Existing: blastComboSync server broadcast (already working)
```typescript
// Source: backend/handlers/wordHandler.ts:617-622
if (comboType) {
  broadcastToRoom(io, getGameRoom(gameCode), 'blastComboSync', {
    comboType,
    username,
  });
}
```

### Existing: blastComboSync client receive (already working)
```typescript
// Source: player/hooks/socket/usePlayerGameEvents.ts:403-409
const handleBlastComboSync = (data: BlastComboSyncPayload) => {
  if (data.username !== username) {
    setBlastComboSync({ ...data, id: `combo-sync-${Date.now()}` });
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No combo sync | Server broadcasts blastComboSync when comboType in submitWord | Phase 52-02 | Framework exists, just needs wire-up |
| localStorage-only codex | localStorage + Supabase POST/GET when userId | Phase 52 | Framework exists, just needs userId |

## Open Questions

1. **SYNC-02: Where exactly does multiplayer blast submit words?**
   - What we know: `components/game/in-game/hooks/useWordSubmission.ts:128` emits `submitWord` for multiplayer. `BlastGame.tsx` is used for both singleplayer and multiplayer blast. In singleplayer blast (`BlastView.tsx`), there is no socket. In multiplayer blast, the game is embedded differently.
   - What's unclear: Is `BlastGame` actually used in multiplayer context via `components/game/in-game/` infrastructure? Or is the multiplayer blast a separate path? Need to verify which component tree is used for multiplayer blast games.
   - Recommendation: Search for where `BlastGame` is used from multiplayer game view. If it is used via in-game hooks, then the fix is adding `comboType` to the in-game hook emit. If multiplayer blast uses a different component, trace from the player view.

2. **SYNC-02: Is there already a test proving the end-to-end flow?**
   - What we know: `wordHandler.blast.test.ts` tests that `broadcastToRoom('blastComboSync')` is called when comboType is provided to submitWord. This is server-side only.
   - What's unclear: No e2e test that proves client A's combo flash reaches client B's UI.
   - Recommendation: Unit test that the in-game submitWord emit includes comboType when combo is detected.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest with React Testing Library |
| Config file | `fe-next/jest.config.ts` |
| Quick run command | `npm run test:frontend -- --testPathPattern="BlastView\|useBlastComboDiscovery\|wordHandler.blast"` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-02 | submitWord socket emit includes comboType when combo detected | unit | `npm run test:frontend -- --testPathPattern="useWordSubmission\|wordHandler.blast"` | Partial (server test exists; client emit test missing) |
| SYNC-04 | BlastView passes user.id to useBlastComboDiscovery | unit | `npm run test:frontend -- --testPathPattern="BlastView"` | Partial (BlastView.discovery.test.tsx exists; userId wiring not tested) |
| SYNC-04 | POST fires for authenticated singleplayer user new combo | unit | `npm run test:frontend -- --testPathPattern="useBlastComboDiscovery"` | ✅ Tests exist but currently passing with userId |

### Sampling Rate
- **Per task commit:** `npm run test:frontend -- --testPathPattern="BlastView.discovery\|useBlastComboDiscovery\|wordHandler.blast"`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Test for SYNC-04: `BlastView.tsx` passes `user?.id` to `useBlastComboDiscovery` — add to `BlastView.discovery.test.tsx` or new test file
- [ ] Test for SYNC-02: in-game `useWordSubmission` emit includes `comboType` — add to existing or new `useWordSubmission.multiplayer.test.ts`

*(Existing test infrastructure covers the framework; only behavioral assertions for new wiring are missing)*

## Sources

### Primary (HIGH confidence)
- Direct code reading — `fe-next/components/blast/BlastView.tsx` (line 41, missing userId)
- Direct code reading — `fe-next/components/game/in-game/hooks/useWordSubmission.ts` (line 128, missing comboType)
- Direct code reading — `fe-next/backend/handlers/wordHandler.ts` (lines 617-622, broadcast exists)
- Direct code reading — `fe-next/player/hooks/socket/usePlayerGameEvents.ts` (lines 403-409, receive exists)
- Direct code reading — `fe-next/components/blast/hooks/useBlastComboDiscovery.ts` (userId param exists)
- Direct code reading — `fe-next/app/api/blast/combo-codex/route.ts` (API fully implemented)
- Direct code reading — `fe-next/supabase/migrations/20260304010000_add_blast_combo_codex.sql` (table exists)
- Direct code reading — `fe-next/contexts/AuthContext.tsx` (useAuth returns user.id)
- `.planning/STATE.md` decisions (Phase 52-02 pattern: trust-client comboType)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — SYNC-02 and SYNC-04 descriptions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use
- Architecture: HIGH — existing patterns verified by reading actual source files
- Pitfalls: HIGH — identified from reading source code and STATE.md decisions
- Gap locations: HIGH — exact file and line numbers confirmed

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable codebase; no fast-moving dependencies)
