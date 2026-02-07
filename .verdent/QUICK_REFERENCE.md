# Verdent Quick Reference

## Core Commands

| Command | Use For | Key Steps |
|---------|---------|-----------|
| **feature** | New feature implementation | Context → Questions → Plan → Test-first → Implement → Verify |
| **fix** | Bug fixing | Parse errors → Reproduce → Write test → Fix → Verify |
| **investigate** | Deep root cause analysis | Map flow → Analyze → Evidence → Report (NO fixes) |
| **refactor** | Code quality improvement | Baseline tests → Refactor incrementally → Keep tests green |

## Additional Commands

| Command | Use For |
|---------|---------|
| **e2e-test** | End-to-end testing with Playwriter |
| **complete-translation** | Translation management (4 languages) |
| **ui** | UI component work (Neo-Brutalist compliance) |

## Essential Agents

| Agent | Expertise |
|-------|-----------|
| **ultrathink-debugger** | Complex debugging, root cause analysis |
| **react-wizard** | React 19 patterns, hooks, performance |
| **code-quality-pragmatist** | DRY, SOLID, anti-slop enforcement |
| **next-js-architect** | Next.js 16 best practices |
| **tailwind-master** | Neo-Brutalist design system |

## Quick Workflows

### Implement New Feature
```
1. Read: AGENTS.md, fe-next/CLAUDE.md, package.json
2. Search: Find similar features (spawn_subagent file-navigator)
3. Clarify: Ask questions (clarification_tool)
4. Plan: Present implementation plan, wait for approval
5. Test: Write tests FIRST
6. Translate: Add keys to all 4 languages
7. Implement: Follow CLAUDE.md standards
8. Verify: lint → tsc → test → build
```

### Fix a Bug
```
1. Reproduce: Document steps, errors, stack trace
2. Test: Write failing test that reproduces bug
3. Investigate: Trace execution flow, find root cause
4. Fix: Address root cause (not symptom)
5. Verify: Test passes, all checks pass, no regressions
```

### Deep Investigation
```
1. Define: Document symptoms, expected vs actual
2. Map: Trace full execution flow
3. Analyze: Examine each step, check state/data
4. Evidence: Build hypothesis with proof
5. Report: Present findings, recommended fix
6. Wait: NO fixes until approved
```

### Refactor Code
```
1. Baseline: Run tests, ensure all pass
2. Identify: Find code smells (duplication, long functions, etc.)
3. Plan: Document what will change
4. Refactor: One change at a time
5. Verify: Tests pass after EACH change
6. Complete: All checks pass, no behavior changes
```

## Pre-Commit Checklist

Run from `fe-next/` directory:
```bash
npm run lint                 # ESLint - must pass
npx tsc --noEmit             # TypeScript - zero errors
npm run test                 # Jest - all tests pass
npm run check:translations   # 4 languages complete
npm run build                # Production build succeeds
```

## Verdent Tools

### File Operations
- `file_read(path)` - Read file contents
- `file_edit(path, old, new)` - Replace text in file
- `file_write(path, content)` - Create or overwrite file

### Search
- `glob(pattern)` - Find files by pattern
- `grep_content(regex, glob)` - Search content in files
- `grep_file(regex)` - Find files containing pattern

### Execution
- `bash(command)` - Run terminal commands
- `spawn_subagent(type, instructions)` - Launch specialized agent

### Interaction
- `clarification_tool(questions)` - Ask user questions
- `todo_update(todos)` - Track task progress
- `web_search(term, objective)` - Search the web
- `web_fetch(url, query)` - Fetch and analyze URL

### Subagent Types
- `verifier` - Code verification (lint, type-check, tests)
- `general` - Multi-step tasks, research
- `code-reviewer` - Pre-commit code review
- `file-navigator` - Fast codebase exploration

## Translation Keys

Pattern: `section.component.element`

Examples:
```javascript
// translations/en.js
export default {
  game: {
    lobby: {
      title: 'Game Lobby',
      startButton: 'Start Game',
      waitingMessage: 'Waiting for players...'
    }
  }
}
```

Usage:
```typescript
const { t } = useLanguage();
<h1>{t('game.lobby.title')}</h1>
<button>{t('game.lobby.startButton')}</button>
```

**CRITICAL**: Update all 4 languages:
- `translations/en.js` - English
- `translations/he.js` - Hebrew (RTL)
- `translations/sv.js` - Swedish
- `translations/ja.js` - Japanese

Verify: `npm run check:translations`

## Neo-Brutalist Design System

### Hard Shadows (NO blur)
```css
shadow-hard        /* 4px 4px 0px black */
shadow-hard-sm     /* 2px 2px 0px black */
shadow-hard-lg     /* 8px 8px 0px black */
shadow-hard-pressed /* 2px 2px 0px black (button pressed) */
```

