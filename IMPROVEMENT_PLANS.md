# LexiClash Improvement Implementation Plans

## Table of Contents
1. [UX/UI Improvements](#1-uxui-improvements)
2. [Performance Optimizations](#2-performance-optimizations)
3. [New Features](#3-new-features)
4. [Quick Wins](#4-quick-wins)

---

## 1. UX/UI Improvements

### 1.1 Interactive Tutorial System

**Goal:** Guide new players through their first game with contextual tooltips

**Current State:** Onboarding exists in `fe-next/components/onboarding/` with steps like `WelcomeDemoStep.tsx` but it's optional and not contextual during actual gameplay.

**Implementation:**

#### Files to Create:
```
fe-next/components/tutorial/
├── TutorialProvider.tsx       # Context for tutorial state
├── TutorialOverlay.tsx        # Overlay with spotlight effect
├── TutorialTooltip.tsx        # Positioned tooltip component
├── TutorialStep.tsx           # Individual step wrapper
├── useTutorial.ts            # Hook for tutorial control
└── tutorialSteps.ts          # Step definitions
```

#### Step 1: Create Tutorial Context
```tsx
// fe-next/components/tutorial/TutorialProvider.tsx
interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'swipe' | 'type';
  onComplete?: () => boolean; // Return true when step is complete
}

interface TutorialContextValue {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}
```

#### Step 2: Define Tutorial Steps
```tsx
// fe-next/components/tutorial/tutorialSteps.ts
export const GAME_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'grid-intro',
    targetSelector: '[data-tutorial="grid"]',
    title: 'tutorial.grid.title',
    description: 'tutorial.grid.description',
    position: 'bottom',
  },
  {
    id: 'swipe-word',
    targetSelector: '[data-tutorial="grid"]',
    title: 'tutorial.swipe.title',
    description: 'tutorial.swipe.description',
    position: 'top',
    action: 'swipe',
    onComplete: () => /* check if word submitted */
  },
  {
    id: 'combo-explain',
    targetSelector: '[data-tutorial="combo-display"]',
    title: 'tutorial.combo.title',
    description: 'tutorial.combo.description',
    position: 'left',
  },
  {
    id: 'timer-explain',
    targetSelector: '[data-tutorial="timer"]',
    title: 'tutorial.timer.title',
    description: 'tutorial.timer.description',
    position: 'bottom',
  },
  {
    id: 'leaderboard-explain',
    targetSelector: '[data-tutorial="leaderboard"]',
    title: 'tutorial.leaderboard.title',
    description: 'tutorial.leaderboard.description',
    position: 'left',
  },
];
```

#### Step 3: Create Spotlight Overlay
```tsx
// fe-next/components/tutorial/TutorialOverlay.tsx
// Uses CSS clip-path to create spotlight effect around target element
// Semi-transparent backdrop with cutout for highlighted element
```

#### Step 4: Add Tutorial Trigger
```tsx
// In PlayerInGameView.tsx or SinglePlayerGame.tsx
const { user } = useAuth();
const { startTutorial } = useTutorial();

useEffect(() => {
  // Check if first game (no games played in profile)
  if (user?.total_games === 0 && !localStorage.getItem('tutorial_completed')) {
    startTutorial();
  }
}, [user]);
```

#### Translations Required:
Add to `fe-next/translations/en.ts`, `he.ts`, `sv.ts`, `ja.ts`:
```ts
tutorial: {
  grid: {
    title: 'The Letter Grid',
    description: 'Swipe across adjacent letters to form words. Letters must connect!',
  },
  swipe: {
    title: 'Try It!',
    description: 'Swipe to form any word you see. The longer the word, the more points!',
  },
  // ... etc
}
```

**Effort:** Medium (3-5 components, translations, localStorage tracking)

---

### 1.2 Mobile Swipe Gestures Enhancement

**Goal:** Improve swipe responsiveness and add gesture hints

**Current State:** `useGridInteraction.ts` handles touch/mouse but could be smoother

**Implementation:**

#### Step 1: Add Visual Trail Effect
```tsx
// In GridComponent - add SVG overlay for swipe trail
const [trailPoints, setTrailPoints] = useState<{x: number, y: number}[]>([]);

// In handleTouchMove, accumulate points
// Render as animated SVG path with neo-brutalist style (thick stroke, hard edges)
```

#### Step 2: Add Haptic Feedback on Letter Selection
```tsx
// fe-next/utils/haptics.ts - already exists, enhance it
export const triggerLetterSelect = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10); // Short pulse
  }
};
```

#### Step 3: Add Gesture Hint Animation for New Players
```tsx
// Show animated hand icon swiping across grid on first load
// Fade out after 3 seconds or first interaction
```

**Effort:** Low-Medium

---

### 1.3 Light Mode Support

**Goal:** Add theme toggle for accessibility

**Current State:** Dark-only with `neo-*` color palette in Tailwind config

**Implementation:**

#### Step 1: Update Tailwind Config
```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      // Add light mode variants
      'neo-bg': {
        light: '#FAFAF9', // warm white
        dark: '#1a1a2e',  // current
      },
      'neo-surface': {
        light: '#FFFFFF',
        dark: '#252542',
      },
      // ... map all colors for both modes
    }
  }
}
```

#### Step 2: Create Theme Context
```tsx
// fe-next/contexts/ThemeContext.tsx
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  resolvedTheme: 'light' | 'dark';
}
```

#### Step 3: Add Theme Toggle in Settings
```tsx
// In Header.tsx or a new SettingsPanel
<ThemeToggle /> // Sun/Moon icon toggle
```

#### Step 4: Update Components
- Update ~50+ components to use `dark:` Tailwind variants
- Test RTL (Hebrew) with both themes

**Effort:** High (many component updates, thorough testing)

---

### 1.4 Enhanced Visual Feedback

**Goal:** Add particle effects and celebrations

**Implementation:**

#### Step 1: Install Particle Library
```bash
npm install @tsparticles/react @tsparticles/slim
```

#### Step 2: Create Celebration Effects
```tsx
// fe-next/components/effects/ComboParticles.tsx
// Trigger burst of neo-colored particles on combo level up

// fe-next/components/effects/AchievementConfetti.tsx
// Already using canvas-confetti in DailyChallengeResults
// Extract to reusable component
```

#### Step 3: Add Word Submission Feedback
```tsx
// In WordFormingArea.tsx
// On valid word: green glow + particles flying to score
// On invalid word: red shake + subtle particles dissipating
```

**Effort:** Medium

---

## 2. Performance Optimizations

### 2.1 Web Workers for Grid Solving

**Goal:** Move CPU-intensive grid solving off main thread

**Current State:** `boggleSolver.ts` runs on main thread, blocks UI on 9x9 boards

**Implementation:**

#### Step 1: Create Worker File
```ts
// fe-next/workers/gridSolver.worker.ts
import { findAllWords } from '@/backend/modules/boggleSolver';

self.onmessage = (e: MessageEvent) => {
  const { grid, dictionary, minLength } = e.data;
  const result = findAllWords(grid, dictionary, minLength);
  self.postMessage(result);
};
```

#### Step 2: Create Worker Hook
```ts
// fe-next/hooks/useGridSolverWorker.ts
export function useGridSolverWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/gridSolver.worker.ts', import.meta.url)
    );
    return () => workerRef.current?.terminate();
  }, []);

  const solve = useCallback((grid, dictionary, minLength) => {
    return new Promise((resolve) => {
      workerRef.current?.postMessage({ grid, dictionary, minLength });
      workerRef.current!.onmessage = (e) => resolve(e.data);
    });
  }, []);

  return { solve };
}
```

#### Step 3: Update API Route
```ts
// fe-next/app/api/solve-grid/route.ts
// Already server-side, but for client hints feature, use worker
```

**Effort:** Medium

---

### 2.2 Virtual Scrolling for Leaderboards

**Goal:** Handle 50+ player leaderboards smoothly

**Implementation:**

#### Step 1: Install Virtualization Library
```bash
npm install @tanstack/react-virtual
```

#### Step 2: Update LiveLeaderboard Component
```tsx
// fe-next/player/components/in-game/LiveLeaderboard.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const LiveLeaderboard = ({ players }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: players.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Row height in px
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[300px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <LeaderboardRow
            key={players[virtualRow.index].id}
            player={players[virtualRow.index]}
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

**Effort:** Low

---

### 2.3 Component Memoization

**Goal:** Reduce unnecessary re-renders

**Implementation:**

#### Priority Components to Memoize:

1. **GridComponent** - Re-renders on every score update
```tsx
// Wrap with React.memo and useMemo for grid cells
export const GridComponent = React.memo(({ grid, ...props }) => {
  const cells = useMemo(() =>
    grid.map((row, i) => row.map((letter, j) => ({ letter, row: i, col: j }))),
    [grid]
  );
  // ...
});
```

2. **LiveLeaderboard** - Only re-render when scores actually change
```tsx
export const LiveLeaderboard = React.memo(
  ({ players }) => { /* ... */ },
  (prev, next) => {
    // Custom comparison - only re-render if rankings changed
    return JSON.stringify(prev.players.map(p => p.score)) ===
           JSON.stringify(next.players.map(p => p.score));
  }
);
```

3. **WordChip** - Static after creation
```tsx
export const WordChip = React.memo(({ word, score, status }) => {
  // ...
});
```

**Effort:** Low

---

### 2.4 Lazy Load Heavy Dependencies

**Goal:** Reduce initial bundle size

**Implementation:**

```tsx
// fe-next/app/[locale]/layout.tsx
// Lazy load Framer Motion for non-critical animations
const MotionDiv = dynamic(() =>
  import('framer-motion').then(mod => mod.motion.div),
  { ssr: false }
);

// Lazy load Howler only when sound is enabled
const loadHowler = () => import('howler');
```

```tsx
// fe-next/contexts/MusicContext.tsx
// Only load audio engine when user enables sound
const [Howl, setHowl] = useState<typeof import('howler').Howl | null>(null);

useEffect(() => {
  if (soundEnabled) {
    import('howler').then(mod => setHowl(mod.Howl));
  }
}, [soundEnabled]);
```

**Effort:** Medium

---

## 3. New Features

### 3.1 Friend System

**Goal:** Add friends list with direct game invitations

**Implementation:**

#### Database Schema (Supabase Migration):
```sql
-- 022_create_friends_table.sql
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create index for fast lookups
CREATE INDEX idx_friends_user ON friends(user_id, status);
CREATE INDEX idx_friends_friend ON friends(friend_id, status);

-- RLS policies
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friends"
  ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friend requests"
  ON friends FOR UPDATE
  USING (auth.uid() = friend_id OR auth.uid() = user_id);
```

#### Frontend Components:
```
fe-next/components/friends/
├── FriendsPanel.tsx          # Main friends list panel
├── FriendCard.tsx            # Individual friend display
├── FriendRequestCard.tsx     # Pending request card
├── AddFriendModal.tsx        # Search and add friends
├── FriendInviteButton.tsx    # Quick invite to game
└── OnlineFriends.tsx         # Shows online status
```

#### Real-time Presence:
```tsx
// Use Supabase Realtime for online status
// fe-next/hooks/useFriendPresence.ts
const channel = supabase.channel('friends-presence');
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  setOnlineFriends(Object.keys(state));
});
```

**Effort:** High

---

### 3.2 Replay System

**Goal:** Watch replays of games

**Implementation:**

#### Database Schema:
```sql
-- 023_create_replays_table.sql
CREATE TABLE game_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  player_id UUID REFERENCES profiles(id),
  events JSONB NOT NULL, -- Array of timestamped events
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event structure:
-- { timestamp: number, type: 'word_submit' | 'combo', data: {...} }
```

#### Event Recording:
```tsx
// fe-next/hooks/useReplayRecorder.ts
interface ReplayEvent {
  timestamp: number; // ms from game start
  type: 'word_submit' | 'word_invalid' | 'combo_up' | 'earthquake';
  data: Record<string, unknown>;
}

const useReplayRecorder = () => {
  const events = useRef<ReplayEvent[]>([]);
  const startTime = useRef<number>(Date.now());

  const recordEvent = (type: string, data: object) => {
    events.current.push({
      timestamp: Date.now() - startTime.current,
      type,
      data,
    });
  };

  const saveReplay = async (gameId: string) => {
    await fetch('/api/replays', {
      method: 'POST',
      body: JSON.stringify({ gameId, events: events.current }),
    });
  };

  return { recordEvent, saveReplay };
};
```

#### Replay Viewer:
```tsx
// fe-next/components/replay/ReplayViewer.tsx
// Playback controls: play, pause, speed (1x, 2x, 4x)
// Timeline scrubber
// Shows grid state at any point in time
// Highlights word paths as they're formed
```

**Effort:** High

---

### 3.3 Tournament Mode

**Goal:** Weekly/monthly competitive events

**Implementation:**

#### Database Schema:
```sql
-- 024_create_tournaments_table.sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('weekly', 'monthly', 'special')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  entry_requirement JSONB, -- { min_level: 5, min_games: 10 }
  prizes JSONB, -- { 1: 'gold_badge', 2: 'silver_badge' }
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  player_id UUID REFERENCES profiles(id),
  score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  best_game_id UUID REFERENCES games(id),
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);
```

#### Frontend:
```
fe-next/app/[locale]/tournaments/
├── page.tsx                  # Tournament list
├── [id]/page.tsx            # Tournament details/leaderboard
└── components/
    ├── TournamentCard.tsx
    ├── TournamentLeaderboard.tsx
    ├── TournamentCountdown.tsx
    └── TournamentPrizes.tsx
```

**Effort:** High

---

### 3.4 Custom Word Packs

**Goal:** Themed word lists for variety

**Implementation:**

#### Database Schema:
```sql
-- 025_create_word_packs_table.sql
CREATE TABLE word_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT, -- 'sports', 'movies', 'science', etc.
  language TEXT NOT NULL,
  words TEXT[] NOT NULL, -- Array of words
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Word Pack Selector:
```tsx
// In game settings or lobby
<WordPackSelector
  packs={availablePacks}
  selected={selectedPack}
  onSelect={setSelectedPack}
/>
```

**Effort:** Medium

---

## 4. Quick Wins

### 4.1 Direct Keyboard Typing

**Goal:** Let players type words directly instead of only swiping

**Current State:** `useGridInteraction.ts:32` has `handleKeyDown` but limited functionality

**Implementation:**

#### Step 1: Add Word Input Field
```tsx
// In PlayerInGameView.tsx or SinglePlayerGame.tsx
const [typedWord, setTypedWord] = useState('');

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && typedWord.length >= minWordLength) {
    // Validate word exists on grid
    const path = findWordPath(grid, typedWord);
    if (path) {
      onWordSubmit(typedWord);
      setTypedWord('');
    } else {
      // Show "word not on grid" feedback
    }
  } else if (e.key === 'Backspace') {
    setTypedWord(prev => prev.slice(0, -1));
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    setTypedWord(prev => prev + e.key.toUpperCase());
  }
};
```

#### Step 2: Show Typed Word Preview
```tsx
// Above or below grid
{typedWord && (
  <div className="text-center font-black text-2xl text-neo-yellow">
    {typedWord}
  </div>
)}
```

#### Step 3: Highlight Matching Letters
```tsx
// As user types, highlight letters on grid that could form the word
const possiblePaths = useMemo(() =>
  findAllPaths(grid, typedWord),
  [grid, typedWord]
);
```

**Effort:** Low-Medium

---

### 4.2 Enhanced "Words You Missed" Display

**Goal:** Show all possible words at game end

**Current State:** `MissedWords.tsx` exists but only shows opponent-found words

**Implementation:**

#### Step 1: Create "All Possible Words" Tab
```tsx
// In results page, add toggle
<Tabs defaultValue="found">
  <TabsList>
    <TabsTrigger value="found">{t('results.wordsFound')}</TabsTrigger>
    <TabsTrigger value="missed">{t('results.allPossible')}</TabsTrigger>
  </TabsList>
  <TabsContent value="missed">
    <AllPossibleWords
      grid={grid}
      foundWords={playerWords}
    />
  </TabsContent>
</Tabs>
```

#### Step 2: Add Word Definitions (Optional)
```tsx
// On click/tap a missed word, show its definition
// Use free dictionary API or store definitions
const fetchDefinition = async (word: string) => {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  return res.json();
};
```

**Effort:** Low

---

### 4.3 Improved Share Cards

**Goal:** Make daily challenge share images more visually appealing

**Current State:** `generateShareableResult()` creates emoji-based text

**Implementation:**

#### Step 1: Create Canvas-based Share Image
```tsx
// fe-next/utils/shareImageGenerator.ts
export async function generateShareImage(result: DailyChallengeResult): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  // Neo-brutalist background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 600, 400);

  // Yellow header bar
  ctx.fillStyle = '#FFE135';
  ctx.fillRect(0, 0, 600, 80);

  // Logo and title
  ctx.font = 'bold 32px Fredoka';
  ctx.fillStyle = '#000';
  ctx.fillText('LexiClash Daily #' + result.puzzleNumber, 30, 55);

  // Score display
  ctx.font = 'bold 72px Fredoka';
  ctx.fillStyle = '#FFE135';
  ctx.fillText(result.score.toString(), 250, 200);

  // Stats
  ctx.font = 'bold 24px Rubik';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${result.wordCount} words`, 220, 250);
  ctx.fillText(`Longest: ${result.longestWord}`, 200, 290);

  // Streak flame if applicable
  if (result.streak > 1) {
    ctx.fillText(`🔥 ${result.streak} day streak`, 210, 330);
  }

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
```

#### Step 2: Add Share Image to Share Flow
```tsx
// In DailyChallengeResults.tsx
const handleShare = async () => {
  const imageBlob = await generateShareImage(result);

  if (navigator.canShare?.({ files: [new File([imageBlob], 'lexiclash.png')] })) {
    await navigator.share({
      files: [new File([imageBlob], 'lexiclash-daily.png', { type: 'image/png' })],
      title: 'LexiClash Daily',
      text: shareText,
    });
  } else {
    // Fallback to text sharing
  }
};
```

**Effort:** Medium

---

### 4.4 First Win Confetti

**Goal:** Celebrate first-time winners

**Current State:** Confetti exists in `DailyChallengeResults.tsx` but not for multiplayer first win

**Implementation:**

```tsx
// fe-next/hooks/useFirstWinCelebration.ts
export function useFirstWinCelebration(isWinner: boolean, gamesPlayed: number) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // First win ever (1 game played means this was their first)
    if (isWinner && gamesPlayed === 1) {
      setShowCelebration(true);

      // Epic confetti burst
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFE135', '#FF6B35', '#00D9FF', '#FF69B4'],
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFE135', '#FF6B35', '#00D9FF', '#FF69B4'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Show achievement-style popup
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [isWinner, gamesPlayed]);

  return { showCelebration };
}
```

```tsx
// In ResultsPage.tsx
const { showCelebration } = useFirstWinCelebration(isWinner, profile?.total_games);

