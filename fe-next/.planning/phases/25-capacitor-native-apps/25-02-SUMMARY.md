---
phase: 25-capacitor-native-apps
plan: 02
subsystem: native-platform-integration
tags: [capacitor, platform-detection, haptics, app-lifecycle, react-hooks]

# Dependency Graph
requires:
  - "25-01"  # Capacitor configuration and dependencies
provides:
  - "Platform detection utilities (native vs web)"
  - "Native haptics with web fallback"
  - "App lifecycle hooks (foreground/background)"
  - "React hook wrappers for native features"
affects:
  - "Future native feature integrations"
  - "Audio loading hook (will use platform detection)"
  - "Any component needing native capabilities"

# Tech Stack
tech-stack:
  added:
    - "@capacitor/app (App lifecycle plugin)"
    - "@capacitor/haptics (Native haptics plugin)"
  patterns:
    - "Graceful degradation (native → web fallback)"
    - "Platform detection with tree-shaking"
    - "React hook wrappers for async APIs"
    - "SSR-safe Capacitor imports"

# File Tracking
key-files:
  created:
    - "utils/platform.ts"
    - "utils/nativeHaptics.ts"
    - "hooks/useAppLifecycle.ts"
    - "hooks/useNativeHaptics.ts"
    - "utils/__tests__/platform.test.ts"
    - "utils/__tests__/nativeHaptics.test.ts"
    - "hooks/__tests__/useAppLifecycle.test.ts"
    - "hooks/__tests__/useNativeHaptics.test.ts"
  modified: []

# Decisions Made
decisions:
  - id: "platform-detection-pattern"
    choice: "Try-catch wrapper around Capacitor.isNativePlatform()"
    rationale: "Allows tree-shaking in web builds while providing safe fallback"
    alternatives: "Conditional imports would complicate bundling"

  - id: "haptics-fallback-strategy"
    choice: "Native Capacitor Haptics → Web Vibration API → Silent fail"
    rationale: "Progressive enhancement ensures functionality everywhere while using best available API"
    alternatives: "Web-only would miss native capabilities; native-only would fail on web"

  - id: "lifecycle-hook-pattern"
    choice: "useRef for callbacks + empty dependency array"
    rationale: "Ensures latest callback version without re-registering listeners on every render"
    alternatives: "Re-register on callback change wastes resources"

  - id: "async-listener-handling"
    choice: "Async registration in useEffect with sync cleanup"
    rationale: "Matches Capacitor API (returns Promise<PluginListenerHandle>)"
    alternatives: "Sync wrapper would require additional complexity"

# Metrics
duration: "10 minutes"
completed: "2026-01-26"
---

# Phase 25 Plan 02: Platform Detection & Native Features Summary

**One-liner:** Core platform utilities with native haptics and lifecycle hooks, featuring graceful web fallbacks

## What Was Built

Created foundational platform detection and native feature integration layer that enables the webapp to seamlessly detect and utilize Capacitor native capabilities while maintaining full web compatibility.

### Platform Detection (`utils/platform.ts`)
- **isNative()** - Detects Capacitor native environment
- **isIOS()** / **isAndroid()** - Platform-specific checks
- **isWeb()** - Web environment detection
- **getPlatform()** - Returns current platform identifier
- **Tree-shaking safe** - Capacitor imports wrapped in try-catch
- **SSR safe** - No runtime errors in server environments

### Native Haptics (`utils/nativeHaptics.ts`)
- **vibrateTap()** - Light haptic for UI interactions
- **vibrateSuccess()** - Success pattern (native notification type)
- **vibrateError()** - Error pattern (native notification type)
- **Graceful fallback** - Native → Web Vibration API → Silent fail
- **Platform aware** - Uses `isNative()` to route correctly

### App Lifecycle Hook (`hooks/useAppLifecycle.ts`)
- **onForeground callback** - Fires when app becomes active
- **onBackground callback** - Fires when app becomes inactive
- **Native-only** - No-op on web (prevents unnecessary listeners)
- **Latest callback refs** - Uses useRef pattern for stability
- **Async-safe** - Properly handles Promise-based addListener API
- **Robust cleanup** - Removes listeners on unmount

### Native Haptics Hook (`hooks/useNativeHaptics.ts`)
- **React hook wrapper** - Clean API for components
- **Stable callbacks** - useCallback prevents re-renders
- **Silent error handling** - Non-critical failures don't crash UI
- **Three methods** - vibrateTap, vibrateSuccess, vibrateError

