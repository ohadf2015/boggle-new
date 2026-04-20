/**
 * BossRushResults Tests
 *
 * Tests for the Boss Rush results screen shown after
 * completing or failing a boss rush.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BossRushResults from '../BossRushResults';
import type { BossRushState } from '../hooks/useBossRush';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
}));

vi.mock('@/lib/adventure/bossConfig', () => ({
  getBossConfig: vi.fn((worldId: number) => ({
    id: `boss-${worldId}`,
    worldId,
    displayName: `adventure.bosses.boss${worldId}.name`,
    imagePath: `/images/bosses/boss-${worldId}.webp`,
  })),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle',
    isAdAvailable: false,
    isPlaceholderCooldown: false,
    showAd: vi.fn().mockResolvedValue(undefined),
    error: null,
    rewardAmount: 0,
    canShowAd: false,
    viewsToday: 0,
    maxViews: 3,
    isDailyLimitReached: false,
    isPlaceholder: false,
  }),
}));

// ==============================================
// HELPERS
// ==============================================

function makeState(overrides: Partial<BossRushState> = {}): BossRushState {
  return {
    isActive: false,
    currentBossIndex: 2,
    defeatedBosses: [1, 3, 5],
    totalBosses: 3,
    bossesDefeated: 3,
    totalScore: 2500,
    startTime: Date.now() - 120000, // 2 minutes ago
    isComplete: true,
    isFailed: false,
    ...overrides,
  };
}

const defaultProps = {
  state: makeState(),
  onRetry: vi.fn(),
  onExit: vi.fn(),
};

// ==============================================
// TESTS
// ==============================================

describe('BossRushResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete title when rush is complete', () => {
    render(<BossRushResults {...defaultProps} />);
    expect(screen.getByText('adventure.bossRush.fullClear')).toBeInTheDocument();
  });

  it('renders failed title when rush failed', () => {
    render(<BossRushResults {...defaultProps} state={makeState({ isComplete: false, isFailed: true, bossesDefeated: 1 })} />);
    expect(screen.getByText('adventure.bossRush.runOver')).toBeInTheDocument();
  });

  it('shows bosses defeated count', () => {
    render(<BossRushResults {...defaultProps} />);
    // Should show 3/3
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });

  it('shows total score', () => {
    render(<BossRushResults {...defaultProps} />);
    expect(screen.getByText(/2,?500/)).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<BossRushResults {...defaultProps} onRetry={onRetry} />);

    const retryBtn = screen.getByText('adventure.bossRush.tryAgain');
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onExit when exit button clicked', () => {
    const onExit = vi.fn();
    render(<BossRushResults {...defaultProps} onExit={onExit} />);

    const exitBtn = screen.getByText('adventure.bossRush.backToHub');
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows partial defeat count when failed mid-rush', () => {
    render(<BossRushResults {...defaultProps} state={makeState({
      isComplete: false, isFailed: true, bossesDefeated: 1, totalBosses: 3,
    })} />);
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();
  });
});
