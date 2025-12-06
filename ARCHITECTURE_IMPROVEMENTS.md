# Architecture Improvement Roadmap

**Created:** 2025-12-06
**Status:** Actionable Implementation Plan

---

## Assessment Summary

| Area | Current State | Priority |
|------|---------------|----------|
| Frontend TypeScript | ✅ Complete (0 .jsx, 123 .tsx) | Done |
| Backend TypeScript | 73 JS files remaining | Medium |
| JoinView Decomposition | Already decomposed with sub-components | Done |
| State Machine | String-based states across 15+ locations | High |
| Legacy Compatibility | 8 deprecated patterns identified | Medium |
| Test Coverage | Good backend, moderate E2E | Low |

---

## Phase 1: State Machine Implementation (High Priority)

### Current State Transitions
```
Game States: 'waiting' → 'in-progress' → 'finished' → 'validating' → 'waiting'
Tournament: 'lobby' → 'in-progress' → 'completed'
```

### Problem
- State transitions scattered across 15+ files
- No guards against invalid transitions (e.g., `waiting` → `finished`)
- Difficult to reason about game flow

### Solution: XState Integration

**Files to modify:**
- `backend/modules/gameStateManager.js`
- `backend/handlers/gameLifecycleHandler.js`
- `backend/handlers/shared.js`
- `shared/types/game.ts`

**Implementation Steps:**

1. **Create State Machine Definition** (`shared/stateMachines/gameMachine.ts`):
```typescript
import { createMachine } from 'xstate';

export const gameMachine = createMachine({
  id: 'game',
  initial: 'waiting',
  states: {
    waiting: {
      on: { START: 'inProgress' }
    },
    inProgress: {
      on: {
        END: 'finished',
        TIMEOUT: 'finished'
      }
    },
    finished: {
      on: {
        VALIDATE: 'validating',
        RESET: 'waiting'
      }
    },
    validating: {
      on: {
        COMPLETE: 'waiting',
        SKIP: 'waiting'
      }
    }
  }
});
```

2. **Wrap gameStateManager with Machine**:
```javascript
// gameStateManager.js
const { interpret } = require('xstate');
const { gameMachine } = require('../shared/stateMachines/gameMachine');

function transitionGameState(gameCode, event) {
  const game = games[gameCode];
  if (!game) return false;

  const machine = interpret(gameMachine.withContext({ gameCode }));
  machine.start(game.gameState);

  if (!machine.can(event)) {
    logger.warn('GAME', `Invalid transition: ${game.gameState} → ${event}`);
    return false;
  }

  machine.send(event);
  game.gameState = machine.state.value;
  return true;
}
```

3. **Update Handlers**:
```javascript
// shared.js - endGame()
- updateGame(gameCode, { gameState: 'finished' });
+ if (!transitionGameState(gameCode, 'END')) return;
```

---

## Phase 2: Legacy Deprecation Plan (Medium Priority)

### Identified Legacy Patterns

| Location | Legacy Code | Replacement |
|----------|-------------|-------------|
| `errorHandler.js:497-511` | `ErrorMessages` object | `ErrorCodes` + `ErrorRegistry` |
| `SocketContext.tsx:339` | `useWebSocket` alias | Direct `useSocket` import |
| `SocketContext.tsx:350` | `WebSocketContext` export | Direct `SocketContext` import |
| `WebSocketContext.tsx:2-3` | Re-export file | Remove after migration |
| `schemas.ts:206-211` | Lowercase aliases | Direct uppercase imports |
| `wordValidator.js:144` | `isWordOnBoard` alias | Direct function use |
| `achievementTiers.ts:23` | Tier alias | Use canonical name |

### Deprecation Steps

1. **Add Deprecation Warnings** (Week 1):
```javascript
// errorHandler.js
/**
 * @deprecated Use ErrorCodes instead. Will be removed in v2.0
 */
const ErrorMessages = { /* ... */ };
if (process.env.NODE_ENV === 'development') {
  console.warn('[DEPRECATION] ErrorMessages is deprecated. Use ErrorCodes.');
}
```

