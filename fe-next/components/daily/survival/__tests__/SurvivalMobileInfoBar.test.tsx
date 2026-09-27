import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'layoutId', 'variants'].includes(k)))}>{children}</div>
  ));
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    m: { div: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock Avatar component
vi.mock('@/components/Avatar', () => {
  const MockAvatar = () => {
    return <div data-testid="avatar" />;
  };
  return { default: MockAvatar };
});

// Mock rankingStyles
vi.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
}));

import { SurvivalMobileInfoBar, type SurvivalMobileInfoBarProps } from '../SurvivalMobileInfoBar';
import type { WordDiscovery } from '../types';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'wordHunt.desktop.liveRanks': 'Live Ranks',
    'wordHunt.desktop.lootCollected': 'Loot Collected',
    'wordHunt.desktop.noWordsYet': 'Find words to collect loot!',
    'wordHunt.desktop.hintsUnlocked': 'Hints Unlocked',
    'wordHunt.desktop.triesRemaining': 'Tries Remaining',
    'wordHunt.mobile.rank': 'Rank',
    'wordHunt.mobile.words': 'Words',
  };
  return translations[key] || key;
};

// Mock fetch for leaderboard
const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      data: [
        { rank_position: 1, display_name: 'Alice', efficiency_score: 350, solved: true, player_id: 'alice-id', guest_fingerprint: null, avatar_image: null},
        { rank_position: 2, display_name: 'Bob', efficiency_score: 280, solved: true, player_id: 'bob-id', guest_fingerprint: null, avatar_image: null},
      ],
      totalPlayers: 25,
    }),
  });
});

const baseProps: SurvivalMobileInfoBarProps = {
  discoveredWords: [],
  hintStage: 0,
  attempts: [],
  puzzleDate: '2026-02-25',
  language: 'en',
  currentPlayerId: null,
  currentGuestFingerprint: null,
  t: mockT,
};

describe('SurvivalMobileInfoBar', () => {
  it('renders compact bar with rank and word count', () => {
    const words: WordDiscovery[] = [
      { word: 'HELLO', timestamp: Date.now(), lifeGained: 5, tokensGained: 2 },
      { word: 'WORLD', timestamp: Date.now() - 1000, lifeGained: 3, tokensGained: 1 },
    ];
    render(<SurvivalMobileInfoBar {...baseProps} discoveredWords={words} />);

    // Should show word count
    expect(screen.getByTestId('mobile-info-words-count')).toHaveTextContent('2');
  });

  it('expands to show full loot list when tapped', () => {
    const words: WordDiscovery[] = [
      { word: 'HELLO', timestamp: Date.now(), lifeGained: 5, tokensGained: 2 },
    ];
    render(<SurvivalMobileInfoBar {...baseProps} discoveredWords={words} />);

    // Tap the bar to expand
    fireEvent.click(screen.getByTestId('mobile-info-toggle'));

    // Should show full word list
    expect(screen.getByText('HELLO')).toBeInTheDocument();
  });

  it('shows live ranks tab in expanded view', async () => {
    render(<SurvivalMobileInfoBar {...baseProps} />);

    // Expand
    fireEvent.click(screen.getByTestId('mobile-info-toggle'));

    // Switch to ranks tab
    fireEvent.click(screen.getByTestId('mobile-info-tab-ranks'));

    // Should show leaderboard data after fetch
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('collapses when toggle is clicked again', () => {
    const words: WordDiscovery[] = [
      { word: 'TEST', timestamp: Date.now(), lifeGained: 5, tokensGained: 2 },
    ];
    render(<SurvivalMobileInfoBar {...baseProps} discoveredWords={words} />);

    // Expand
    fireEvent.click(screen.getByTestId('mobile-info-toggle'));
    expect(screen.getByText('TEST')).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByTestId('mobile-info-toggle'));

    // Full word list should be hidden
    expect(screen.queryByText('TEST')).not.toBeInTheDocument();
  });

  it('uses icons not emojis in expanded loot list', () => {
    const words: WordDiscovery[] = [
      { word: 'HELLO', timestamp: Date.now(), lifeGained: 5, tokensGained: 2 },
    ];
    render(<SurvivalMobileInfoBar {...baseProps} discoveredWords={words} />);

    fireEvent.click(screen.getByTestId('mobile-info-toggle'));

    const expandedContent = screen.getByTestId('mobile-info-expanded');
    const textContent = expandedContent.textContent || '';
    expect(textContent).not.toContain('❤️');
    expect(textContent).not.toContain('🔑');
  });
});
