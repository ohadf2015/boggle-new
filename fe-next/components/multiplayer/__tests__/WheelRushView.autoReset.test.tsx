/**
 * MP Wheel Rush — auto-reset on rejected word (parity with daily WordWheelGame).
 *
 * UX: when a built word is SENT and comes back incorrect (server rejection or
 * client-side validation failure), the built letters auto-clear so the next
 * attempt starts fresh — the player never has to hit Clear manually. Tap-mode
 * keeps the letters on screen for a ~1.5s read window before wiping; a fresh
 * tap during that window cancels the pending reset (no mid-typing wipe).
 *
 * This mirrors components/daily/__tests__/WordWheelGame.autoResetOnError.test.tsx
 * so the two Word Wheel surfaces stay behaviourally identical.
 */
import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io-client';

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

const tap = (selector: string) => {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  fireEvent.click(el);
};

// WordTile renders one button per built letter, each aria-labelled
// `wordWheel.tapToRemove`. The wheel's own used letters also carry that label,
// so restrict the count to WordTile buttons (no wheel data attr).
const builtLetterCount = () =>
  screen.queryAllByLabelText(/wordWheel\.tapToRemove/).filter(el => !el.hasAttribute('data-wheel-letter')).length;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const renderView = () => {
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
};

const buildCat = () => {
  tap('[data-wheel-letter="C"]');
  tap('[data-wheel-letter="A"]'); // center
  tap('[data-wheel-letter="T"]');
};

const clickSubmit = () => {
  const btn = screen.getByText('wordWheel.submit').closest('button')!;
  act(() => { fireEvent.click(btn); });
};

describe('WheelRushView auto-reset after rejected word (parity with daily)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('auto-clears the built word ~1.5s after a SERVER rejection (tap mode)', async () => {
    const socket = renderView();

    buildCat();
    expect(builtLetterCount()).toBe(3);

    clickSubmit();
    expect(socket.emit).toHaveBeenCalledWith('submitWheelWord', { word: 'CAT' });

    // Server says the word is invalid.
    act(() => { socket.fire('wheelWordResult', { word: 'CAT', accepted: false, error: 'NOT_A_WORD' }); });

    // Letters linger briefly so the error is readable.
    await act(async () => { await sleep(1200); });
    expect(builtLetterCount()).toBe(3);

    // After the 1.5s window the builder auto-clears with no manual Clear tap.
    await waitFor(() => { expect(builtLetterCount()).toBe(0); }, { timeout: 1200 });
  }, 6000);

  it('auto-clears after a CLIENT-side rejection (word missing the center letter)', async () => {
    renderView();

    // C, T, R — three letters, no center 'A' → handleSubmit rejects locally.
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="T"]');
    tap('[data-wheel-letter="R"]');
    expect(builtLetterCount()).toBe(3);

    clickSubmit();

    await waitFor(() => { expect(builtLetterCount()).toBe(0); }, { timeout: 2200 });
  }, 6000);

  it('cancels the pending auto-reset when the player taps a fresh letter mid-window', async () => {
    const socket = renderView();

    buildCat();
    clickSubmit();
    act(() => { socket.fire('wheelWordResult', { word: 'CAT', accepted: false, error: 'NOT_A_WORD' }); });
    expect(builtLetterCount()).toBe(3);

    // 0.8s into the 1.5s window the player taps a new letter to retry.
    await act(async () => { await sleep(800); });
    tap('[data-wheel-letter="S"]');

    // Past the original 1.5s mark the builder must still hold letters
    // (the fresh tap cancelled the pending reset).
    await act(async () => { await sleep(1000); });
    expect(builtLetterCount()).toBeGreaterThan(0);
  }, 6000);
});
