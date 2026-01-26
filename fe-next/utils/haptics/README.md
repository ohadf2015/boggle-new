# Haptics System

Unified haptics abstraction for web and native platforms.

## Quick Start

```typescript
import { useHaptics } from '@/hooks/useHaptics';

function MyButton() {
  const { tap, success, error } = useHaptics();

  return (
    <button
      onClick={async () => {
        await tap();
        // Handle click...
      }}
    >
      Click me
    </button>
  );
}
```

## API Reference

### Predefined Patterns

- `tap()` - Light tap (button press, toggle)
- `success()` - Success feedback (form submit, action complete)
- `error()` - Error feedback (validation fail)
- `warning()` - Warning feedback (destructive action)
- `selection()` - Selection change (picker, slider)

### Custom Patterns

```typescript
import { HapticIntensity } from '@/utils/haptics';

const { triggerCustom } = useHaptics();

await triggerCustom({
  duration: 50,
  intensity: HapticIntensity.HEAVY,
});
```

## Platform Support

- **Native (iOS/Android)**: Uses Capacitor Haptics plugin for rich feedback
- **Web**: Falls back to Vibration API
- **Unsupported**: No-op (graceful degradation)

## Architecture

**Strategy Pattern** implementation with automatic platform detection:

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

## Usage Examples

### Button with Haptic Feedback

```typescript
const { tap } = useHaptics();

<button onClick={async () => {
  await tap(); // Haptic feedback BEFORE action
  handleAction();
}}>
  Action
</button>
```

### Success Feedback After Async Operation

```typescript
const { success, error } = useHaptics();

try {
  await saveData();
  await success();
} catch (err) {
  await error();
}
```

### Check if Haptics Supported

```typescript
const { isSupported } = useHaptics();

if (isSupported()) {
  // Show haptics toggle in settings
}
```

## Testing

The haptics system is fully tested with 100% coverage:

- `HapticsManager` - 14 tests
- `useHaptics` hook - 11 tests

Run tests:
```bash
npm run test:frontend -- utils/haptics/__tests__/
npm run test:frontend -- hooks/__tests__/useHaptics.test.ts
```

## Migration Guide

### Old System → New System

**Before:**
```typescript
// Confusing - which to use?
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

**After:**
```typescript
// Simple - works everywhere
import { useHaptics } from '@/hooks/useHaptics';

const { tap } = useHaptics();
await tap(); // Best implementation auto-selected
```

### Breaking Changes

None. The new system is backward compatible through the `HapticsProvider`.
