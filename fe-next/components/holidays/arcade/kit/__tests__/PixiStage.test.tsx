import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const px = vi.hoisted(() => ({
  apps: [] as { destroy: ReturnType<typeof vi.fn>; resolveInit: () => void }[],
  deferInit: false,
}));

vi.mock('pixi.js', () => {
  class Container {
    children: unknown[] = [];
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    addChild = vi.fn((...c: unknown[]) => { this.children.push(...c); return c[0]; });
    sortableChildren = false;
    zIndex = 0;
    destroyed = false;
  }
  class Application {
    stage = new Container();
    canvas = document.createElement('canvas');
    screen = { width: 390, height: 700 };
    renderer = { on: vi.fn(), off: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn(), started: true, start: vi.fn(), stop: vi.fn() };
    destroy = vi.fn();
    init = vi.fn(() => new Promise<void>((resolve) => {
      px.apps.push({ destroy: this.destroy, resolveInit: resolve });
      if (!px.deferInit) resolve();
    }));
  }
  const Assets = { load: vi.fn(async () => ({})), get: vi.fn(() => ({})) };
  return { Application, Container, Assets, Texture: { WHITE: {} } };
});
vi.mock('@/lib/gameEngine/ParticleSystem', () => ({ ParticlePool: class { burst = vi.fn(); update = vi.fn(); destroy = vi.fn(); } }));

import PixiStage from '../PixiStage';

const sfx = { play: vi.fn(), combo: vi.fn() };

beforeEach(() => {
  px.apps.length = 0;
  px.deferInit = false;
});

describe('PixiStage lifecycle', () => {
  it('Given a mounted stage, when it unmounts, then the pixi app and the scene are destroyed', async () => {
    const destroyScene = vi.fn();
    const create = vi.fn(() => ({ update: vi.fn(), destroy: destroyScene }));
    const { unmount } = render(<PixiStage art={['bg-latke']} create={create} paused={false} reduced={false} sfx={sfx} label="game" />);
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    unmount();
    expect(destroyScene).toHaveBeenCalledTimes(1);
    expect(px.apps[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('Given the stage unmounts before pixi finishes starting, then the late app is still destroyed and no scene is built', async () => {
    px.deferInit = true;
    const create = vi.fn(() => ({ update: vi.fn() }));
    const { unmount } = render(<PixiStage art={[]} create={create} paused={false} reduced={false} sfx={sfx} label="game" />);
    await waitFor(() => expect(px.apps).toHaveLength(1));
    unmount();
    px.apps[0].resolveInit();
    await waitFor(() => expect(px.apps[0].destroy).toHaveBeenCalledTimes(1));
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    [false, [1, 3]],
    [true, [9, 10]],
  ])('Given a final fall asks for slow motion (reduced=%s), then the game steps at the matching speed', async (reduced, expected) => {
    const update = vi.fn();
    const create = vi.fn((ctx: { slowMo: (ms: number) => void }) => {
      ctx.slowMo(1000);
      return { update };
    });
    render(<PixiStage art={[]} create={create} paused={false} reduced={reduced} sfx={sfx} label="game" />);
    await waitFor(() => expect(create).toHaveBeenCalled());
    const app = (create.mock.calls[0][0] as unknown as { app: { ticker: { add: ReturnType<typeof vi.fn> } } }).app;
    const tick = app.ticker.add.mock.calls[0][0] as (t: { deltaMS: number }) => void;
    for (let i = 0; i < 10; i++) tick({ deltaMS: 1000 / 60 });
    expect(update.mock.calls.length).toBeGreaterThanOrEqual(expected[0]);
    expect(update.mock.calls.length).toBeLessThanOrEqual(expected[1]);
  });

  it('Given the first tap or key, then the stage reports it once so the hint can go away', async () => {
    const onInput = vi.fn();
    const { getByRole } = render(<PixiStage art={[]} create={() => ({ update: vi.fn() })} paused={false} reduced={false} sfx={sfx} label="game" onInput={onInput} />);
    const stage = getByRole('application');
    stage.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    stage.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onInput).toHaveBeenCalled();
  });
});

describe('PixiStage tween safety', () => {
  it('Given a tween whose sprite was destroyed, then the game keeps stepping instead of freezing', async () => {
    const update = vi.fn();
    const create = vi.fn((ctx: { tweens: { add: (o: { from: number; to: number; duration: number; onUpdate: (v: number) => void }) => number } }) => {
      ctx.tweens.add({ from: 0, to: 1, duration: 5, onUpdate: () => { throw new TypeError("Cannot read properties of null (reading 'set')"); } });
      return { update };
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<PixiStage art={[]} create={create as never} paused={false} reduced={false} sfx={sfx} label="game" />);
    await waitFor(() => expect(create).toHaveBeenCalled());
    const app = (create.mock.calls[0][0] as unknown as { app: { ticker: { add: ReturnType<typeof vi.fn> } } }).app;
    const tick = app.ticker.add.mock.calls[0][0] as (t: { deltaMS: number }) => void;
    for (let i = 0; i < 10; i++) expect(() => tick({ deltaMS: 1000 / 60 })).not.toThrow();
    expect(update.mock.calls.length).toBeGreaterThanOrEqual(9);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('Given a Hebrew page, when a score floats up, then it reads +50 instead of flipping to 50+', async () => {
    const create = vi.fn((ctx: { float: (x: number, y: number, text: string) => void }) => {
      ctx.float(10, 10, '+50');
      return { update: vi.fn() };
    });
    const { container } = render(<PixiStage art={[]} create={create as never} paused={false} reduced={false} sfx={sfx} label="game" />);
    await waitFor(() => expect(create).toHaveBeenCalled());
    const span = [...container.querySelectorAll('span')].find((s) => s.textContent === '+50');
    expect(span).toHaveAttribute('dir', 'auto');
  });
});
