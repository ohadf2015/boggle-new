# Mascot Full-App Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Place all 20 Lexi mascot variants in emotionally appropriate moments across the app, fixing the orphaned DJMascot and giving the Daily Word Hunt zero-to-full mascot coverage.

**Architecture:** Direct contextual placement — each mascot variant is wired to the exact emotional state (score %, timer threshold, combo level) in the screen it belongs to. A single `mascotConfig.ts` constants file holds all trigger thresholds so game balance decisions stay out of component JSX.

**Tech Stack:** Next.js, TypeScript, Framer Motion (`m` from framer-motion), `<Mascot>` / `<CelebrationMascot>` / `<DJMascot>` from `components/ui/`, `useDevicePerformance` for reduced motion.

---

## Task 1: Create trigger constants file

**Files:**
- Create: `fe-next/utils/mascotConfig.ts`

**Step 1: Write the failing test**

```ts
// fe-next/utils/__tests__/mascotConfig.test.ts
import {
  PANIC_TIMER_THRESHOLD,
  ONFIRE_COMBO_THRESHOLD,
  FLEXING_SCORE_THRESHOLD,
  ENCOURAGING_SCORE_THRESHOLD,
  MINDBLOWN_PROGRESS_THRESHOLD,
} from '../mascotConfig';

describe('mascotConfig', () => {
  it('exports numeric constants', () => {
    expect(typeof PANIC_TIMER_THRESHOLD).toBe('number');
    expect(typeof ONFIRE_COMBO_THRESHOLD).toBe('number');
    expect(typeof FLEXING_SCORE_THRESHOLD).toBe('number');
    expect(typeof ENCOURAGING_SCORE_THRESHOLD).toBe('number');
    expect(typeof MINDBLOWN_PROGRESS_THRESHOLD).toBe('number');
  });

  it('panic threshold is less than onfire combo (different scales)', () => {
    expect(PANIC_TIMER_THRESHOLD).toBeLessThan(60); // seconds
    expect(ONFIRE_COMBO_THRESHOLD).toBeGreaterThanOrEqual(3);
  });

  it('score thresholds are fractions between 0 and 1', () => {
    expect(FLEXING_SCORE_THRESHOLD).toBeGreaterThan(0);
    expect(FLEXING_SCORE_THRESHOLD).toBeLessThanOrEqual(1);
    expect(ENCOURAGING_SCORE_THRESHOLD).toBeGreaterThan(0);
    expect(ENCOURAGING_SCORE_THRESHOLD).toBeLessThan(FLEXING_SCORE_THRESHOLD);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="mascotConfig" --no-coverage
```

Expected: FAIL — "Cannot find module '../mascotConfig'"

**Step 3: Create the constants file**

```ts
// fe-next/utils/mascotConfig.ts

/**
 * Mascot trigger thresholds — single source of truth for emotional state logic.
 * Game balance decisions live here, not scattered in JSX.
 */

/** Seconds remaining when panic mascot appears during gameplay */
export const PANIC_TIMER_THRESHOLD = 30;

/** Combo level at which onfire mascot appears during gameplay */
export const ONFIRE_COMBO_THRESHOLD = 3;

/**
 * Word hunt efficiency score (0–1) above which flexing mascot shows on results.
 * efficiencyScore = wordsFound / totalPossibleWords (backend-computed).
 */
export const FLEXING_SCORE_THRESHOLD = 0.6;

/**
 * Word hunt efficiency score (0–1) below which encouraging mascot shows on results.
 * Players below this threshold get a supportive Lexi, not a celebrating one.
 */
export const ENCOURAGING_SCORE_THRESHOLD = 0.4;

/**
 * Achievement progress percentage (0–100) above which mindblown mascot shows
 * in the AchievementProgressTracker.
 */
export const MINDBLOWN_PROGRESS_THRESHOLD = 80;
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="mascotConfig" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add utils/mascotConfig.ts utils/__tests__/mascotConfig.test.ts
git commit -m "feat(mascot): add mascot trigger constants"
```

---

## Task 2: Wire DJMascot into MultiplayerLobby

