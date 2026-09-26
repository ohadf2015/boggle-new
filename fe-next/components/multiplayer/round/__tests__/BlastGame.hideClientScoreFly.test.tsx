/**
 * BlastGame's MP opt-in `hideClientScoreFly` (default off): the client
 * engine's "+N" fly is switched off so the ROUND overlay (MpServerScoreFly)
 * shows the server's `wordAccepted.score` instead. Solo/quick-play keep the
 * fly (default render lock: blast/legacy/__tests__/BlastGame.defaultRender).
 */
import React from 'react';
import { render, act, screen } from '@testing-library/react';

const captured = vi.hoisted(() => ({ setScoreFlyEvents: null as null | ((fn: (p: unknown[]) => unknown[]) => void) }));

vi.mock('@/components/blast/legacy/hooks/useBlastWordHandler', () => ({
  useBlastWordHandler: (params: { effects: { setScoreFlyEvents: typeof captured.setScoreFlyEvents } }) => {
    captured.setScoreFlyEvents = params.effects.setScoreFlyEvents;
    return { handleWordAccepted: () => {} };
  },
}));
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

import { BlastGame } from '@/components/blast/legacy/BlastGame';

const grid = [
  ['C', 'A', 'T', 'S', 'E', 'R'],
  ['D', 'O', 'G', 'E', 'N', 'T'],
  ['R', 'A', 'T', 'E', 'S', 'O'],
  ['B', 'I', 'R', 'D', 'A', 'L'],
  ['M', 'O', 'O', 'N', 'I', 'P'],
  ['S', 'T', 'A', 'R', 'E', 'D'],
];

function renderBlast(extra: { hideClientScoreFly?: boolean } = {}) {
  const noop = () => {};
  render(
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
      {...extra}
    />,
  );
  // A client-computed fly (engine total 999) — what the word handler pushes.
  act(() => {
    captured.setScoreFlyEvents!((prev) => [...prev, { id: 'fly-1', score: 999, startX: 50, startY: 50, tier: 1 }]);
  });
}

describe('BlastGame hideClientScoreFly (MP opt-in)', () => {
  it('default: the client "+N" fly shows (solo / quick-play unchanged)', () => {
    renderBlast();
    expect(screen.getByTestId('blast-effects-layer').textContent).toContain('999');
  });

  it('opted in: the client-computed number never shows', () => {
    renderBlast({ hideClientScoreFly: true });
    expect(screen.getByTestId('blast-effects-layer').textContent).not.toContain('999');
  });
});
