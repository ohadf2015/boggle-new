import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const canvasConfigs: unknown[] = [];
vi.mock('@/lib/gameEngine/GameCanvas', () => ({
  GameCanvas: ({ children, config }: { children: React.ReactNode; config: unknown }) => {
    canvasConfigs.push(config);
    return <div data-testid="mock-game-canvas">{children}</div>;
  },
  useGameEngine: () => mockEngine,
}));

import WordWheelEffectsCanvas from '../WordWheelEffectsCanvas';

const baseProps = { width: 400, height: 600, onEffectsConsumed: vi.fn() };

beforeEach(() => {
  mockEngine.particles.create.mockClear();
  mockEngine.particles.burst.mockClear();
  baseProps.onEffectsConsumed.mockClear();
});

describe('WordWheelEffectsCanvas — idle cost', () => {
  it('starts no forever-running emitter on mount, so an idle canvas can sleep', () => {
    render(<WordWheelEffectsCanvas {...baseProps} effects={[]} />);
    expect(mockEngine.particles.create).not.toHaveBeenCalled();
  });

  it('draws without antialiasing at a capped resolution', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
    render(<WordWheelEffectsCanvas {...baseProps} effects={[]} />);
    const config = canvasConfigs.at(-1) as { antialias?: boolean; resolution?: number };
    expect(config.antialias).toBe(false);
    expect(config.resolution).toBeLessThanOrEqual(1.5);
  });

  it('renders without crashing with empty effects', () => {
    const { container } = render(<WordWheelEffectsCanvas {...baseProps} effects={[]} />);
    expect(container.querySelector('[data-testid="mock-game-canvas"]')).toBeInTheDocument();
  });
});
