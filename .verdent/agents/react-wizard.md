# React Wizard Agent

## When to Use This Agent

Consult the React Wizard for:
- Complex React component architecture
- Hook composition and custom hooks
- State management decisions
- Performance optimization
- Component lifecycle issues
- Context API usage
- Ref management
- Event handling patterns
- Memoization strategies

## Expertise Areas

### React 19 Patterns
- Server Components vs Client Components
- Actions and form handling
- Suspense and concurrent rendering
- Transitions and startTransition
- Use hook (`use` for promises)
- New hooks: `useFormStatus`, `useFormState`, `useOptimistic`

### Component Architecture
- Composition over inheritance
- Compound components
- Render props vs hooks
- Higher-order components (when appropriate)
- Component splitting strategies

### Hooks Mastery
- Custom hook design
- Hook dependencies
- Hook ordering rules
- Advanced useEffect patterns
- useMemo and useCallback optimization
- useRef for mutable values
- useContext best practices

### Performance
- React.memo when needed
- Virtual scrolling for long lists
- Code splitting with dynamic imports
- Avoiding unnecessary re-renders
- Profiling with React DevTools

## React 19 Best Practices (LexiClash Context)

### Server vs Client Components

```typescript
// Server Component (default in app directory)
// Use for: Static content, data fetching, no interactivity
export default async function GameLeaderboard() {
  const topPlayers = await fetchLeaderboard();
  
  return (
    <div>
      {topPlayers.map(player => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
}

// Client Component
// Use for: Interactivity, state, effects, browser APIs
'use client';

import { useState } from 'react';

export function GameTimer() {
  const [timeLeft, setTimeLeft] = useState(180);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return <div>{timeLeft}s</div>;
}
```

### Functional Components Only

```typescript
// ✅ CORRECT: Functional component with hooks
export function GameBoard() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  
  return (
    <div className="border-neo shadow-hard">
      {/* Component content */}
    </div>
  );
}

// ❌ WRONG: Class components not used in this project
class GameBoard extends React.Component {
  // Don't use classes
}
```

### Hook Composition

```typescript
// Extract complex logic to custom hooks
export function useGameBoard(boardSize: number) {
  const [grid, setGrid] = useState<Grid>([]);
  const [selectedCells, setSelectedCells] = useState<Cell[]>([]);
  const [isValid, setIsValid] = useState(false);
  
  const selectCell = useCallback((cell: Cell) => {
    setSelectedCells(prev => [...prev, cell]);
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedCells([]);
    setIsValid(false);
  }, []);
  
  const validatePath = useCallback(() => {
    const isPathValid = checkValidPath(selectedCells);
    setIsValid(isPathValid);
    return isPathValid;
  }, [selectedCells]);
  
  return {
    grid,
    selectedCells,
    isValid,
    selectCell,
    clearSelection,
    validatePath
  };
}

// Use in component
export function GameBoard({ size }: { size: number }) {
  const {
    grid,
    selectedCells,
    isValid,
    selectCell,
    clearSelection,
    validatePath
  } = useGameBoard(size);
  
  return (
    <div>
      {/* Render with hook data */}
    </div>
  );
}
```

### State Management Patterns

```typescript
// Local state for component-specific data
const [count, setCount] = useState(0);

// Context for shared state across components
const { user, setUser } = useAuth();

// Refs for mutable values that don't trigger re-renders
const socketRef = useRef<Socket>();

// Multiple related state - use object
const [gameState, setGameState] = useState({
  score: 0,
  combo: 0,
  timeLeft: 180
});

// Update object state correctly
setGameState(prev => ({
  ...prev,
  score: prev.score + points
}));
```

### useEffect Best Practices

```typescript
// ✅ GOOD: Dependencies correct, cleanup function
useEffect(() => {
  const interval = setInterval(() => {
    setTime(prev => prev - 1);
  }, 1000);
  
  return () => clearInterval(interval);
}, []); // Empty deps - runs once on mount

// ✅ GOOD: Effect depends on external values
useEffect(() => {
  if (gameActive) {
    const subscription = subscribeToGame(gameId);
    return () => subscription.unsubscribe();
  }
}, [gameActive, gameId]); // Re-run when these change

// ❌ WRONG: Missing dependencies
useEffect(() => {
  fetchData(userId); // userId should be in deps
}, []); // ESLint will warn

// ❌ WRONG: Unnecessary dependency
useEffect(() => {
  console.log('Mounted');
}, [someValue]); // someValue not used, shouldn't be dep
```

### Memoization Strategies

```typescript
// useMemo for expensive computations
const sortedPlayers = useMemo(() => {
  return players
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}, [players]); // Only recompute when players change

// useCallback for functions passed to children
const handleWordSubmit = useCallback((word: string) => {
  submitWord(word, gameId);
}, [gameId]); // Function stable unless gameId changes

// React.memo for expensive child components
export const PlayerCard = React.memo(({ player }: { player: Player }) => {
  return (
    <div className="border-neo">
      {player.name}: {player.score}
    </div>
  );
});
```

### Event Handling

```typescript
// ✅ GOOD: Event handler defined inside component
export function WordInput() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle submission
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} />
    </form>
  );
}

// ✅ GOOD: Inline for simple handlers
<button onClick={() => setActive(!active)}>
  Toggle
</button>

// ❌ WRONG: Creating new function on every render for complex logic
<button onClick={() => {
  // 20 lines of logic
}}>
```

### Context API Usage