2. **Update All Consumers** (Week 2-3):
   - Search for each deprecated import
   - Replace with canonical version
   - Run tests after each change

3. **Remove Legacy Code** (Week 4):
   - Delete deprecated exports
   - Remove compatibility files
   - Update documentation

---

## Phase 3: Backend TypeScript Migration (Medium Priority)

### Migration Order (by dependency)

```
Phase 3a: Pure Modules (no dependencies)
├── utils/logger.js → logger.ts
├── utils/profanityFilter.js → profanityFilter.ts
├── modules/scoringEngine.js → scoringEngine.ts
└── modules/wordValidator.js → wordValidator.ts

Phase 3b: Core Modules
├── modules/userManager.js → userManager.ts
├── modules/scoreManager.js → scoreManager.ts
├── modules/presenceManager.js → presenceManager.ts
└── modules/peerValidationManager.js → peerValidationManager.ts

Phase 3c: Facade Layer
├── modules/gameStateManager.js → gameStateManager.ts
└── redisClient.js → redisClient.ts

Phase 3d: Handlers
└── handlers/*.js → handlers/*.ts
```

### Migration Template

For each file:
1. Rename `.js` → `.ts`
2. Add type imports from `@/shared/types/game`
3. Type function parameters and return values
4. Run `tsc --noEmit` to verify
5. Update tests if needed

**Example Migration** (`scoringEngine.js` → `scoringEngine.ts`):
```typescript
import type { WordDetail, DifficultyLevel } from '@/shared/types/game';

interface ScoreConfig {
  basePoints: Record<number, number>;
  comboMultipliers: number[];
}

export function calculateWordScore(
  word: string,
  comboLevel: number = 0,
  config?: Partial<ScoreConfig>
): number {
  // ...implementation
}
```

---

## Phase 4: Additional Improvements (Low Priority)

### 4.1 Extract JoinModeFields and HostModeFields

Currently defined inside `JoinView.tsx` (lines 529, 633). Move to separate files:

```
components/join/
├── JoinModeFields.tsx (extract from line 529)
├── HostModeFields.tsx (extract from line 633)
├── index.ts (update exports)
```

### 4.2 Worker Thread for Game Timers

Current: All timers in main thread via `timerManager.js`

```javascript
// timerManager.js - Current
setInterval(() => { /* timer logic */ }, intervalMs);

// timerWorker.js - Proposed
const { Worker } = require('worker_threads');
const timerWorker = new Worker('./timerWorker.js');
timerWorker.postMessage({ gameCode, duration });
```

### 4.3 OpenTelemetry Integration

Add distributed tracing beyond correlation IDs:

```javascript
const { trace } = require('@opentelemetry/api');

function startGameTimer(io, gameCode, timerSeconds) {
  const span = trace.getTracer('game').startSpan('startGameTimer');
  span.setAttribute('gameCode', gameCode);
  // ...
  span.end();
}
```

---

## Implementation Timeline

| Phase | Effort | Risk | Dependencies |
|-------|--------|------|--------------|
| Phase 1: State Machine | 2-3 days | Medium | XState package |
| Phase 2: Legacy Removal | 1 week | Low | None |
| Phase 3: Backend TS | 2-3 weeks | Low | TypeScript config |
| Phase 4: Enhancements | 1-2 weeks | Low | Phase 1-3 |

---

## Quick Wins (Can Do Now)

1. **Add XState package**:
   ```bash
   cd fe-next && npm install xstate
   ```

2. **Add deprecation warnings** to legacy code

3. **Extract sub-components** from JoinView.tsx

4. **Create `shared/stateMachines/` directory**

---

## Validation Checklist

After each phase:
- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No new TypeScript errors
- [ ] No console warnings about deprecated code
