/**
 * MP Wheel Rush controls — parity with daily WordWheelGame: the shuffle button
 * is replaced by a "remove last letter" (backspace) button. MP's old shuffle
 * also had a desync bug (it rearranged the wheel without remapping the built
 * word); removing it kills that bug too.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
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
    off: vi.fn((event: string, cb: Handler) => { handlers.get(event)?.delete(cb); return socket; }),
    emit,
    fire: (event: string, ...args: unknown[]) => { handlers.get(event)?.forEach(cb => cb(...args)); },
  };
  return socket as unknown as Socket & { fire: (e: string, ...a: unknown[]) => void; emit: ReturnType<typeof vi.fn> };
}

const tStub = (key: string) => key;
const puzzle = { centerLetter: 'A', outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'], allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'] };

const tap = (selector: string) => {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  fireEvent.click(el);
};

const builtLetterCount = () =>
  screen.queryAllByLabelText(/wordWheel\.tapToRemove/).filter(el => !el.hasAttribute('data-wheel-letter')).length;

const renderView = () => {
  const socket = makeMockSocket();
  render(
    <WheelRushView socket={socket} username="alice" leaderboard={[{ username: 'alice', score: 0 }]} onQuit={vi.fn()} t={tStub} />,
  );
  act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() }); });
  return socket;
};

describe('WheelRushView controls — remove-letter replaces shuffle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no longer renders the shuffle button', () => {
    renderView();
    expect(screen.queryByLabelText('wordWheel.shuffle')).toBeNull();
  });

  it('renders a remove-last-letter button', () => {
    renderView();
    expect(screen.getByLabelText('wordWheel.removeLetter')).toBeInTheDocument();
  });

  it('removes only the last built letter when tapped', () => {
    renderView();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="T"]');
    expect(builtLetterCount()).toBe(3);

    fireEvent.click(screen.getByLabelText('wordWheel.removeLetter'));
    expect(builtLetterCount()).toBe(2);
  });

  it('disables the remove-letter button when nothing is built', () => {
    renderView();
    expect(screen.getByLabelText('wordWheel.removeLetter')).toBeDisabled();
  });
});
