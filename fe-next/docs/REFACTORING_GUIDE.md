# Code Refactoring Guide

This document outlines the refactoring work done to reduce code duplication and improve maintainability across the LexiClash codebase.

## Overview

The refactoring focused on identifying and consolidating common patterns, creating reusable utility hooks, and reducing boilerplate code. The goal was to improve:

- **Maintainability**: Easier to update and fix bugs
- **Consistency**: Standardized patterns across the codebase
- **Developer Experience**: Less boilerplate, more focus on business logic
- **Type Safety**: Better TypeScript support and error handling

## New Utility Hooks

### 1. `useToastResult` - Standardized Toast Notifications

**Location**: `fe-next/hooks/useToastResult.ts`

**Problem**: Repetitive toast notification patterns with result checking scattered throughout the codebase.

**Before**:
```typescript
const handleSave = async () => {
  const result = await saveProfile(data);
  if (result.success) {
    toast.success(t('profile.updateSuccess') || 'Profile updated');
  } else {
    toast.error(result.error || t('profile.updateError') || 'Failed to update');
  }
};
```

**After**:
```typescript
const showResult = useToastResult({
  successKey: 'profile.updateSuccess',
  errorKey: 'profile.updateError',
});

const handleSave = async () => {
  const result = await saveProfile(data);
  showResult(result);
};
```

**Benefits**:
- Eliminates repetitive if/else checks
- Automatic translation handling
- Consistent toast behavior across the app
- Support for custom durations and fallback messages

**API**:
```typescript
interface ToastResultConfig {
  successKey: string;        // Translation key for success
  errorKey: string;          // Translation key for error
  successFallback?: string;  // Fallback if translation missing
  errorFallback?: string;    // Fallback if translation missing
  duration?: number;         // Toast duration in ms
}

// Returns function: (result: ResultWithSuccess) => void
const showResult = useToastResult(config);
```

**Additional Hook**: `useToastHandlers`

For more control over when toasts are shown:

```typescript
const { showSuccess, showError } = useToastHandlers({
  successKey: 'profile.saved',
  errorKey: 'profile.saveFailed',
});

try {
  await saveData();
  showSuccess('Custom success message'); // Optional override
} catch (error) {
  showError(error.message);
}
```

---

### 2. `useFetch` - Standardized Data Fetching

**Location**: `fe-next/hooks/useFetch.ts`

**Problem**: Repeated fetch patterns with similar error handling and loading states.

**Before**:
```typescript
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

const fetchProfile = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/profile');
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setData(data);
  } catch (err) {
    setError(err.message);
    toast.error('Failed to load profile');
  } finally {
    setIsLoading(false);
  }
};
```

**After**:
```typescript
const { data, isLoading, error, refetch } = useFetch({
  url: '/api/profile',
  autoFetch: true,
  onError: (error) => toast.error('Failed to load profile'),
});
```

**API**:
```typescript
interface UseFetchOptions<T> {
  url: string | null;
  options?: RequestInit;           // Standard fetch options
  autoFetch?: boolean;             // Auto-fetch on mount
  transform?: (data: unknown) => T; // Transform response data
  onSuccess?: (data: T) => void;   // Success callback
  onError?: (error: Error) => void; // Error callback
  deps?: React.DependencyList;     // Re-fetch dependencies
}

// Returns
interface UseFetchReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  hasExecuted: boolean;
  refetch: () => Promise<T | null>;
  reset: () => void;
  clearError: () => void;
}
```

**POST Requests**: `usePost` hook

```typescript
const { execute: createUser, isLoading } = usePost({
  url: '/api/users',
  onSuccess: () => toast.success('User created'),
});

await createUser({ name: 'John', email: 'john@example.com' });
```

---

### 3. `useSafeSocketEvents` - Socket Event Management (Already Existed!)

**Location**: `fe-next/hooks/useSafeSocketEvent.ts`

**Problem**: Manual socket.on/socket.off registration with complex useEffect dependencies.

**Before**:
```typescript
useEffect(() => {
  if (!socket) return;

  const handleGameStart = (data) => { /* ... */ };
  const handleGameEnd = (data) => { /* ... */ };
  const handleScoreUpdate = (data) => { /* ... */ };

  socket.on('game-start', handleGameStart);
  socket.on('game-end', handleGameEnd);
  socket.on('score-update', handleScoreUpdate);

  return () => {
    socket.off('game-start', handleGameStart);
    socket.off('game-end', handleGameEnd);
    socket.off('score-update', handleScoreUpdate);
  };
}, [socket, /* many dependencies */]);
```

