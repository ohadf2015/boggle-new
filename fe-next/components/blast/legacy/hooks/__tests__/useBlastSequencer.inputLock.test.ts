import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastSequencer, type AnimPhase } from '../useBlastSequencer';
import type { GravityResult } from '../../utils/blastGravity';

const word = [0, 1, 2, 3].map((col) => ({ row: 5, col, type: 'standard' }));

const gravity = (over: Partial<GravityResult> = {}): GravityResult => ({
  newGrid: [],
  newTileStates: [],
  clearedTiles: word.map(({ row, col }) => ({ row, col })) as GravityResult['clearedTiles'],
  fallingTiles: [0, 1, 2, 3].map((col) => ({ row: 5, col, fallDistance: 2 })) as GravityResult['fallingTiles'],
  newTiles: [0, 1, 2, 3].map((col) => ({ row: 0, col, spawnOffset: 60 })) as GravityResult['newTiles'],
  ...over,
});

async function settle(p: Promise<void>, ms: number) {
  let done = false;
  void p.then(() => { done = true; });
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  return done;
}

describe('useBlastSequencer — input lock after a word', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('unlocks a 4-letter word with a 2-row fall within 600ms', async () => {
    const { result } = renderHook(() => useBlastSequencer());
    let p!: Promise<void>;
    act(() => {
      p = result.current.animateWordClear(word).then(() => result.current.animateCascade(gravity(), 0, () => {}));
    });
    expect(await settle(p, 600)).toBe(true);
    expect(result.current.state.isAnimating).toBe(false);
  });

  it('keeps the board locked while tiles are falling', async () => {
    const { result } = renderHook(() => useBlastSequencer());
    act(() => { void result.current.animateCascade(gravity(), 0, () => {}); });
    expect(result.current.state.phase).toBe('falling');
    expect(result.current.state.isAnimating).toBe(true);
  });

  it('does not replay the word clear in the first cascade step', async () => {
    const { result } = renderHook(() => useBlastSequencer());
    const phases: AnimPhase[] = [];
    let p!: Promise<void>;
    act(() => { p = result.current.animateCascade(gravity(), 0, () => {}); });
    for (let t = 0; t < 40; t++) {
      phases.push(result.current.state.phase);
      await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    }
    await p;
    expect(phases).not.toContain('clearing');
  });

  it('still plays the clear for tiles a chained cascade found', async () => {
    const { result } = renderHook(() => useBlastSequencer());
    act(() => { void result.current.animateCascade(gravity(), 1, () => {}); });
    const phases: AnimPhase[] = [];
    for (let t = 0; t < 40; t++) {
      phases.push(result.current.state.phase);
      await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    }
    expect(phases).toContain('clearing');
  });

  it('lets new tiles finish appearing without holding input, then goes idle', async () => {
    const { result } = renderHook(() => useBlastSequencer());
    let p!: Promise<void>;
    act(() => { p = result.current.animateCascade(gravity(), 0, () => {}); });
    expect(await settle(p, 300)).toBe(true);
    expect(result.current.state.phase).toBe('appearing');
    expect(result.current.state.isAnimating).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(result.current.state.phase).toBe('idle');
  });

  it('never lets the appear tail overwrite the next word\'s animation', async () => {
    const { result } = renderHook(() => useBlastSequencer());
    let p!: Promise<void>;
    act(() => { p = result.current.animateCascade(gravity(), 0, () => {}); });
    expect(await settle(p, 300)).toBe(true);
    act(() => { void result.current.animateWordClear(word); });
    expect(result.current.state.phase).toBe('anticipation');
    await act(async () => { await vi.advanceTimersByTimeAsync(60); });
    expect(result.current.state.phase).not.toBe('idle');
    expect(result.current.state.isAnimating).toBe(true);
  });
});