**Files:**
- Modify: `fe-next/components/multiplayer/MultiplayerLobby.tsx`
- Test: `fe-next/components/multiplayer/__tests__/MultiplayerLobby.djMascot.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/multiplayer/__tests__/MultiplayerLobby.djMascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiplayerLobby from '../MultiplayerLobby';

jest.mock('@/components/ui/DJMascot', () => ({
  DJMascotWithEntrance: () => <div data-testid="dj-mascot" />,
}));
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ prefersReducedMotion: false, enableComplexAnimations: true }),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
jest.mock('@/hooks/useMobileLandscape', () => ({ useMobileLandscape: () => false }));
// Stub all sub-components to avoid deep import chains
jest.mock('@/components/join', () => ({
  RoomList: () => null,
  LanguageSelector: () => null,
  ModeSelector: () => null,
  HostModeFields: () => null,
  JoinModeFields: () => null,
}));
jest.mock('@/components/LandscapeIndicator', () => () => null);
jest.mock('@/utils/validation', () => ({
  validateUsername: () => ({ isValid: true }),
  validateRoomName: () => ({ isValid: true }),
  validateGameCode: () => ({ isValid: true }),
  sanitizeInput: (s: string) => s,
}));

const defaultProps = {
  handleJoin: jest.fn(),
  gameCode: '',
  username: '',
  roomName: '',
  hostUsername: '',
  setGameCode: jest.fn(),
  setUsername: jest.fn(),
  setRoomName: jest.fn(),
  setHostUsername: jest.fn(),
  error: '',
  activeRooms: [],
  refreshRooms: jest.fn(),
  roomsLoading: false,
  isAuthenticated: false,
  displayName: '',
};

describe('MultiplayerLobby - DJ Mascot', () => {
  it('renders the DJ mascot in the lobby header', () => {
    render(<MultiplayerLobby {...defaultProps} />);
    expect(screen.getByTestId('dj-mascot')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="MultiplayerLobby.djMascot" --no-coverage
```

Expected: FAIL — dj-mascot not found

**Step 3: Add DJMascot to MultiplayerLobby header**

In `fe-next/components/multiplayer/MultiplayerLobby.tsx`:

Add import after existing imports (line ~18):
```tsx
import { DJMascotWithEntrance } from '@/components/ui/DJMascot';
```

In the header section (around line 362, after the `<h1>` title block), add DJ mascot beside the title:

```tsx
{/* DJ Mascot - decorative, bobs to the beat of the lobby */}
<DJMascotWithEntrance size="md" className="hidden sm:block" delay={0.3} />
```

Place it inside the flex container that already wraps the page title. The container looks like:
```tsx
<m.div ... className="flex items-center gap-4 mb-6">
  <Link ...><ArrowLeft/></Link>
  <div className="flex-1">
    <h1>...</h1>
    <p>...</p>
  </div>
  {/* ADD DJ HERE, after the text div */}
  <DJMascotWithEntrance size="md" className="hidden sm:block" delay={0.3} />
</m.div>
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="MultiplayerLobby.djMascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/multiplayer/MultiplayerLobby.tsx components/multiplayer/__tests__/MultiplayerLobby.djMascot.test.tsx
git commit -m "feat(mascot): add DJMascot to multiplayer lobby header"
```

---

## Task 3: Add explorer mascot to Daily Word Hunt ready screen

**Files:**
- Modify: `fe-next/components/daily/DailyReadyScreen.tsx`
- Test: `fe-next/components/daily/__tests__/DailyReadyScreen.mascot.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/__tests__/DailyReadyScreen.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
jest.mock('@/hooks/useMobileLandscape', () => ({ useMobileLandscape: () => false }));
// stub heavy sub-components
jest.mock('@/components/daily/TabbedDailyLeaderboard', () => () => null);
jest.mock('@/components/daily/DailyIntroCarousel', () => () => null);
jest.mock('@/components/daily/CreateChallengeModal', () => ({ CreateChallengeModal: () => null }));
jest.mock('@/components/daily/UnauthenticatedCreateChallengeSection', () => ({
  UnauthenticatedCreateChallengeSection: () => null,
}));
jest.mock('@/components/auth/AuthModal', () => () => null);
jest.mock('@/utils/dailyChallenge', () => ({ hasPlayedWordHuntToday: () => false }));

import DailyReadyScreen from '../DailyReadyScreen';

const baseProps = {
  puzzleNumber: 42,
  puzzleDate: '2026-02-21',
  language: 'en' as const,
  currentFlag: '🇺🇸',
  challengeData: null,
  isAuthenticated: false,
  targetWordLength: 5,
  currentPlayerId: null,
  guestFingerprint: null,
  tutorialCompleted: true,
  onLanguageChange: jest.fn(),
  onStart: jest.fn(),
  onBack: jest.fn(),
  onShowTutorial: jest.fn(),
  t: (k: string) => k,
};

describe('DailyReadyScreen - explorer mascot', () => {
  it('renders explorer mascot', () => {
    render(<DailyReadyScreen {...baseProps} />);
    expect(screen.getByTestId('mascot-explorer')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="DailyReadyScreen.mascot" --no-coverage
```

