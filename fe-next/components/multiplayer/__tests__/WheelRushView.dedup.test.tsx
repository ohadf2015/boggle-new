import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { WheelRushView } from '../WheelRushView';

// Regression gate for the "found word shows twice" MP bug. A word can be added
// to `myWords` from two paths: the `wheelWordResult` accept (append) and the
// `wheelRushInit` reconnect-hydration (replace). A duplicate result emission —
// or a buffered result arriving right after a reconnect snapshot — must NOT
// produce two chips for the same word. Each word is unique in the list (the
// stolen/closed handlers mutate the single matching entry in place).

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
    emit: vi.fn(),
    fire: (event: string, ...args: unknown[]) => {
      handlers.get(event)?.forEach(cb => cb(...args));
    },
  };
  return socket as unknown as Socket & { fire: (e: string, ...a: unknown[]) => void };
}

const leaderboard = [{ username: 'alice', score: 0 }];
const PUZZLE = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'E', 'S', 'N'],
  allLetters: ['A', 'C', 'T', 'R', 'E', 'S', 'N'],
};

const countWordChips = (root: HTMLElement, word: string) => {
  const slot = root.querySelector('[data-testid="my-words-slot"]');
  if (!slot) return 0;
  return Array.from(slot.querySelectorAll('span[data-kind]'))
    .filter(c => (c.textContent ?? '').startsWith(word)).length;
};

describe('WheelRushView — my-words dedup (found-word-shows-twice gate)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders a locked word only once when wheelWordResult fires twice for it', () => {
    const socket = makeMockSocket();
    const { container } = render(
      <WheelRushView socket={socket} username="alice" leaderboard={leaderboard} onQuit={vi.fn()} t={(k: string) => k} />,
    );
    act(() => { socket.fire('wheelRushInit', { puzzle: PUZZLE, startedAt: Date.now() }); });
    act(() => { socket.fire('wheelWordResult', { word: 'CAT', accepted: true, kind: 'locked', score: 5 }); });
    // Duplicate emission (socket re-delivery / double subscribe).
    act(() => { socket.fire('wheelWordResult', { word: 'CAT', accepted: true, kind: 'locked', score: 5 }); });

    expect(countWordChips(container, 'CAT')).toBe(1);
  });

  it('does not double a word when a result arrives after a reconnect snapshot hydrated it', () => {
    const socket = makeMockSocket();
    const { container } = render(
      <WheelRushView socket={socket} username="alice" leaderboard={leaderboard} onQuit={vi.fn()} t={(k: string) => k} />,
    );
    // Reconnect: snapshot already lists CAT as one of my words.
    act(() => {
      socket.fire('wheelRushInit', { puzzle: PUZZLE, startedAt: Date.now(), myWords: ['CAT'] });
    });
    expect(countWordChips(container, 'CAT')).toBe(1);
    // A buffered accept for the same word lands right after the snapshot.
    act(() => { socket.fire('wheelWordResult', { word: 'CAT', accepted: true, kind: 'locked', score: 5 }); });

    expect(countWordChips(container, 'CAT')).toBe(1);
  });
});
