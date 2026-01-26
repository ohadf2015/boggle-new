# Phase 25 Plan 06: Generic Haptics Abstraction Layer

**One-liner:** Unified haptics API with Strategy Pattern automatically selecting native Capacitor or web Vibration API

---

## Metadata

```yaml
phase: 25
plan: 06
subsystem: native-integration
tags: [haptics, capacitor, refactoring, strategy-pattern, abstraction]
completed: 2026-01-26
duration: 18 minutes
type: gap-closure

requires:
  - 25-05  # NativeAppProvider integration

provides:
  - unified-haptics-api
  - haptics-strategy-pattern
  - platform-detection
  - backwards-compatibility

affects:
  - future-haptics-features  # Will use useHaptics() hook
  - settings-ui  # Can use HapticsContext

tech-stack:
  added: []
  patterns:
    - Strategy Pattern for platform abstraction
    - Facade Pattern for unified API
    - Context API for app-wide configuration

key-files:
  created:
    - utils/haptics/types.ts
    - utils/haptics/webHaptics.ts
    - utils/haptics/nativeHaptics.ts
    - utils/haptics/HapticsManager.ts
    - utils/haptics/index.ts
    - utils/haptics/README.md
    - hooks/useHaptics.ts
    - contexts/HapticsContext.tsx
    - utils/haptics/__tests__/HapticsManager.test.ts
    - hooks/__tests__/useHaptics.test.ts
  modified:
    - contexts/SoundEffectsContext.tsx
    - app/providers.tsx
    - components/MusicControls.tsx
  deleted:
    - utils/haptics.ts
    - utils/nativeHaptics.ts
    - hooks/useNativeHaptics.ts
    - hooks/__tests__/useNativeHaptics.test.ts
    - utils/__tests__/nativeHaptics.test.ts

decisions:
  - name: Strategy Pattern for haptics abstraction
    rationale: Automatic platform detection eliminates developer confusion about which API to use
    impact: Developers use single useHaptics() hook, platform selection happens automatically
    date: 2026-01-26

  - name: Facade Pattern with convenience methods
    rationale: Provides simple tap/success/error methods while still supporting custom patterns
    impact: Most common use cases require minimal code, advanced use cases still supported
    date: 2026-01-26

  - name: Backwards compatibility exports
    rationale: Gradual migration path for existing code without breaking changes
    impact: Old haptic functions still work, mapped to new system
    date: 2026-01-26

  - name: HapticsContext for configuration
    rationale: Infrastructure for future settings UI (user preference toggle)
    impact: Centralized haptics configuration, ready for settings integration
    date: 2026-01-26
```

---

## Summary

This gap closure plan unified two separate haptics implementations (web Vibration API and native Capacitor Haptics) into a single abstraction layer using the Strategy Pattern. The new system automatically detects the platform and selects the best implementation, eliminating developer confusion.

### Problem Solved

Before this plan, the app had:
1. **Web Vibration API** (`utils/haptics.ts`) - Used throughout the app
2. **Capacitor Haptics** (`utils/nativeHaptics.ts`, `hooks/useNativeHaptics.ts`) - Existed but unused

This created confusion: "Which haptics API should I use?" and prevented native apps from using richer Capacitor haptics.

### Solution: Unified Abstraction

The new system provides:
- **Single API**: `useHaptics()` hook works everywhere
- **Automatic selection**: Native Capacitor on iOS/Android, Vibration API on web
- **Zero breaking changes**: Backwards compatibility through mapping functions
- **Future-ready**: HapticsContext prepared for settings UI

### Architecture

**Strategy Pattern** implementation:

```
┌─────────────────────────────────────────────┐
│         HapticsManager (Facade)             │
│  - Detects platform                         │
│  - Routes to correct implementation         │
│  - Provides unified API                     │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  NativeHaptics   │   │   WebHaptics     │
│  (Capacitor)     │   │  (Vibration API) │
└──────────────────┘   └──────────────────┘
```

### Implementation Highlights

