/**
 * PostHog inbox 01a108ad: every growth:blast_board_stuck in 30 days was an MP
 * board waiting on the CLIENT dictionary. MP submits are server-validated, so
 * the board must not wait on it; the deferred load starts in the background.
 */
import React from 'react';
import { render, act, screen } from '@testing-library/react';

const { retry } = vi.hoisted(() => ({ retry: vi.fn() }));

vi.mock('@/contexts/MusicContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: () => () => {} });
  return { ...actual, useMusic: () => api, useMusicSafe: () => api };
});
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: false, retry }),
}));
vi.mock('@/contexts/AdMobContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: (_t, k) => (k === 'isNative' || k === 'isReady' ? false : () => {}) });
  return { ...actual, useAdMobContext: () => api };
});

import { BlastGame } from '../BlastGame';

const grid = Array.from({ length: 6 }, () => ['C', 'A', 'T', 'S', 'E', 'R']);
const noop = () => {};

describe('MP Blast board with a cold client dictionary', () => {
  beforeEach(() => retry.mockClear());

  it('shows the board instead of the loading gate, and starts the dictionary load once', () => {
    const { rerender } = render(
      <BlastGame
        config={{ gridSize: 6, specialTileChance: 0.12, language: 'he' as never, boardClearMode: 'shrink' }}
        mode="multiplayer"
        serverGrid={grid as never}
        blastSeed={1}
        remainingTime={50}
        totalTime={60}
        username="you"
        leaderboard={[{ username: 'you', score: 0 }]}
        onWordWithComboType={noop}
        onMPDeadEnd={noop}
        onMPBoardCleared={noop}
        onGameEnd={noop}
        onQuit={noop}
      />,
    );
    act(() => {});
    expect(screen.getByTestId('blast-game-root')).toBeTruthy();
    rerender(
      <BlastGame
        config={{ gridSize: 6, specialTileChance: 0.12, language: 'he' as never, boardClearMode: 'shrink' }}
        mode="multiplayer"
        serverGrid={grid as never}
        blastSeed={1}
        remainingTime={49}
        totalTime={60}
        username="you"
        leaderboard={[{ username: 'you', score: 0 }]}
        onWordWithComboType={noop}
        onMPDeadEnd={noop}
        onMPBoardCleared={noop}
        onGameEnd={noop}
        onQuit={noop}
      />,
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
