# Mobile Results Page Simplification - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify mobile results page to show score celebration + play again above the fold, with compacted secondary info below.

**Architecture:** Create 3 new compact components, add `compact` prop to `ResultsWinnerBanner`, update `MobileResultsTab` and `MobileDetailsTab`, reorganize desktop layout.

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion, Jest/React Testing Library

---

## Task 1: Create MobileCompactStats Component

**Files:**
- Create: `fe-next/components/results/MobileCompactStats.tsx`
- Test: `fe-next/components/results/__tests__/MobileCompactStats.test.tsx`

**Step 1: Write the failing test**

```typescript
// fe-next/components/results/__tests__/MobileCompactStats.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileCompactStats from '../MobileCompactStats';

// Mock useLanguage hook
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('MobileCompactStats', () => {
  it('renders word count and accuracy in a single row', () => {
    render(<MobileCompactStats wordCount={12} accuracy={85} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('displays words and accuracy labels', () => {
    render(<MobileCompactStats wordCount={8} accuracy={92} />);

    expect(screen.getByText('results.words')).toBeInTheDocument();
    expect(screen.getByText('results.accuracy')).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    render(<MobileCompactStats wordCount={0} accuracy={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --testPathPattern="MobileCompactStats" --verbose`
Expected: FAIL with "Cannot find module '../MobileCompactStats'"

**Step 3: Write minimal implementation**

```typescript
// fe-next/components/results/MobileCompactStats.tsx
'use client';

import React, { memo } from 'react';
import { Hash, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileCompactStatsProps {
  /** Number of valid words found */
  wordCount: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Additional className */
  className?: string;
}

/**
 * MobileCompactStats - Ultra-compact stats row for mobile results
 *
 * Shows only words count and accuracy in a single inline row.
 * Designed to fit above the fold with the banner and CTA.
 */
const MobileCompactStats: React.FC<MobileCompactStatsProps> = memo(({
  wordCount,
  accuracy,
  className,
}) => {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'flex items-center justify-center gap-3',
      className
    )}>
      {/* Words */}
      <div className="flex items-center gap-1.5 bg-white/10 rounded-neo border border-white/20 px-3 py-1.5">
        <div className="w-5 h-5 rounded bg-neo-lime text-neo-black flex items-center justify-center">
          <Hash className="w-3 h-3" />
        </div>
        <span className="text-lg font-black text-white">{wordCount}</span>
        <span className="text-[10px] text-white/60 font-bold uppercase">
          {t('results.words') || 'Words'}
        </span>
      </div>

      {/* Accuracy */}
      <div className="flex items-center gap-1.5 bg-white/10 rounded-neo border border-white/20 px-3 py-1.5">
        <div className="w-5 h-5 rounded bg-neo-pink text-white flex items-center justify-center">
          <Target className="w-3 h-3" />
        </div>
        <span className="text-lg font-black text-white">{accuracy}%</span>
        <span className="text-[10px] text-white/60 font-bold uppercase">
          {t('results.accuracy') || 'Acc'}
        </span>
      </div>
    </div>
  );
});

MobileCompactStats.displayName = 'MobileCompactStats';

export default MobileCompactStats;
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --testPathPattern="MobileCompactStats" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add fe-next/components/results/MobileCompactStats.tsx fe-next/components/results/__tests__/MobileCompactStats.test.tsx
git commit -m "feat(results): add MobileCompactStats component

Ultra-compact stats row showing words + accuracy for mobile.
Designed to fit above the fold with banner and CTA."
```

---

## Task 2: Create MobileCompactRewards Component

**Files:**
- Create: `fe-next/components/results/MobileCompactRewards.tsx`
- Test: `fe-next/components/results/__tests__/MobileCompactRewards.test.tsx`

**Step 1: Write the failing test**

```typescript
// fe-next/components/results/__tests__/MobileCompactRewards.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileCompactRewards from '../MobileCompactRewards';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('MobileCompactRewards', () => {
  it('renders win streak when provided', () => {
    render(<MobileCompactRewards winStreak={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('renders coins when provided', () => {
    render(<MobileCompactRewards coins={25} />);

    expect(screen.getByText('+25')).toBeInTheDocument();
  });

  it('renders both streak and coins inline', () => {
    render(<MobileCompactRewards winStreak={5} coins={50} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
  });

  it('returns null when no rewards', () => {
    const { container } = render(<MobileCompactRewards />);

    expect(container.firstChild).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --testPathPattern="MobileCompactRewards" --verbose`
