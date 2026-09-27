import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// GSAP/ScrollTrigger can't meaningfully run in jsdom (no layout/scroll); the
// effect math lives in lib/animation/scrollFx.ts and is unit-tested there.
// Here we only verify the component mounts cleanly, renders nothing, and runs
// its setup callback exactly once.
const setupSpy = vi.fn();

vi.mock('@gsap/react', () => ({
  useGSAP: (cb: () => void) => {
    setupSpy();
    cb();
  },
}));

const matchMediaAdd = vi.fn();
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    matchMedia: () => ({ add: matchMediaAdd, revert: vi.fn() }),
    fromTo: vi.fn(),
    to: vi.fn(),
    quickTo: vi.fn(() => vi.fn()),
    utils: { toArray: () => [] },
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

import { PageScrollFx } from '../PageScrollFx';

describe('PageScrollFx', () => {
  beforeEach(() => {
    setupSpy.mockClear();
    matchMediaAdd.mockClear();
  });

  it('renders nothing into the DOM', () => {
    const { container } = render(<PageScrollFx />);
    expect(container).toBeEmptyDOMElement();
  });

  it('runs its GSAP setup and registers two matchMedia queries (motion-safe + fine-pointer)', () => {
    render(<PageScrollFx />);
    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(matchMediaAdd).toHaveBeenCalledTimes(2);
    const queries = matchMediaAdd.mock.calls.map((c) => c[0]);
    expect(queries.some((q: string) => q.includes('prefers-reduced-motion'))).toBe(true);
    expect(queries.some((q: string) => q.includes('pointer: fine'))).toBe(true);
  });
});
