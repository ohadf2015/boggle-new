# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Jest 29.7.0 - JavaScript/TypeScript test framework
- Frontend config: `jest.config.js` (jsdom environment for React)
- Backend config: `backend/jest.config.js` (node environment)
- Playwright 1.57.0 - E2E testing (separate config: `playwright.config.ts`)

**Assertion Library:**
- Jest built-in matchers
- React Testing Library matchers via `@testing-library/jest-dom`
- Testing Library: `@testing-library/react` 16.3.0
- User event simulation: `@testing-library/user-event` 14.6.1

**Run Commands:**
```bash
npm run test                # Run all tests (frontend + backend)
npm run test:frontend       # Frontend tests only
npm run test:backend        # Backend tests only
npm run test:watch         # Frontend watch mode
npm run test:coverage      # Coverage report
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # E2E tests with UI
npm run test:e2e:headed    # E2E tests with browser visible
```

## Test File Organization

**Location:**
- Frontend tests: Colocated in `__tests__/` subdirectory at same level as code
- Backend tests: `backend/__tests__/` directory or `__tests__/` in respective module
- E2E tests: `e2e/` directory (ignored by TypeScript, separate config)

**Naming:**
- Test files: `.test.ts` or `.test.tsx` suffix
- Spec files: `.spec.ts` or `.spec.tsx` (also supported)
- Test subdirs: `__tests__/` folder name (not `.test/`)
- Specialized tests: Suffix with category before test extension (e.g., `.overflow.test.tsx`, `.highlightFade.test.tsx`, `.extended.test.ts`)

**Examples:**
- `components/__tests__/Avatar.test.tsx` - Component test
- `hooks/__tests__/useAdventureGame.test.ts` - Hook test
- `types/__tests__/adventure.test.ts` - Type contract test
- `backend/__tests__/wordValidator.extended.test.ts` - Extended backend test
- `app/[locale]/__tests__/layout.overflow.test.tsx` - Specialized layout test

**Directory Structure:**
```
components/
  __tests__/
    Avatar.test.tsx
    GridComponent.test.tsx
  Avatar.tsx
  GridComponent.tsx

hooks/
  __tests__/
    useAdventureGame.test.ts
  useAdventureGame.ts

backend/
  __tests__/
    wordValidator.extended.test.ts
    spamDetector.test.ts
```

## Test Structure

**Given-When-Then Pattern:**

All tests follow the Given-When-Then (Arrange-Act-Assert) structure with explicit sections:

```typescript
// Type definition test example (from types/__tests__/adventure.test.ts)
describe('Adventure Types', () => {
  describe('TileState', () => {
    it('should support optional frozen state for ice tiles', () => {
      // GIVEN
      const tile: TileState = {
        letter: 'C',
        type: 'ice',
        isCleared: false,
        isFrozen: true,
      };

      // THEN (no WHEN needed for type tests - structure IS the test)
      expect(tile.isFrozen).toBe(true);
    });
  });
});
```

**Component Test Example (from components/__tests__/Avatar.test.tsx):**

```typescript
describe('Avatar', () => {
  describe('image avatar (default)', () => {
    it('renders image avatar when avatarImage is provided', () => {
      // GIVEN
      // Setup complete with mocks in place (jest.mock calls at top)

      // WHEN
      render(<Avatar avatarImage="pizza-pete" />);

      // THEN
      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatars/pizza-pete.png');
    });
  });
});
```

**Context/Hook Test Example (from contexts/__tests__/ProgressionContext.test.tsx):**

```typescript
describe('ProgressionContext', () => {
  describe('Initial Loading', () => {
    it('should load progression on mount', async () => {
      // GIVEN
      const mockProgression = createMockProgression();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.progression).toEqual(mockProgression);
      expect(result.current.error).toBeNull();
    });
  });
});
```

**Patterns:**
- **Setup:** `beforeEach()` clears mocks between tests
- **Teardown:** `afterEach()` via `clearMocks: true` in Jest config
- **Async handling:** Use `async/await` with `waitFor()` for async assertions
- **Component rendering:** React Testing Library `render()` function
- **Hook testing:** `renderHook()` from Testing Library with optional wrapper
- **Mocking:** Jest's `jest.fn()` and `jest.mock()`

## Mocking

**Framework:** Jest built-in mocking system

**Setup File:** `jest.setup.js` runs before each test file

**Patterns:**

Global mocks (from `jest.setup.js`):
```typescript
// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  // ... other methods
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;
```

