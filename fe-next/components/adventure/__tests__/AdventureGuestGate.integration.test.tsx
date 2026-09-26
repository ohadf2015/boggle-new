/**
 * Integration test for AdventureGuestGate
 * Tests the full flow: unauth guest -> click play battle -> real board renders -> fight -> demo_started fires
 * Does NOT mock AdventureDemo, so it tests with real components
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configure, render, screen, waitFor } from '@testing-library/react';

// next/dynamic resolves the demo chunk asynchronously; under a parallel full-suite run it
// can exceed RTL's 1s default (observed 2/6 flakes). The assertions are unchanged.
configure({ asyncUtilTimeout: 5000 });
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

import { AdventureGuestGate } from '../AdventureGuestGate';

describe('AdventureGuestGate Integration', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    vi.clearAllMocks();

    // Mock the demo API
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
              seconds: 0.5,
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

  it('given unauth guest clicks play battle, when the demo loads, then real board renders and is interactive with no extra click', async () => {
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="map" />
      </Suspense>
    );

    // Click play battle
    const playBattleButton = screen.getByText('adventurePlay.guest.playBattle');
    await user.click(playBattleButton);

    // Wait for real board to load
    await waitFor(() => {
      expect(screen.getByText('a')).toBeTruthy();
    });

    // Check all 16 letters are present (real GridComponent)
    const expectedLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
    for (const letter of expectedLetters) {
      expect(screen.getByText(letter)).toBeTruthy();
    }

    // The guest already chose "play a free battle" at the gate — there is no
    // second "Fight" button. The board auto-starts (phase ready -> start()) and
    // becomes interactive on its own once it has loaded.
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '0');
    });
  });

  it('given guest plays the demo, when the board loads, then demo_started is fired automatically once', async () => {
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="map" />
      </Suspense>
    );

    // Click play battle
    const playBattleButton = screen.getByText('adventurePlay.guest.playBattle');
    await user.click(playBattleButton);

    // Wait for board to load and auto-start — no fight button to click anymore.
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '0');
    });

    // Verify demo_started was fired automatically, exactly once.
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_demo_started', {});
    const startedCalls = mockTrackGrowthEvent.mock.calls.filter((c) => c[0] === 'adventure_demo_started');
    expect(startedCalls).toHaveLength(1);
  });

  it('given guest plays demo, when the run completes, then only demo endpoint was called (no writes)', async () => {
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="map" />
      </Suspense>
    );

    // Click play battle
    const playBattleButton = screen.getByText('adventurePlay.guest.playBattle');
    await user.click(playBattleButton);

    // Board loads and auto-starts on its own (0.5s level set in the mock) —
    // no fight button to click.
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '0');
    });

    // Wait for time to run out
    await waitFor(
      () => {
        expect(
          screen.queryByText('adventurePlay.guest.demoWon') ||
          screen.queryByText('adventurePlay.guest.demoLost')
        ).toBeTruthy();
      },
      { timeout: 3000 }
    );

    // Verify only demo endpoint was called, no write endpoints
    const allCalls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(allCalls.length).toBeGreaterThan(0);
    for (const call of allCalls) {
      expect(call).toMatch(/\/api\/adventure\/demo/);
      expect(call).not.toMatch(/\/api\/adventure\/(start|node|complete)/);
    }
  });
});
