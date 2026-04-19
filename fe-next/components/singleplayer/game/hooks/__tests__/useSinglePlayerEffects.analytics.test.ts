/**
 * useSinglePlayerEffects — game_started tracking
 *
 * When the SP game view mounts, we must fire `trackGameStart('singleplayer',
 * { subMode, boardSize })` so the PostHog funnel records every SP session
 * start keyed by sub-variant (practice/classic/solo-bots/…) and grid dim.
 * `mode` (canonical, top-level) is injected by trackGameStart itself.
 *
 * Fires exactly once per hook instance (mount-only). Must not re-fire on
 * grid changes, mode changes, or re-renders — each SP game is one
 * component instance, and start_count inflation would corrupt the funnel.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LetterGrid } from '@/shared/types/game';

const trackGameStart = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
}));

import { useSinglePlayerEffects } from '../useSinglePlayerEffects';

const grid4: LetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const grid5: LetterGrid = [
  ['A', 'B', 'C', 'D', 'E'],
  ['F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O'],
  ['P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y'],
];

function baseOptions(overrides: Partial<Parameters<typeof useSinglePlayerEffects>[0]> = {}): Parameters<typeof useSinglePlayerEffects>[0] {
  return {
    grid: grid4,
    isPaused: false,
    isGameOver: false,
    score: 0,
    language: 'en',
    mode: 'practice',
    isLandscape: false,
    isDesktop: false,
    isTv: false,
    remainingTime: 120,
    gameActive: false,
    foundWords: [],
    timerSeconds: 120,
    trainingCompletedSkillsRef: { current: new Set<string>() } as React.RefObject<Set<string> | null>,
    trainingUpdateProgress: vi.fn(),
    announceTimer: vi.fn(),
    setGameActive: vi.fn(),
    onQuit: vi.fn(),
    t: (k: string) => k,
    isTypingModeRef: { current: false } as React.RefObject<boolean>,
    showHintPromptRef: { current: false } as React.RefObject<boolean>,
    setShowHintPrompt: vi.fn(),
    setShowQuitConfirm: vi.fn(),
    setIsPaused: vi.fn(),
    ...overrides,
  };
}

describe('useSinglePlayerEffects — game_started tracking', () => {
  beforeEach(() => {
    trackGameStart.mockClear();
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => 'test-uuid' },
      writable: true,
      configurable: true,
    });
    global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response)) as unknown as typeof fetch;
  });

  it('fires trackGameStart exactly once on mount with mode + boardSize', () => {
    renderHook(() => useSinglePlayerEffects(baseOptions({ mode: 'practice', grid: grid4 })));

    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('singleplayer', {
      subMode: 'practice',
      boardSize: 4,
    });
  });

  it('uses grid length for boardSize when grid is 5x5', () => {
    renderHook(() => useSinglePlayerEffects(baseOptions({ mode: 'classic', grid: grid5 })));

    expect(trackGameStart).toHaveBeenCalledWith('singleplayer', {
      subMode: 'classic',
      boardSize: 5,
    });
  });

  it('reports boardSize=0 when grid is null on mount', () => {
    renderHook(() => useSinglePlayerEffects(baseOptions({ mode: 'practice', grid: null })));

    expect(trackGameStart).toHaveBeenCalledWith('singleplayer', {
      subMode: 'practice',
      boardSize: 0,
    });
  });

  it('does not re-fire on prop changes (mount-only)', () => {
    const { rerender } = renderHook(
      (props: Parameters<typeof useSinglePlayerEffects>[0]) => useSinglePlayerEffects(props),
      { initialProps: baseOptions({ mode: 'practice', grid: grid4 }) }
    );

    expect(trackGameStart).toHaveBeenCalledTimes(1);

    rerender(baseOptions({ mode: 'classic', grid: grid5 }));
    rerender(baseOptions({ mode: 'classic', grid: grid5, score: 100 }));

    expect(trackGameStart).toHaveBeenCalledTimes(1);
  });
});