**After**:
```typescript
// Define handlers as stable callbacks
const handleGameStart = useCallback((data) => {
  // Handle game start
}, [dependencies]);

const handleGameEnd = useCallback((data) => {
  // Handle game end
}, [dependencies]);

const handleScoreUpdate = useCallback((data) => {
  // Handle score update
}, [dependencies]);

// Register all events with one hook
const events = useMemo(() => [
  { event: 'game-start', handler: handleGameStart },
  { event: 'game-end', handler: handleGameEnd },
  { event: 'score-update', handler: handleScoreUpdate },
], [handleGameStart, handleGameEnd, handleScoreUpdate]);

useSafeSocketEvents({
  socket,
  events,
  onError: (event, error) => {
    logger.error(`Socket error on "${event}":`, error);
  },
});
```

**Benefits**:
- Automatic cleanup on unmount
- Error handling with logging
- Type-safe event handling
- Eliminates 2N lines of code (N socket.on + N socket.off)

**API**:
```typescript
interface EventConfig {
  event: string;
  handler: (data: unknown) => void | Promise<void>;
  enabled?: boolean; // Optional: conditionally enable events
}

useSafeSocketEvents({
  socket: Socket | null,
  events: EventConfig[],
  onError?: (event: string, error: Error) => void
});
```

**Single Event Version**: `useSafeSocketEvent`

```typescript
useSafeSocketEvent({
  socket,
  event: 'game-update',
  handler: (data) => setGameState(data),
  enabled: isConnected,
  onError: (error) => console.error('Game update error:', error),
});
```

---

### 4. `useAsyncAction` - Async State Management (Already Existed!)

**Location**: `fe-next/hooks/useAsyncAction.ts`

**Problem**: Manual management of loading and error states for async operations.

**Use this instead of manually managing state!**

**Before**:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState(null);

const handleSubmit = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await submitForm(formData);
    setData(result);
    toast.success('Success!');
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

**After**:
```typescript
const { execute, isLoading, error, data } = useAsyncAction(
  async () => submitForm(formData),
  {
    onSuccess: () => toast.success('Success!'),
    onError: (err) => toast.error(err.message),
  }
);

const handleSubmit = () => execute();
```

---

## Refactoring Examples

### Example 1: usePlayerWordEvents Refactoring

**File**: `fe-next/player/hooks/socket/usePlayerWordEvents.ts`

**Changes**:
- Converted 16 handler functions to `useCallback` for stability
- Replaced manual socket.on/socket.off with `useSafeSocketEvents`
- Eliminated 32 lines of boilerplate (16 on + 16 off)
- Added centralized error handling

**Impact**:
- Reduced code by ~40 lines
- Improved readability
- Better error logging
- Easier to add/remove events

### Example 2: Remaining Socket Hooks to Refactor

The following hooks follow the same pattern and should be refactored:

**Player Hooks** (~67 socket.on calls total):
- ✅ `usePlayerWordEvents` (16 events) - **REFACTORED**
- ⬜ `usePlayerSessionEvents` (17 events)
- ⬜ `usePlayerGameEvents` (12 events)
- ⬜ `usePlayerTournamentEvents` (5 events)

**Host Hooks** (~36 socket.on calls total):
- ⬜ `useHostWordEvents` (7 events)
- ⬜ `useHostGameEvents` (10 events)
- ⬜ `useHostPlayerEvents` (14 events)
- ⬜ `useHostTournamentEvents` (5 events)

**Other Files**:
- ⬜ `HostView.tsx` (3 events)
- ⬜ `RoomChat.tsx` (2 events)

**Estimated Impact**: Eliminating ~200 lines of boilerplate code

---

## Refactoring Checklist

When refactoring a component or hook:

### ✅ Socket Events
- [ ] Are there multiple `socket.on()` calls?
- [ ] Use `useSafeSocketEvents` for bulk registration
- [ ] Convert handlers to `useCallback` with proper dependencies
- [ ] Use `useMemo` for the events array
- [ ] Add error logging via `onError` callback

### ✅ Data Fetching
- [ ] Is there manual fetch + loading/error state management?
- [ ] Replace with `useFetch` for GET requests
- [ ] Replace with `usePost` for POST requests
- [ ] Consider using `useAsyncAction` for non-fetch async operations

### ✅ Toast Notifications
- [ ] Are there repeated `if (result.success)` patterns?
- [ ] Use `useToastResult` for result-based toasts
- [ ] Use `useToastHandlers` for manual control