**1. Type-Safe Abstraction**
```typescript
// Unified interface all implementations must follow
export interface IHapticsImplementation {
  isSupported(): boolean;
  trigger(pattern: HapticPattern): Promise<void>;
  triggerCustom(pattern: CustomHapticPattern): Promise<void>;
}
```

**2. Automatic Platform Detection**
```typescript
export class HapticsManager {
  constructor() {
    // Select implementation based on platform
    this.implementation = isNative() ? new NativeHaptics() : new WebHaptics();
  }
}
```

**3. Developer-Friendly Hook**
```typescript
const { tap, success, error } = useHaptics();
await tap(); // Works everywhere, best implementation auto-selected
```

**4. Backwards Compatibility**
```typescript
// Old code continues to work
export const hapticForWordScore = () => haptics.tap();
export const hapticError = () => haptics.error();
```

---

## Execution Details

### Tasks Completed

**All 12 tasks executed successfully:**

1. ✅ Define unified haptics interface and types (types.ts)
2. ✅ Implement web haptics adapter (webHaptics.ts)
3. ✅ Refactor native haptics adapter (nativeHaptics.ts)
4. ✅ Create HapticsManager facade with TDD tests (100% coverage)
5. ✅ Create useHaptics React hook with TDD tests (100% coverage)
6. ✅ Create HapticsContext for app-wide configuration
7. ✅ Create barrel export for clean imports (index.ts)
8. ✅ Refactor SoundEffectsContext to use new system
9. ✅ Add HapticsProvider to app providers
10. ✅ Delete old haptics files (5 files removed)
11. ✅ Create documentation (README.md)
12. ✅ Verify build, tests, add backwards compatibility

### Test Coverage

**Total: 25 tests, 100% coverage on core modules**

- HapticsManager: 14 tests, 100% coverage
- useHaptics hook: 11 tests, 100% coverage

### Commits

**15 commits total (atomic per-task commits):**

| Commit | Type | Description | Files |
|--------|------|-------------|-------|
| 1b188e9f | feat | Define unified haptics interface | types.ts |
| a8e2cbad | feat | Implement web haptics adapter | webHaptics.ts |
| 7da0363c | refactor | Refactor native haptics adapter | nativeHaptics.ts |
| 5d835ece | test | HapticsManager facade + TDD tests | HapticsManager.ts, test |
| eba35b7b | test | useHaptics hook + TDD tests | useHaptics.ts, test |
| f3aaa1eb | feat | HapticsContext for configuration | HapticsContext.tsx |
| 8d479fa5 | feat | Barrel export for clean imports | index.ts |
| 983985f3 | refactor | SoundEffectsContext integration | SoundEffectsContext.tsx |
| 32c4b5bb | feat | Add HapticsProvider to app | providers.tsx |
| f63d3b99 | chore | Delete old haptics.ts | haptics.ts |
| ae0db170 | chore | Delete old nativeHaptics.ts | nativeHaptics.ts |
| 6472b3f9 | chore | Delete obsolete test | nativeHaptics.test.ts |
| 438f80d6 | docs | Create documentation | README.md |
| 26f57f33 | fix | Update MusicControls | MusicControls.tsx |
| 700424ad | feat | Backwards compatibility exports | index.ts |

---

## Deviations from Plan

### Auto-Fixed Issues (Rule 1 & 2)

**1. [Rule 2 - Missing Critical] Added backwards compatibility exports**
- **Found during:** Task 12 (build verification)
- **Issue:** Existing code referenced old haptic functions (hapticForWordScore, hapticError, hapticClueRevealed, hapticGameWin)
- **Fix:** Added compatibility exports that map old functions to new system
- **Files modified:** utils/haptics/index.ts
- **Rationale:** Prevents breaking changes, provides gradual migration path
- **Commit:** 700424ad

**2. [Rule 1 - Bug] Fixed MusicControls haptics imports**
- **Found during:** Task 12 (build verification)
- **Issue:** MusicControls.tsx referenced old isHapticsEnabled/setHapticsEnabled exports
- **Fix:** Updated to use HapticsContext (useHapticsConfig)
- **Files modified:** components/MusicControls.tsx
- **Commit:** 26f57f33

