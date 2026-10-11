import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';

const { mockPrefetch } = vi.hoisted(() => ({ mockPrefetch: vi.fn() }));

vi.mock('@/contexts/MusicContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: () => () => {} });
  return { ...actual, useMusic: () => api, useMusicSafe: () => api };
});
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: true }),
}));
vi.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({ prefetch: mockPrefetch, getCached: () => undefined, clearCache: () => {} }),
}));
vi.mock('@/contexts/AdMobContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: (_t, k) => (k === 'isNative' || k === 'isReady' ? false : () => {}) });
  return { ...actual, useAdMobContext: () => api };
});

import { BlastGame } from '../BlastGame';

const grid = [
  ['C', 'A', 'T', 'S', 'E', 'R'],
  ['D', 'O', 'G', 'E', 'N', 'T'],
  ['R', 'A', 'T', 'E', 'S', 'O'],
  ['B', 'I', 'R', 'D', 'A', 'L'],
  ['M', 'O', 'O', 'N', 'I', 'P'],
  ['S', 'T', 'A', 'R', 'E', 'D'],
];

describe('Blast asks the dictionary while the word is still being traced', () => {
  it('given a word the client dictionary does not know, when it is traced, then its verdict is fetched before release', () => {
    const noop = () => {};
    const { container } = render(
      <BlastGame
        config={{ gridSize: 6, specialTileChance: 0.12, language: 'en' as never, boardClearMode: 'shrink' }}
        mode="multiplayer"
        serverGrid={grid as never}
        blastSeed={12345}
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
    const board = container.querySelector<HTMLElement>('[role="grid"]')!;
    for (const key of ['c', 'a', 't', 's']) fireEvent.keyDown(board, { key });

    expect(mockPrefetch.mock.calls.map(([w]) => String(w).toLowerCase())).toContain('cats');
  });
});
