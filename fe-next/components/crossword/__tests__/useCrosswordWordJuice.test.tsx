// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const m = vi.hoisted(() => ({
  reducedMotion: false,
  reducedEffects: false,
  fxReady: true,
  playSound: vi.fn(),
  playComboSound: vi.fn(),
  tap: vi.fn(() => Promise.resolve()),
  success: vi.fn(() => Promise.resolve()),
  emit: vi.fn(),
  burst: vi.fn(),
}));

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => m.reducedMotion }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [m.reducedEffects, vi.fn()] }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: m.playSound, playComboSound: m.playComboSound }),
}));
vi.mock('@/utils/haptics', () => ({ haptics: { tap: m.tap, success: m.success } }));
vi.mock('@/lib/blast/mascotBus', () => ({ emitMascotEvent: m.emit }));
vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: { isInitialized: () => m.fxReady, spawnBurst: m.burst },
}));
vi.mock('gsap', () => ({ default: { context: () => ({ revert: vi.fn() }), fromTo: vi.fn() } }));

import { useCrosswordWordJuice, type JuiceIntensity } from '../useCrosswordWordJuice';
import { initGame, type GameState } from '@/lib/crossword/gameState';
import { buildSeedPuzzle } from '@/lib/crossword/puzzles/index';

const seed = {
  id: 'juice-hook',
  locale: 'en',
  difficulty: 'easy',
  rtl: false,
  grid: [
    ['b', 'i', 'r', 'd'],
    ['i', 'd', 'e', 'a'],
    ['r', 'e', 's', 't'],
    ['d', 'a', 't', 'e'],
  ],
  clues: { bird: 'b', idea: 'i', rest: 'r', date: 'd' },
} as const;
const puzzle = buildSeedPuzzle(seed as never);
const row0 = { '0,0': 'b', '0,1': 'i', '0,2': 'r', '0,3': 'd' };
const row1 = { '1,0': 'i', '1,1': 'd', '1,2': 'e', '1,3': 'a' };

function setup(intensity: JuiceIntensity, start: GameState = initGame(puzzle)) {
  const root = document.createElement('div');
  for (const c of puzzle.cells) {
    const cell = document.createElement('button');
    cell.dataset.cwCell = `${c.row},${c.col}`;
    cell.innerHTML = '<span data-letter></span>';
    root.appendChild(cell);
  }
  const gridRef = { current: root };
  return renderHook(({ state }) => useCrosswordWordJuice({ state, gridRef, intensity }), {
    initialProps: { state: start },
  });
}

describe('useCrosswordWordJuice', () => {
  beforeEach(() => {
    m.reducedMotion = false;
    m.reducedEffects = false;
    m.fxReady = true;
    for (const fn of [m.playSound, m.playComboSound, m.tap, m.success, m.emit, m.burst]) fn.mockClear();
  });

  it('Given a word just solved, plays the accept sound, buzzes, bursts and tells the mascot', () => {
    const { rerender } = setup('full');
    rerender({ state: initGame(puzzle, row0) });
    expect(m.playSound).toHaveBeenCalledWith('wordAccepted');
    expect(m.tap).toHaveBeenCalled();
    expect(m.burst).toHaveBeenCalled();
    expect(m.emit).toHaveBeenCalledWith({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false });
  });

  it('Given progress restored on mount, celebrates nothing', () => {
    setup('full', initGame(puzzle, row0));
    expect(m.playSound).not.toHaveBeenCalled();
    expect(m.emit).not.toHaveBeenCalled();
  });

  it('Given two words solved in quick succession, builds a combo with the combo sound', () => {
    const { rerender, result } = setup('full');
    rerender({ state: initGame(puzzle, row0) });
    rerender({ state: initGame(puzzle, { ...row0, ...row1 }) });
    expect(result.current.comboLevel).toBeGreaterThanOrEqual(2);
    expect(m.playComboSound).toHaveBeenCalled();
    expect(m.success).toHaveBeenCalled();
  });

  it('Given multiplayer (small), keeps it to sound, buzz and the mascot: no combo, no burst', () => {
    const { rerender, result } = setup('small');
    rerender({ state: initGame(puzzle, row0) });
    rerender({ state: initGame(puzzle, { ...row0, ...row1 }) });
    expect(m.playSound).toHaveBeenCalledWith('wordAccepted');
    expect(m.emit).toHaveBeenCalled();
    expect(m.burst).not.toHaveBeenCalled();
    expect(m.playComboSound).not.toHaveBeenCalled();
    expect(result.current.comboLevel).toBe(0);
  });

  it('Given a combo, the third word throws more sparks than the first', () => {
    const { rerender } = setup('full');
    rerender({ state: initGame(puzzle, row0) });
    const firstCount = m.burst.mock.calls.at(-1)?.[3]?.count as number;
    rerender({ state: initGame(puzzle, { ...row0, ...row1 }) });
    rerender({ state: initGame(puzzle, { ...row0, ...row1, '2,0': 'r', '2,1': 'e', '2,2': 's', '2,3': 't' }) });
    expect(m.burst.mock.calls.at(-1)?.[3]?.count).toBeGreaterThan(firstCount);
  });

  it('Given reduce effects, skips the particle burst', () => {
    m.reducedEffects = true;
    const { rerender } = setup('full');
    rerender({ state: initGame(puzzle, row0) });
    expect(m.burst).not.toHaveBeenCalled();
  });

  it('Given reduced motion, skips the particle burst', () => {
    m.reducedMotion = true;
    const { rerender } = setup('full');
    rerender({ state: initGame(puzzle, row0) });
    expect(m.burst).not.toHaveBeenCalled();
  });

  it('Given the combo window passes with no solve, the combo drops to 0', () => {
    vi.useFakeTimers();
    try {
      const { rerender, result } = setup('full');
      rerender({ state: initGame(puzzle, row0) });
      expect(result.current.comboLevel).toBe(1);
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(result.current.comboLevel).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Given a new puzzle loaded with progress, does not celebrate it', () => {
    const { rerender } = setup('full');
    const other = buildSeedPuzzle({ ...seed, id: 'juice-hook-2' } as never);
    rerender({ state: initGame(other, row0) });
    expect(m.playSound).not.toHaveBeenCalled();
  });
});
