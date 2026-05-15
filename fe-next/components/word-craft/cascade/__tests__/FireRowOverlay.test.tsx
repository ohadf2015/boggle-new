import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FireRowOverlay } from '../FireRowOverlay';

describe('cascade/FireRowOverlay', () => {
  it('renders totalRows pips', () => {
    const { container } = render(<FireRowOverlay fireRow={0} totalRows={7} />);
    const pips = container.querySelectorAll('span.h-3.w-3');
    expect(pips.length).toBe(7);
  });

  it('lights the first fireRow pips', () => {
    const { container } = render(<FireRowOverlay fireRow={3} totalRows={7} />);
    const pips = container.querySelectorAll('span.h-3.w-3');
    expect(pips[0].className).toMatch(/bg-neo-orange|bg-neo-red/);
    expect(pips[6].className).toMatch(/bg-neo-navy/);
  });

  it('flags danger when fire is half-or-more', () => {
    const { container } = render(<FireRowOverlay fireRow={4} totalRows={7} />);
    const root = container.querySelector('[data-testid="fire-row-overlay"]')!;
    expect(root.getAttribute('data-danger')).toBe('true');
    expect(root.className).toMatch(/animate-neo-shake/);
  });

  it('does not flag danger below half', () => {
    const { container } = render(<FireRowOverlay fireRow={2} totalRows={7} />);
    const root = container.querySelector('[data-testid="fire-row-overlay"]')!;
    expect(root.getAttribute('data-danger')).toBe('false');
  });

  it('has an aria-label describing state', () => {
    const { container } = render(<FireRowOverlay fireRow={2} totalRows={7} />);
    const root = container.querySelector('[data-testid="fire-row-overlay"]')!;
    expect(root.getAttribute('aria-label')).toBe('Fire 2 of 7');
  });
});
