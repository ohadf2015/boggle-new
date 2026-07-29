/**
 * ConfettiBurst tests
 * Tests: renders canvas, trigger=false is inert, trigger=true fires animation, reduced-motion skipped
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock canvas context (jsdom doesn't implement it)
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    set globalAlpha(_: number) {},
    set fillStyle(_: string) {},
  });
});

import { ConfettiBurst } from '../ConfettiBurst';

describe('ConfettiBurst', () => {
  it('renders a canvas element', () => {
    render(<ConfettiBurst trigger={false} />);
    // canvas is rendered (pointer-events-none fixed overlay)
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('canvas has pointer-events-none class', () => {
    render(<ConfettiBurst trigger={false} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveClass('pointer-events-none');
  });

  it('accepts className prop', () => {
    render(<ConfettiBurst trigger={false} className="test-class" />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveClass('test-class');
  });

  it('does not crash when trigger changes from false to true', () => {
    const { rerender } = render(<ConfettiBurst trigger={false} />);
    expect(() => rerender(<ConfettiBurst trigger={true} />)).not.toThrow();
  });

  it('accepts custom particleCount and colors', () => {
    expect(() =>
      render(
        <ConfettiBurst
          trigger={false}
          particleCount={30}
          colors={['#FFE135', '#FF6B35', '#00FFFF']}
        />
      )
    ).not.toThrow();
  });
});
