import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';

const { legendarySpy, fireConfettiSpy } = vi.hoisted(() => ({
  legendarySpy: vi.fn(),
  fireConfettiSpy: vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playButtonClickSound: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playLegendaryWordSound: legendarySpy,
  }),
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/components/daily/WordWheelPixiRing', () => ({ default: () => null }));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: fireConfettiSpy }));

import { WheelRushView } from '../WheelRushView';

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
  return socket as unknown as Socket & { fire: (e: string, ...a: unknown[]) => void };
}

const tStub = (k: string) => k;
const puzzle = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'],
  allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'],
};

function renderView() {
  const socket = makeMockSocket();
  render(
    <WheelRushView
      socket={socket}
      username="alice"
      leaderboard={[{ username: 'alice', score: 0 }]}
      onQuit={vi.fn()}
      t={tStub}
    />,
  );
  act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() }); });
  return socket;
}

describe('WheelRushView — wheel-coverage celebration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('celebrates when an accepted word uses every distinct wheel letter', () => {
    const socket = renderView();
    act(() => {
      socket.fire('wheelWordResult', { word: 'CANTERS', accepted: true, kind: 'locked', score: 60 });
    });
    const banner = screen.getByTestId('wheel-celebration');
    expect(banner.getAttribute('data-tier')).toBe('all');
    expect(fireConfettiSpy).toHaveBeenCalled();
    expect(legendarySpy).toHaveBeenCalled();
  });

  it('celebrates (almost) when an accepted word uses all-but-one wheel letter', () => {
    const socket = renderView();
    act(() => {
      socket.fire('wheelWordResult', { word: 'CANTER', accepted: true, kind: 'locked', score: 40 });
    });
    expect(screen.getByTestId('wheel-celebration').getAttribute('data-tier')).toBe('almost');
  });

  it('does NOT celebrate an ordinary word below the coverage threshold', () => {
    const socket = renderView();
    act(() => {
      socket.fire('wheelWordResult', { word: 'CRANE', accepted: true, kind: 'locked', score: 15 });
    });
    expect(screen.queryByTestId('wheel-celebration')).toBeNull();
    expect(fireConfettiSpy).not.toHaveBeenCalled();
  });

  it('does NOT celebrate a rejected word', () => {
    const socket = renderView();
    act(() => {
      socket.fire('wheelWordResult', { word: 'CANTERS', accepted: false, error: 'not-a-word' });
    });
    expect(screen.queryByTestId('wheel-celebration')).toBeNull();
    expect(fireConfettiSpy).not.toHaveBeenCalled();
  });
});