Expected: FAIL — mascot-explorer not found

**Step 3: Add explorer mascot to DailyReadyScreen**

In `fe-next/components/daily/DailyReadyScreen.tsx`:

Add import:
```tsx
import { MascotWithEntrance } from '@/components/ui/Mascot';
```

In the "Main content" section (around line 224, inside `<div className="max-w-md w-full text-center space-y-5 mt-16 sm:mt-20">`), add before the first content block:

```tsx
{/* Explorer mascot - sets the tone for the word hunt adventure ahead */}
<div className="flex justify-center">
  <MascotWithEntrance variant="explorer" size="lg" delay={0.1} />
</div>
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="DailyReadyScreen.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/DailyReadyScreen.tsx components/daily/__tests__/DailyReadyScreen.mascot.test.tsx
git commit -m "feat(mascot): add explorer mascot to daily word hunt ready screen"
```

---

## Task 4: Add panic + onfire mascots to DailyChallengeGame

**Files:**
- Modify: `fe-next/components/daily/DailyChallengeGame.tsx`
- Test: `fe-next/components/daily/__tests__/DailyChallengeGame.mascot.test.tsx`

**Context:** `timer.remainingTime` and `combo.comboLevel` are already local variables in scope within the render. Use `PANIC_TIMER_THRESHOLD` (30s) and `ONFIRE_COMBO_THRESHOLD` (3) from mascotConfig.

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/__tests__/DailyChallengeGame.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the heavy hooks so we control timer/combo values
let mockRemainingTime = 60;
let mockComboLevel = 0;

jest.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: mockRemainingTime,
    remainingTimeRef: { current: mockRemainingTime },
  }),
}));
jest.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: mockComboLevel,
    comboTimeRemaining: 0,
    isDangerState: false,
    maxCombo: mockComboLevel,
    incrementCombo: jest.fn(),
    resetCombo: jest.fn(),
  }),
}));
jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
  MascotWithEntrance: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));
