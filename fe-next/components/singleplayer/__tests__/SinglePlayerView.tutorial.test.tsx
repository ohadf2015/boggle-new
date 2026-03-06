/**
 * SinglePlayerView Tutorial Integration Tests
 *
 * Verifies TutorialProvider + TutorialOverlay are wired into the singleplayer game view
 * TDD RED phase: tests written before implementation
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock search params
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock NavigationContext
jest.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => jest.fn(),
}));

// Mock MusicContext
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    unlockAudio: jest.fn(),
    playBackgroundMusic: jest.fn(),
    stopBackgroundMusic: jest.fn(),
    isPlaying: false,
  }),
}));

jest.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: jest.fn(),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

jest.mock('@/hooks/useFeatureUnlockNotifications', () => ({
  useFeatureUnlockNotifications: jest.fn(),
}));

// Mock SinglePlayerGame to render data-tutorial targets
jest.mock('../SinglePlayerGame', () => {
  return function MockSinglePlayerGame() {
    return (
      <div data-testid="single-player-game">
        <div data-tutorial="grid">Grid</div>
        <div data-tutorial="combo">Combo</div>
        <div data-tutorial="timer">Timer</div>
        <div data-tutorial="leaderboard">Leaderboard</div>
      </div>
    );
  };
});

// Mock PreGameTutorial
jest.mock('../PreGameTutorial', () => {
  return function MockPreGameTutorial({ onComplete }: { onComplete: () => void }) {
    return <button onClick={onComplete}>Complete Tutorial</button>;
  };
});

// Mock SinglePlayerResults
jest.mock('../SinglePlayerResults', () => {
  return function MockResults() {
    return <div>Results</div>;
  };
});

// Mock AutoHideHeader
jest.mock('@/components/AutoHideHeader', () => {
  return function MockHeader() {
    return null;
  };
});

// Mock contextual guidance
jest.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
  markGuidanceShown: jest.fn(),
}));

// Mock PullToRefreshIndicator
jest.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Control tutorial completion state
let mockTutorialCompleted = false;
jest.mock('@/components/tutorial/tutorialSteps', () => ({
  ...jest.requireActual('@/components/tutorial/tutorialSteps'),
  isTutorialCompleted: () => mockTutorialCompleted,
  markTutorialCompleted: jest.fn(),
}));

// Mock TutorialOverlay to be detectable
jest.mock('@/components/tutorial/TutorialOverlay', () => {
  const { useContext } = require('react');
  return function MockTutorialOverlay() {
    const { TutorialContext } = require('@/components/tutorial/TutorialProvider');
    const ctx = useContext(TutorialContext);
    if (!ctx || !ctx.isActive) return null;
    return <div data-testid="tutorial-overlay">Tutorial Active</div>;
  };
});

import SinglePlayerView from '../SinglePlayerView';

describe('SinglePlayerView tutorial integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTutorialCompleted = true; // Default: tutorial already completed (no auto-start)
  });

  it('renders TutorialProvider and TutorialOverlay in the playing phase', async () => {
    // GIVEN: a singleplayer game in playing phase
    render(<SinglePlayerView />);

    // Skip pre-game tutorial to get to playing phase
    const completeBtn = screen.queryByText('Complete Tutorial');
    if (completeBtn) {
      await act(async () => {
        completeBtn.click();
      });
    }

    // THEN: SinglePlayerGame should render (confirms playing phase)
    await waitFor(() => {
      expect(screen.getByTestId('single-player-game')).toBeInTheDocument();
    });

    // The TutorialOverlay should NOT be visible when tutorial is completed
    expect(screen.queryByTestId('tutorial-overlay')).not.toBeInTheDocument();
  });

  it('auto-starts tutorial for first-time players during playing phase', async () => {
    // GIVEN: tutorial has NOT been completed before
    mockTutorialCompleted = false;

    render(<SinglePlayerView />);

    // Skip pre-game tutorial to get to playing phase
    const completeBtn = screen.queryByText('Complete Tutorial');
    if (completeBtn) {
      await act(async () => {
        completeBtn.click();
      });
    }

    // THEN: the game should render
    await waitFor(() => {
      expect(screen.getByTestId('single-player-game')).toBeInTheDocument();
    });

    // AND: TutorialOverlay should become visible after auto-start delay (1s)
    await waitFor(
      () => {
        expect(screen.getByTestId('tutorial-overlay')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