{showCelebration && (
  <FirstWinOverlay>
    <Trophy className="w-24 h-24 text-neo-yellow animate-bounce" />
    <h2>{t('results.firstWin.title')}</h2>
    <p>{t('results.firstWin.message')}</p>
  </FirstWinOverlay>
)}
```

**Effort:** Low

---

### 4.5 Separate Sound Controls

**Goal:** Independent toggles for music vs sound effects

**Current State:** `MusicContext.tsx` and `SoundEffectsContext.tsx` are separate but UI toggle is combined

**Implementation:**

```tsx
// Update settings/audio controls
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <span>{t('settings.music')}</span>
    <Switch checked={musicEnabled} onCheckedChange={setMusicEnabled} />
  </div>
  <div className="flex items-center justify-between">
    <span>{t('settings.soundEffects')}</span>
    <Switch checked={sfxEnabled} onCheckedChange={setSfxEnabled} />
  </div>
  <div className="flex items-center justify-between">
    <span>{t('settings.haptics')}</span>
    <Switch checked={hapticsEnabled} onCheckedChange={setHapticsEnabled} />
  </div>
</div>
```

**Effort:** Very Low

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Keyboard typing | High | Low | **P0** |
| Sound controls | Medium | Very Low | **P0** |
| First win confetti | Medium | Low | **P0** |
| Component memoization | High | Low | **P1** |
| Virtual scrolling | Medium | Low | **P1** |
| Missed words enhanced | Medium | Low | **P1** |
| Tutorial system | High | Medium | **P1** |
| Web Workers | High | Medium | **P2** |
| Share image | Medium | Medium | **P2** |
| Mobile gestures | Medium | Medium | **P2** |
| Friend system | High | High | **P3** |
| Replay system | High | High | **P3** |
| Tournament mode | High | High | **P3** |
| Light mode | Medium | High | **P4** |
| Custom word packs | Medium | Medium | **P4** |

---

## Next Steps

1. Start with **P0 Quick Wins** - can be completed in 1-2 hours each
2. Move to **P1 Performance** - immediate UX improvements
3. Plan sprints for **P2-P3 Features** - requires design and testing
4. Schedule **P4** for future roadmap

Would you like me to implement any of these improvements?