Expected: FAIL with "Cannot find module '../MobileCompactRewards'"

**Step 3: Write minimal implementation**

```typescript
// fe-next/components/results/MobileCompactRewards.tsx
'use client';

import React, { memo } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileCompactRewardsProps {
  /** Current win streak (0 = no streak) */
  winStreak?: number;
  /** Coins earned (0 = no coins) */
  coins?: number;
  /** Whether user is authenticated (affects coin display) */
  isAuthenticated?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * MobileCompactRewards - Single-row rewards display for mobile
 *
 * Shows win streak and coins in a compact inline format.
 * Designed for below-the-fold secondary info.
 */
const MobileCompactRewards: React.FC<MobileCompactRewardsProps> = memo(({
  winStreak = 0,
  coins = 0,
  isAuthenticated = true,
  className,
}) => {
  const { t } = useLanguage();

  const hasStreak = winStreak > 0;
  const hasCoins = coins > 0;

  if (!hasStreak && !hasCoins) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center justify-center gap-4 py-2 px-3 bg-white/5 rounded-neo border border-white/10',
      className
    )}>
      {/* Win Streak */}
      {hasStreak && (
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🔥</span>
          <span className="text-base font-black text-neo-orange">{winStreak}</span>
          <span className="text-xs text-white/60 font-bold">
            {t('results.winStreak') || 'Streak'}
          </span>
        </div>
      )}

      {/* Separator */}
      {hasStreak && hasCoins && (
        <div className="w-px h-4 bg-white/20" />
      )}

      {/* Coins */}
      {hasCoins && (
        <div className="flex items-center gap-1.5">
          <Coins className={cn(
            'w-4 h-4',
            isAuthenticated ? 'text-neo-lime' : 'text-amber-400/60'
          )} />
          <span className={cn(
            'text-base font-black',
            isAuthenticated ? 'text-neo-lime' : 'text-amber-400/60'
          )}>
            +{coins}
          </span>
          {!isAuthenticated && (
            <span className="text-[10px] text-white/40">
              {t('coins.signInShort') || 'Sign in'}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

MobileCompactRewards.displayName = 'MobileCompactRewards';

export default MobileCompactRewards;
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --testPathPattern="MobileCompactRewards" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add fe-next/components/results/MobileCompactRewards.tsx fe-next/components/results/__tests__/MobileCompactRewards.test.tsx
git commit -m "feat(results): add MobileCompactRewards component

Single-row rewards display showing streak + coins inline.
Returns null when no rewards to display."
```

---

## Task 3: Create MobileCompactLeaderboard Component

**Files:**
- Create: `fe-next/components/results/MobileCompactLeaderboard.tsx`
- Test: `fe-next/components/results/__tests__/MobileCompactLeaderboard.test.tsx`

**Step 1: Write the failing test**

```typescript
// fe-next/components/results/__tests__/MobileCompactLeaderboard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileCompactLeaderboard from '../MobileCompactLeaderboard';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('MobileCompactLeaderboard', () => {
  const mockParticipants = [
    { name: 'Player1', score: 247, isCurrentPlayer: true },
    { name: 'Bot1', score: 198, isBot: true },
    { name: 'Bot2', score: 156, isBot: true },
  ];

  it('renders top 3 participants as text rows', () => {
    render(<MobileCompactLeaderboard participants={mockParticipants} />);

    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Bot1')).toBeInTheDocument();
    expect(screen.getByText('Bot2')).toBeInTheDocument();
  });

  it('displays scores for each participant', () => {
    render(<MobileCompactLeaderboard participants={mockParticipants} />);

    expect(screen.getByText('247')).toBeInTheDocument();
    expect(screen.getByText('198')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument();
  });

  it('highlights current player', () => {
    render(<MobileCompactLeaderboard participants={mockParticipants} />);

    const currentPlayerRow = screen.getByText('Player1').closest('div');
    expect(currentPlayerRow).toHaveClass('bg-neo-cyan/10');
  });

  it('shows rank medals', () => {
    render(<MobileCompactLeaderboard participants={mockParticipants} />);

    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('limits to 3 participants', () => {
    const manyParticipants = [
      ...mockParticipants,
      { name: 'Bot3', score: 100 },
      { name: 'Bot4', score: 50 },
    ];
    render(<MobileCompactLeaderboard participants={manyParticipants} />);

    expect(screen.queryByText('Bot3')).not.toBeInTheDocument();
    expect(screen.queryByText('Bot4')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --testPathPattern="MobileCompactLeaderboard" --verbose`
