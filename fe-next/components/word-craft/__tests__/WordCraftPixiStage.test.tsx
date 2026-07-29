import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { WordCraftPixiStage } from '../WordCraftPixiStage';

// Mock Pixi to avoid WebGL in JSDOM.
vi.mock('pixi.js', () => {
  const apps: any[] = [];
  class Application {
    canvas = document.createElement('canvas');
    stage = { addChild: vi.fn() };
    renderer = { width: 320, height: 320, resize: vi.fn() };
    destroy = vi.fn();
    init = vi.fn().mockResolvedValue(undefined);
    constructor() { apps.push(this); }
    static __apps = apps;
    static __clear = () => { apps.length = 0; };
  }
  class Container {
    children: any[] = [];
    addChild = vi.fn((c: any) => this.children.push(c));
    destroy = vi.fn();
  }
  return { Application, Container };
});

function Wrapper({ rm = false }: { rm?: boolean }) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={boardRef} data-testid="board" style={{ width: 400, height: 400 }}>
      <WordCraftPixiStage boardRef={boardRef} reducedMotion={rm} />
    </div>
  );
}

describe('WordCraftPixiStage', () => {
  it('mounts a canvas holder inside the board container', () => {
    const { container } = render(<Wrapper />);
    // The holder div exists; canvas may attach async.
    expect(container.querySelector('div[aria-hidden="true"]')).toBeTruthy();
  });

  it('renders without throwing when Pixi init fails', async () => {
    const pixi = await import('pixi.js') as any;
    const originalApp = pixi.Application;
    pixi.Application = class { init() { return Promise.reject(new Error('no webgl')); } destroy() {} };
    expect(() => render(<Wrapper />)).not.toThrow();
    pixi.Application = originalApp;
  });

  it('accepts reducedMotion prop without error', () => {
    expect(() => render(<Wrapper rm={true} />)).not.toThrow();
  });
});
