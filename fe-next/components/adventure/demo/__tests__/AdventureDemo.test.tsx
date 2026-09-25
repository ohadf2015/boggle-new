/**
 * Tests for AdventureDemo component
 * Verifies guest can play one real World-1 fight with interactive board
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { Suspense } from 'react';

const mockTrackGrowthEvent = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (event: string, data?: any) => mockTrackGrowthEvent(event, data),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (k: string, v?: any) => v ? `${k}|${JSON.stringify(v)}` : k,
    language: 'en',
  }),
  useLanguage: () => ({
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

vi.mock('@/components/adventure/play/useWordChecker', () => ({
  useWordChecker: () => async (word: string) => {
    // 'abc' is on the board (row 0), other words fail
    return word === 'abc';
  },
}));

import { AdventureDemo } from '../AdventureDemo';

describe('AdventureDemo', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    vi.clearAllMocks();

    // Mock the demo API - use mockImplementation to handle multiple calls
    fetchSpy = vi.spyOn(global, 'fetch');
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            grid: [
              ['a', 'b', 'c', 'd'],
              ['e', 'f', 'g', 'h'],
              ['i', 'j', 'k', 'l'],
              ['m', 'n', 'o', 'p'],
            ],
            level: {
              world: 1,
              level: 1,
              kind: 'fight',
              size: 4,
              minLength: 3,
              seconds: 0.5,  // Very short for testing
              stars: [10, 25, 40],
              enemyId: 'foe-w1',
              isBoss: false,
              bossHp: 50,
            },
            language: 'en',
            seconds: 0.5,
            hints: [],
            targets: undefined,
          }),
          { status: 200 }
        )
      )
    );
  });

  afterEach(() => {
    if (fetchSpy) fetchSpy.mockRestore();
  });

  it('renders a 4x4 grid of letters from the demo board', async () => {
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={vi.fn()} />
      </Suspense>
    );

    // Wait for board to load
    await waitFor(() => {
      expect(screen.getByText('a')).toBeTruthy();
    });

    // Check all 16 letters are present
    const expectedLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
    for (const letter of expectedLetters) {
      expect(screen.getByText(letter)).toBeTruthy();
    }
  });

  it('shows the fight button when ready, not the grid submit', async () => {
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={vi.fn()} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('adventurePlay.fight')).toBeTruthy();
    });
  });

  it('fires demo_started when fight button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={vi.fn()} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('adventurePlay.fight')).toBeTruthy();
    });

    const fightButton = screen.getByText('adventurePlay.fight');
    await user.click(fightButton);

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_demo_started', {});
  });

  it('calls onExit when back button is clicked', async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={onExit} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('a')).toBeTruthy();
    });

    const backButton = screen.getByRole('button', { name: 'adventurePlay.guest.backToGate' });
    await user.click(backButton);
    expect(onExit).toHaveBeenCalled();
  });

  it('when play again is clicked, shows a fresh board and fight button', async () => {
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={vi.fn()} />
      </Suspense>
    );

    // Wait for board to load and fight button to appear
    await waitFor(() => {
      expect(screen.getByText('adventurePlay.fight')).toBeTruthy();
    });

    // Click fight to start
    const fightButton = screen.getByText('adventurePlay.fight');
    await user.click(fightButton);

    // Wait for time to run out (0.5 seconds set in mock)
    await waitFor(
      () => {
        // Result card should be shown with won/lost title
        expect(
          screen.queryByText('adventurePlay.guest.demoWon') ||
          screen.queryByText('adventurePlay.guest.demoLost')
        ).toBeTruthy();
      },
      { timeout: 3000 }
    );

    // Click play again button
    const playAgainButton = screen.getByRole('button', { name: 'adventurePlay.guest.playAgain' });
    await user.click(playAgainButton);

    // Fight button should reappear
    await waitFor(() => {
      expect(screen.getByText('adventurePlay.fight')).toBeTruthy();
    });

    // Result card should be gone
    expect(screen.queryByText('adventurePlay.guest.demoWon')).toBeNull();
    expect(screen.queryByText('adventurePlay.guest.demoLost')).toBeNull();
  });
});
