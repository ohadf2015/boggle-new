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

  it('renders an interactive board without any click once the board has loaded', async () => {
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={vi.fn()} />
      </Suspense>
    );

    // No "Fight" button anymore — the guest already opted in at the gate, so the
    // demo auto-starts (phase ready -> start()) as soon as the board loads.
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '0');
    });
  });

  it('fires adventure_demo_started exactly once automatically after load', async () => {
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={vi.fn()} />
      </Suspense>
    );

    await waitFor(() => {
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_demo_started', {});
    });

    const startedCalls = mockTrackGrowthEvent.mock.calls.filter((c) => c[0] === 'adventure_demo_started');
    expect(startedCalls).toHaveLength(1);
  });

  it('calls onExit from the top-bar back button', async () => {
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

    const backButton = screen.getByRole('button', { name: 'adventurePlay.backToMap' });
    await user.click(backButton);
    expect(onExit).toHaveBeenCalled();
  });

  it('when play again is clicked, shows a fresh board that auto-starts again', async () => {
    render(
      <Suspense fallback={null}>
        <AdventureDemo onExit={vi.fn()} />
      </Suspense>
    );

    // Board loads and auto-starts (0.5s level set in the mock).
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '0');
    });

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

    const startedCallsBeforeReplay = mockTrackGrowthEvent.mock.calls.filter(
      (c) => c[0] === 'adventure_demo_started'
    );
    expect(startedCallsBeforeReplay).toHaveLength(1);

    // Click play again button
    const user = userEvent.setup();
    const playAgainButton = screen.getByRole('button', { name: 'adventurePlay.guest.playAgain' });
    await user.click(playAgainButton);

    // Fresh board auto-starts again — no click needed to make it interactive.
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '0');
    });

    // Result card should be gone
    expect(screen.queryByText('adventurePlay.guest.demoWon')).toBeNull();
    expect(screen.queryByText('adventurePlay.guest.demoLost')).toBeNull();

    // adventure_demo_started fired once more for the new round.
    await waitFor(() => {
      const startedCallsAfterReplay = mockTrackGrowthEvent.mock.calls.filter(
        (c) => c[0] === 'adventure_demo_started'
      );
      expect(startedCallsAfterReplay).toHaveLength(2);
    });
  });
});
