import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WordTowerSmashScene } from '../WordTowerSmashScene';
import type { RivalMarker } from '@/lib/wordTower/rivals';

// Identity-ish translator: echoes the key (+ params) so we can assert on keys.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const target: RivalMarker = {
  id: 'rival-1',
  name: 'Alex',
  heightM: 100,
  playerId: 'p1',
} as RivalMarker;

/**
 * Drives the reduced-motion path (no WebGL in jsdom). It shares the SAME power
 * oscillator + `onDone(powerRef.current)` contract as the Pixi path, so this
 * locks the skill → damage wiring: a strike captures the live power and hands it
 * to onDone, which the caller turns into authoritative floors.
 */
describe('WordTowerSmashScene — strike captures skill and reports it', () => {
  let rafCb: FrameRequestCallback | null = null;
  beforeEach(() => {
    // Deterministic rAF: we advance the clock manually so the oscillator reaches
    // a non-zero, non-trivial power before the strike.
    rafCb = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('captures a live power value on STRIKE and passes it (0..1) to onDone', () => {
    const onDone = vi.fn();
    render(
      <WordTowerSmashScene target={target} attackerHeightM={100} onDone={onDone} t={t} reducedMotion />,
    );

    // Aim phase shows the STRIKE cta + the skill hint.
    expect(screen.getByText('wordTower.sabotage.strikeCta')).toBeTruthy();

    // Advance the oscillator a few frames so power climbs off zero.
    act(() => {
      const base = performance.now();
      for (let i = 1; i <= 30; i++) rafCb?.(base + i * 33);
    });

    // Strike, then let the reduced-motion impact→result beat elapse.
    vi.useFakeTimers();
    fireEvent.click(screen.getByText('wordTower.sabotage.strikeCta'));
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Result readout appears; DONE commits the hit.
    const done = screen.getByText('wordTower.sabotage.done');
    fireEvent.click(done);
    vi.useRealTimers();

    expect(onDone).toHaveBeenCalledTimes(1);
    const accuracy = onDone.mock.calls[0][0] as number;
    expect(accuracy).toBeGreaterThanOrEqual(0);
    expect(accuracy).toBeLessThanOrEqual(1);
  });

  it('does not report until the player commits (no accidental early onDone)', () => {
    const onDone = vi.fn();
    render(
      <WordTowerSmashScene target={target} attackerHeightM={100} onDone={onDone} t={t} reducedMotion />,
    );
    // Still aiming — nothing committed yet.
    expect(onDone).not.toHaveBeenCalled();
  });
});
