# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `GridComponent.tsx`, `Avatar.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `usePullToRefresh.ts`, `useAdventureWordValidation.ts`)
- Utilities: camelCase (e.g., `validation.ts`, `customPuzzle.ts`)
- Types: Use `types/` directory with PascalCase (e.g., `types/adventure.ts`)
- Tests: Mirror source structure with `.test.ts` or `.test.tsx` suffix (e.g., `components/__tests__/Avatar.test.tsx`, `hooks/__tests__/useAdventureGame.test.ts`, `backend/__tests__/wordValidator.extended.test.ts`)
- Test subdirectories: Use `__tests__/` folder at same level as code being tested

**Functions:**
- camelCase for all functions and methods
- Exported functions use camelCase (e.g., `validateUsername`, `calculateScore`, `isWordOnBoard`)
- Helper functions: camelCase, often with descriptive verb prefixes (e.g., `getWordFromPath`, `isAdjacent`, `getScrollTop`, `findScrollableParent`)

**Variables:**
- camelCase for all variables and state (e.g., `selectedCells`, `isValidating`, `pullDistance`)
- Boolean variables prefixed with `is`, `has`, `can`, `should` (e.g., `isValid`, `isFrozen`, `isPulling`, `hasError`, `canSubmit`)
- React state: `const [variableName, setVariableName] = useState()`
- Refs: camelCase with `Ref` suffix (e.g., `gridRef`, `hintTimeoutRef`, `timerRef`)

**Types & Interfaces:**
- PascalCase for all types and interfaces (e.g., `GridComponentProps`, `WordValidationResult`, `UseAdventureWordValidationProps`)
- Props interfaces: `ComponentNameProps` (e.g., `PeerValidationResultToastProps`)
- Type exports: Use `export type` for TypeScript types
- Generic type parameters: Single uppercase letter or descriptive PascalCase (e.g., `<T>`, `<Props>`, `<State>`)

**Constants:**
- UPPER_SNAKE_CASE for global constants (e.g., `USERNAME_MIN_LENGTH`, `BASE_SCORE_PER_LETTER`, `RAINBOW_COLORS`)
- Constants stored in dedicated `consts.ts` files or colocated with related code
- Constants grouped by category with comments: `// ===== CONSTANTS =====`

## Code Style

**Formatting:**
- No explicit prettier/prettier config found in root; ESLint enforces style
- 2-space indentation (default Node.js/TypeScript standard)
- Line length: No hard limit enforced, but components kept under 500 lines
- Semicolons: Required (enforced by Next.js ESLint config)

**Linting:**
- ESLint 9 with `eslint-config-next/core-web-vitals`
- Config file: `eslint.config.mjs` (flat config format)
- Custom rules:
  - `react-hooks/set-state-in-effect`: OFF (allows legitimate hydration/data patterns)
  - `react-hooks/refs`: OFF (allows useRef patterns)
  - `no-duplicate-imports`: ERROR (prevents duplicate imports)
- Run with: `npm run lint`

**TypeScript:**
- Strict mode: ENABLED
- `noImplicitThis`: true
- `strictNullChecks`: true
- `strictFunctionTypes`: true
- `strictPropertyInitialization`: true
- `noImplicitReturns`: true
- `noFallthroughCasesInSwitch`: true
- `noUnusedLocals`: false (allows unused variables)
- `noUnusedParameters`: false (allows unused parameters)
- No `any` types allowed (enforced through team standards, not config)
- Path aliases: `@/*` resolves to project root

## Import Organization

**Order:**
1. React & React-related imports (`import React`, `import type`, `from 'react'`)
2. External libraries (`framer-motion`, `lucide-react`, `@radix-ui/*`)
3. Absolute imports using alias (`@/components`, `@/lib`, `@/hooks`, `@/contexts`, `@/utils`, `@/types`, `@/shared`)
4. Relative imports (only when necessary)
5. Type imports: `import type { ... } from ...`

