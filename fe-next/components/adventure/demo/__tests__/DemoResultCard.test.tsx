/**
 * Tests for DemoResultCard component
 * Verifies result display, sign-in flow, play again, and home navigation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockTrackGrowthEvent = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (event: string, data?: any) => mockTrackGrowthEvent(event, data),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (k: string, v?: any) => v ? `${k}|${JSON.stringify(v)}` : k,
    language: 'en',
  }),
}));

vi.mock('@/components/auth/AuthModal', () => ({
  default: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="auth-modal">
        <button data-testid="auth-modal-close" onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

import { DemoResultCard } from '../DemoResultCard';

describe('DemoResultCard', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    vi.clearAllMocks();
  });

  it('shows won message when won is true', async () => {
    const result = {
      won: true,
      score: 150,
      words: 5,
      points: 150,
      stars: 0,
      items: [],
      mastery: [],
      purse: 0,
      totalCoins: 0,
      relicsAdded: [],
      relicsUpgraded: [],
    };

    render(<DemoResultCard result={result} onPlayAgain={vi.fn()} />);

    expect(screen.getByText('adventurePlay.guest.demoWon')).toBeTruthy();
  });

  it('shows lost message when won is false', async () => {
    const result = {
      won: false,
      score: 0,
      words: 0,
      points: 0,
      stars: 0,
      items: [],
      mastery: [],
      purse: 0,
      totalCoins: 0,
      relicsAdded: [],
      relicsUpgraded: [],
    };

    render(<DemoResultCard result={result} onPlayAgain={vi.fn()} />);

    expect(screen.getByText('adventurePlay.guest.demoLost')).toBeTruthy();
  });

  it('displays the score value', async () => {
    const result = {
      won: true,
      score: 325,
      words: 8,
      points: 325,
      stars: 0,
      items: [],
      mastery: [],
      purse: 0,
      totalCoins: 0,
      relicsAdded: [],
      relicsUpgraded: [],
    };

    render(<DemoResultCard result={result} onPlayAgain={vi.fn()} />);

    // The t() mock will output "adventurePlay.guest.demoScore|{\"score\":325}"
    const scoreText = screen.getByText(/adventurePlay.guest.demoScore.*325/);
    expect(scoreText).toBeTruthy();
  });

  it('fires adventure_guest_signin_clicked when sign-in button is clicked', async () => {
    const user = userEvent.setup();
    const result = {
      won: true,
      score: 100,
      words: 3,
      points: 100,
      stars: 0,
      items: [],
      mastery: [],
      purse: 0,
      totalCoins: 0,
      relicsAdded: [],
      relicsUpgraded: [],
    };

    render(<DemoResultCard result={result} onPlayAgain={vi.fn()} />);

    const signInButton = screen.getByRole('button', { name: 'adventurePlay.guest.saveProgress' });
    await user.click(signInButton);

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_guest_signin_clicked', { surface: 'demo' });
    expect(screen.getByTestId('auth-modal')).toBeTruthy();
  });

  it('calls onPlayAgain when play again button is clicked', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    const result = {
      won: true,
      score: 100,
      words: 3,
      points: 100,
      stars: 0,
      items: [],
      mastery: [],
      purse: 0,
      totalCoins: 0,
      relicsAdded: [],
      relicsUpgraded: [],
    };

    render(<DemoResultCard result={result} onPlayAgain={onPlayAgain} />);

    const playAgainButton = screen.getByRole('button', { name: 'adventurePlay.guest.playAgain' });
    await user.click(playAgainButton);

    expect(onPlayAgain).toHaveBeenCalled();
  });

  it('home link goes to home page', async () => {
    const result = {
      won: true,
      score: 100,
      words: 3,
      points: 100,
      stars: 0,
      items: [],
      mastery: [],
      purse: 0,
      totalCoins: 0,
      relicsAdded: [],
      relicsUpgraded: [],
    };

    render(<DemoResultCard result={result} onPlayAgain={vi.fn()} />);

    const homeLink = screen.getByRole('link', { name: 'adventurePlay.backHome' });
    expect(homeLink).toHaveAttribute('href', '/en');
  });
});