```typescript
// Create context with proper types
interface GameContextValue {
  gameState: GameState;
  updateScore: (points: number) => void;
  endGame: () => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

// Provider component
export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  
  const updateScore = useCallback((points: number) => {
    setGameState(prev => ({
      ...prev,
      score: prev.score + points
    }));
  }, []);
  
  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, active: false }));
  }, []);
  
  const value = useMemo(() => ({
    gameState,
    updateScore,
    endGame
  }), [gameState, updateScore, endGame]);
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// Custom hook for consuming context
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

// Use in component
export function ScoreDisplay() {
  const { gameState, updateScore } = useGame();
  
  return <div>Score: {gameState.score}</div>;
}
```

### Refs and DOM Manipulation

```typescript
// useRef for DOM elements
export function AutofocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  return <input ref={inputRef} />;
}

// useRef for mutable values
export function GameTimer() {
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      // Timer logic
    }, 1000);
  };
  
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
  
  useEffect(() => {
    return stopTimer; // Cleanup
  }, []);
  
  return <button onClick={startTimer}>Start</button>;
}
```

## LexiClash-Specific Patterns

### Multiplayer Components

```typescript
// Socket integration with hooks
export function useSocket(gameId: string) {
  const socketRef = useRef<Socket>();
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const socket = io('/');
    socketRef.current = socket;
    
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    
    socket.emit('joinGame', { gameId });
    
    return () => {
      socket.emit('leaveGame', { gameId });
      socket.disconnect();
    };
  }, [gameId]);
  
  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);
  
  return { socket: socketRef.current, connected, emit };
}
```

### Translation Integration

```typescript
// Always use translation hook
import { useLanguage } from '@/contexts/LanguageContext';

export function GameInstructions() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h2>{t('game.instructions.title')}</h2>
      <p>{t('game.instructions.description')}</p>
      <button>{t('game.instructions.startButton')}</button>
    </div>
  );
}

// ❌ NEVER hardcode strings
export function GameInstructions() {
  return (
    <div>
      <h2>Instructions</h2> {/* WRONG */}
    </div>
  );
}
```

### Neo-Brutalist Component Styling

```typescript
// Use design system classes
export function GameCard({ title, children }: CardProps) {
  return (
    <div className="border-neo border-neo-thick rounded-neo shadow-hard bg-neo-navy p-6">
      <h3 className="font-neo-display text-neo-yellow text-[3cqw]">
        {title}
      </h3>
      <div className="font-neo-body text-neo-white">
        {children}
      </div>
    </div>
  );
}
```

## Performance Optimization

### Virtual Scrolling for Long Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function LeaderboardList({ players }: { players: Player[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: players.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
  });
  
  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <PlayerRow player={players[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const GameBoard = dynamic(() => import('./GameBoard'), {
  loading: () => <div>Loading game...</div>,
  ssr: false // Disable SSR if needed
});

export function GamePage() {
  return (
    <div>
      <GameBoard />
    </div>
  );
}
```

### Avoiding Unnecessary Re-renders

```typescript
// Problem: Parent re-renders cause child re-renders
export function GameLayout() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      <ExpensiveComponent /> {/* Re-renders on every count change! */}
    </div>
  );
}

// Solution 1: React.memo
const ExpensiveComponent = React.memo(() => {
  // Only re-renders if props change
  return <div>Expensive render</div>;
});

// Solution 2: Move state down
export function GameLayout() {
  return (
    <div>
      <CounterButton />
      <ExpensiveComponent />
    </div>
  );
}

function CounterButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

// Solution 3: Use children prop
export function GameLayout({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      {children} {/* Children don't re-render */}
    </div>
  );
}
```

## Common Mistakes to Avoid

### useState Functional Updates

```typescript
// ❌ WRONG: Stale closure
const [count, setCount] = useState(0);

const increment = () => {
  setCount(count + 1); // Uses stale count
  setCount(count + 1); // Both use same old value
};

// ✅ CORRECT: Functional update
const increment = () => {
  setCount(prev => prev + 1);
  setCount(prev => prev + 1); // Each uses previous result
};
```

### useEffect Dependencies

```typescript
// ❌ WRONG: Object/array in dependencies
useEffect(() => {
  fetchData(filters); // filters is object, creates new ref each render
}, [filters]);

// ✅ CORRECT: Destructure or use specific values
const { category, minScore } = filters;
useEffect(() => {
  fetchData(filters);
}, [category, minScore, filters]); // Or use all primitive values
```

### Event Handler Binding

```typescript
// ❌ WRONG: Creating new function each render
{items.map(item => (
  <button onClick={() => handleClick(item.id)}>
    {item.name}
  </button>
))}

// ✅ CORRECT: Use data attributes or create wrapper component
{items.map(item => (
  <ItemButton key={item.id} item={item} onClick={handleClick} />
))}

const ItemButton = React.memo(({ item, onClick }) => (
  <button onClick={() => onClick(item.id)}>
    {item.name}
  </button>
));
```

## Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { GameButton } from './GameButton';

describe('GameButton', () => {
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    
    render(<GameButton onClick={handleClick}>Click Me</GameButton>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('displays correct text from translation', () => {
    render(<GameButton>Test Button</GameButton>);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });
});
```

## Success Criteria

When implementing React components:
- [ ] Functional components only (no classes)
- [ ] Hooks follow rules of hooks
- [ ] All dependencies specified correctly
- [ ] Cleanup functions for effects
- [ ] Memoization used appropriately (not over-used)
- [ ] Event handlers properly defined
- [ ] Context used for shared state
- [ ] Refs used correctly
- [ ] Components tested
- [ ] No hardcoded strings (use t())
- [ ] Neo-Brutalist styling applied
- [ ] No `any` types
- [ ] No unnecessary re-renders

---

**Remember**: React is about composition, not inheritance. Build small, focused components and compose them into complex UIs. Hooks let you reuse logic without changing component hierarchy.