// Stub everything else to keep this test fast
jest.mock('@/components/GridComponent', () => () => <div data-testid="grid" />);
jest.mock('@/components/CircularTimer', () => () => null);
jest.mock('@/components/game/WordFormingArea', () => () => null);
jest.mock('@/components/game/ComboDisplay', () => () => null);
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: jest.fn() }),
}));
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ pauseMusic: jest.fn(), resumeMusic: jest.fn() }),
}));
jest.mock('@/hooks/useMobileLandscape', () => ({ useMobileLandscape: () => false }));
jest.mock('@/contexts/CoinContext', () => ({ useCoinContext: () => ({ awardComboMilestone: jest.fn() }) }));
// Stub remaining hooks
jest.mock('@/hooks/useGameMusic', () => ({ useGameMusic: () => ({}) }));
jest.mock('@/hooks/useWordSubmission', () => ({ useWordSubmission: () => ({ submitWord: jest.fn(), feedback: null }) }));
jest.mock('@/hooks/useNavigationGuard', () => ({ useNavigationGuard: () => {} }));
jest.mock('@/hooks/useKeyboardWordInput', () => ({ useKeyboardWordInput: () => {} }));
jest.mock('@/hooks/useContextualGuidance', () => ({
  useContextualGuidance: () => ({ showGuidance: false }),
  useSwipeTipGuidanceTrigger: () => {},
}));
jest.mock('@/hooks/useDirectionPatternGuidance', () => ({ useDirectionPatternGuidance: () => {} }));
jest.mock('@/hooks/useFirstPlayTutorial', () => ({ useFirstPlayTutorial: () => ({ showTutorial: false }) }));
jest.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: () => {} }));
jest.mock('@/components/achievements/AchievementProgressTracker', () => ({ AchievementProgressTracker: () => null }));
jest.mock('@/components/tutorial/TutorialCallout', () => ({ TutorialCallout: () => null }));
jest.mock('@/components/game/DirectionGuidanceTooltip', () => () => null);
jest.mock('@/components/game/SwipeTipTooltip', () => () => null);
jest.mock('@/components/game/KeyboardHintTooltip', () => () => null);
jest.mock('@/components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));

const MOCK_GRID = { letters: [['A','B','C'],['D','E','F'],['G','H','I']], size: 3 };

const defaultProps = {
  grid: MOCK_GRID,
  puzzleNumber: 1,
  language: 'en' as const,
  duration: 120,
  onComplete: jest.fn(),
  onQuit: jest.fn(),
};

import DailyChallengeGame from '../DailyChallengeGame';

describe('DailyChallengeGame - mascots', () => {
  beforeEach(() => {
    mockRemainingTime = 60;
    mockComboLevel = 0;
  });

  it('does not show panic mascot when time is above threshold', () => {
    mockRemainingTime = 60;
    render(<DailyChallengeGame {...defaultProps} />);
    expect(screen.queryByTestId('mascot-panic')).not.toBeInTheDocument();
  });

  it('shows panic mascot when timer is below 30 seconds', () => {
    mockRemainingTime = 20;
    render(<DailyChallengeGame {...defaultProps} />);
    expect(screen.getByTestId('mascot-panic')).toBeInTheDocument();
  });

  it('shows onfire mascot when combo level >= 3', () => {
    mockComboLevel = 3;
    render(<DailyChallengeGame {...defaultProps} />);
    expect(screen.getByTestId('mascot-onfire')).toBeInTheDocument();
  });

  it('does not show onfire mascot when combo is below threshold', () => {
    mockComboLevel = 2;
    render(<DailyChallengeGame {...defaultProps} />);
    expect(screen.queryByTestId('mascot-onfire')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="DailyChallengeGame.mascot" --no-coverage
```

Expected: FAIL — mascot-panic and mascot-onfire not found

**Step 3: Add conditional mascots to DailyChallengeGame**

In `fe-next/components/daily/DailyChallengeGame.tsx`:

Add imports at top:
```tsx
import { Mascot } from '@/components/ui/Mascot';
import { PANIC_TIMER_THRESHOLD, ONFIRE_COMBO_THRESHOLD } from '@/utils/mascotConfig';
```

In the render, after the ComboDisplay div (around line 416), add mascot indicators:

```tsx
{/* Panic mascot: appears when clock is running down - adds urgency */}
{timer.remainingTime <= PANIC_TIMER_THRESHOLD && (
  <div className="absolute top-2 end-2 z-10 pointer-events-none">
    <Mascot variant="panic" size="sm" animated />
  </div>
)}

{/* On-fire mascot: appears during hot combo streaks */}
{combo.comboLevel >= ONFIRE_COMBO_THRESHOLD && timer.remainingTime > PANIC_TIMER_THRESHOLD && (
  <div className="absolute top-2 start-2 z-10 pointer-events-none">
    <Mascot variant="onfire" size="sm" animated />
  </div>
)}
```

Wrap the game area in `relative` if it isn't already, or find an appropriate relative-positioned parent.

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="DailyChallengeGame.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/DailyChallengeGame.tsx components/daily/__tests__/DailyChallengeGame.mascot.test.tsx
git commit -m "feat(mascot): add panic/onfire mascots to daily challenge game"
```

---

## Task 5: Add flexing / encouraging mascots to DailyWordHuntResults

**Files:**
- Modify: `fe-next/components/daily/DailyWordHuntResults.tsx`
- Test: `fe-next/components/daily/__tests__/DailyWordHuntResults.mascot.test.tsx`

**Context:** `result.efficiencyScore` is a 0–1 float from the backend. Use `FLEXING_SCORE_THRESHOLD` (0.6) and `ENCOURAGING_SCORE_THRESHOLD` (0.4).

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/__tests__/DailyWordHuntResults.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false }),
}));
// Stub all result sub-modules
jest.mock('@/components/daily/results', () => ({
  useShareHandlers: () => ({}),
  useResultSubmission: () => ({}),
  useCoinActions: () => ({}),
  useConfettiEffects: () => ({}),
  ScoreBadge: () => null,
  ResultDisplay: () => null,
  PerformanceSection: () => null,
  CoinUnlockCard: () => null,
  ShareSection: () => null,
  AttemptHistory: () => null,
  StatsSection: () => null,
  RankBadge: () => null,
  MoreOptionsAccordion: () => null,
  SharePanel: () => null,
}));
jest.mock('@/components/daily/NextChallengePrompt', () => ({ NextChallengePrompt: () => null }));
jest.mock('@/components/auth/DailyChallengeInlineSignup', () => () => null);
jest.mock('@/components/daily/StreakMilestoneCelebration', () => () => null);
jest.mock('@/components/daily/TabbedDailyLeaderboard', () => () => null);
jest.mock('@/components/daily/WatchAdButton', () => () => null);
jest.mock('@/components/custom-puzzle/CustomPuzzleCreator', () => () => null);
jest.mock('@/components/layout/MobileTabBar', () => ({ MobileTabBar: () => null }));
jest.mock('@/components/animations/CoinSpendAnimation', () => ({ CoinSpendAnimation: () => null }));
jest.mock('@/utils/dailyChallenge', () => ({
  getGuestFingerprint: jest.fn(),
  getGuestDailyPlayer: jest.fn(),
  getStreakMilestone: () => null,
  getStreakMilestoneMessage: () => null,
  findRarestWord: () => null,
}));
jest.mock('@/contexts/auth/authUtils', () => ({ fetchGeolocation: jest.fn() }));

import DailyWordHuntResults from '../DailyWordHuntResults';

const baseResult = {
  solved: true,
  attemptsUsed: 1,
  targetWord: 'WORDS',
  streakDays: 3,
  lifeRemaining: 3,
  wordsDiscovered: [],
  efficiencyScore: 0.5, // neutral — no mascot
};

const baseProps = {
  result: baseResult,
  puzzleNumber: 1,
  puzzleDate: '2026-02-21',
  language: 'en' as const,
  countdown: '23:59:59',
  isNewCompletion: false,
  onBack: jest.fn(),
  onRetry: jest.fn(),
  onGameLanguageChange: jest.fn(),
};

describe('DailyWordHuntResults - mascots', () => {
  it('shows flexing mascot when efficiency score is high', () => {
    render(<DailyWordHuntResults {...baseProps} result={{ ...baseResult, efficiencyScore: 0.75 }} />);
    expect(screen.getByTestId('mascot-flexing')).toBeInTheDocument();
  });

  it('shows encouraging mascot when efficiency score is low', () => {
    render(<DailyWordHuntResults {...baseProps} result={{ ...baseResult, efficiencyScore: 0.3 }} />);
    expect(screen.getByTestId('mascot-encouraging')).toBeInTheDocument();
  });

  it('shows neither mascot at neutral score', () => {
    render(<DailyWordHuntResults {...baseProps} result={{ ...baseResult, efficiencyScore: 0.5 }} />);
    expect(screen.queryByTestId('mascot-flexing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mascot-encouraging')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="DailyWordHuntResults.mascot" --no-coverage
```

Expected: FAIL

**Step 3: Add score-conditional mascots to DailyWordHuntResults**

In `fe-next/components/daily/DailyWordHuntResults.tsx`:

Add imports at top:
```tsx
import { MascotWithEntrance } from '@/components/ui/Mascot';
import { FLEXING_SCORE_THRESHOLD, ENCOURAGING_SCORE_THRESHOLD } from '@/utils/mascotConfig';
```

Add derived value with the other derived values (after line ~103):
```tsx
const efficiency = result.efficiencyScore ?? 0;
const showFlexing = efficiency >= FLEXING_SCORE_THRESHOLD;
const showEncouraging = efficiency < ENCOURAGING_SCORE_THRESHOLD;
```

In the JSX, at the top of the results tab content, add:
```tsx
{/* Mascot reacts to player performance */}
{showFlexing && (
  <div className="flex justify-center mb-4">
    <MascotWithEntrance variant="flexing" size="lg" delay={0.2} />
  </div>
)}
{showEncouraging && (
  <div className="flex justify-center mb-4">
    <MascotWithEntrance variant="encouraging" size="md" delay={0.2} />
  </div>
)}
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="DailyWordHuntResults.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/DailyWordHuntResults.tsx components/daily/__tests__/DailyWordHuntResults.mascot.test.tsx
git commit -m "feat(mascot): add flexing/encouraging mascots to word hunt results"
```

---

## Task 6: Add celebration mascot to StreakMilestoneCelebration

**Files:**
- Modify: `fe-next/components/daily/StreakMilestoneCelebration.tsx`
- Test: `fe-next/components/daily/__tests__/StreakMilestoneCelebration.mascot.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/__tests__/StreakMilestoneCelebration.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`celebration-mascot-${variant}`} />
  ),
}));
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));
jest.mock('@/utils/confettiUtils', () => ({ fireConfetti: jest.fn() }));