**3. [Rule 3 - Blocking] Deleted obsolete test files**
- **Found during:** Task 12 (test verification)
- **Issue:** Old test files referenced deleted haptics implementations
- **Fix:** Deleted hooks/__tests__/useNativeHaptics.test.ts and utils/__tests__/nativeHaptics.test.ts
- **Files deleted:** 2 test files
- **Commits:** 6472b3f9, ae0db170

---

## Verification

### Build Status
✅ **Production build succeeds**
```bash
npm run build
✓ Compiled successfully in 10.7s
```

### Test Status
✅ **All haptics tests pass**
```bash
npm run test:frontend -- utils/haptics/__tests__/
✓ 14 tests passing, 100% coverage

npm run test:frontend -- hooks/__tests__/useHaptics.test.ts
✓ 11 tests passing, 100% coverage
```

### Lint Status
✅ **No new lint errors**
```bash
npm run lint
✖ 6 problems (0 errors, 6 warnings)
# Pre-existing warnings in coverage reports only
```

---

## Usage Examples

### Before (Confusing)
```typescript
// Which to use?
import { vibrateTap } from '@/utils/haptics';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

// Platform-specific code
if (isNative()) {
  const { impact } = useNativeHaptics();
  await impact('light');
} else {
  vibrateTap();
}
```

### After (Simple)
```typescript
// Works everywhere
import { useHaptics } from '@/hooks/useHaptics';

const { tap } = useHaptics();
await tap(); // Best implementation auto-selected
```

### Common Patterns

**Button with haptic feedback:**
```typescript
const { tap } = useHaptics();

<button onClick={async () => {
  await tap(); // Haptic BEFORE action
  handleAction();
}}>
  Action
</button>
```

**Success/error feedback:**
```typescript
const { success, error } = useHaptics();

try {
  await saveData();
  await success();
} catch (err) {
  await error();
}
```

**Custom patterns:**
```typescript
import { HapticIntensity } from '@/utils/haptics';

const { triggerCustom } = useHaptics();

await triggerCustom({
  duration: 50,
  intensity: HapticIntensity.HEAVY,
});
```

---

## Next Phase Readiness

### What This Enables

1. **Native apps get richer haptics** - Capacitor Haptics used automatically on iOS/Android
2. **Unified developer experience** - Single API, no platform checks
3. **Future settings UI** - HapticsContext ready for user preference toggle
4. **Gradual migration** - Existing code works via compatibility exports

### Future Work (Not Blocking)

- [ ] Migrate remaining old haptic functions to use new API directly
- [ ] Add haptics toggle to settings UI (using HapticsContext)
- [ ] Add more predefined patterns (warning, selection variations)
- [ ] Performance monitoring for haptic timing

### No Blockers

This plan closes the final Phase 25 gap. All native integrations are now wired and abstracted:
- ✅ Platform detection
- ✅ Native haptics
- ✅ App lifecycle
- ✅ Safe area handling
- ✅ Network status monitoring
- ✅ Unified haptics abstraction

**Phase 25 is now COMPLETE.**

---

## Lessons Learned

1. **Backwards compatibility is critical** - Adding compatibility exports prevented breaking 5+ files
2. **Strategy Pattern scales well** - Easy to add new platforms (e.g., desktop Electron)
3. **TDD catches integration issues early** - 100% coverage found missing implementations
4. **Documentation reduces onboarding friction** - README.md provides clear migration path

---

## Performance Metrics

- **Duration:** 18 minutes (including TDD tests and verification)
- **Files created:** 10 (types, implementations, tests, docs)
- **Files modified:** 3 (SoundEffectsContext, providers, MusicControls)
- **Files deleted:** 5 (old implementations, obsolete tests)
- **Tests added:** 25 (HapticsManager + useHaptics)
- **Test coverage:** 100% on HapticsManager and useHaptics
- **Build time:** 10.7s (production build)

---

*Gap closure complete. Unified haptics system operational.*
