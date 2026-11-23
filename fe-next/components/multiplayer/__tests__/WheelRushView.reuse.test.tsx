import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

function setup() {
  const socket = makeMockSocket();
  const utils = render(
    <WheelRushView socket={socket} username="alice" leaderboard={[{ username: 'alice', score: 0 }]} onQuit={vi.fn()} t={tStub} />,
  );
  act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() }); });
  socket.emit.mockClear();
  const letter = (l: string) => utils.container.querySelector<HTMLButtonElement>(`[data-wheel-letter="${l}"]`)!;
  const tiles = () => utils.container.querySelectorAll('[data-testid="built-letter-tile"]').length;
  const tap = (l: string) => { act(() => { vi.advanceTimersByTime(600); fireEvent.click(letter(l)); }); };
  return { socket, letter, tiles, tap };
}

describe('WheelRushView reuses the daily wheel input', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('Given three letters built, When a fourth letter is held, Then the word is submitted (hold-to-submit)', () => {
    const { socket, letter, tap } = setup();
    tap('C'); tap('R'); tap('A');

    act(() => { fireEvent.pointerDown(letter('N')); });
    act(() => { vi.advanceTimersByTime(900); });

    expect(socket.emit).toHaveBeenCalledWith('submitWheelWord', { word: 'CRAN' });
  });

  it('Given letters built, When backspace is held, Then the whole word clears', () => {
    const { tiles, tap } = setup();
    tap('C'); tap('R'); tap('A');
    expect(tiles()).toBe(3);

    const back = screen.getByRole('button', { name: 'wordWheel.removeLetter' });
    act(() => { fireEvent.pointerDown(back); vi.advanceTimersByTime(500); });
    act(() => { fireEvent.click(back); });

    expect(tiles()).toBe(0);
  });
});
