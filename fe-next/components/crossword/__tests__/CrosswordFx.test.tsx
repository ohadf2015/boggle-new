import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

const fx = vi.hoisted(() => ({
  reduced: false,
  detach: vi.fn(),
  builds: [] as Array<(ctx: unknown) => { update: (dt: number) => boolean }>,
}));

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => fx.reduced }));
vi.mock('@/lib/pixiFx/fxLayers', () => ({
  attachFxLayer: vi.fn((build) => {
    fx.builds.push(build);
    return fx.detach;
  }),
}));
vi.mock('pixi.js', () => {
  throw new Error('CrosswordFx must not create its own Pixi Application');
});

import { CrosswordFx } from '../CrosswordFx';

class FakeGraphics {
  x = 0;
  y = 0;
  rotation = 0;
  rect() {
    return this;
  }
  fill() {
    return this;
  }
}

function runLayer() {
  const children: FakeGraphics[] = [];
  const layer = fx.builds[0]({
    pixi: { Graphics: FakeGraphics },
    container: { addChild: (g: FakeGraphics) => children.push(g) },
  });
  return { layer, children };
}

describe('CrosswordFx', () => {
  beforeEach(() => {
    fx.reduced = false;
    fx.detach.mockClear();
    fx.builds = [];
  });

  it('draws nothing before the first solve', () => {
    render(<CrosswordFx burstKey={0} />);
    expect(fx.builds).toHaveLength(0);
  });

  it('a solve attaches one confetti layer on the shared canvas', () => {
    render(<CrosswordFx burstKey={1} />);
    expect(fx.builds).toHaveLength(1);

    const { layer, children } = runLayer();
    expect(children.length).toBe(Math.min(140, Math.floor(window.innerWidth / 6)));

    const startY = children[0].y;
    expect(layer.update(16)).toBe(true);
    expect(children[0].y).toBeGreaterThan(startY);
  });

  it('the confetti finishes after 2.6s', () => {
    render(<CrosswordFx burstKey={1} />);
    const { layer } = runLayer();
    let alive = true;
    let frames = 0;
    while (alive && frames < 1000) {
      alive = layer.update(100);
      frames++;
    }
    expect(frames).toBe(26);
  });

  it('respects reduced motion', () => {
    fx.reduced = true;
    render(<CrosswordFx burstKey={1} />);
    expect(fx.builds).toHaveLength(0);
  });

  it('detaches on unmount and on the next solve', () => {
    const { rerender, unmount } = render(<CrosswordFx burstKey={1} />);
    rerender(<CrosswordFx burstKey={2} />);
    expect(fx.detach).toHaveBeenCalledTimes(1);
    expect(fx.builds).toHaveLength(2);
    unmount();
    expect(fx.detach).toHaveBeenCalledTimes(2);
  });
});
