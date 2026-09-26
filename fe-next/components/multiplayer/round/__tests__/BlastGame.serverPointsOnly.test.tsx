/**
 * BlastGame's MP opt-in `serverPointsOnly` (default off): every point blast
 * shows comes from the server. The client engine's "+N" fly is off (the ROUND
 * overlay MpServerScoreFly shows `wordAccepted.score`), the word pill drops its
 * client "+N". (The MP HUD score already reads the leaderboard — asserted
 * here so it stays that way.) Solo and quick-play keep both client numbers
 * (default render lock:
 * blast/legacy/__tests__/BlastGame.defaultRender).
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
// The word pill's feedback as the client computes it: accepted, engine total 777.
vi.mock('@/components/singleplayer/game/hooks/useWordSubmission', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/singleplayer/game/hooks/useWordSubmission')>();
  return {
    ...actual,
    useWordSubmission: (...args: Parameters<typeof actual.useWordSubmission>) => ({
      ...actual.useWordSubmission(...args),
      currentFeedback: { id: 'fb-1', type: 'accepted', word: 'CATS', score: 777 },
    }),
  };
});
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

function renderBlast(extra: { serverPointsOnly?: boolean } = {}) {
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
      leaderboard={[{ username: 'you', score: 42 }, { username: 'bot', score: 5 }]}
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

const hudScore = () => screen.getByLabelText(/blast\.score|score/i, { selector: '[aria-label]' }).getAttribute('aria-label');

describe('BlastGame serverPointsOnly (MP opt-in)', () => {
  it('default: client fly and client pill points (solo / quick-play unchanged)', () => {
    renderBlast();
    expect(screen.getByTestId('blast-effects-layer').textContent).toContain('999');
    expect(document.body.textContent).toContain('+777');
  });

  it('opted in: no client-computed number anywhere; the HUD shows my server score', () => {
    renderBlast({ serverPointsOnly: true });
    expect(screen.getByTestId('blast-effects-layer').textContent).not.toContain('999');
    expect(document.body.textContent).not.toContain('+777');
    expect(hudScore()).toMatch(/42$/);
  });
});