Per-test mocks (from component tests):
```typescript
// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: {...}) => (
    <img src={src} alt={alt} {...props} onError={onError} data-testid="avatar-image" />
  ),
}));

// Mock utility modules
jest.mock('@/utils/avatarConfig', () => ({
  getAvatarPath: (avatar: { id: string; filename: string } | string) => {
    if (typeof avatar === 'string') {
      return `/avatars/${avatar}.png`;
    }
    return `/avatars/${avatar.filename}`;
  },
  getRandomAvatar: () => ({ id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' }),
  AVATARS: [
    { id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' },
  ],
}));
```

Fetch mocking:
```typescript
const mockFetch = jest.fn();
global.fetch = mockFetch;

// In test:
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => mockProgression,
});

// Verify call:
expect(mockFetch).toHaveBeenCalledWith(
  '/api/progression',
  expect.objectContaining({ method: 'GET' })
);
```

**What to Mock:**
- External APIs (fetch, axios calls)
- File system operations
- Time-based operations (setTimeout, Date)
- Third-party libraries
- Context providers (when testing consumers)
- next/* modules (Image, router, etc.)

**What NOT to Mock:**
- The code under test itself
- Simple utilities (unless expensive)
- React built-ins
- Test utilities themselves

## Fixtures and Factories

**Test Data Creation:**

Factory function pattern (from `ProgressionContext.test.tsx`):
```typescript
function createMockProgression(overrides?: Partial<PlayerProgression>): PlayerProgression {
  return {
    userId: 'test-user-123',
    playerLevel: 5,
    xp: 2500,
    currentWorld: 2,
    currentLevel: 3,
    totalStars: 25,
    completions: [
      { world: 1, level: 1, stars: 3, bestScore: 450, bestWords: 15, completedAt: '2025-01-20T12:00:00Z' },
      { world: 1, level: 2, stars: 2, bestScore: 380, bestWords: 12, completedAt: '2025-01-20T12:30:00Z' },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-20T12:30:00Z',
    ...overrides,
  };
}

// Usage in test:
const mockProgression = createMockProgression();
const customProgression = createMockProgression({ playerLevel: 10, xp: 5000 });
```

**Location:**
- Factory functions: Defined within test file at top-level
- Shared fixtures: Extracted to `__tests__/fixtures/` if used across multiple tests
- Test data constants: Colocated in test file

## Coverage

**Requirements:** 10% global minimum (enforced by Jest config)

**Frontend Config:**
```javascript
coverageThreshold: {
  global: {
    branches: 10,
    functions: 10,
    lines: 10,
    statements: 10,
  },
}
```

**Backend Config:**
```javascript
coverageThreshold: {
  global: {
    branches: 20,
    functions: 20,
    lines: 20,
    statements: 20,
  }
}
```

**Collected Coverage:**
- Frontend: Components, hooks, contexts, utils, lib (excludes `.d.ts`, node_modules, tests)
- Backend: All JS/TS files except node_modules, dist, test files, config files

**View Coverage:**
```bash
npm run test:coverage
# Opens HTML report in coverage/lcov-report/index.html
```

## Test Types

**Unit Tests:**

Scope: Individual functions, hooks, utilities

Example from `useAdventureWordValidation.ts` (validates helper functions):
```typescript
// Helper function test
test('should validate that path forms a valid sequence of adjacent tiles without repeats', () => {
  // Test path validation logic
  const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }];
  expect(isValidPath(path)).toBe(true);

  // Reject repeated tile
  const invalidPath = [{ row: 0, col: 0 }, { row: 0, col: 0 }];
  expect(isValidPath(invalidPath)).toBe(false);
});
```

Example from `wordValidator.extended.test.ts`:
```typescript
test('finds horizontal word', () => {
  const board: LetterGrid = [
    ['C', 'A', 'T'],
    ['X', 'Y', 'Z'],
    ['P', 'Q', 'R']
  ];

  expect(isWordOnBoard('cat', board, undefined, 'en')).toBe(true);
});
```

**Integration Tests:**

Scope: Multiple components/systems working together

Example: Testing context provider with hooks
```typescript
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

it('should load progression on mount', async () => {
  const { result } = renderHook(() => useProgression(), { wrapper });
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
  expect(result.current.progression).toEqual(mockProgression);
});
```

**Type Contract Tests:**

Scope: Validating type definitions and constraints

Example from `adventure.test.ts`:
```typescript
describe('LevelConfig', () => {
  it('should only accept valid grid sizes', () => {
    const validSizes: Array<4 | 5 | 6 | 7> = [4, 5, 6, 7];
    validSizes.forEach((size) => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: size,
        // ... other required fields
      };
      expect(config.gridSize).toBe(size);
    });
  });
});
```

**E2E Tests:**

Framework: Playwright (separate configuration)

Run: `npm run test:e2e`

Located in: `e2e/` directory (not included in TypeScript compilation)

## Common Patterns

**Testing Async Operations:**

```typescript
// Using async/await with waitFor
it('should load data asynchronously', async () => {
  // GIVEN
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: 'value' }),
  });

  // WHEN
  const { result } = renderHook(() => useData(), { wrapper });

  // THEN
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
  expect(result.current.data).toEqual({ data: 'value' });
});
```

**Testing Error Cases:**

```typescript
it('should set error on fetch failure', async () => {
  // GIVEN
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ error: 'Server error' }),
  });

  // WHEN
  const { result } = renderHook(() => useProgression(), { wrapper });

  // THEN
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
  expect(result.current.error).not.toBeNull();
});
```

**Testing Component Interactions:**

```typescript
it('shows user icon fallback when avatar image fails to load', async () => {
  // GIVEN
  render(<Avatar avatarImage="broccoli-bob" />);

  // WHEN
  const img = screen.getByTestId('avatar-image');
  fireEvent.error(img);

  // THEN
  await waitFor(() => {
    expect(screen.getByTestId('avatar-fallback-icon')).toBeInTheDocument();
  });
});
```

**Testing Multiple Scenarios (Parameterized):**

```typescript
it('should only accept valid difficulty values', () => {
  const validDifficulties: Array<'EASY' | 'MEDIUM' | 'HARD'> = ['EASY', 'MEDIUM', 'HARD'];
  validDifficulties.forEach((difficulty) => {
    const config: LevelConfig = {
      world: 1,
      level: 1,
      gridSize: 5,
      timerSeconds: 90,
      objectives: [],
      specialTiles: [],
      difficulty,
      chapterNumber: 1,
      levelInChapter: 1,
      isBossLevel: false,
    };
    expect(config.difficulty).toBe(difficulty);
  });
});
```

## Anti-Patterns to Avoid

**Testing Implementation Details:**

❌ Bad:
```typescript
test('calls setState hook', () => {
  // Tests internal hook behavior, not functionality
  expect(setState).toHaveBeenCalledWith(true);
});
```

✅ Good:
```typescript
test('shows loading state when fetching data', async () => {
  // Tests user-visible behavior
  render(<DataComponent />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

**Tests That Are Too Brittle:**

❌ Bad:
```typescript
test('calls fetch with specific order of parameters', () => {
  // Breaks if parameter order changes but functionality doesn't
  expect(fetch).toHaveBeenCalledWith('/api/users', { method: 'GET', headers: {...} });
});
```

✅ Good:
```typescript
test('fetches user data from correct endpoint', () => {
  // Uses expect.objectContaining for flexibility
  expect(fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({ method: 'GET' }));
});
```

**Testing Third-Party Libraries:**

❌ Bad:
```typescript
test('Array.map works correctly', () => {
  expect([1, 2, 3].map(x => x * 2)).toEqual([2, 4, 6]);
});
```

✅ Good:
```typescript
test('doubles all values in input array', () => {
  const result = doubleValues([1, 2, 3]);
  expect(result).toEqual([2, 4, 6]);
});
```

**Shared State Between Tests:**

❌ Bad:
```typescript
let sharedData = [];

test('creates user', () => {
  sharedData.push({ name: 'John' });
});

test('finds user', () => {
  // Depends on previous test
  expect(findUser('John')).toBeDefined();
});
```

✅ Good:
```typescript
test('creates and finds user', () => {
  // Each test is independent
  const user = createUser({ name: 'John' });
  const found = findUser('John');
  expect(found).toBeDefined();
});
```

## Test Timeout

**Frontend:** 10,000ms (10 seconds)
**Backend:** 10,000ms (10 seconds) - increased for Socket.IO tests which may need longer

Configured in Jest config files:
```javascript
testTimeout: 10000,
```

## Module Aliases in Tests

Jest moduleNameMapper handles alias resolution:
- `@/(.*)` → Root directory
- `@/components/(.*)` → Components directory
- `@/hooks/(.*)` → Hooks directory
- `@/contexts/(.*)` → Contexts directory
- `@/utils/(.*)` → Utils directory
- `@/shared/(.*)` → Shared directory
- `@/types/(.*)` → Types directory
- `@backend/(.*)` → Backend directory (backend config only)

## Validation Testing

**Input validation tests** follow the error key pattern:

```typescript
export interface ValidationResult {
  isValid: boolean;
  error?: string;  // Translation key, not message
}

test('should reject empty username', () => {
  const result = validateUsername('');
  expect(result.isValid).toBe(false);
  expect(result.error).toBe('validation.usernameRequired');
});

test('should reject username too short', () => {
  const result = validateUsername('ab');
  expect(result.isValid).toBe(false);
  expect(result.error).toBe('validation.usernameTooShort');
});
```

---

*Testing analysis: 2026-01-22*
