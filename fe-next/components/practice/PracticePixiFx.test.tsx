import { render, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const destroy = vi.fn();
const init = vi.fn().mockResolvedValue(undefined);

class FakeApp {
  canvas = document.createElement('canvas');
  stage = { addChild: vi.fn(), removeChildren: vi.fn() };
  init = init;
  destroy = destroy;
}

vi.mock('pixi.js', () => ({ Application: FakeApp }));

import PracticePixiFx from './PracticePixiFx';

describe('PracticePixiFx', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
  });

  afterEach(() => {
    destroy.mockClear();
    init.mockClear();
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
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    render(<PracticePixiFx />);
    expect(init).not.toHaveBeenCalled();
  });
});
