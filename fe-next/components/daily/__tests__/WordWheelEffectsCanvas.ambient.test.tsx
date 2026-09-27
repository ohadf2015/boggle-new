import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParticleConfig } from '@/lib/gameEngine/types';

// ─── Mock GameCanvas ────────────────────────────────────────────────
// Bypass real PixiJS init — render children directly, expose a spy engine so
// we can inspect the ambient emitter config the EffectsWorker requests.
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
  GameCanvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-game-canvas">{children}</div>
  ),
  useGameEngine: () => mockEngine,
}));

import WordWheelEffectsCanvas from '../WordWheelEffectsCanvas';

const baseProps = { width: 400, height: 600, onEffectsConsumed: vi.fn() };

beforeEach(() => {
  mockEngine.particles.create.mockClear();
  mockEngine.particles.burst.mockClear();
  baseProps.onEffectsConsumed.mockClear();
});

describe('WordWheelEffectsCanvas — ambient backdrop', () => {
  it('creates exactly one persistent ambient emitter on mount', () => {
    render(<WordWheelEffectsCanvas {...baseProps} effects={[]} />);
    expect(mockEngine.particles.create).toHaveBeenCalledTimes(1);
  });

  it('the ambient field is tuned to be VISIBLE over the dark navy backdrop', () => {
    // Regression guard: the ambient layer previously inherited AMBIENT_BOKEH's
    // near-invisible tuning (peak alpha 0.15, ~1px particles), so the word-wheel
    // play area read as flat solid black. The ambient must be perceptible.
    render(<WordWheelEffectsCanvas {...baseProps} effects={[]} />);
    const config = mockEngine.particles.create.mock.calls[0][0] as ParticleConfig;

    // Peak opacity high enough to register against bg-neo-navy (#1a1a2e).
    expect(config.alpha.end).toBeGreaterThanOrEqual(0.2);
    // Soft orbs large enough to be seen (not sub-pixel specks).
    expect(config.scale.end).toBeGreaterThanOrEqual(1);
    // A full field of particles, spawned across the whole canvas.
    expect(config.maxParticles).toBeGreaterThanOrEqual(30);
    expect(config.spawnConfig?.width).toBe(baseProps.width);
    expect(config.spawnConfig?.height).toBe(baseProps.height);
  });

  it('renders without crashing with empty effects', () => {
    const { container } = render(<WordWheelEffectsCanvas {...baseProps} effects={[]} />);
    expect(container.querySelector('[data-testid="mock-game-canvas"]')).toBeInTheDocument();
  });
});
