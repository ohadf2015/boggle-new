// ─── NewYearFireworks Bridge Tests ──────────────────────────────────
// Thin bridge over SharedFxApp.spawnFirework — owns scheduling,
// color-rotation, position randomization. Renders nothing.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import NewYearFireworks from '../NewYearFireworks';

const spawnFirework = vi.fn();

vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnFirework: (...args: unknown[]) => spawnFirework(...args),
    isInitialized: () => true,
  },
}));

beforeEach(() => {
  spawnFirework.mockClear();
  cleanup();
});

describe('NewYearFireworks (bridge)', () => {
  it('renders no DOM overlay (engine draws on shared canvas)', () => {
    const { container } = render(<NewYearFireworks active count={3} />);
    expect(container.firstChild).toBeNull();
  });

  it('does NOT call spawnFirework when inactive', () => {
    render(<NewYearFireworks active={false} count={5} />);
    expect(spawnFirework).not.toHaveBeenCalled();
  });

  it('calls spawnFirework exactly count times when active', () => {
    render(<NewYearFireworks active count={8} />);
    expect(spawnFirework).toHaveBeenCalledTimes(8);
  });

  it('defaults count to 8', () => {
    render(<NewYearFireworks active />);
    expect(spawnFirework).toHaveBeenCalledTimes(8);
  });

  it('passes numeric hex color (not tailwind class name)', () => {
    render(<NewYearFireworks active count={4} />);
    for (const call of spawnFirework.mock.calls) {
      const arg = call[0] as { color: unknown };
      expect(typeof arg.color).toBe('number');
    }
  });

  it('rotates through 4 neo colors (lime, pink, cyan, purple)', () => {
    render(<NewYearFireworks active count={4} />);
    const colors = spawnFirework.mock.calls.map((c) => (c[0] as { color: number }).color);
    const palette = new Set([0xbfff00, 0xff1493, 0x00ffff, 0x8b5cf6]);
    for (const c of colors) expect(palette.has(c)).toBe(true);
  });

  it('staggers delayMs across duration (monotonic increasing)', () => {
    render(<NewYearFireworks active count={5} duration={5000} />);
    const delays = spawnFirework.mock.calls.map(
      (c) => (c[0] as { delayMs: number }).delayMs,
    );
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
    expect(delays[0]).toBeGreaterThanOrEqual(0);
    expect(delays[delays.length - 1]).toBeLessThan(5000);
  });

  it('passes pixel x/y coordinates (not percentages)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    render(<NewYearFireworks active count={4} />);
    for (const call of spawnFirework.mock.calls) {
      const arg = call[0] as { x: number; y: number };
      expect(arg.x).toBeGreaterThan(0);
      expect(arg.x).toBeLessThan(1000);
      expect(arg.y).toBeGreaterThan(0);
      expect(arg.y).toBeLessThan(800);
    }
  });

  it('passes size in sensible pixel range', () => {
    render(<NewYearFireworks active count={4} />);
    for (const call of spawnFirework.mock.calls) {
      const arg = call[0] as { size: number };
      expect(arg.size).toBeGreaterThanOrEqual(40);
      expect(arg.size).toBeLessThanOrEqual(200);
    }
  });
});
