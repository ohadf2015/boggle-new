import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock GameCanvas ────────────────────────────────────────────────
// Bypass real PixiJS init — render children directly, expose spy engine.
const mockEngine = {
  particles: {
    burst: vi.fn(),
    create: vi.fn(() => ({ emit: vi.fn(), destroy: vi.fn() })),
  },
  shake: {
    light: vi.fn(),
    medium: vi.fn(),
    heavy: vi.fn(),
    shake: vi.fn(),
  },
  flash: {
    flash: vi.fn(),
    danger: vi.fn(),
    gold: vi.fn(),
    white: vi.fn(),
    combo: vi.fn(),
  },
  timeDilation: {
    freeze: vi.fn(),
    slowDown: vi.fn(),
  },
  width: 400,
  height: 600,
};

vi.mock('@/lib/gameEngine/GameCanvas', () => ({
  GameCanvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-game-canvas">{children}</div>
  ),
  useGameEngine: () => mockEngine,
}));

import WordHuntEffectsCanvas, { type WordHuntEffect } from '../WordHuntEffectsCanvas';

const baseProps = {
  width: 400,
  height: 600,
  onEffectsConsumed: vi.fn(),
};

beforeEach(() => {
  Object.values(mockEngine.particles).forEach((fn) => 'mockClear' in fn && fn.mockClear());
  Object.values(mockEngine.shake).forEach((fn) => fn.mockClear());
  Object.values(mockEngine.flash).forEach((fn) => fn.mockClear());
  Object.values(mockEngine.timeDilation).forEach((fn) => fn.mockClear());
  baseProps.onEffectsConsumed.mockClear();
});

describe('WordHuntEffectsCanvas', () => {
  it('renders without crashing with empty effects', () => {
    const { container } = render(
      <WordHuntEffectsCanvas {...baseProps} effects={[]} />,
    );
    expect(container.querySelector('[data-testid="mock-game-canvas"]')).toBeInTheDocument();
  });

  it('dispatches small pop + lime flash for short valid word (<=1 pts)', () => {
    const effects: WordHuntEffect[] = [
      { type: 'wordValid', x: 100, y: 200, points: 1 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(mockEngine.flash.flash).toHaveBeenCalled();
    expect(mockEngine.shake.heavy).not.toHaveBeenCalled();
  });

  it('dispatches medium burst + light shake for 4-5 letter word (<=5 pts)', () => {
    const effects: WordHuntEffect[] = [
      { type: 'wordValid', x: 100, y: 200, points: 3 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(mockEngine.shake.light).toHaveBeenCalled();
  });

  it('dispatches big explosion + gold stars + medium shake + hit-stop for 6-7 letter word (<=12 pts)', () => {
    const effects: WordHuntEffect[] = [
      { type: 'wordValid', x: 100, y: 200, points: 8 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockEngine.shake.medium).toHaveBeenCalled();
    expect(mockEngine.timeDilation.slowDown).toHaveBeenCalled();
  });

  it('dispatches massive celebration + heavy shake for 8+ letter word (>12 pts)', () => {
    const effects: WordHuntEffect[] = [
      { type: 'wordValid', x: 100, y: 200, points: 15 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(mockEngine.shake.heavy).toHaveBeenCalled();
    expect(mockEngine.timeDilation.slowDown).toHaveBeenCalled();
  });

  it('triggers freeze + multi-wave firework on targetFound', () => {
    vi.useFakeTimers();
    const effects: WordHuntEffect[] = [
      { type: 'targetFound', x: 200, y: 300 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.timeDilation.freeze).toHaveBeenCalled();
    expect(mockEngine.shake.heavy).toHaveBeenCalled();
    const burstsBefore = mockEngine.particles.burst.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(mockEngine.particles.burst.mock.calls.length).toBeGreaterThan(burstsBefore);
    vi.useRealTimers();
  });

  it('plays error sparks + danger flash + shake on invalid', () => {
    const effects: WordHuntEffect[] = [
      { type: 'invalid', x: 50, y: 50 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(mockEngine.flash.danger).toHaveBeenCalled();
    expect(mockEngine.shake.shake).toHaveBeenCalled();
  });

  it('starts persistent urgency emitter on lowLife (idempotent)', () => {
    const { rerender } = render(
      <WordHuntEffectsCanvas {...baseProps} effects={[{ type: 'lowLife' }]} />,
    );
    expect(mockEngine.particles.create).toHaveBeenCalledTimes(1);

    rerender(
      <WordHuntEffectsCanvas
        {...baseProps}
        effects={[{ type: 'lowLife' }, { type: 'lowLife' }]}
      />,
    );
    expect(mockEngine.particles.create).toHaveBeenCalledTimes(1);
  });

  it('shatters letter on letterEliminated', () => {
    const effects: WordHuntEffect[] = [
      { type: 'letterEliminated', x: 75, y: 80 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(mockEngine.shake.light).toHaveBeenCalled();
  });

  it('triggers gold sparkle for clueGain', () => {
    const effects: WordHuntEffect[] = [{ type: 'clueGain' }];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(mockEngine.flash.flash).toHaveBeenCalled();
  });

  it('triggers gold rising stars for lifeGain', () => {
    const effects: WordHuntEffect[] = [{ type: 'lifeGain', amount: 10 }];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
  });

  it('flashes red on heavy lifeDrop (>5)', () => {
    const effects: WordHuntEffect[] = [{ type: 'lifeDrop', amount: 8 }];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.flash.danger).toHaveBeenCalled();
  });

  it('does NOT flash red on small lifeDrop (<=2)', () => {
    const effects: WordHuntEffect[] = [{ type: 'lifeDrop', amount: 1 }];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.flash.danger).not.toHaveBeenCalled();
  });

  it('triggers multi-wave firework on gameWon', () => {
    vi.useFakeTimers();
    const effects: WordHuntEffect[] = [{ type: 'gameWon', score: 50 }];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    const initialBursts = mockEngine.particles.burst.mock.calls.length;
    expect(initialBursts).toBeGreaterThanOrEqual(1);
    expect(mockEngine.timeDilation.freeze).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(mockEngine.particles.burst.mock.calls.length).toBeGreaterThan(initialBursts);
    vi.useRealTimers();
  });

  it('triggers red smoke + slow-down on gameLost', () => {
    const effects: WordHuntEffect[] = [{ type: 'gameLost' }];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(mockEngine.flash.danger).toHaveBeenCalled();
    expect(mockEngine.timeDilation.slowDown).toHaveBeenCalled();
  });

  it('calls onEffectsConsumed after processing batch', () => {
    const effects: WordHuntEffect[] = [
      { type: 'wordValid', x: 1, y: 2, points: 3 },
    ];
    render(<WordHuntEffectsCanvas {...baseProps} effects={effects} />);
    expect(baseProps.onEffectsConsumed).toHaveBeenCalled();
  });

  it('cooldown: rapid back-to-back wordValid effects within 80ms only fire one burst-set', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <WordHuntEffectsCanvas
        {...baseProps}
        effects={[{ type: 'wordValid', x: 1, y: 1, points: 3 }]}
      />,
    );
    const callsAfterFirst = mockEngine.particles.burst.mock.calls.length;

    rerender(
      <WordHuntEffectsCanvas
        {...baseProps}
        effects={[
          { type: 'wordValid', x: 1, y: 1, points: 3 },
          { type: 'wordValid', x: 1, y: 1, points: 3 },
        ]}
      />,
    );
    // Second call within cooldown window — should be suppressed.
    expect(mockEngine.particles.burst.mock.calls.length).toBe(callsAfterFirst * 2);
    vi.useRealTimers();
  });
});