### ✅ Loading/Error States
- [ ] Manual `useState` for loading and error?
- [ ] Replace with `useAsyncAction` hook
- [ ] Add success/error callbacks for side effects

---

## Migration Guide

### Step 1: Identify Duplication Patterns

Look for:
- Multiple `socket.on()` calls in a single `useEffect`
- Repeated `fetch()` calls with similar error handling
- Manual loading/error state management
- Repeated toast notification patterns

### Step 2: Choose the Right Hook

| Pattern | Hook |
|---------|------|
| Socket events (bulk) | `useSafeSocketEvents` |
| Single socket event | `useSafeSocketEvent` |
| GET requests | `useFetch` |
| POST requests | `usePost` |
| Async operations | `useAsyncAction` |
| Toast on result | `useToastResult` |
| Manual toasts | `useToastHandlers` |

### Step 3: Refactor Incrementally

1. Convert handler functions to `useCallback`
2. Replace manual registration with utility hook
3. Test thoroughly
4. Remove old code
5. Commit changes

### Step 4: Test

Run tests to ensure no regressions:
```bash
npm run test:frontend
npm run test:e2e
```

For multiplayer features, run:
```bash
cd fe-next && npx playwright test e2e/multiplayer-game-start.spec.ts --project=chromium --timeout=120000
```

---

## Best Practices

### 1. Use `useCallback` for Event Handlers

Always wrap socket event handlers in `useCallback` to prevent unnecessary re-registrations:

```typescript
const handleGameStart = useCallback((data: GameStartData) => {
  setGameState(data);
  playSound('game-start');
}, [setGameState, playSound]);
```

### 2. Use `useMemo` for Event Arrays

Memoize the events array to prevent re-registration on every render:

```typescript
const events = useMemo(() => [
  { event: 'game-start', handler: handleGameStart },
  { event: 'game-end', handler: handleGameEnd },
], [handleGameStart, handleGameEnd]);
```

### 3. Add Error Logging

Always include error logging for socket events:

```typescript
useSafeSocketEvents({
  socket,
  events,
  onError: (event, error) => {
    logger.error(`Socket event error on "${event}":`, error);
  },
});
```

### 4. Prefer Existing Hooks

Before creating new hooks, check if an existing hook can be used:
- `useAsyncAction` - Already existed, underutilized
- `useSafeSocketEvents` - Already existed, underutilized

### 5. Type Safety

Always type your data structures:

```typescript
interface GameStartData {
  gameId: string;
  players: Player[];
  startTime: number;
}

const handleGameStart = useCallback((data: GameStartData) => {
  // TypeScript will ensure data has correct shape
}, []);
```

---

## Performance Considerations

### Socket Events

**Before**: Every render could potentially re-register events
**After**: Events only re-register when handlers change

### Data Fetching

**Before**: Manual management could lead to race conditions
**After**: `useFetch` handles cleanup and prevents stale data

### Async Operations

**Before**: Could have memory leaks with unmounted components
**After**: `useAsyncAction` automatically cleans up

---

## Next Steps

### High Priority

1. ✅ Refactor `usePlayerWordEvents` (DONE)
2. ⬜ Refactor remaining player socket hooks
3. ⬜ Refactor host socket hooks
4. ⬜ Audit components using `useAsyncAction` pattern
5. ⬜ Create examples in Storybook (if applicable)

### Medium Priority

6. ⬜ Extract repeated className patterns into style constants
7. ⬜ Centralize all validation logic
8. ⬜ Create `useFormValidation` hook
9. ⬜ Document component patterns

### Low Priority

10. ⬜ Add unit tests for new hooks
11. ⬜ Create ESLint rules to enforce patterns
12. ⬜ Add TypeScript strict mode incrementally

---

## Estimated Impact

Based on analysis of the codebase:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Socket registration LOC | ~200 | ~50 | **75% reduction** |
| Loading state patterns | ~30 | ~5 | **83% reduction** |
| Toast patterns | ~50 | ~10 | **80% reduction** |
| Fetch patterns | ~40 | ~10 | **75% reduction** |

**Total**: Estimated **~215 lines of boilerplate code** eliminated across the codebase.

---

## Support

For questions or issues with refactoring:

1. Check this guide first
2. Review the hook implementation in `fe-next/hooks/`
3. Look at refactored examples (e.g., `usePlayerWordEvents`)
4. Reach out to the team

---

## Changelog

### 2025-12-31
- Created refactoring guide
- Added `useToastResult` hook
- Added `useFetch` hook
- Refactored `usePlayerWordEvents` to use `useSafeSocketEvents`
- Documented patterns and best practices
