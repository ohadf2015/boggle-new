/** Wheel Rush runs the shared stuck coach: wheel copy, legacy event, old flag respected. */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  useLanguage: () => ({ t: (k: string, fallback?: string) => fallback ?? k, language: 'en', dir: 'ltr' }),
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

const ftueSpy = vi.fn();
vi.mock('@/utils/posthogEngagement', async () => {
  const actual = await vi.importActual<typeof import('@/utils/posthogEngagement')>('@/utils/posthogEngagement');
  return { ...actual, trackMpFtue: (...a: unknown[]) => ftueSpy(...a) };
});

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

const renderView = () => {
  const socket = makeMockSocket();
  render(
    <WheelRushView socket={socket} username="alice" leaderboard={[{ username: 'alice', score: 0 }]} onQuit={vi.fn()} t={tStub} />,
  );
  act(() => { socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() }); });
  return socket;
};

describe('WheelRushView stuck coach', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    ftueSpy.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the shared wheel coach to an idle new player and keeps the legacy shown event', () => {
    renderView();
    act(() => { vi.advanceTimersByTime(13_000); });
    expect(screen.getByTestId('mp-stuck-coach-card').textContent).toMatch(/center letter/i);
    expect(ftueSpy).toHaveBeenCalledWith({ event: 'shown', mode: 'wheel_rush' });
  });

  it('tapping letters restarts the idle clock', () => {
    renderView();
    act(() => { vi.advanceTimersByTime(8_000); });
    tap('[data-wheel-letter="C"]');
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(screen.queryByTestId('mp-stuck-coach-card')).toBeNull();
  });

  it('stays silent for a player the old coachmark already taught', () => {
    localStorage.setItem('mp_ftue_drag_v1', 'dismissed');
    renderView();
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.queryByTestId('mp-stuck-coach-card')).toBeNull();
  });
});
