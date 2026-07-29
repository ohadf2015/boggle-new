import { createRef } from 'react';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const destroy = vi.fn();
const init = vi.fn().mockResolvedValue(undefined);
const tickerAdd = vi.fn();
const tickerRemove = vi.fn();
const stageAddChild = vi.fn();
const stageRemoveChild = vi.fn();
const graphicsCircle = vi.fn().mockReturnThis();
const graphicsFill = vi.fn().mockReturnThis();
const graphicsClear = vi.fn().mockReturnThis();

class FakeApp {
  canvas = document.createElement('canvas');
  screen = { width: 320, height: 240 };
  stage = { addChild: stageAddChild, removeChild: stageRemoveChild, removeChildren: vi.fn() };
  ticker = { add: tickerAdd, remove: tickerRemove };
  init = init;
  destroy = destroy;
}

class FakeGraphics {
  x = 0;
  y = 0;
  alpha = 1;
  scale = { set: vi.fn() };
  circle = graphicsCircle;
  fill = graphicsFill;
  clear = graphicsClear;
  destroy = vi.fn();
}

vi.mock('pixi.js', () => ({ Application: FakeApp, Graphics: FakeGraphics }));

import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';

const mockMM = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
};

describe('PracticePixiFx', () => {
  beforeEach(() => {
    mockMM(false);
  });

  afterEach(() => {
    destroy.mockClear();
    init.mockClear();
    tickerAdd.mockClear();
    tickerRemove.mockClear();
    stageAddChild.mockClear();
    stageRemoveChild.mockClear();
    graphicsCircle.mockClear();
    graphicsFill.mockClear();
    cleanup();
  });

  it('initializes a Pixi app on mount', async () => {
    render(<PracticePixiFx />);
    await waitFor(() => expect(init).toHaveBeenCalled());
  });

  it('destroys the Pixi app on unmount', async () => {
    const { unmount } = render(<PracticePixiFx />);
    await waitFor(() => expect(init).toHaveBeenCalled());
    unmount();
    expect(destroy).toHaveBeenCalled();
  });

  it('skips Pixi when prefers-reduced-motion is reduce', () => {
    mockMM(true);
    render(<PracticePixiFx />);
    expect(init).not.toHaveBeenCalled();
  });

  it('burst spawns particles on the stage', async () => {
    const ref = createRef<PracticePixiFxHandle>();
    render(<PracticePixiFx ref={ref} />);
    await waitFor(() => expect(init).toHaveBeenCalled());
    act(() => {
      ref.current?.burst(100, 80, 0xbfff00);
    });
    expect(stageAddChild).toHaveBeenCalled();
    expect(graphicsCircle).toHaveBeenCalled();
    expect(graphicsFill).toHaveBeenCalled();
    expect(tickerAdd).toHaveBeenCalled();
  });

  it('goalCelebrate spawns a fullscreen burst', async () => {
    const ref = createRef<PracticePixiFxHandle>();
    render(<PracticePixiFx ref={ref} />);
    await waitFor(() => expect(init).toHaveBeenCalled());
    stageAddChild.mockClear();
    act(() => {
      ref.current?.goalCelebrate();
    });
    expect(stageAddChild).toHaveBeenCalled();
  });

  it('burst is a no-op under reduced motion', async () => {
    mockMM(true);
    const ref = createRef<PracticePixiFxHandle>();
    render(<PracticePixiFx ref={ref} />);
    act(() => {
      ref.current?.burst(50, 50);
    });
    expect(stageAddChild).not.toHaveBeenCalled();
  });
});