### Chunky Borders
```css
border-neo         /* 3px solid black */
border-neo-thick   /* 4px solid black */
rounded-neo        /* 4px border-radius (minimal rounding) */
```

### Color Palette
```css
neo-yellow    /* #FFE135 - Primary */
neo-orange    /* #FF6B35 - Secondary */
neo-pink      /* #FF1493 - Accent */
neo-cyan      /* #00FFFF - Accent */
neo-navy      /* #1a1a2e - Background */
neo-white     /* #FFFFFF - Text */
```

### Typography
```css
font-neo-display  /* Fredoka - headings */
font-neo-body     /* Rubik - body text */
```

### Container Queries (Prefer over Viewport Units)
```css
text-[3cqw]    /* 3% of container width */
p-[2cqi]       /* 2% of container inline size */
text-[5cqmin]  /* 5% of smaller container dimension */
```

## Type Safety Rules

### No `any` Types
```typescript
// ❌ WRONG
function process(data: any): any { }

// ✅ CORRECT
interface ProcessData {
  value: number;
  timestamp: Date;
}
function process(data: ProcessData): number { }
```

### Null Safety
```typescript
// ❌ WRONG
const name = user.profile.name;

// ✅ CORRECT
const name = user?.profile?.name ?? 'Unknown';
```

### Discriminated Unions
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

## Code Quality Standards

### DRY Principle
- No duplicated code
- Extract repeated logic to utilities
- Use constants for repeated values

### SOLID Principles
- Single Responsibility: One function, one job
- Open/Closed: Open for extension, closed for modification
- Dependency Inversion: Depend on abstractions

### File Size Limits
- Components: < 300 lines
- Files: < 500 lines
- Functions: < 50 lines
- Parameters: < 4 parameters

### Naming
- Variables: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case` or `PascalCase`

## Common Patterns

### Custom Hook
```typescript
export function useGameBoard(size: number) {
  const [state, setState] = useState(initialState);
  
  const action = useCallback(() => {
    // Logic
  }, [deps]);
  
  return { state, action };
}
```

### Context Provider
```typescript
const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }) {
  const [state, setState] = useState(initialState);
  const value = useMemo(() => ({ state, setState }), [state]);
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be within GameProvider');
  return context;
}
```

### API Route (Next.js)
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Testing Patterns

### Component Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('GameButton', () => {
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<GameButton onClick={handleClick}>Click</GameButton>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Test
```typescript
import { renderHook, act } from '@testing-library/react';

describe('useCounter', () => {
  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## Git Workflow

### Check Status
```bash
git status
git diff
git log -3
```

### Create Branch
```bash
git checkout -b feature/my-feature
```

### Commit
```bash
git add .
git commit -m "feat: add new feature"
```

### Conventional Commits
```
feat: New feature
fix: Bug fix
refactor: Code refactoring
test: Add or update tests
docs: Documentation changes
chore: Maintenance tasks
```

## Debugging Tips

### Add Strategic Logging
```typescript
console.log('[DEBUG] Entry:', { args });
console.log('[DEBUG] State:', { before, after });
console.trace('[DEBUG] Call stack:');
```

### Check Types
```typescript
console.log('[DEBUG] Type:', typeof value, Array.isArray(value));
```

### Time Operations
```typescript
console.time('Operation');
expensiveOperation();
console.timeEnd('Operation');
```

### Inspect Network
- Browser DevTools → Network tab
- Or: `curl -v http://localhost:3001/api/endpoint`

## Performance

### Memoization
```typescript
const value = useMemo(() => expensiveCalc(), [deps]);
const callback = useCallback(() => action(), [deps]);
const Component = React.memo(({ props }) => <div />);
```

### Code Splitting
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./Heavy'), {
  loading: () => <div>Loading...</div>
});
```

### Virtual Scrolling
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
// For long lists (>100 items)
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Hardcoded strings | Use `t('key')` |
| `any` types | Define proper types |
| Long functions | Extract smaller functions |
| Magic numbers | Use named constants |
| Missing deps in useEffect | Add all dependencies |
| Creating functions in render | Use useCallback |
| No error handling | Add try/catch, validation |
| No tests | Write tests first |
| Forgetting translations | Update all 4 languages |
| Viewport units | Use container queries |

## Help & Documentation

- **Commands**: `.verdent/commands/`
- **Agents**: `.verdent/agents/`
- **Skills**: `.verdent/skills/`
- **Main docs**: `AGENTS.md`, `fe-next/CLAUDE.md`
- **Game design**: `GAME_DESIGN_DOCUMENT.md`

---

**Quick Start**: Read `AGENTS.md` → Follow command workflow → Use agents for guidance → Test everything → Ship quality code