**Path Aliases:**
- `@/*`: Project root
- `@/components/(.*)`: Components directory
- `@/hooks/(.*)`: Hooks directory
- `@/contexts/(.*)`: Contexts directory
- `@/utils/(.*)`: Utils directory
- `@/shared/(.*)`: Shared types/utilities
- `@/types/(.*)`: Type definitions
- `@backend/(.*)`: Backend modules (in Jest config)

**Example from `PeerValidationResultToast.tsx`:**
```typescript
'use client';

import React, { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PeerValidationResultPayload } from '@/shared/types/socket';
```

## Error Handling

**Patterns:**
- Try-catch blocks with typed error handling: `catch (err) { err instanceof Error ? ... : new Error(String(err)) }`
- Errors converted to `Error` type before logging/reporting
- Error logging uses structured approach with operation context
- Example from `gameSessionLogger.ts`:
  ```typescript
  } catch (err) {
    logger.error('GAME_SESSION_LOGGER', `Exception logging game session: ${err}`);
    captureBackgroundErrorSafe(err instanceof Error ? err : new Error(String(err)), {
      operation: 'log_game_session',
      service: 'gameSessionLogger',
    });
  }
  ```

**Validation Results:**
- Validation functions return `ValidationResult` interface: `{ isValid: boolean; error?: string }`
- Error strings are translation keys (e.g., `'validation.usernameRequired'`, `'adventure.errors.tooShort'`)
- Examples from `validation.ts`:
  ```typescript
  export interface ValidationResult {
    isValid: boolean;
    error?: string;
  }

  export const validateUsername = (username: string): ValidationResult => {
    if (!username || !username.trim()) {
      return { isValid: false, error: 'validation.usernameRequired' };
    }
    // ...
    return { isValid: true };
  };
  ```

**Word Validation Results:**
- Hook returns result with `errorKey` for translation and optional `score`
- Example from `useAdventureWordValidation.ts`:
  ```typescript
  export interface WordValidationResult {
    isValid: boolean;
    errorKey?: string;
    score?: number;
  }
  ```

**Null/Empty Checks:**
- Explicit null checks: `if (!variable)`, `if (variable !== null)`, `if (value === undefined)`
- Optional chaining: `obj?.property`
- Nullish coalescing: `value ?? defaultValue`
- Array checks: `.length === 0` or `.length > 0`

## Logging

**Framework:** console methods (console.log, console.warn, console.error)

**Patterns:**
- Backend uses labeled logging: `logger.error('GAME_SESSION_LOGGER', message)`
- Frontend: Direct console calls for development, Sentry for production
- Sentry integration in frontend via `@sentry/nextjs` (mocked in tests)
- Configuration warnings logged with console.warn at startup
- Errors logged with context object: `{ operation, service, userId }`
- Example:
  ```typescript
  logger.error('GAME_SESSION_LOGGER', `Exception logging game session: ${err}`);
  captureBackgroundErrorSafe(err instanceof Error ? err : new Error(String(err)), {
    operation: 'log_game_session',
    service: 'gameSessionLogger',
    userId: sessionData.userId,
  });
  ```

**No logging of sensitive data** (passwords, tokens, email addresses)

## Comments

**When to Comment:**
- Complex algorithms: Explain why this approach (e.g., adjacency checking in path validation)
- Non-obvious behavior: Side effects, state mutations, workarounds
- Translation keys: When mapping keys to UI text
- Performance considerations: Device capability detection, memoization
- Accessibility: Why certain patterns are used for accessibility

**When NOT to Comment:**
- Obvious code: `const [isLoading, setIsLoading] = useState(false)` needs no comment
- Self-documenting: Good naming replaces comments
- Implementation details that change frequently