import StreakMilestoneCelebration from '../StreakMilestoneCelebration';

const baseProps = {
  isOpen: true,
  onClose: jest.fn(),
  streak: 7,
  emoji: '🔥',
  title: '7 Day Streak!',
  subtitle: 'Amazing consistency',
};

describe('StreakMilestoneCelebration - mascot', () => {
  it('renders celebration mascot when modal is open', () => {
    render(<StreakMilestoneCelebration {...baseProps} />);
    expect(screen.getByTestId('celebration-mascot-celebration')).toBeInTheDocument();
  });

  it('does not render mascot when modal is closed', () => {
    render(<StreakMilestoneCelebration {...baseProps} isOpen={false} />);
    expect(screen.queryByTestId('celebration-mascot-celebration')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="StreakMilestoneCelebration.mascot" --no-coverage
```

Expected: FAIL

**Step 3: Add CelebrationMascot to StreakMilestoneCelebration**

In `fe-next/components/daily/StreakMilestoneCelebration.tsx`:

Add import:
```tsx
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
```

Inside the `AnimatePresence` / modal JSX (when `isOpen` is true), add mascot above the emoji/title:
```tsx
{/* Celebration mascot — Lexi joins the streak party */}
<div className="flex justify-center mb-2">
  <CelebrationMascotWithEntrance variant="celebration" size="xl" delay={0.3} />
</div>
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="StreakMilestoneCelebration.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/StreakMilestoneCelebration.tsx components/daily/__tests__/StreakMilestoneCelebration.mascot.test.tsx
git commit -m "feat(mascot): add celebration mascot to streak milestone modal"
```

---

## Task 7: Add crying mascot to NoWordsFoundView

**Files:**
- Modify: `fe-next/components/results/NoWordsFoundView.tsx`
- Test: `fe-next/components/results/__tests__/NoWordsFoundView.mascot.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/results/__tests__/NoWordsFoundView.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));
jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import NoWordsFoundView from '../NoWordsFoundView';

describe('NoWordsFoundView - crying mascot', () => {
  it('renders crying mascot for the current player', () => {
    render(<NoWordsFoundView isCurrentPlayer={true} playerName="Alice" />);
    expect(screen.getByTestId('mascot-crying')).toBeInTheDocument();
  });

  it('renders crying mascot for other players too (shared empathy)', () => {
    render(<NoWordsFoundView isCurrentPlayer={false} playerName="Bob" />);
    expect(screen.getByTestId('mascot-crying')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="NoWordsFoundView.mascot" --no-coverage
```

Expected: FAIL

**Step 3: Add crying mascot to NoWordsFoundView**

In `fe-next/components/results/NoWordsFoundView.tsx`:

Add import:
```tsx
import { Mascot } from '../../components/ui/Mascot';
```

In the component JSX, before the emoji/headline block, add:
```tsx
{/* Crying mascot — Lexi commiserates */}
<div className="flex justify-center mb-3">
  <Mascot variant="crying" size="lg" animated />
</div>
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="NoWordsFoundView.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/results/NoWordsFoundView.tsx components/results/__tests__/NoWordsFoundView.mascot.test.tsx
git commit -m "feat(mascot): add crying mascot to no words found screen"
```

---

## Task 8: Add shopkeeper mascot to UpgradeShop

**Files:**
- Modify: `fe-next/components/adventure/meta/UpgradeShop.tsx`
- Test: `fe-next/components/adventure/meta/__tests__/UpgradeShop.mascot.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/adventure/meta/__tests__/UpgradeShop.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
  MascotWithEntrance: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

// Stub sub-parts of shop to isolate test
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ prefersReducedMotion: false }),
}));

import UpgradeShop from '../UpgradeShop';

describe('UpgradeShop - shopkeeper mascot', () => {
  it('renders shopkeeper mascot in shop header', () => {
    render(<UpgradeShop coins={100} onPurchase={jest.fn()} upgrades={[]} onClose={jest.fn()} />);
    expect(screen.getByTestId('mascot-shopkeeper')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="UpgradeShop.mascot" --no-coverage
```

Expected: FAIL

**Step 3: Add shopkeeper mascot to UpgradeShop header**

In `fe-next/components/adventure/meta/UpgradeShop.tsx`:

Read the file first, then add import and place `<MascotWithEntrance variant="shopkeeper" size="md" />` in the shop header area alongside the title.

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="UpgradeShop.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/adventure/meta/UpgradeShop.tsx components/adventure/meta/__tests__/UpgradeShop.mascot.test.tsx
git commit -m "feat(mascot): add shopkeeper mascot to upgrade shop"
```

---

## Task 9: Add mindblown mascot to AchievementProgressTracker

**Files:**
- Modify: `fe-next/components/achievements/AchievementProgressTracker.tsx`
- Test: `fe-next/components/achievements/__tests__/AchievementProgressTracker.mascot.test.tsx`

**Context:** The tracker already computes `percentage` per achievement. Show `mindblown` when any visible achievement is above `MINDBLOWN_PROGRESS_THRESHOLD` (80%).

**Step 1: Write the failing test**

```tsx
// fe-next/components/achievements/__tests__/AchievementProgressTracker.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import { AchievementProgressTracker } from '../AchievementProgressTracker';

const baseProps = {
  validWordCount: 1,      // triggers 3-word achievement at low %
  comboLevel: 0,
  maxCombo: 0,
  wordLengths: [4],
  timeSinceStart: 10,
  gameDuration: 120,
  earnedAchievements: [],
};

describe('AchievementProgressTracker - mindblown mascot', () => {
  it('shows mindblown mascot when an achievement is near completion', () => {
    // 9 words of a 10-word achievement = 90% — above threshold
    render(<AchievementProgressTracker {...baseProps} validWordCount={9} />);
    expect(screen.getByTestId('mascot-mindblown')).toBeInTheDocument();
  });

  it('does not show mindblown mascot when no achievement is near', () => {
    render(<AchievementProgressTracker {...baseProps} validWordCount={1} />);
    expect(screen.queryByTestId('mascot-mindblown')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="AchievementProgressTracker.mascot" --no-coverage
```

Expected: FAIL

**Step 3: Add mindblown mascot to AchievementProgressTracker**

In `fe-next/components/achievements/AchievementProgressTracker.tsx`:

Add imports:
```tsx
import { Mascot } from '@/components/ui/Mascot';
import { MINDBLOWN_PROGRESS_THRESHOLD } from '@/utils/mascotConfig';
```

After the `visibleAchievements` computation, derive:
```tsx
const hasNearMilestone = visibleAchievements.some(a => a.percentage >= MINDBLOWN_PROGRESS_THRESHOLD);
```

In the JSX, render mascot alongside a near-milestone achievement item:
```tsx
{hasNearMilestone && (
  <div className="flex justify-center my-1">
    <Mascot variant="mindblown" size="xs" animated />
  </div>
)}
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="AchievementProgressTracker.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/achievements/AchievementProgressTracker.tsx components/achievements/__tests__/AchievementProgressTracker.mascot.test.tsx
git commit -m "feat(mascot): add mindblown mascot to achievement near-milestone"
```

---

## Task 10: Add spectating mascot to TV broadcast spectator banner

**Files:**
- Modify: `fe-next/components/SpectatorBanner.tsx`
- Test: `fe-next/components/__tests__/SpectatorBanner.mascot.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/__tests__/SpectatorBanner.mascot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import SpectatorBanner from '../SpectatorBanner';

describe('SpectatorBanner - spectating mascot', () => {
  it('renders spectating mascot in the banner', () => {
    render(<SpectatorBanner />);
    expect(screen.getByTestId('mascot-spectating')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="SpectatorBanner.mascot" --no-coverage
```

Expected: FAIL

**Step 3: Read SpectatorBanner and add mascot**

First read `fe-next/components/SpectatorBanner.tsx` to understand structure, then add:

```tsx
import { Mascot } from '@/components/ui/Mascot';
```

And place `<Mascot variant="spectating" size="sm" animated />` alongside the banner text.

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npm run test -- --testPathPattern="SpectatorBanner.mascot" --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/SpectatorBanner.tsx components/__tests__/SpectatorBanner.mascot.test.tsx
git commit -m "feat(mascot): add spectating mascot to spectator banner"
```

---

## Task 11: Add powerup mascot to BlastGameLayout

**Files:**
- Modify: `fe-next/components/blast/BlastGameLayout.tsx`
- Test: `fe-next/components/blast/__tests__/BlastGameLayout.mascot.test.tsx`

**Context:** Read `BlastGameLayout.tsx` to understand how power-up activation state is tracked. Show `powerup` mascot briefly (using AnimatePresence + auto-dismiss) when a special tile is activated.

**Step 1: Write the failing test**

```tsx
// fe-next/components/blast/__tests__/BlastGameLayout.mascot.test.tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

// Stub blast-specific components to keep test fast
// (Read BlastGameLayout to know actual imports, then stub them here)

import BlastGameLayout from '../BlastGameLayout';

describe('BlastGameLayout - powerup mascot', () => {
  it('shows powerup mascot when a special tile is activated', () => {
    render(<BlastGameLayout {.../* read file for required props */} powerUpActive={true} />);
    expect(screen.getByTestId('mascot-powerup')).toBeInTheDocument();
  });

  it('hides powerup mascot when no powerup is active', () => {
    render(<BlastGameLayout {.../* props */} powerUpActive={false} />);
    expect(screen.queryByTestId('mascot-powerup')).not.toBeInTheDocument();
  });
});
```

**Note:** Read `BlastGameLayout.tsx` before step 3 to determine exact prop names and required stubs.

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test -- --testPathPattern="BlastGameLayout.mascot" --no-coverage
```

Expected: FAIL

**Step 3: Read BlastGameLayout and add conditional powerup mascot**

After reading file: add import, find power-up activation state, add:
```tsx
{powerUpActive && (
  <div className="absolute top-4 end-4 z-20 pointer-events-none">
    <Mascot variant="powerup" size="sm" animated />
  </div>
)}
```

**Step 4 & 5:** Run, verify pass, commit.

```bash
git commit -m "feat(mascot): add powerup mascot to blast game layout"
```

---

## Task 12: Motion audit — verify all new placements complement their GIFs

**This is a code review + fix task, not a TDD task.**

**Files to audit (read each, check animation config):**

For each new placement, verify the `<Mascot>` CSS animation in `Mascot.tsx` doesn't fight the GIF:

| Variant | GIF motion | CSS animation in Mascot.tsx | Verdict |
|---|---|---|---|
| `explorer` | walk/sway side-to-side | `x: [0, -3, 3, 0]` lateral sway | ✅ complementary |
| `panic` | frantic movement | `x: [0, -3, 3, -2, 2, -1, 1, 0]` rapid jitter | ✅ complementary |
| `onfire` | upward energy burst | `y: [0, -10, 0], scale: [1, 1.08, 1]` | ✅ complementary |
| `flexing` | proud flex pose | `scale: [1, 1.05, 1], y: [0, -3, 0]` | ✅ complementary |
| `encouraging` | supportive bob | `y: [0, -5, 0]` gentle | ✅ complementary |
| `celebration` | celebration dance | `y: [0, -12, 0], rotate` bounce | ✅ complementary |
| `crying` | heaving sob | `y: [0, -3, 0]` slow bob | ✅ complementary |
| `shopkeeper` | idle lean | `y: [0, -3, 0], rotate: [0, 2, -2, 0]` | ✅ complementary |
| `mindblown` | dramatic pop | `scale: [1, 1.1, 1], y: [0, -8, 0]` | ✅ complementary |
| `spectating` | watching bob | `y: [0, -4, 0]` relaxed | ✅ complementary |
| `powerup` | energy burst | `scale: [1, 1.08, 1, 1.04, 1], y: [0, -8, 0]` | ✅ complementary |
| `dj` (DJMascot) | DJ bob | custom `y: [0, -6, 0, -4, 0], rotate: [0, -2, 0, 2, 0]` | ✅ complementary |

If any animation conflicts (e.g. a slow bob on a fast-jittering GIF), open `components/ui/Mascot.tsx` and adjust the `transition.duration` for that variant to match GIF speed.

**Step 1:** Open `fe-next/components/ui/Mascot.tsx` and audit `transition.duration` for `panic` (should be ≤ 0.5s) and `onfire` (should be ≤ 0.6s).

**Step 2:** If any duration is mismatched, edit and re-run existing mascot tests.

**Step 3:** Commit if changes were made.

```bash
git commit -m "fix(mascot): tune animation durations to complement GIF motion"
```

---

## Task 13: Full validation pass

**Step 1: Run all tests**

```bash
cd fe-next && npm run test -- --no-coverage 2>&1 | tail -20
```

Expected: All new tests pass, no regressions in pre-existing tests. Known pre-existing failures (NeoLoader, SinglePlayerGame.test, GlobalBottomNav.safezone) are acceptable — do not modify those tests.

**Step 2: Lint**

```bash
cd fe-next && npm run lint
```

Expected: No new errors.

**Step 3: Build**

```bash
cd fe-next && npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

**Step 4: RTL smoke check**

Start dev server and navigate to `/?locale=he`. Verify mascots in lobby and landing page aren't broken by RTL layout. The `start` / `end` CSS logical properties handle this automatically.

**Step 5: Final commit**

```bash
git commit -m "chore(mascot): all 20 mascot variants placed across app"
```

---

## Summary of all 12 new placements

| Variant | Location | Trigger |
|---|---|---|
| `dj` | MultiplayerLobby header | Always |
| `explorer` | DailyReadyScreen | Page load |
| `panic` | DailyChallengeGame | Timer ≤ 30s |
| `onfire` | DailyChallengeGame | Combo ≥ 3 |
| `flexing` | DailyWordHuntResults | efficiencyScore ≥ 0.6 |
| `encouraging` | DailyWordHuntResults | efficiencyScore < 0.4 |
| `celebration` | StreakMilestoneCelebration | Modal open |
| `crying` | NoWordsFoundView | Always (zero words) |
| `shopkeeper` | UpgradeShop | Shop open |
| `mindblown` | AchievementProgressTracker | Any achievement ≥ 80% |
| `spectating` | SpectatorBanner | Always |
| `powerup` | BlastGameLayout | Power-up active |
