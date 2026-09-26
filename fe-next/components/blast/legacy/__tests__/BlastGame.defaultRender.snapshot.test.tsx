/**
 * Default-render lock for the MP round rebuild's opt-in BlastGame prop
 * (`serverScoredFly`). Quick-play (BlastQuickRound) and solo must render
 * byte-identically without it. Recorded BEFORE the prop was added.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
vi.mock('@/contexts/MusicContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: () => () => {} });
  return { ...actual, useMusic: () => api, useMusicSafe: () => api };
});

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => true, isLoaded: true }),
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

function snap(ui: React.ReactElement): string {
  const { container, unmount } = render(ui);
  act(() => {});
  if (container.querySelector('[data-testid="blast-loading"]')) throw new Error('snapshot must cover the live board, not the loader');
  const html = container.innerHTML;
  unmount();
  return html;
}

describe('BlastGame default render (no MP opt-in props)', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });
  afterEach(() => vi.restoreAllMocks());

  it('quick-play blast board is unchanged', () => {
    const noop = () => {};
    expect(
      snap(
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
      ),
    ).toMatchSnapshot();
  });
});