**JSDoc/TSDoc:**
- Used for exported functions and hooks
- Format: `/** Description */` on single line or multi-line
- Include `@param` and `@returns` for public APIs
- Example from `usePullToRefresh.ts`:
  ```typescript
  /**
   * usePullToRefresh - Hook for pull-to-refresh functionality
   *
   * Features:
   * - Native iOS-style pull-to-refresh
   * - Works with both window scroll and element scroll
   * - Configurable threshold and resistance
   * - Haptic feedback on trigger
   *
   * @example
   * const { pullToRefreshHandlers, pullState } = usePullToRefresh({
   *   onRefresh: async () => {
   *     await fetchNewData();
   *   },
   * });
   */
  ```

**Section Comments:**
- Use dividers for logical sections: `// ===== SECTION_NAME =====`
- Example from `useAdventureWordValidation.ts`:
  ```typescript
  // ==============================================
  // TYPES
  // ==============================================

  // ==============================================
  // CONSTANTS
  // ==============================================

  // ==============================================
  // HELPER FUNCTIONS
  // ==============================================

  // ==============================================
  // HOOK
  // ==============================================
  ```

## Function Design

**Size:**
- Max ~50 lines per function (enforce via code review)
- Helper functions extracted for logic > 20 lines
- Component functions kept under 300 lines (split into sub-components or hooks)

**Parameters:**
- Prefer object parameter for > 3 params: `function validate(options: { word: string; language: string; minLength: number })`
- Use type aliases for parameter types
- Destructure props in function signature when possible
- Example from `GridComponent.tsx`:
  ```typescript
  const GridComponent = memo<GridComponentProps>(({
    grid,
    interactive = false,
    onWordSubmit,
    onPathSubmit,
    selectedCells: externalSelectedCells,
    className,
    // ... 10+ more props destructured
  }) => {
  ```

**Return Values:**
- Explicit return type annotations on all exported functions
- Return objects with named properties for multiple values
- Example from `useAdventureWordValidation.ts`:
  ```typescript
  export interface UseAdventureWordValidationReturn {
    isValidating: boolean;
    lastValidationResult: WordValidationResult | null;
    validateWord: (word: string, path: Array<{ row: number; col: number }>) => Promise<WordValidationResult>;
  }
  ```

## Module Design

**Exports:**
- Use named exports for functions, types, interfaces
- Use default export for components only
- Example from `Avatar.tsx`:
  ```typescript
  const Avatar = memo<AvatarProps>(({ avatarImage, profilePictureUrl }) => {
    // ...
  });

  Avatar.displayName = 'Avatar';
  export default Avatar;
  ```

**Barrel Files:**
- Used in component subdirectories (e.g., `components/grid/index.ts`)
- Export all sub-modules for convenience
- Keep barrel files focused on related exports

**React Components:**
- Always use `memo()` for components to prevent unnecessary re-renders
- Always set `displayName` on memoized components
- Use function component syntax (no class components)
- Example from `PeerValidationResultToast.tsx`:
  ```typescript
  const PeerValidationResultToast = memo<PeerValidationResultToastProps>(({
    result,
    isMyWord,
    onDismiss,
    t,
    autoDismissMs = 5000,
  }) => {
    // implementation
  });

  PeerValidationResultToast.displayName = 'PeerValidationResultToast';
  export default PeerValidationResultToast;
  ```

**Hooks:**
- Always export as named function starting with `use`
- Return interface defining all return values (never bare object)
- Props interface: `UseXXXProps` pattern
- Return interface: `UseXXXReturn` pattern
- Example from `useAdventureWordValidation.ts`:
  ```typescript
  export interface UseAdventureWordValidationProps {
    grid: string[][];
    language: string;
    minWordLength: number;
    foundWords: string[];
  }

  export interface UseAdventureWordValidationReturn {
    isValidating: boolean;
    lastValidationResult: WordValidationResult | null;
    validateWord: (...) => Promise<WordValidationResult>;
  }

  export function useAdventureWordValidation({
    grid,
    language,
    minWordLength,
    foundWords,
  }: UseAdventureWordValidationProps): UseAdventureWordValidationReturn {
    // implementation
  }
  ```

---

*Convention analysis: 2026-01-22*
