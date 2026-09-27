import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { WHEEL_RUSH_FOG_MS } from '@/shared/constants/wheelRushConstants';

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

  it('unmasks opponent scores after fog window expires', () => {
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
            { username: 'bob', score: 42 },
          ]}
          onQuit={vi.fn()}
          t={tStub}
        />,
      );
      act(() => {
        socket.fire('wheelRushInit', { puzzle, startedAt: start });
      });
      // During fog: bob's score is masked
      expect(screen.getByText('???')).toBeTruthy();

      // Advance past fog window
      act(() => {
        vi.setSystemTime(start + WHEEL_RUSH_FOG_MS + 500);
        vi.advanceTimersByTime(WHEEL_RUSH_FOG_MS + 500);
      });

      // After fog: bob's real score is visible, no more ???
      expect(screen.queryByText('???')).toBeNull();
      expect(screen.getByText('42')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
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

  // Parity with SP WordWheelGame: each wheel index appears in the built word at most
  // once. Re-tapping a used letter must REMOVE it (toggle off), never add a second copy.
  it('tapping a wheel letter twice toggles it off (parity with SP)', () => {
    const socket = makeMockSocket();
    const { container } = render(
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

    const cBtn = container.querySelector<HTMLButtonElement>('[data-wheel-letter="C"]');
    expect(cBtn).toBeTruthy();

    // First tap → C is added.
    act(() => { fireEvent.click(cBtn!); });
    expect(container.querySelectorAll('[data-testid="built-letter-tile"]').length).toBe(1);

    // Second tap on the same wheel letter → C is removed (toggle), not duplicated.
    act(() => { fireEvent.click(cBtn!); });
    expect(container.querySelectorAll('[data-testid="built-letter-tile"]').length).toBe(0);
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
    // The message renders twice by design: the visible feedback pill and the
    // sr-only aria-live region that mirrors it for screen readers.
    expect(screen.getAllByText(/wordWheel\.notInDictionary/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^not-a-word$/)).toBeNull();
  });

  it('does not re-register socket listeners when puzzle is set after wheelRushInit', () => {
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
    const onMock = socket.on as ReturnType<typeof vi.fn>;
    const beforeInit = onMock.mock.calls.length;

    // wheelRushInit transitions puzzle null→object. Listener effect must NOT re-run.
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });

    const afterInit = onMock.mock.calls.length;
    expect(afterInit - beforeInit).toBe(0);
  });

  it('drops the animate-pulse class on the fog dot when prefers-reduced-motion is set', () => {
    mockReducedMotion = true;
    try {
      const socket = makeMockSocket();
      const { container } = render(
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
      const dot = container.querySelector('.bg-neo-cyan');
      expect(dot).toBeTruthy();
      expect(dot?.className.includes('animate-pulse')).toBe(false);
    } finally {
      mockReducedMotion = false;
    }
  });

  it('observes the wheel container with ResizeObserver instead of window resize', () => {
    const ctorSpy = vi.fn();
    const observeSpy = vi.fn();
    class TrackedRO {
      constructor(cb: ResizeObserverCallback) { ctorSpy(cb); }
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    const original = (global as unknown as { ResizeObserver: unknown }).ResizeObserver;
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = TrackedRO;
    try {
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
      expect(ctorSpy).toHaveBeenCalled();
      // observe should be called with an Element (the wheel container)
      expect(observeSpy).toHaveBeenCalled();
      const observed = observeSpy.mock.calls[0]?.[0];
      expect(observed).toBeInstanceOf(Element);
    } finally {
      (global as unknown as { ResizeObserver: unknown }).ResizeObserver = original;
    }
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

it('renders the round-timer countdown when remainingTime prop is provided', () => {
    const socket = makeMockSocket();
    render(
      <WheelRushView
        socket={socket}
        username="alice"
        leaderboard={[{ username: 'alice', score: 0 }]}
        onQuit={vi.fn()}
        t={tStub}
        remainingTime={75}
      />,
    );
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });
    expect(screen.getByText('1:15')).toBeTruthy();
  });

  it('hides the round-timer when remainingTime prop is null', () => {
    const socket = makeMockSocket();
    render(
      <WheelRushView
        socket={socket}
        username="alice"
        leaderboard={[{ username: 'alice', score: 0 }]}
        onQuit={vi.fn()}
        t={tStub}
        remainingTime={null}
      />,
    );
    act(() => {
      socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() });
    });
    expect(screen.queryByTestId('wheel-rush-timer')).toBeNull();
  });

  it('emits submitWheelWord on pointer-up after dragging across ≥3 letters', () => {
    const socket = makeMockSocket();
    const { container } = render(
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

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-wheel-letter]'),
    );
    const byLetter = (l: string) =>
      buttons.find(b => (b.dataset.wheelLetter || '').toUpperCase() === l)!;
    const C = byLetter('C');
    const A = byLetter('A');
    const R = byLetter('R');
    expect(C && A && R).toBeTruthy();

    const wheelDiv = container.querySelector<HTMLDivElement>('div.touch-none')!;
    const queue: HTMLElement[] = [C, A, R];
    const efp = vi.spyOn(document, 'elementFromPoint').mockImplementation(() => queue.shift() || null);

    try {
      fireEvent.pointerDown(wheelDiv, { clientX: 0, clientY: 0 });
      fireEvent.pointerMove(wheelDiv, { clientX: 1, clientY: 1 });
      fireEvent.pointerMove(wheelDiv, { clientX: 2, clientY: 2 });
      fireEvent.pointerUp(wheelDiv, { clientX: 2, clientY: 2 });
    } finally {
      efp.mockRestore();
    }

    expect(socket.emit).toHaveBeenCalledWith('submitWheelWord', { word: 'CAR' });
  });

  it('calls onFogProgressChange with progress in (0,1) while fog is active', () => {
    vi.useFakeTimers();
    try {
      const start = 1_700_000_000_000;
      vi.setSystemTime(start);
      const socket = makeMockSocket();
      const onFogProgressChange = vi.fn();
      render(
        <WheelRushView
          socket={socket}
          username="alice"
          leaderboard={[{ username: 'alice', score: 0 }]}
          onQuit={vi.fn()}
          t={tStub}
          onFogProgressChange={onFogProgressChange}
        />,
      );
      act(() => {
        socket.fire('wheelRushInit', { puzzle, startedAt: start });
      });
      act(() => {
        vi.setSystemTime(start + 250);
        vi.advanceTimersByTime(250);
      });
      expect(onFogProgressChange).toHaveBeenCalled();
      const progress = onFogProgressChange.mock.calls.at(-1)![0] as number;
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('calls onFogProgressChange(0) once fog expires', () => {
    vi.useFakeTimers();
    try {
      const start = 1_700_000_000_000;
      vi.setSystemTime(start);
      const socket = makeMockSocket();
      const onFogProgressChange = vi.fn();
      render(
        <WheelRushView
          socket={socket}
          username="alice"
          leaderboard={[{ username: 'alice', score: 0 }]}
          onQuit={vi.fn()}
          t={tStub}
          onFogProgressChange={onFogProgressChange}
        />,
      );
      act(() => {
        socket.fire('wheelRushInit', { puzzle, startedAt: start });
      });
      act(() => {
        vi.setSystemTime(start + WHEEL_RUSH_FOG_MS + 500);
        vi.advanceTimersByTime(WHEEL_RUSH_FOG_MS + 500);
      });
      const lastProgress = onFogProgressChange.mock.calls.at(-1)![0] as number;
      expect(lastProgress).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
