# Classic Mode Catalyst Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In multiplayer classic games, the server picks exactly one of four catalysts (earthquake, blizzard, lightning, meteor) at game start, each running ~1.5× longer than today, with warning UI that explains what the catalyst does.

**Architecture:** `roundEventsManager` becomes the single catalyst scheduler. It picks from a 4-entry pool; if the pick is `earthquake` it calls the (now exported) `executeEarthquakeSequence`, otherwise `executeRoundEvent`. The host-client earthquake trigger path is removed for multiplayer (single-player keeps its own client-driven earthquake untouched). Durations are bumped in two server-side config objects. Warning components gain a plain-language effect line backed by new translation keys.

**Tech Stack:** TypeScript, Node/Express + Socket.IO backend, React (Next.js) frontend, Vitest/Jest tests.

**Working directory:** all paths below are relative to `/Users/ohadfisher/git/boggle-new/fe-next/`. Run all commands from `fe-next/`.

---

## Background — exact current state

- `backend/handlers/earthquakeHandler.ts`
  - Lines 57-61: `EARTHQUAKE_CONFIG = { warningDurationMs: 2000, shakeDurationMs: 1000, fireRoundDurationSeconds: 15 }`
  - Lines 82-141: `socket.on('triggerEarthquake', ...)` — host-only, sets `earthquakeTriggered`, calls `executeEarthquakeSequence`.
  - Line 150: `function executeEarthquakeSequence(io: Server, gameCode: string, game: GameState): void` — **currently not exported**.
  - Lines 216-220: `broadcastToRoom(io, room, 'fireRoundStart', { gameSessionId, grid: newGrid, duration: EARTHQUAKE_CONFIG.fireRoundDurationSeconds })`.
  - Lines 260-264: `export { registerEarthquakeHandlers, clearGameEarthquakeState, EARTHQUAKE_CONFIG };`
- `backend/modules/roundEventsManager.ts`
  - Lines 18-34: `RoundEventType = 'blizzard' | 'lightning' | 'meteor'`, `EVENT_TYPES`, `EVENT_CONFIG`.
  - Lines 99-137: `scheduleRoundEvent(io, gameCode, _game, totalTimerSeconds)` — picks via `pickRandomEventType()`, schedules one timer.
  - Lines ~122-126: guard `if (currentGame.earthquakeTriggered || currentGame.fireRoundActive) { clearRoundEventTimers(gameCode); return; }`.
- `backend/handlers/gameStartHandler.ts` line 603: `scheduleRoundEvent(io, gameCode, game, validTimer);` (only when `resolvedMode === 'classic' && playerUsernames.length >= 2`).
- `hooks/useEarthquakeFireRound.ts`
  - Lines 88-119: `useEffect` computing `triggerTimeRef.current` (the trigger window). Guard at top: `if (!enabled || triggerTimeRef.current !== null) return;`.
  - Lines 194-216: `triggerEarthquake` callback — MP-host branch emits `socket.emit('triggerEarthquake', ...)`, else calls local `executeEarthquakeSequence()`.
- `shared/utils/earthquakeSocketHandlers.ts` line 166: `const duration = data.duration || 15;` — client reads fire-round duration from payload.
- `components/earthquake/EarthquakeWarning.tsx` lines ~130-138: renders `t('earthquake.warning')` + `t('earthquake.brace')`.
- `components/earthquake/FireRoundIndicator.tsx` lines ~108-115: renders `t('earthquake.fireRound')` + `t('earthquake.multiplier')`.
- `components/game/in-game/components/RoundEventOverlay.tsx` lines 28-52: `EVENT_CONFIG` map with `warningText`; lines ~225-232 render `t(config.warningText)`.
- `translations/en.js` line ~701: `roundEvent` block; line ~774: `earthquake` block. Same blocks exist in `he.js`, `sv.js`, `ja.js`, `es.js`.

## File Structure (what changes)

| File | Responsibility after change |
|---|---|
| `backend/handlers/earthquakeHandler.ts` | Longer earthquake durations; `executeEarthquakeSequence` exported; `triggerEarthquake` socket handler removed |
| `backend/modules/roundEventsManager.ts` | Single catalyst scheduler over a 4-entry pool; longer round-event durations; obsolete mutual-exclusion guard removed |
| `hooks/useEarthquakeFireRound.ts` | Single-player only; multiplayer trigger path removed |
| `translations/{en,he,sv,ja,es}.js` | New `*.effect` strings for the four catalysts |
| `components/earthquake/EarthquakeWarning.tsx` | Renders earthquake effect line |
| `components/earthquake/FireRoundIndicator.tsx` | Renders persistent effect label during fire round |
| `components/game/in-game/components/RoundEventOverlay.tsx` | Renders per-event effect line in the warning banner |

