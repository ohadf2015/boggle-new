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
});
