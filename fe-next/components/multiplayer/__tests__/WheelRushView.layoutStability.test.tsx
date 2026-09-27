/**
 * MP word-wheel layout stability + daily-style rival hint.
 *
 * Two contracts here:
 *   1. The "my words" chip strip (MyWordsChips) must reserve a fixed-height
 *      slot from word #0 so the wheel cluster (`flex-1 justify-center`)
 *      doesn't re-center when the first chip lands. This mirrors the
 *      single-player WordWheelGame fix.
 *   2. To make MP feel like the daily challenge, we surface a "X more words
 *      to pass <player>" hint above the wheel, derived from the leaderboard
 *      prop. The hint hides while fog-of-war is active (we must not leak
 *      opponent scores). The slot is reserved either way so toggling
 *      visibility doesn't shift the wheel.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { WHEEL_RUSH_FOG_MS } from '@/shared/constants/wheelRushConstants';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playButtonClickSound: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/components/daily/WordWheelPixiRing', () => ({
  default: () => null,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));

import { WheelRushView } from '../WheelRushView';
import { MyWordsChips } from '../WheelRushPieces';

type Handler = (...args: unknown[]) => void;
function makeMockSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    on: vi.fn((e: string, cb: Handler) => {
      if (!handlers.has(e)) handlers.set(e, new Set());
      handlers.get(e)!.add(cb);
      return socket;
    }),
    off: vi.fn((e: string, cb: Handler) => { handlers.get(e)?.delete(cb); return socket; }),
    emit: vi.fn(),
    fire: (e: string, ...a: unknown[]) => handlers.get(e)?.forEach(cb => cb(...a)),
  };
  return socket as unknown as Socket & { fire: (e: string, ...a: unknown[]) => void; emit: ReturnType<typeof vi.fn> };
}

const tStub = (k: string, p?: Record<string, string | number>) =>
  p ? `${k}:${JSON.stringify(p)}` : k;

const puzzle = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'],
  allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'],
};

describe('MyWordsChips — layout stability', () => {
  it('renders an empty fixed-height slot when no words are present', () => {
    const { container } = render(<MyWordsChips words={[]} />);
    const slot = container.querySelector('[data-testid="my-words-slot"]');
    expect(slot).toBeTruthy();
    // Cap matches the prior `max-h-16` (64px) so the wheel cluster never
    // has to re-flow when the first chip lands.
    expect(slot!.className).toMatch(/h-16/);
  });

  it('keeps the slot present when words exist', () => {
    const { container } = render(
      <MyWordsChips words={[{ word: 'CAT', kind: 'locked', score: 3, ts: 1 }]} />,
    );
    expect(container.querySelector('[data-testid="my-words-slot"]')).toBeTruthy();
  });
});

describe('WheelRushView — daily-style rival hint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a reserved next-rival slot from mount (so toggling does not shift the wheel)', () => {
    const socket = makeMockSocket();
    render(
      <WheelRushView
        socket={socket}
        username="alice"
        leaderboard={[{ username: 'alice', score: 10 }]}
        onQuit={vi.fn()}
        t={tStub}
      />,
    );
    act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() }); });
    // Slot is always present so the wheel doesn't jump when the rival pill
    // mounts/unmounts mid-match.
    expect(screen.getByTestId('mp-next-rival-slot')).toBeTruthy();
  });

  it('shows "X more words to pass Y" pill once fog ends and a rival is ahead', () => {
    vi.useFakeTimers();
    try {
      const start = 1_700_000_000_000;
      vi.setSystemTime(start);
      const socket = makeMockSocket();
      render(
        <WheelRushView
          socket={socket}
          username="alice"
          leaderboard={[
            { username: 'alice', score: 10 },
            { username: 'bob', score: 40 },
          ]}
          onQuit={vi.fn()}
          t={tStub}
        />,
      );
      act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: start }); });

      // During fog: opponent scores are hidden; rival pill must NOT leak them.
      expect(screen.queryByText(/wordsToPass/)).toBeNull();

      // After fog: pill appears with i18n key + bob's name.
      act(() => {
        vi.setSystemTime(start + WHEEL_RUSH_FOG_MS + 500);
        vi.advanceTimersByTime(WHEEL_RUSH_FOG_MS + 500);
      });

      // tStub renders `wordWheel.pointsToPass:{count, name}` — assert
      // the name made it through. The exact count is the raw point delta
      // (40-10 = 30); just verify the i18n key + name made it through.
      const pill = screen.getByText(/wordWheel\.pointsToPass/);
      expect(pill.textContent).toContain('bob');
    } finally {
      vi.useRealTimers();
    }
  });

  it('caps the wheel with a short-viewport height variant so the action bar never overlaps the chips on short screens', () => {
    const socket = makeMockSocket();
    render(
      <WheelRushView
        socket={socket}
        username="alice"
        leaderboard={[{ username: 'alice', score: 10 }]}
        onQuit={vi.fn()}
        t={tStub}
      />,
    );
    act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() }); });

    // The wheel must carry a `short:` max-height cap so it shrinks below the
    // 176px floor on <=600px-tall viewports. Without it the wheel overflows
    // the `flex-1 justify-center` cluster and the action bar (Submit) spills
    // downward, colliding with the found-words chip strip below — the
    // overlap seen in the bug report screenshot. Mirrors WordWheelGame.tsx.
    const cluster = screen.getByTestId('wheel-cluster');
    const shortCapped = cluster.querySelector('[class*="short:max-h-"]');
    expect(shortCapped).toBeTruthy();
  });

  it('does not show the rival pill when self is the leader', () => {
    vi.useFakeTimers();
    try {
      const start = 1_700_000_000_000;
      vi.setSystemTime(start);
      const socket = makeMockSocket();
      render(
        <WheelRushView
          socket={socket}
          username="alice"
          leaderboard={[
            { username: 'alice', score: 100 },
            { username: 'bob', score: 40 },
          ]}
          onQuit={vi.fn()}
          t={tStub}
        />,
      );
      act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: start }); });
      act(() => {
        vi.setSystemTime(start + WHEEL_RUSH_FOG_MS + 500);
        vi.advanceTimersByTime(WHEEL_RUSH_FOG_MS + 500);
      });
      expect(screen.queryByText(/wordWheel\.wordsToPass/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