Expected: FAIL with "Cannot find module '../MobileCompactLeaderboard'"

**Step 3: Write minimal implementation**

```typescript
// fe-next/components/results/MobileCompactLeaderboard.tsx
'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Participant {
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
  isBot?: boolean;
}

interface MobileCompactLeaderboardProps {
  /** Sorted participants (highest score first) */
  participants: Participant[];
  /** Additional className */
  className?: string;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

/**
 * MobileCompactLeaderboard - Text-only leaderboard for mobile
 *
 * Shows top 3 as simple text rows without avatars or podium.
 * Designed for compact below-the-fold display.
 */
const MobileCompactLeaderboard: React.FC<MobileCompactLeaderboardProps> = memo(({
  participants,
  className,
}) => {
  const { t } = useLanguage();

  // Limit to top 3
  const top3 = participants.slice(0, 3);

  if (top3.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'bg-white/5 rounded-neo border border-white/10 overflow-hidden',
      className
    )}>
      {top3.map((participant, index) => (
        <div
          key={participant.name}
          className={cn(
            'flex items-center justify-between px-3 py-2',
            index < top3.length - 1 && 'border-b border-white/10',
            participant.isCurrentPlayer && 'bg-neo-cyan/10'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{RANK_MEDALS[index]}</span>
            <span className={cn(
              'font-bold text-sm',
              participant.isCurrentPlayer ? 'text-neo-cyan' : 'text-white'
            )}>
              {participant.name}
            </span>
            {participant.isCurrentPlayer && (
              <span className="text-neo-cyan text-xs">←</span>
            )}
          </div>
          <span className={cn(
            'font-black text-sm',
            participant.isCurrentPlayer ? 'text-neo-cyan' : 'text-white/80'
          )}>
            {participant.score}
          </span>
        </div>
      ))}
    </div>
  );
});

MobileCompactLeaderboard.displayName = 'MobileCompactLeaderboard';

export default MobileCompactLeaderboard;
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --testPathPattern="MobileCompactLeaderboard" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add fe-next/components/results/MobileCompactLeaderboard.tsx fe-next/components/results/__tests__/MobileCompactLeaderboard.test.tsx
git commit -m "feat(results): add MobileCompactLeaderboard component

Text-only leaderboard showing top 3 without avatars or podium.
Highlights current player row with cyan accent."
```

---

## Task 4: Add compact prop to ResultsWinnerBanner

**Files:**
- Modify: `fe-next/components/results/ResultsWinnerBanner.tsx`
- Test: `fe-next/components/results/__tests__/ResultsWinnerBanner.test.tsx` (add new tests)

**Step 1: Write the failing test**

Add to existing test file or create new:

```typescript
// Add to existing tests or create fe-next/components/results/__tests__/ResultsWinnerBanner.test.tsx
describe('ResultsWinnerBanner compact mode', () => {
  const mockWinner = {
    username: 'TestPlayer',
    score: 150,
  };

  it('renders with reduced padding in compact mode', () => {
    const { container } = render(
      <ResultsWinnerBanner
        winner={mockWinner}
        isCurrentUserWinner={true}
        compact={true}
      />
    );

    // Check for compact padding class
    const contentDiv = container.querySelector('.p-2');
    expect(contentDiv).toBeInTheDocument();
  });

  it('hides mascot in compact mode', () => {
    const { container } = render(
      <ResultsWinnerBanner
        winner={mockWinner}
        isCurrentUserWinner={true}
        compact={true}
      />
    );

    // Mascot should not be present
    const mascot = container.querySelector('[data-testid="mascot"]');
    expect(mascot).not.toBeInTheDocument();
  });

  it('uses smaller text sizes in compact mode', () => {
    render(
      <ResultsWinnerBanner
        winner={mockWinner}
        isCurrentUserWinner={true}
        compact={true}
      />
    );

    const username = screen.getByText('TestPlayer');
    expect(username).toHaveClass('text-lg');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --testPathPattern="ResultsWinnerBanner" --verbose`