---

## Task 1: Scale earthquake durations

**Files:**
- Modify: `backend/handlers/earthquakeHandler.ts:57-61`
- Test: `backend/handlers/__tests__/earthquakeHandler.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Add to `backend/handlers/__tests__/earthquakeHandler.test.ts`:

```typescript
import { EARTHQUAKE_CONFIG } from '../earthquakeHandler';

describe('EARTHQUAKE_CONFIG durations (catalyst unification)', () => {
  it('uses the scaled-up multiplayer durations', () => {
    expect(EARTHQUAKE_CONFIG.warningDurationMs).toBe(3000);
    expect(EARTHQUAKE_CONFIG.shakeDurationMs).toBe(1500);
    expect(EARTHQUAKE_CONFIG.fireRoundDurationSeconds).toBe(23);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- backend/handlers/__tests__/earthquakeHandler.test.ts`
Expected: FAIL — `warningDurationMs` is `2000`, not `3000`.

- [ ] **Step 3: Apply the change**

In `backend/handlers/earthquakeHandler.ts`, replace lines 57-61:

```typescript
const EARTHQUAKE_CONFIG = {
  warningDurationMs: 3000,  // 3 seconds
  shakeDurationMs: 1500,    // 1.5 seconds
  fireRoundDurationSeconds: 23, // 23 seconds (~1.5x previous 15s)
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- backend/handlers/__tests__/earthquakeHandler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/handlers/earthquakeHandler.ts backend/handlers/__tests__/earthquakeHandler.test.ts
git commit -m "feat: scale up earthquake catalyst durations"
```

---

## Task 2: Scale round-event durations

**Files:**
- Modify: `backend/modules/roundEventsManager.ts:30-34`
- Test: `backend/modules/__tests__/roundEventsManager.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Add to `backend/modules/__tests__/roundEventsManager.test.ts`:

```typescript
import { EVENT_CONFIG } from '../roundEventsManager';

describe('EVENT_CONFIG durations (catalyst unification)', () => {
  it('uses the scaled-up round-event durations', () => {
    expect(EVENT_CONFIG.blizzard).toEqual({ durationMs: 18_000, warningMs: 3_000 });
    expect(EVENT_CONFIG.lightning).toEqual({ durationMs: 15_000, warningMs: 3_000 });
    expect(EVENT_CONFIG.meteor).toEqual({ durationMs: 12_000, warningMs: 3_000 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- backend/modules/__tests__/roundEventsManager.test.ts`
Expected: FAIL — either `EVENT_CONFIG` is not exported, or values are the old `12_000 / 2_000` etc.

- [ ] **Step 3: Apply the change**

In `backend/modules/roundEventsManager.ts`, replace the `EVENT_CONFIG` definition (lines 30-34) and ensure it is exported:

```typescript
export const EVENT_CONFIG: Record<RoundEventType, { durationMs: number; warningMs: number }> = {
  blizzard: { durationMs: 18_000, warningMs: 3_000 },
  lightning: { durationMs: 15_000, warningMs: 3_000 },
  meteor: { durationMs: 12_000, warningMs: 3_000 },
};
```

(If `EVENT_CONFIG` was already exported, keep the `export` — only the values change.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- backend/modules/__tests__/roundEventsManager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/modules/roundEventsManager.ts backend/modules/__tests__/roundEventsManager.test.ts
git commit -m "feat: scale up round-event catalyst durations"
```

---

## Task 3: Export `executeEarthquakeSequence`

**Files:**
- Modify: `backend/handlers/earthquakeHandler.ts:150` and `:260-264`
- Test: `backend/handlers/__tests__/earthquakeHandler.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `backend/handlers/__tests__/earthquakeHandler.test.ts`:

```typescript
import * as earthquakeHandler from '../earthquakeHandler';

describe('executeEarthquakeSequence export (catalyst unification)', () => {
  it('is exported so the catalyst scheduler can invoke it', () => {
    expect(typeof earthquakeHandler.executeEarthquakeSequence).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- backend/handlers/__tests__/earthquakeHandler.test.ts`
Expected: FAIL — `earthquakeHandler.executeEarthquakeSequence` is `undefined`.

- [ ] **Step 3: Apply the change**

In `backend/handlers/earthquakeHandler.ts`:

Change the declaration on line 150 from:

```typescript
function executeEarthquakeSequence(io: Server, gameCode: string, game: GameState): void {
```

to:

```typescript
export function executeEarthquakeSequence(io: Server, gameCode: string, game: GameState): void {
```

Then update the export block (lines 260-264) to also re-export it explicitly for consistency:

```typescript
export {
  registerEarthquakeHandlers,
  clearGameEarthquakeState,
  EARTHQUAKE_CONFIG,
  executeEarthquakeSequence,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- backend/handlers/__tests__/earthquakeHandler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/handlers/earthquakeHandler.ts backend/handlers/__tests__/earthquakeHandler.test.ts
git commit -m "refactor: export executeEarthquakeSequence for catalyst scheduler"
```

---

## Task 4: Add `earthquake` to the catalyst pool in `roundEventsManager`

This makes `roundEventsManager` the single scheduler over all four catalysts.

**Files:**
- Modify: `backend/modules/roundEventsManager.ts` (type/pool near lines 18-26; `scheduleRoundEvent` lines 99-137; remove guard ~122-126)
- Test: `backend/modules/__tests__/roundEventsManager.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `backend/modules/__tests__/roundEventsManager.test.ts`:

```typescript
import { CATALYST_POOL, pickRandomCatalyst } from '../roundEventsManager';

describe('catalyst pool (catalyst unification)', () => {
  it('contains exactly the four catalysts', () => {
    expect([...CATALYST_POOL].sort()).toEqual(
      ['blizzard', 'earthquake', 'lightning', 'meteor']
    );
  });

  it('pickRandomCatalyst only ever returns a pool member', () => {
    for (let i = 0; i < 200; i++) {
      expect(CATALYST_POOL).toContain(pickRandomCatalyst());
    }
  });

  it('pickRandomCatalyst can return earthquake', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(pickRandomCatalyst());
    expect(seen.has('earthquake')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- backend/modules/__tests__/roundEventsManager.test.ts`
Expected: FAIL — `CATALYST_POOL` and `pickRandomCatalyst` are not exported.

- [ ] **Step 3: Apply the change**

In `backend/modules/roundEventsManager.ts`:

(a) Below the existing `RoundEventType` definition and `EVENT_TYPES` (lines 18-26 area), add the catalyst type and pool:

```typescript
export type CatalystType = RoundEventType | 'earthquake';

export const CATALYST_POOL: readonly CatalystType[] = [
  'blizzard',
  'lightning',
  'meteor',
  'earthquake',
] as const;

export function pickRandomCatalyst(): CatalystType {
  return CATALYST_POOL[Math.floor(Math.random() * CATALYST_POOL.length)];
}
```

(b) Add an import for the earthquake sequence at the top of the file, alongside the other backend imports:

```typescript
import { executeEarthquakeSequence } from '../handlers/earthquakeHandler';
```

(c) Rewrite `scheduleRoundEvent` (lines 99-137) so it picks from the catalyst pool and routes earthquake separately. Replace the whole function with:

```typescript
export function scheduleRoundEvent(
  io: Server,
  gameCode: string,
  game: GameState,
  totalTimerSeconds: number
): void {
  const catalyst = pickRandomCatalyst();
  const triggerAtPercent =
    SCHEDULE_MIN_PERCENT + Math.random() * (SCHEDULE_MAX_PERCENT - SCHEDULE_MIN_PERCENT);

  updateGame(gameCode, {
    roundEventSchedule: { eventType: catalyst, triggerAtPercent },
    activeRoundEvent: null,
  });

  const triggerDelayMs = totalTimerSeconds * 1000 * triggerAtPercent;

  timerManager.setTimeout(
    `roundEvent:${gameCode}:trigger`,
    () => {
      const currentGame = getGame(gameCode);
      if (!currentGame || currentGame.gameState !== 'in-progress') {
        clearRoundEventTimers(gameCode);
        return;
      }

      if (catalyst === 'earthquake') {
        updateGame(gameCode, { earthquakeTriggered: true });
        const armedGame = getGame(gameCode);
        if (armedGame) {
          executeEarthquakeSequence(io, gameCode, armedGame);
        }
        return;
      }

      executeRoundEvent(io, gameCode, currentGame, catalyst);
    },
    triggerDelayMs
  );

  logger.info(
    'ROUND_EVENT',
    `Game ${gameCode}: scheduled catalyst '${catalyst}' at ${Math.round(triggerAtPercent * 100)}% of game (${Math.round(triggerDelayMs / 1000)}s)`
  );
}
```

Notes:
- The `_game` parameter is now used (renamed to `game`) — it is passed through for the earthquake branch via a fresh `getGame` read to ensure the `earthquakeTriggered` flag is set first.
- The old mutual-exclusion guard (`if (currentGame.earthquakeTriggered || currentGame.fireRoundActive) { ... }`) is **deleted** — under unified selection nothing else arms a catalyst, and when the pick *is* earthquake the guard would wrongly block our own catalyst.
- `executeRoundEvent` is called with `catalyst` typed as `RoundEventType` — TypeScript narrows it correctly because the `catalyst === 'earthquake'` branch returns. If the compiler does not narrow (depends on TS version), cast at the call site: `executeRoundEvent(io, gameCode, currentGame, catalyst as RoundEventType)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- backend/modules/__tests__/roundEventsManager.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `cd fe-next && npx tsc --noEmit`
Expected: no errors in `roundEventsManager.ts` or `earthquakeHandler.ts`.

- [ ] **Step 6: Commit**

```bash
git add backend/modules/roundEventsManager.ts backend/modules/__tests__/roundEventsManager.test.ts
git commit -m "feat: unify catalyst selection — server picks one of four at game start"
```

---

## Task 5: Remove the multiplayer `triggerEarthquake` socket handler

The host-client trigger path is now dead — the server schedules earthquake. Remove the handler and its host-only logic. `executeEarthquakeSequence` stays (called by `roundEventsManager`).

**Files:**
- Modify: `backend/handlers/earthquakeHandler.ts:82-141` (inside `registerEarthquakeHandlers`)
- Test: `backend/handlers/__tests__/earthquakeHandler.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `backend/handlers/__tests__/earthquakeHandler.test.ts`:

```typescript
import { registerEarthquakeHandlers } from '../earthquakeHandler';

describe('triggerEarthquake socket handler removal (catalyst unification)', () => {
  it('does not register a triggerEarthquake listener', () => {
    const registered: string[] = [];
    const fakeSocket = {
      id: 'sock-1',
      on: (event: string) => { registered.push(event); },
    } as unknown as import('socket.io').Socket;
    const fakeIo = {} as unknown as import('socket.io').Server;

    registerEarthquakeHandlers(fakeIo, fakeSocket);

    expect(registered).not.toContain('triggerEarthquake');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- backend/handlers/__tests__/earthquakeHandler.test.ts`
Expected: FAIL — `registered` contains `'triggerEarthquake'`.

- [ ] **Step 3: Apply the change**

In `backend/handlers/earthquakeHandler.ts`, delete the entire `socket.on('triggerEarthquake', (data: TriggerEarthquakePayload) => { ... });` block (lines 82-141, from `socket.on('triggerEarthquake'` through its closing `});`).

If `registerEarthquakeHandlers` becomes an empty function body after this, keep the function (it is still exported and called per-socket) — leave a one-line comment inside:

```typescript
function registerEarthquakeHandlers(_io: Server, _socket: Socket): void {
  // Earthquake is scheduled server-side by roundEventsManager; no socket events to register.
}
```

If `TriggerEarthquakePayload` is now unused in this file, remove its import. Run `npx tsc --noEmit` in Step 5 to confirm.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- backend/handlers/__tests__/earthquakeHandler.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `cd fe-next && npx tsc --noEmit`
Expected: no errors. If an unused-import error appears for `TriggerEarthquakePayload`, remove that import line and re-run.

- [ ] **Step 6: Commit**

```bash
git add backend/handlers/earthquakeHandler.ts backend/handlers/__tests__/earthquakeHandler.test.ts
git commit -m "refactor: remove dead multiplayer triggerEarthquake socket handler"
```

---

## Task 6: Strip the multiplayer path from `useEarthquakeFireRound`

Single-player keeps its client-driven earthquake. Multiplayer must not arm a client-side trigger — the server drives it via broadcasts handled by `earthquakeSocketHandlers`.

**Files:**
- Modify: `hooks/useEarthquakeFireRound.ts` (window-calc `useEffect` ~line 90; `triggerEarthquake` callback lines 194-216)
- Test: `hooks/__tests__/useEarthquakeFireRound.test.ts` (or `.tsx` — match the existing test file's extension; create if absent)

- [ ] **Step 1: Write the failing test**

Add to the existing `useEarthquakeFireRound` test file (use `@testing-library/react`'s `renderHook`, matching how other hook tests in this folder are written):

```typescript
import { renderHook } from '@testing-library/react';
import { useEarthquakeFireRound } from '../useEarthquakeFireRound';

describe('useEarthquakeFireRound multiplayer path removal (catalyst unification)', () => {
  it('never emits triggerEarthquake in multiplayer mode', () => {
    const emit = vi.fn();
    const socket = { emit } as unknown as import('socket.io-client').Socket;

    const { result } = renderHook(() =>
      useEarthquakeFireRound({
        enabled: true,
        mode: 'multiplayer',
        isHost: true,
        socket,
        gameDurationSeconds: 120,
        currentTimeSeconds: 120,
        gameSessionId: 'sess-1',
      } as Parameters<typeof useEarthquakeFireRound>[0])
    );

    // Force a trigger attempt; in multiplayer it must be a no-op (server-driven).
    result.current.triggerEarthquake(true);

    expect(emit).not.toHaveBeenCalled();
  });
});
```

(If `vi` is not in scope, use the project's configured mock fn — `jest.fn()` for Jest-run hook tests. Match the existing file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- hooks/__tests__/useEarthquakeFireRound.test.ts`
Expected: FAIL — `emit` was called with `'triggerEarthquake'`.

- [ ] **Step 3: Apply the change**

In `hooks/useEarthquakeFireRound.ts`:

(a) In the trigger-window `useEffect` (top of the effect, ~line 90), change the early-return guard so the window is never armed in multiplayer. Replace:

```typescript
  if (!enabled || triggerTimeRef.current !== null) return;
```

with:

```typescript
  // Multiplayer earthquake is scheduled server-side (roundEventsManager) — never arm a client trigger.
  if (!enabled || mode === 'multiplayer' || triggerTimeRef.current !== null) return;
```

Add `mode` to that `useEffect`'s dependency array (it currently lists `[enabled, gameDurationSeconds, config]` — make it `[enabled, mode, gameDurationSeconds, config]`).

(b) In the `triggerEarthquake` callback (lines 194-216), remove the multiplayer-host emit branch. Replace the whole callback body with:

```typescript
const triggerEarthquake = useCallback((force = false) => {
  // Multiplayer earthquake is server-driven; the client never triggers it.
  if (mode === 'multiplayer') return;

  // Non-force triggers: check if already triggered or in progress
  if (!force) {
    if (earthquakeTriggeredRef.current || earthquakeState !== 'idle') {
      return;
    }
  }

  earthquakeTriggeredRef.current = true;

  // Single-player: execute earthquake sequence locally
  executeEarthquakeSequence();
}, [mode, executeEarthquakeSequence, earthquakeState]);
```

Note: `isHost`, `socket`, `gameSessionId`, `currentTimeSeconds` and `TriggerEarthquakePayload` may now be unused inside this callback. Leave the hook's *props* intact (the SP/MP shared signature stays), but if `TriggerEarthquakePayload` import becomes unused in this file, remove it. The type-check in Step 5 will surface unused symbols.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- hooks/__tests__/useEarthquakeFireRound.test.ts`
Expected: PASS. Also confirm pre-existing single-player tests in the same file still pass.

- [ ] **Step 5: Type-check**

Run: `cd fe-next && npx tsc --noEmit`
Expected: no errors. Remove any now-unused imports flagged in `useEarthquakeFireRound.ts`.

- [ ] **Step 6: Commit**

```bash
git add hooks/useEarthquakeFireRound.ts hooks/__tests__/useEarthquakeFireRound.test.ts
git commit -m "refactor: make useEarthquakeFireRound single-player only"
```

---

## Task 7: Add catalyst effect-description translation keys

One plain-language effect string per catalyst, in all five locales.

**Files:**
- Modify: `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`
- Test: `translations/__tests__/catalystEffectKeys.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `translations/__tests__/catalystEffectKeys.test.ts`:

```typescript
import en from '../en';
import he from '../he';
import sv from '../sv';
import ja from '../ja';
import es from '../es';

const locales = { en, he, sv, ja, es };

describe('catalyst effect-description keys (catalyst unification)', () => {
  for (const [name, dict] of Object.entries(locales)) {
    it(`${name} has earthquake.effect and roundEvent.{blizzard,lightning,meteor}Effect`, () => {
      expect(typeof (dict as any).earthquake?.effect).toBe('string');
      expect((dict as any).earthquake.effect.length).toBeGreaterThan(0);
      expect(typeof (dict as any).roundEvent?.blizzardEffect).toBe('string');
      expect(typeof (dict as any).roundEvent?.lightningEffect).toBe('string');
      expect(typeof (dict as any).roundEvent?.meteorEffect).toBe('string');
    });
  }
});
```

(If `translations/*.js` are not ESM-default-exportable in the test runner, match the import style already used by existing translation tests in the repo — e.g. `const en = require('../en')`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- translations/__tests__/catalystEffectKeys.test.ts`
Expected: FAIL — keys are `undefined`.

- [ ] **Step 3: Apply the change**

In `translations/en.js`, add to the `earthquake` block (after `"multiplier"`):

```javascript
    "effect": "The whole board is replaced — score fast for 2× points",
```

and to the `roundEvent` block (after `"meteorWarning"`):

```javascript
    "blizzardEffect": "Frozen tiles can't be used until they thaw",
    "lightningEffect": "Charged tiles score bonus points — grab them fast",
    "meteorEffect": "New letters crash in — fresh words appear",
```

In `translations/he.js` (Hebrew, RTL):

```javascript
    // earthquake block:
    "effect": "כל הלוח מתחלף — צברו נקודות מהר לבונוס ×2",
    // roundEvent block:
    "blizzardEffect": "אריחים קפואים לא ניתנים לשימוש עד שיפשירו",
    "lightningEffect": "אריחים טעונים מזכים בנקודות בונוס — תפסו אותם מהר",
    "meteorEffect": "אותיות חדשות נוחתות — מילים חדשות נפתחות",
```

In `translations/sv.js` (Swedish):

```javascript
    // earthquake block:
    "effect": "Hela brädet byts ut — poängjaga snabbt för 2× poäng",
    // roundEvent block:
    "blizzardEffect": "Frusna brickor kan inte användas förrän de tinar",
    "lightningEffect": "Laddade brickor ger bonuspoäng — ta dem snabbt",
    "meteorEffect": "Nya bokstäver slår ner — färska ord dyker upp",
```

In `translations/ja.js` (Japanese):

```javascript
    // earthquake block:
    "effect": "ボード全体が入れ替わる — 急いで得点して2倍ボーナス",
    // roundEvent block:
    "blizzardEffect": "凍ったタイルは溶けるまで使えません",
    "lightningEffect": "帯電タイルはボーナス得点 — 早く取ろう",
    "meteorEffect": "新しい文字が降ってくる — 新たな単語が出現",
```

In `translations/es.js` (Spanish):

```javascript
    // earthquake block:
    "effect": "Todo el tablero se reemplaza — anota rápido para 2× puntos",
    // roundEvent block:
    "blizzardEffect": "Las fichas congeladas no se pueden usar hasta que se descongelen",
    "lightningEffect": "Las fichas cargadas dan puntos extra — atrápalas rápido",
    "meteorEffect": "Caen letras nuevas — aparecen palabras frescas",
```

> The HE/SV/JA/ES strings are AI-generated — flag them for native review (project standard, per memory).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- translations/__tests__/catalystEffectKeys.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add translations/en.js translations/he.js translations/sv.js translations/ja.js translations/es.js translations/__tests__/catalystEffectKeys.test.ts
git commit -m "feat: add catalyst effect-description translation keys (HE/SV/JA/ES need native review)"
```

---

## Task 8: Render the earthquake effect line in `EarthquakeWarning`

**Files:**
- Modify: `components/earthquake/EarthquakeWarning.tsx` (warning-text block, ~lines 130-138)
- Test: `components/earthquake/__tests__/EarthquakeWarning.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test**

Add to `components/earthquake/__tests__/EarthquakeWarning.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { EarthquakeWarning } from '../EarthquakeWarning';

describe('EarthquakeWarning effect line (catalyst unification)', () => {
  it('renders the plain-language effect description', () => {
    const t = (key: string) =>
      key === 'earthquake.effect' ? 'The whole board is replaced — score fast for 2× points' : key;
    render(<EarthquakeWarning isVisible t={t} /* ...spread any other required props with minimal stubs */ />);
    expect(
      screen.getByText('The whole board is replaced — score fast for 2× points')
    ).toBeInTheDocument();
  });
});
```

> Before writing the test, open `EarthquakeWarning.tsx` and read its props interface; pass the minimal required props (the component currently consumes at least `isVisible` and `t`). Match the existing test files in `components/earthquake/__tests__/` for the exact prop shape.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- components/earthquake/__tests__/EarthquakeWarning.test.tsx`
Expected: FAIL — text not found.

- [ ] **Step 3: Apply the change**

In `components/earthquake/EarthquakeWarning.tsx`, in the "Warning Text" block, add a third line under `t('earthquake.brace')`. Replace:

```tsx
            {/* Warning Text */}
            <div className="text-center">
              <h2 className="text-3xl font-black uppercase text-neo-cream mb-2 tracking-wide">
                {t('earthquake.warning')}
              </h2>
              <p className="text-lg font-bold text-neo-cream/80">
                {t('earthquake.brace')}
              </p>
            </div>
```

with:

```tsx
            {/* Warning Text */}
            <div className="text-center">
              <h2 className="text-3xl font-black uppercase text-neo-cream mb-2 tracking-wide">
                {t('earthquake.warning')}
              </h2>
              <p className="text-lg font-bold text-neo-cream/80">
                {t('earthquake.brace')}
              </p>
              <p className="mt-2 text-sm font-bold text-neo-cream/90 leading-snug border-t-2 border-neo-cream/30 pt-2">
                {t('earthquake.effect')}
              </p>
            </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- components/earthquake/__tests__/EarthquakeWarning.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/earthquake/EarthquakeWarning.tsx components/earthquake/__tests__/EarthquakeWarning.test.tsx
git commit -m "feat: explain earthquake effect in the warning overlay"
```

---

## Task 9: Render a persistent effect label in `FireRoundIndicator`

The active fire-round badge currently shows only "FIRE ROUND" + "2× EVERYTHING" + countdown. Add the effect line so players understand the catalyst during the active phase.

**Files:**
- Modify: `components/earthquake/FireRoundIndicator.tsx` (the "Text" `<div className="flex flex-col">` block, ~lines 108-115)
- Test: `components/earthquake/__tests__/FireRoundIndicator.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test**

Add to `components/earthquake/__tests__/FireRoundIndicator.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { FireRoundIndicator } from '../FireRoundIndicator';

describe('FireRoundIndicator effect label (catalyst unification)', () => {
  it('renders the effect description while active', () => {
    const t = (key: string) =>
      key === 'earthquake.effect' ? 'The whole board is replaced — score fast for 2× points' : key;
    render(
      <FireRoundIndicator isActive remainingSeconds={20} t={t} /* ...minimal required props */ />
    );
    expect(
      screen.getByText('The whole board is replaced — score fast for 2× points')
    ).toBeInTheDocument();
  });
});
```

> Read `FireRoundIndicator.tsx`'s props interface first and pass the minimal required props; match the existing earthquake test files.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- components/earthquake/__tests__/FireRoundIndicator.test.tsx`
Expected: FAIL — text not found.

- [ ] **Step 3: Apply the change**

In `components/earthquake/FireRoundIndicator.tsx`, replace the "Text" block:

```tsx
            {/* Text */}
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-wide text-neo-cream leading-none">
                {t('earthquake.fireRound')}
              </span>
              <span className="text-xs font-bold text-neo-lime leading-none mt-0.5">
                {t('earthquake.multiplier')}
              </span>
            </div>
```

with:

```tsx
            {/* Text */}
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-wide text-neo-cream leading-none">
                {t('earthquake.fireRound')}
              </span>
              <span className="text-xs font-bold text-neo-lime leading-none mt-0.5">
                {t('earthquake.multiplier')}
              </span>
              <span className="max-w-[11rem] text-[10px] font-semibold text-neo-cream/85 leading-tight mt-1">
                {t('earthquake.effect')}
              </span>
            </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- components/earthquake/__tests__/FireRoundIndicator.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/earthquake/FireRoundIndicator.tsx components/earthquake/__tests__/FireRoundIndicator.test.tsx
git commit -m "feat: show earthquake effect label during fire round"
```

---

## Task 10: Render the per-event effect line in `RoundEventOverlay`

**Files:**
- Modify: `components/game/in-game/components/RoundEventOverlay.tsx` (`EVENT_CONFIG` map lines 28-52; warning render ~lines 225-235)
- Test: `components/game/in-game/components/__tests__/RoundEventOverlay.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test**

Add to `components/game/in-game/components/__tests__/RoundEventOverlay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { RoundEventOverlay } from '../RoundEventOverlay';

describe('RoundEventOverlay effect line (catalyst unification)', () => {
  it('renders the per-event effect description in the warning banner', () => {
    const t = (key: string) =>
      key === 'roundEvent.blizzardEffect'
        ? "Frozen tiles can't be used until they thaw"
        : key;
    render(
      <RoundEventOverlay event={{ type: 'blizzard', phase: 'warning' }} t={t} />
    );
    expect(
      screen.getByText("Frozen tiles can't be used until they thaw")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm test -- components/game/in-game/components/__tests__/RoundEventOverlay.test.tsx`
Expected: FAIL — text not found.

- [ ] **Step 3: Apply the change**

In `components/game/in-game/components/RoundEventOverlay.tsx`:

(a) Add an `effectText` field to each entry in the `EVENT_CONFIG` map (lines 28-52). The map type becomes:

```typescript
const EVENT_CONFIG: Record<RoundEventType, {
  warningText: string;
  effectText: string;
  icon: string;
  warningBg: string;
  warningGlow: string;
}> = {
  blizzard: {
    warningText: 'roundEvent.blizzardWarning',
    effectText: 'roundEvent.blizzardEffect',
    icon: '❄️',
    warningBg: 'bg-linear-to-r from-blue-900/95 via-cyan-900/95 to-blue-900/95 border-cyan-300',
    warningGlow: 'shadow-[0_0_60px_rgba(96,165,250,0.8),0_0_120px_rgba(96,165,250,0.3)]',
  },
  lightning: {
    warningText: 'roundEvent.lightningWarning',
    effectText: 'roundEvent.lightningEffect',
    icon: '⚡',
    warningBg: 'bg-linear-to-r from-indigo-900/95 via-purple-900/95 to-indigo-900/95 border-yellow-300',
    warningGlow: 'shadow-[0_0_60px_rgba(250,204,21,0.8),0_0_120px_rgba(250,204,21,0.3)]',
  },
  meteor: {
    warningText: 'roundEvent.meteorWarning',
    effectText: 'roundEvent.meteorEffect',
    icon: '☄️',
    warningBg: 'bg-linear-to-r from-red-900/95 via-orange-900/95 to-red-900/95 border-orange-300',
    warningGlow: 'shadow-[0_0_60px_rgba(251,146,60,0.8),0_0_120px_rgba(251,146,60,0.3)]',
  },
};
```

(b) In the warning banner render, add an effect line after the warning-text `<AdaptiveMotion.span>` (the one rendering `{t(config.warningText)}`) and before the decorative line. Insert:

```tsx
        {/* Effect description — explains what the catalyst does */}
        <AdaptiveMotion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.25, ease: 'easeOut' }}
          className="text-sm sm:text-base font-medium text-white/90 text-center max-w-xs drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
        >
          {t(config.effectText)}
        </AdaptiveMotion.span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm test -- components/game/in-game/components/__tests__/RoundEventOverlay.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/game/in-game/components/RoundEventOverlay.tsx components/game/in-game/components/__tests__/RoundEventOverlay.test.tsx
git commit -m "feat: explain blizzard/lightning/meteor effects in the warning banner"
```

---

## Task 11: Full verification

- [ ] **Step 1: Lint**

Run: `cd fe-next && npm run lint`
Expected: no new errors.

- [ ] **Step 2: Type-check**

Run: `cd fe-next && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full test suite (catalyst-related)**

Run:
```bash
cd fe-next && npm test -- backend/handlers/__tests__/earthquakeHandler.test.ts backend/modules/__tests__/roundEventsManager.test.ts hooks/__tests__/useEarthquakeFireRound.test.ts components/earthquake/__tests__ components/game/in-game/components/__tests__/RoundEventOverlay.test.tsx translations/__tests__/catalystEffectKeys.test.ts
```
Expected: all PASS. Also re-run any pre-existing earthquake/round-event tests to confirm no regressions.

- [ ] **Step 4: Build**

Run: `cd fe-next && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke (if a dev environment is available)**

Start the dev server (`cd fe-next && npm run dev`, port **3001**), start a 2-player multiplayer classic game, and confirm: exactly one catalyst fires, it runs the scaled duration, and the warning shows the effect line. This requires two clients — note explicitly if it cannot be exercised.

- [ ] **Step 6: Final commit (only if Steps 1-4 produced fixes)**

```bash
git add -A
git commit -m "chore: fix lint/type issues from catalyst unification"
```

---

## Self-Review Notes

- **Spec coverage:** Selection unification → Tasks 3-4. Dead code removal → Tasks 4 (guard), 5 (socket handler), 6 (hook MP path). Durations → Tasks 1-2. UI effect lines → Tasks 7-10. Testing → every task is TDD; Task 11 is full verification. SP untouched → Task 6 keeps the SP path and re-runs SP tests.
- **Type consistency:** `CATALYST_POOL` / `pickRandomCatalyst` / `CatalystType` defined in Task 4 and used only there. `executeEarthquakeSequence` exported in Task 3, consumed in Task 4. `EVENT_CONFIG` exported in Task 2, extended in Task 10. Translation keys (`earthquake.effect`, `roundEvent.{blizzard,lightning,meteor}Effect`) defined in Task 7, consumed in Tasks 8-10 — names match exactly.
- **Known soft spots flagged inline:** exact prop shapes for `EarthquakeWarning` / `FireRoundIndicator` tests (engineer must read the component first); test-runner import style for `translations/*.js` (match existing translation tests); TS narrowing of `catalyst` at the `executeRoundEvent` call site (cast provided as fallback).
