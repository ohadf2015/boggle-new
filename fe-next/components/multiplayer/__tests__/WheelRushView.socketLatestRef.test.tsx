import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { WheelRushView } from '../WheelRushView';

// --- Characterization / golden-master gate for the React-Compiler un-bail refactor.
// WheelRushView binds its socket listeners ONCE (effect deps [socket, flash]) and reads
// latest props (t, puzzle, username, sound fns) inside those once-bound handlers via the
// `latestRef` write-during-render bridge (WheelRushView.tsx:165-166, read at :312/:335).
//
// That ref-write-during-render is what makes React Compiler BAIL on this component
// (react-doctor `refs` errors L166/L169). The blessed fix is `useEffectEvent`. This test
// pins the two behaviors the bridge protects so the refactor cannot regress them:
//   A) listeners register exactly once across prop-driven re-renders (no re-subscribe storm)
//   B) the once-bound handler reads the LATEST prop values, not the values at mount
// Both MUST stay green before and after the refactor.

let mockReducedMotion = false;
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => mockReducedMotion };
});

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

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/components/daily/WordWheelPixiRing', () => ({ default: () => null }));

type Handler = (...args: unknown[]) => void;

function makeMockSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const emit = vi.fn();
  const socket = {
    on: vi.fn((event: string, cb: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(cb);
      return socket;
    }),
    off: vi.fn((event: string, cb: Handler) => {
      handlers.get(event)?.delete(cb);
      return socket;
    }),
    emit,
    fire: (event: string, ...args: unknown[]) => {
      handlers.get(event)?.forEach(cb => cb(...args));
    },
  };
  return socket as unknown as Socket & {
    fire: (e: string, ...a: unknown[]) => void;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
}

const leaderboard = [{ username: 'alice', score: 0 }];

function countCalls(fn: ReturnType<typeof vi.fn>, event: string) {
  return fn.mock.calls.filter((c: unknown[]) => c[0] === event).length;
}

describe('WheelRushView — socket latest-value bridge (compiler un-bail gate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('A) registers each wheel listener exactly once across prop-driven re-renders', () => {
    const socket = makeMockSocket();
    const { rerender } = render(
      <WheelRushView socket={socket} username="alice" leaderboard={leaderboard} onQuit={vi.fn()} t={(k: string) => k} />,
    );

    // Re-render with NEW prop identities (new t, new leaderboard array, changed username).
    // None of these are in the socket effect's dep array, so listeners must NOT re-bind.
    act(() => {
      rerender(
        <WheelRushView socket={socket} username="alice2" leaderboard={[...leaderboard]} onQuit={vi.fn()} t={(k: string) => `x:${k}`} />,
      );
    });

    for (const ev of ['wheelRushInit', 'wheelWordResult']) {
      expect(countCalls(socket.on, ev)).toBe(1);
      expect(countCalls(socket.off, ev)).toBe(0); // no unbind churn between renders
    }
  });

  it('B) the once-bound onResult handler reads the LATEST t prop, not the mount-time t', () => {
    const tMount = vi.fn((k: string) => k);
    const socket = makeMockSocket();
    const { rerender } = render(
      <WheelRushView socket={socket} username="alice" leaderboard={leaderboard} onQuit={vi.fn()} t={tMount} />,
    );

    const tLatest = vi.fn((k: string) => k);
    act(() => {
      rerender(
        <WheelRushView socket={socket} username="alice" leaderboard={leaderboard} onQuit={vi.fn()} t={tLatest} />,
      );
    });

    tMount.mockClear();
    tLatest.mockClear();

    // Fire a rejection — onResult (bound once, at mount when t===tMount) builds an error
    // message via latestRef.current.t. If the bridge works it uses tLatest; if a refactor
    // captured t directly it would wrongly call tMount.
    act(() => {
      socket.fire('wheelWordResult', { word: 'ZZZZ', accepted: false, error: 'NOT_IN_DICTIONARY' });
    });

    expect(tLatest).toHaveBeenCalled();
    expect(tMount).not.toHaveBeenCalled();
  });
});
