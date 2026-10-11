import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEngine = {
  particles: {
    burst: vi.fn(),
    create: vi.fn(() => ({ emit: vi.fn(), destroy: vi.fn() })),
  },
  shake: { light: vi.fn(), medium: vi.fn(), heavy: vi.fn(), shake: vi.fn() },
  flash: { flash: vi.fn(), danger: vi.fn(), gold: vi.fn(), white: vi.fn(), combo: vi.fn() },
  timeDilation: { freeze: vi.fn(), slowDown: vi.fn() },
  width: 400,
  height: 600,
};

vi.mock('@/lib/gameEngine/GameCanvas', () => ({
  GameCanvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGameEngine: () => mockEngine,
}));

import WordWheelEffectsCanvas, { type WordWheelEffect } from '../WordWheelEffectsCanvas';

const baseProps = { width: 400, height: 600, onEffectsConsumed: vi.fn() };
const tints = () => Object.values(mockEngine.flash).reduce((n, fn) => n + fn.mock.calls.length, 0);

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(mockEngine.flash).forEach((fn) => fn.mockClear());
  mockEngine.particles.burst.mockClear();
});

describe('WordWheelEffectsCanvas — word celebrations stay on the wheel', () => {
  it.each([1, 5, 12, 96])('given a valid word worth %i, then particles burst but the screen is never tinted', (points) => {
    const effects: WordWheelEffect[] = [{ type: 'wordValid', x: 200, y: 300, points }];
    render(<WordWheelEffectsCanvas {...baseProps} effects={effects} />);
    vi.runAllTimers();
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(tints()).toBe(0);
  });

  it('given a whole-wheel word, then its waves never tint the screen', () => {
    render(<WordWheelEffectsCanvas {...baseProps} effects={[{ type: 'pangram', x: 200, y: 300 }]} />);
    vi.runAllTimers();
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(tints()).toBe(0);
  });

  it('given a rejected word, then it shakes and sparks without a red screen wash', () => {
    render(<WordWheelEffectsCanvas {...baseProps} effects={[{ type: 'error', x: 200, y: 300 }]} />);
    expect(mockEngine.particles.burst).toHaveBeenCalled();
    expect(tints()).toBe(0);
  });

  it('given a combo, then the screen is never tinted', () => {
    render(<WordWheelEffectsCanvas {...baseProps} effects={[{ type: 'combo', x: 200, y: 300, combo: 6 }]} />);
    expect(tints()).toBe(0);
  });
});
