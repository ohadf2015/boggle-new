import React from 'react';
import { render, act } from '@testing-library/react';

const { idleEnabled } = vi.hoisted(() => ({ idleEnabled: [] as boolean[] }));

vi.mock('@/contexts/MusicContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: () => () => {} });
  return { ...actual, useMusic: () => api, useMusicSafe: () => api };
});
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: false, retry: () => {} }),
}));
vi.mock('@/hooks/useIdleDetection', () => ({
  useIdleDetection: (opts: { enabled: boolean }) => {
    idleEnabled.push(opts.enabled);
    return { reportActivity: () => {} };
  },
}));
vi.mock('@/contexts/AdMobContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: (_t, k) => (k === 'isNative' || k === 'isReady' ? false : () => {}) });
  return { ...actual, useAdMobContext: () => api };
});

import { BlastGame } from '../BlastGame';

const grid = Array.from({ length: 6 }, () => ['C', 'A', 'T', 'S', 'E', 'R']);

describe('Blast idle detection while the board is loading', () => {
  it('given the dictionary is still loading, the idle timer stays off so loading is not reported as dead time', () => {
    const noop = () => {};
    render(
      <BlastGame
        config={{ gridSize: 6, specialTileChance: 0.12, language: 'es' as never, boardClearMode: 'shrink' }}
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
    expect(idleEnabled.length).toBeGreaterThan(0);
    expect(idleEnabled.every((e) => e === false)).toBe(true);
  });
});
