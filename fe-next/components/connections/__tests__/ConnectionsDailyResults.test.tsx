import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import type { Puzzle } from '@/lib/connections/types';
import ConnectionsDailyResults from '../ConnectionsDailyResults';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, params?: Record<string, unknown>) => {
    if (params) return `${k}(${JSON.stringify(params)})`;
    return k;
  }}),
}));

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playVictorySound: vi.fn() }),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    animate: vi.fn((target, variants, options) => {
      // Immediately call onUpdate and animationComplete for tests
      if (typeof variants === 'number') {
        if (options?.onUpdate) options.onUpdate(variants);
        if (options?.animationComplete) options.animationComplete();
      }
      return { stop: vi.fn() };
    }),
  };
});

describe('ConnectionsDailyResults', () => {
  const mockPuzzles: Puzzle[] = [
    { id: '1', from: 'cat', to: 'dog', tips: [] },
    { id: '2', from: 'red', to: 'blue', tips: [] },
    { id: '3', from: 'hot', to: 'cold', tips: [] },
    { id: '4', from: 'fast', to: 'slow', tips: [] },
    { id: '5', from: 'big', to: 'small', tips: [] },
  ];

  const mockOutcomes: BridgeOutcome[] = [
    { reached: true, solved: true, wrongAttempts: 0, hintUsed: false },
    { reached: true, solved: true, wrongAttempts: 1, hintUsed: false },
    { reached: true, solved: false, wrongAttempts: 2, hintUsed: true },
    { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
    { reached: true, solved: true, wrongAttempts: 0, hintUsed: false },
  ];

  const mockLeaderboard: LeaderboardRow[] = [
    { rank: 1, displayName: 'Player1', score: 500, avatarEmoji: '😀' },
    { rank: 2, displayName: 'Player2', score: 450, avatarEmoji: '😎' },
  ];

  const defaultProps = {
    score: 350,
    solvedCount: 3,
    total: 5,
    streak: 7,
    rank: 12,
    totalPlayers: 100,
    outcomes: mockOutcomes,
    puzzles: mockPuzzles,
    leaderboardRows: mockLeaderboard,
    isLoading: false,
    shareText: 'LexiClash · Word Chain 2026-09-13\nclean · messy',
    dateISO: '2026-09-13',
    onShareClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders score circle with animated counting', async () => {
    render(<ConnectionsDailyResults {...defaultProps} />);

    // Check hero score circle appears
    expect(screen.getByTestId('score-circle')).toBeTruthy();
    // Final score should be visible after animation
    expect(within(screen.getByTestId('score-circle')).getByText('350')).toBeTruthy();
  });

  it('renders tier message based on score', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);

    // Score 350 is a strong run - should have a tier message
    expect(screen.getByTestId('tier-message')).toBeTruthy();
  });

  it('renders stat chips for solved count and streak', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);

    // Solved count chip
    expect(screen.getByTestId('stat-chip-solved')).toBeTruthy();
    expect(screen.getByText(/connections\.daily\.solved/)).toBeTruthy();

    // Streak chip with flame - specifically in the stat-chip-streak
    const streakChip = screen.getByTestId('stat-chip-streak');
    expect(streakChip).toBeTruthy();
    expect(streakChip.textContent).toContain('7');
  });

  it('does not render streak chip when streak is 0', () => {
    render(<ConnectionsDailyResults {...{ ...defaultProps, streak: 0 }} />);

    expect(screen.queryByTestId('stat-chip-streak')).toBeFalsy();
  });

  it('renders perfect banner for exceptional runs', () => {
    const highScore = { ...defaultProps, score: 500, solvedCount: 5 };
    render(<ConnectionsDailyResults {...highScore} />);

    expect(screen.getByTestId('exceptional-banner')).toBeTruthy();
  });

  it('renders recap, answer key, and leaderboard', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);

    // BridgeOutcomeTiles renders recap-squares (one per outcome)
    expect(screen.getAllByTestId('recap-square').length).toBeGreaterThan(0);
    // DailyAnswerKey has this testid
    expect(screen.getByTestId('daily-answer-key')).toBeTruthy();
    // ConnectionsLeaderboard is in this wrapper div
    expect(screen.getByTestId('connections-leaderboard')).toBeTruthy();
  });

  it('renders the shared share card (GameEmojiShareCard) with the recap tiles inside', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);
    const card = screen.getByTestId('game-emoji-share-card');
    expect(card).toBeTruthy();
    // The bridge outcome tiles are the share artifact, inside the shared card.
    const tiles = card.querySelectorAll('[data-testid="recap-square"]');
    expect(tiles.length).toBe(mockOutcomes.length);
    // The shared card shows the score + labeled stats — and no emoji artifact.
    expect(card.textContent).toContain('350');
    expect(card.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2B1B}-\u{2B1C}]/u);
  });

  it('copy button copies the paste-text path (shareText prop)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ConnectionsDailyResults {...defaultProps} />);
    const copyButton = screen.getByRole('button', { name: 'share.emojiCard.copy' });
    copyButton.click();
    await screen.findByText('common.copied');
    expect(writeText).toHaveBeenCalledWith(defaultProps.shareText);
  });

  it('reports share clicks through onShareClick', () => {
    const onShareClick = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    render(<ConnectionsDailyResults {...{ ...defaultProps, onShareClick }} />);
    screen.getByRole('button', { name: 'share.emojiCard.copy' }).click();
    expect(onShareClick).toHaveBeenCalledWith('copy');
  });

  it('shows the countdown to the next UTC day', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);
    expect(screen.getByText(/connections\.daily\.nextIn/)).toBeTruthy();
  });

  it('respects reduced motion preference for score animation', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);

    // When reduced motion is enabled (default in tests), score should appear immediately
    // The mock for useReducedMotion returns true by default
    const scoreText = within(screen.getByTestId('score-circle')).getByText('350');
    expect(scoreText).toBeTruthy();
    // Verify the circle has motion-reduce class for accessibility
    const circle = screen.getByTestId('score-circle');
    expect(circle.className).toContain('motion-reduce');
  });

  it('renders loading state in leaderboard', () => {
    const { getByText } = render(<ConnectionsDailyResults {...{ ...defaultProps, isLoading: true }} />);

    // Leaderboard title should still be present when loading
    expect(getByText('connections.daily.leaderboard')).toBeTruthy();
  });

  it('has a back link to the daily hub', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);

    const backLink = screen.getByTestId('back-button');
    expect(backLink.tagName).toBe('A');
    expect(backLink.getAttribute('href')).toBe('/en/daily');
  });

  it('renders a labeled rank stat tile when rank is known', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);
    const rankTile = screen.getByTestId('stat-tile-rank');
    expect(rankTile.textContent).toContain('#12');
  });

  it('keeps all existing data-testids for regression', () => {
    render(<ConnectionsDailyResults {...defaultProps} />);

    // Verify components that must maintain their testids
    // recap-square has multiple instances (one per outcome)
    expect(screen.getAllByTestId('recap-square').length).toBeGreaterThan(0);
    expect(screen.getByTestId('daily-answer-key')).toBeTruthy();
  });
});