## Test Coverage

**56 tests passing across 4 test suites:**

- **Platform Detection:** 18 tests
  - Native/web detection
  - iOS/Android identification
  - Tree-shaking safety
  - SSR safety

- **Native Haptics:** 13 tests
  - Native Capacitor integration
  - Web fallback behavior
  - Error handling
  - Tree-shaking safety

- **App Lifecycle:** 12 tests
  - Foreground/background callbacks
  - Listener registration/cleanup
  - Async handling
  - Error resilience

- **Haptics Hook:** 13 tests
  - React integration
  - Callback stability
  - Error handling
  - Multiple simultaneous calls

## Technical Highlights

### Graceful Degradation Pattern
```typescript
// Native first, web fallback, silent fail
if (isNative()) {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
    return;
  } catch {
    // Fall through to web
  }
}
triggerHaptic('light'); // Web API
```

### Tree-Shaking Safe Imports
```typescript
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    // Capacitor tree-shaken in web build
    return false;
  }
}
```

### Stable Callback References
```typescript
// Avoids listener re-registration on every render
const callbackRef = useRef(callback);
useEffect(() => {
  callbackRef.current = callback;
}, [callback]);

useEffect(() => {
  const listener = await App.addListener('event', () => {
    callbackRef.current?.(); // Always latest version
  });
  return () => listener.remove();
}, []); // Empty deps!
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Async App.addListener API**
- **Found during:** Task 3 implementation
- **Issue:** `App.addListener` returns `Promise<PluginListenerHandle>`, not direct handle. TypeScript build failed.
- **Fix:**
  - Changed import to `type PluginListenerHandle` from `@capacitor/core`
  - Wrapped registration in async function
  - Updated all tests to await async registration
- **Files modified:** `hooks/useAppLifecycle.ts`, `hooks/__tests__/useAppLifecycle.test.ts`
- **Commit:** e6c00ff3

## Next Phase Readiness

### What's Ready
✅ Platform detection available for all components
✅ Native haptics ready for UI feedback
✅ App lifecycle hooks ready for resource management
✅ Pattern established for future native integrations

### Potential Concerns
⚠️ **Audio Hook Integration** - Next task (25-03) will need to test platform detection with actual audio loading. Current tests mock Capacitor; real device testing needed.

⚠️ **Performance** - App lifecycle listener is async. Components relying on immediate lifecycle detection may need adjustment.

### Blockers
None - All dependencies resolved.

## Integration Points

**Established:**
- `utils/platform.ts` → All native features check environment first
- `utils/nativeHaptics.ts` → `utils/hapticFeedback.ts` (web fallback)
- `hooks/useNativeHaptics.ts` → `utils/nativeHaptics.ts` (utility wrapper)

**Ready for:**
- Audio loading hook (25-03) will use `isNative()` to route Capacitor vs web audio
- Future viewport hook (CrazyGames portal integration) can use lifecycle for resize events
- Any component needing platform-specific behavior

## Files Changed

**Created (8 files):**
- `utils/platform.ts` (65 lines)
- `utils/nativeHaptics.ts` (62 lines)
- `hooks/useAppLifecycle.ts` (90 lines)
- `hooks/useNativeHaptics.ts` (65 lines)
- `utils/__tests__/platform.test.ts` (178 lines)
- `utils/__tests__/nativeHaptics.test.ts` (190 lines)
- `hooks/__tests__/useAppLifecycle.test.ts` (242 lines)
- `hooks/__tests__/useNativeHaptics.test.ts` (191 lines)

**Total:** 1,083 lines of production code + tests

## Commits

- `abefc0a1` - feat(25-02): add platform detection utility (18 tests)
- `a0e88731` - feat(25-02): add native haptics with web fallback (13 tests)
- `50fbabfa` - feat(25-02): add app lifecycle hook for foreground/background (12 tests)
- `323a2da1` - feat(25-02): add native haptics hook wrapper (13 tests)
- `e6c00ff3` - fix(25-02): handle async App.addListener correctly

## Verification

✅ All 56 tests passing
✅ Build succeeds (TypeScript compilation clean)
✅ Linter passes (no code quality issues)
✅ Translation check clean (no hardcoded strings)

---

**Status:** ✅ **COMPLETE** - Ready for 25-03 (Audio loading hook with native Capacitor support)
