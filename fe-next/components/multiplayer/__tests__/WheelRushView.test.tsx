import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { Socket } from 'socket.io-client';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playButtonClickSound: vi.fn(),
    playBoardShuffleSound: vi.fn(),
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
  isValidWordWheelWord: (word: string, center: string, all: string[]) => {
    const allSet = new Set(all.map(l => l.toUpperCase()));
    return word.toUpperCase().split('').every(c => allSet.has(c))
      && word.toUpperCase().includes(center.toUpperCase());
  },
}));

import { WheelRushView } from '../WheelRushView';

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
  return socket as unknown as Socket & { fire: (e: string, ...a: unknown[]) => void; emit: ReturnType<typeof vi.fn> };
}

const tStub = (key: string) => key;

const puzzle = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'],
  allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'],
};

describe('WheelRushView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state before wheelRushInit fires', () => {
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
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it('requests state on mount and renders letters after init', () => {
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
    expect(socket.emit).toHaveBeenCalledWith('requestWheelRushState');

    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });

    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
  });

  it('fog-of-war masks opponent scores during fog window', () => {
    const socket = makeMockSocket();
    render(
      <WheelRushView
        socket={socket}
        username="alice"
        leaderboard={[
          { username: 'alice', score: 10 },
          { username: 'bob', score: 42 },
        ]}
        onQuit={vi.fn()}
        t={tStub}
      />,
    );
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });
    expect(screen.getByText('bob')).toBeTruthy();
    expect(screen.getByText('???')).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('calls onQuit when quit button clicked', () => {
    const socket = makeMockSocket();
    const onQuit = vi.fn();
    render(
      <WheelRushView
        socket={socket}
        username="alice"
        leaderboard={[{ username: 'alice', score: 0 }]}
        onQuit={onQuit}
        t={tStub}
      />,
    );
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });
    fireEvent.click(screen.getByRole('button', { name: /quit/i }));
    expect(onQuit).toHaveBeenCalled();
  });

  it('emits submitWheelWord via keyboard Enter after typing a valid word', () => {
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
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });
    socket.emit.mockClear();

    // Type CRANE (5 letters ≥ server min 4, center A, letters all present)
    act(() => { fireEvent.keyDown(window, { key: 'C' }); });
    act(() => { fireEvent.keyDown(window, { key: 'R' }); });
    act(() => { fireEvent.keyDown(window, { key: 'A' }); });
    act(() => { fireEvent.keyDown(window, { key: 'N' }); });
    act(() => { fireEvent.keyDown(window, { key: 'E' }); });
    act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });

    expect(socket.emit).toHaveBeenCalledWith('submitWheelWord', { word: 'CRANE' });
  });

  it('rejects 2-letter word locally without emitting (matches server min 3)', () => {
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
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });
    socket.emit.mockClear();

    act(() => { fireEvent.keyDown(window, { key: 'C' }); });
    act(() => { fireEvent.keyDown(window, { key: 'A' }); });
    act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });

    expect(socket.emit).not.toHaveBeenCalledWith('submitWheelWord', expect.anything());
  });

  it('maps server error codes to translation keys instead of showing raw codes', () => {
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
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });

    act(() => {
      socket.fire('wheelWordResult', { word: 'XYZW', accepted: false, error: 'not-a-word' });
    });
    expect(screen.getByText(/wordWheel\.notInDictionary/)).toBeTruthy();
    expect(screen.queryByText(/^not-a-word$/)).toBeNull();
  });

  it('does not render QuickReactions picker in-game', () => {
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
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });
    expect(screen.queryByRole('button', { name: /reactions\.label/i })).toBeNull();
  });

it('marks word as stolen-from-me when wheelWordStolen targets self', () => {
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
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });

    // Alice locks CRANE
    act(() => {
      socket.fire('wheelWordResult', {
        word: 'CRANE', accepted: true, kind: 'locked', score: 15, lockUntil: Date.now() + 3000,
      });
    });
    expect(screen.getByText(/CRANE/)).toBeTruthy();

    // Bob steals it from Alice
    act(() => {
      socket.fire('wheelWordStolen', { word: 'CRANE', by: 'bob', from: 'alice' });
    });

    // Chip should now reflect stolen-from-me state (red variant renders with data-kind)
    const chip = screen.getByText(/CRANE/);
    expect(chip.className).toMatch(/neo-red|bg-neo-red/);
  });
});