Expected: FAIL (compact prop doesn't exist yet)

**Step 3: Write minimal implementation**

Modify `fe-next/components/results/ResultsWinnerBanner.tsx`:

Add prop to interface (around line 30):
```typescript
interface ResultsWinnerBannerProps {
  // ... existing props
  /** Compact mode - reduced height for mobile above-fold (default: false) */
  compact?: boolean;
}
```

Update component signature (around line 89):
```typescript
const ResultsWinnerBanner: React.FC<ResultsWinnerBannerProps> = ({
  // ... existing props
  compact = false,
}) => {
```

Update content div padding (around line 241):
```typescript
{/* Content - Compact layout */}
<div className={cn(
  "relative z-10 text-center",
  compact ? "p-2 sm:p-3" : "p-3 sm:p-4 md:p-5"
)}>
```

Update icon size (around line 252-258):
```typescript
<div className={cn(
  `${styles.iconBgClass} border-3 border-neo-black rounded-neo shadow-hard inline-block`,
  compact ? "p-1.5" : "p-2"
)}>
  <RankIcon
    className={cn(
      styles.iconTextClass,
      compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl md:text-4xl"
    )}
    style={{
      filter: 'drop-shadow(2px 2px 0px rgb(var(--neo-black)))',
    }}
  />
</div>
```

Update username text size (around line 309):
```typescript
<h1
  className={cn(
    `font-black ${styles.textClass} uppercase leading-tight`,
    compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl md:text-3xl"
  )}
  style={{
    textShadow: `2px 2px 0px ${styles.nameShadowColor}`,
  }}
>
  {winner.username}
</h1>
```

Update score badge (around line 334):
```typescript
<div className={cn(
  "bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard",
  compact ? "px-2 py-1" : "px-3 py-1.5 sm:px-4 sm:py-2"
)}>
  <p className={cn(
    "font-black text-neo-black",
    compact ? "text-base sm:text-lg" : "text-lg sm:text-xl md:text-2xl"
  )}>
    {winner.score} <span className={cn(compact ? "text-[10px]" : "text-xs sm:text-sm")}>{t('results.points')}</span>
  </p>
</div>
```

Hide mascot in compact mode (around line 344):
```typescript
{/* Mascot - Hidden in compact mode */}
{!compact && (
  <div className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-0 z-20 pointer-events-none">
    {/* ... mascot code ... */}
  </div>
)}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --testPathPattern="ResultsWinnerBanner" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add fe-next/components/results/ResultsWinnerBanner.tsx fe-next/components/results/__tests__/ResultsWinnerBanner.test.tsx
git commit -m "feat(results): add compact prop to ResultsWinnerBanner

Reduces padding, text sizes, and hides mascot for mobile above-fold use.
Approximately 30% height reduction in compact mode."
```

---

## Task 5: Update MobileResultsTab with new compact components

**Files:**
- Modify: `fe-next/components/singleplayer/results/components/MobileResultsTab.tsx`
- Test: Update existing tests

**Step 1: Write the failing test**

```typescript
// Update fe-next/components/singleplayer/results/components/__tests__/MobileResultsTab.test.tsx
describe('MobileResultsTab simplified layout', () => {
  it('renders compact banner above fold', () => {
    render(<MobileResultsTab {...defaultProps} />);

    // Banner should have compact prop
    const banner = screen.getByTestId('winner-banner');
    expect(banner).toHaveAttribute('data-compact', 'true');
  });

  it('shows MobileCompactStats instead of full CompactResultsStats', () => {
    render(<MobileResultsTab {...defaultProps} />);

    // Should NOT show sparkline or archetype
    expect(screen.queryByTestId('sparkline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('archetype-badge')).not.toBeInTheDocument();
  });

  it('shows MobileCompactRewards instead of full RewardsSummary', () => {
    render(<MobileResultsTab {...defaultProps} winStreakData={{ currentStreak: 3 }} />);

    // Should show compact single-row rewards
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('uses MobileCompactLeaderboard instead of Top3Leaderboard', () => {
    render(<MobileResultsTab {...defaultProps} />);

    // Should NOT show podium
    expect(screen.queryByTestId('podium')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --testPathPattern="MobileResultsTab" --verbose`
Expected: FAIL

**Step 3: Write minimal implementation**

Update imports:
```typescript
// Remove old imports
// import CompactResultsStats from '@/components/results/CompactResultsStats';
// import BonusBadgesRow from '@/components/results/BonusBadgesRow';
// import RewardsSummary from '@/components/results/RewardsSummary';
// import Top3Leaderboard from '@/components/results/Top3Leaderboard';

// Add new imports
import MobileCompactStats from '@/components/results/MobileCompactStats';
import MobileCompactRewards from '@/components/results/MobileCompactRewards';
import MobileCompactLeaderboard from '@/components/results/MobileCompactLeaderboard';
```

Replace component usage in JSX:
```typescript
return (
  <div className="space-y-3">
    {/* Back button - unchanged */}
    <button onClick={onBackToLobby} className="...">
      ...
    </button>

    {/* ABOVE FOLD - Score celebration + Play Again */}
    <div className="relative">
      <ResultsWinnerBanner
        winner={{ username: t('common.you') || 'You', score: results.playerScore }}
        isCurrentUserWinner={true}
        rank={mode === 'solo-bots' ? playerRank : 1}
        variant={bannerConfig.variant}
        customMessage={bannerConfig.message}
        customAnnouncement={bannerConfig.announcement}
        showConfetti={shouldShowConfetti}
        compact={true}  // NEW: compact mode
      />
    </div>

    {/* Compact stats row (words + accuracy only) */}
    <MobileCompactStats
      wordCount={validWordCount}
      accuracy={accuracy}
    />

    {/* Play Again - Primary CTA */}
    <NextStepPrompt currentMode={nextStepMode} onBackToLobby={onBackToLobby} variant="mobile" />

    {/* BELOW FOLD - Compacted secondary info */}

    {/* Compact rewards row */}
    {mode !== 'practice' && (
      <MobileCompactRewards
        winStreak={winStreakData?.currentStreak || 0}
        coins={coinReward?.awarded || 0}
        isAuthenticated={isAuthenticated}
      />
    )}

    {/* Compact leaderboard */}
    {mode === 'solo-bots' && results.botScores.length > 0 && (
      <MobileCompactLeaderboard
        participants={allParticipants.map(p => ({
          name: p.name,
          score: p.score,
          isCurrentPlayer: p.isPlayer,
          isBot: !p.isPlayer,
        }))}
      />
    )}

    {/* Global rank - text only */}
    {globalRank && (
      <div className="text-center text-sm text-white/60">
        <span className="font-bold">#{globalRank}</span> {t('leaderboard.globalRank') || 'Global Rank'}
      </div>
    )}

    {/* Challenge a Friend */}
    {results.grid && (
      <ChallengeButton
        grid={results.grid}
        score={results.playerScore}
        words={results.playerWords}
        gameLanguage={results.language || 'en'}
        gameDuration={results.gameDuration}
        variant="compact"
        isWinner={isWinner}
      />
    )}
  </div>
);
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --testPathPattern="MobileResultsTab" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add fe-next/components/singleplayer/results/components/MobileResultsTab.tsx
git commit -m "refactor(results): simplify MobileResultsTab layout

- Use compact banner for reduced height
- Replace CompactResultsStats with MobileCompactStats
- Replace RewardsSummary with MobileCompactRewards
- Replace Top3Leaderboard with MobileCompactLeaderboard
- Remove BonusBadgesRow (moved to Details tab)
- Global rank now text-only"
```

---

## Task 6: Update MobileDetailsTab with Bonuses section

**Files:**
- Modify: `fe-next/components/singleplayer/results/components/MobileDetailsTab.tsx`
- Test: Update existing tests

**Step 1: Write the failing test**

```typescript
describe('MobileDetailsTab with Bonuses', () => {
  it('shows Bonuses section when bonuses exist', () => {
    render(
      <MobileDetailsTab
        {...defaultProps}
        totalComboBonus={15}
        totalFireRoundBonus={10}
      />
    );

    expect(screen.getByText(/bonuses/i)).toBeInTheDocument();
  });

  it('shows archetype in Performance section', () => {
    render(
      <MobileDetailsTab
        {...defaultProps}
        playerArchetype={{ key: 'speedster', name: 'Speedster' }}
      />
    );

    // Archetype should be inside Performance section
    expect(screen.getByText('Speedster')).toBeInTheDocument();
  });

  it('Your Words section is expanded by default', () => {
    render(<MobileDetailsTab {...defaultProps} />);

    const wordsSection = screen.getByText(/your words/i).closest('[data-expanded]');
    expect(wordsSection).toHaveAttribute('data-expanded', 'true');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --testPathPattern="MobileDetailsTab" --verbose`
Expected: FAIL

**Step 3: Write minimal implementation**

Update props interface:
```typescript
interface MobileDetailsTabProps {
  // ... existing props
  /** Total combo bonus earned */
  totalComboBonus?: number;
  /** Total fire round bonus earned */
  totalFireRoundBonus?: number;
  /** Player archetype (moved from Results tab) */
  playerArchetype?: PlayerArchetype | null;
}
```

Update component JSX:
```typescript
return (
  <div className="space-y-3">
    {/* Your Words - DEFAULT OPEN */}
    {results.playerWordData && results.playerWordData.length > 0 && (
      <YourWordsSection
        wordsByPoints={wordsByPoints}
        sortedPointGroups={sortedPointGroups}
        invalidWords={invalidWords}
        wordCount={results.playerWordData.length}
        title={t('results.yourWords') || 'Your Words'}
        t={t}
        defaultExpanded={true}  // CHANGED: now default open
      />
    )}

    {/* Performance - includes archetype now */}
    {playerInsights && (
      <CollapsibleSection
        title={t('results.performanceDetails') || 'Performance'}
        defaultExpanded={false}  // CHANGED: collapsed by default
      >
        <PerformanceSection
          insights={playerInsights}
          archetype={playerArchetype}  // NEW: archetype moved here
        />
      </CollapsibleSection>
    )}

    {/* Missed Words */}
    {mode === 'solo-bots' && missedWords.length > 0 && (
      <CollapsibleSection
        title={t('results.missedWords') || 'Missed Words'}
        defaultExpanded={false}
      >
        <MissedWords missedWords={missedWords} maxDisplay={5} />
      </CollapsibleSection>
    )}

    {/* Bot Words */}
    {mode === 'solo-bots' && botWordDetails.length > 0 && (
      <BotWordsSection
        botWordDetails={botWordDetails}
        language={gameLanguage}
        title={t('singlePlayer.botWordsFound') || 'Bot Words Found'}
        t={t}
        defaultExpanded={false}
      />
    )}

    {/* Achievements */}
    {results.achievements && results.achievements.length > 0 && (
      <AchievementsSection
        achievements={results.achievements}
        title={t('hostView.achievements') || 'Achievements'}
        disclaimer={t('singlePlayer.achievementsNotSaved')}
        defaultExpanded={false}  // CHANGED: collapsed by default
      />
    )}

    {/* History Chart - moved from Results tab */}
    <CollapsibleSection
      title={t('results.performanceHistory') || 'History'}
      icon={<TrendingUp className="w-4 h-4" />}
      defaultExpanded={false}
    >
      <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
    </CollapsibleSection>

    {/* NEW: Bonuses section */}
    {(totalComboBonus > 0 || totalFireRoundBonus > 0) && (
      <CollapsibleSection
        title={t('results.bonuses') || 'Bonuses'}
        defaultExpanded={false}
      >
        <div className="space-y-2 p-3">
          {totalComboBonus > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{t('results.comboBonus') || 'Combo Bonus'}</span>
              <span className="font-bold text-neo-cyan">+{totalComboBonus}</span>
            </div>
          )}
          {totalFireRoundBonus > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{t('results.fireRoundBonus') || 'Fire Round'}</span>
              <span className="font-bold text-neo-orange">+{totalFireRoundBonus}</span>
            </div>
          )}
        </div>
      </CollapsibleSection>
    )}
  </div>
);
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --testPathPattern="MobileDetailsTab" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add fe-next/components/singleplayer/results/components/MobileDetailsTab.tsx
git commit -m "refactor(results): reorganize MobileDetailsTab sections

- Your Words now expanded by default
- All other sections collapsed by default
- Add Bonuses section (combo + fire round)
- Move archetype into Performance section
- Consistent collapsible section structure"
```

---

## Task 7: Update SinglePlayerResults to pass new props

**Files:**
- Modify: `fe-next/components/singleplayer/SinglePlayerResults.tsx`

**Step 1: Verify current props being passed**

Check that `totalComboBonus`, `totalFireRoundBonus`, and `playerArchetype` are passed to MobileDetailsTab.

**Step 2: Update component**

Find the MobileDetailsTab usage and ensure all new props are passed:

```typescript
<MobileDetailsTab
  results={results}
  mode={mode}
  gameLanguage={gameLanguage}
  playerInsights={playerInsights}
  wordsByPoints={wordsByPoints}
  sortedPointGroups={sortedPointGroups}
  invalidWords={invalidWords}
  botWordDetails={botWordDetails}
  missedWords={missedWords}
  t={t}
  // NEW props
  totalComboBonus={totalComboBonus}
  totalFireRoundBonus={totalFireRoundBonus}
  playerArchetype={playerArchetype}
/>
```

**Step 3: Run tests**

Run: `npm run test:frontend -- --testPathPattern="SinglePlayerResults" --verbose`
Expected: PASS

**Step 4: Commit**

```bash
git add fe-next/components/singleplayer/SinglePlayerResults.tsx
git commit -m "fix(results): pass bonus and archetype props to MobileDetailsTab"
```

---

## Task 8: Export new components from index

**Files:**
- Modify: `fe-next/components/results/index.ts`

**Step 1: Add exports**

```typescript
// Add to fe-next/components/results/index.ts
export { default as MobileCompactStats } from './MobileCompactStats';
export { default as MobileCompactRewards } from './MobileCompactRewards';
export { default as MobileCompactLeaderboard } from './MobileCompactLeaderboard';
```

**Step 2: Commit**

```bash
git add fe-next/components/results/index.ts
git commit -m "chore(results): export new mobile compact components"
```

---

## Task 9: Update multiplayer ResultsMainContent

**Files:**
- Modify: `fe-next/components/results/ResultsMainContent.tsx`

**Step 1: Update for mobile mode**

Add `isMobile` prop and conditionally use compact components:

```typescript
interface ResultsMainContentProps {
  // ... existing props
  /** Use compact mobile layout */
  isMobile?: boolean;
}
```

Update component to use compact components when `isMobile={true}`:

```typescript
{isMobile ? (
  <>
    {/* Compact banner */}
    {bannerPlayer && (
      <ResultsWinnerBanner
        {...bannerProps}
        compact={true}
      />
    )}

    {/* Compact stats */}
    <MobileCompactStats
      wordCount={currentPlayerValidWords.length}
      accuracy={accuracy}
    />

    {/* CTA buttons */}
    {/* ... */}

    {/* Compact rewards */}
    {winStreakData && (
      <MobileCompactRewards
        winStreak={winStreakData.currentStreak}
        coins={0} // Multiplayer doesn't have coins yet
      />
    )}

    {/* Compact leaderboard */}
    {sortedScores.length > 1 && (
      <MobileCompactLeaderboard
        participants={sortedScores.map(p => ({
          name: p.username,
          score: p.score,
          isCurrentPlayer: normalizeUsername(p.username) === normalizeUsername(username),
        }))}
      />
    )}
  </>
) : (
  // Existing desktop layout
)}
```

**Step 2: Run tests and verify**

Run: `npm run test:frontend -- --testPathPattern="ResultsMainContent" --verbose`

**Step 3: Commit**

```bash
git add fe-next/components/results/ResultsMainContent.tsx
git commit -m "feat(results): add mobile compact mode to ResultsMainContent

Uses new compact components when isMobile=true for
consistent mobile experience across all game modes."
```

---

## Task 10: Run full test suite and lint

**Step 1: Run all tests**

```bash
npm run test
```
Expected: All tests PASS

**Step 2: Run lint**

```bash
npm run lint
```
Expected: No errors

**Step 3: Run build**

```bash
npm run build
```
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify mobile results simplification passes all checks"
```

---

## Summary

**New Components Created:**
1. `MobileCompactStats` - Single-row words + accuracy
2. `MobileCompactRewards` - Single-row streak + coins
3. `MobileCompactLeaderboard` - Text-only top 3

**Components Modified:**
1. `ResultsWinnerBanner` - Added `compact` prop
2. `MobileResultsTab` - Simplified layout
3. `MobileDetailsTab` - Reorganized sections, added Bonuses
4. `ResultsMainContent` - Added `isMobile` mode

**Total Commits:** 10 atomic commits following TDD
