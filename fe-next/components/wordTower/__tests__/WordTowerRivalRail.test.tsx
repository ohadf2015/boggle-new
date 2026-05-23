import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WordTowerRivalRail } from '../WordTowerRivalRail';
import type { RivalMarker } from '@/lib/wordTower/rivals';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const rivals: RivalMarker[] = [{ id: 'a', name: 'Ann', heightM: 100, highestBiome: 'orbit' }];

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no ResizeObserver; the rail observes its own size.
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
});
afterEach(() => vi.useRealTimers());

describe('WordTowerRivalRail pass-toast', () => {
  it('keeps the cheer up across an interleaved height change, then auto-dismisses', () => {
    const { rerender } = render(<WordTowerRivalRail rivals={rivals} viewerHeightM={90} t={t} />);
    expect(screen.queryByText(/rivalPassed/)).toBeNull();

    // Climb past Ann(100) → cheer appears.
    act(() => { rerender(<WordTowerRivalRail rivals={rivals} viewerHeightM={110} t={t} />); });
    expect(screen.getByText(/rivalPassed:Ann/)).toBeTruthy();

    // Build another word: height advances, NO new crossing. The cheer must persist
    // (the old single-effect code cancelled its own dismiss timer here).
    act(() => { rerender(<WordTowerRivalRail rivals={rivals} viewerHeightM={120} t={t} />); });
    expect(screen.getByText(/rivalPassed:Ann/)).toBeTruthy();

    // It is transient — clears on its own timer.
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByText(/rivalPassed/)).toBeNull();
  });

  it('never cheers for a rival you have not passed', () => {
    render(<WordTowerRivalRail rivals={rivals} viewerHeightM={50} t={t} />);
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByText(/rivalPassed/)).toBeNull();
  });
});
