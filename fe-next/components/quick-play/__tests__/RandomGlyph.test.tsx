/**
 * Random glyph contract.
 *
 * RandomGlyph represents choice and motion — four mode symbols orbit
 * a central spinner, conveying "the wheel will decide" without competing
 * as a fifth mode peer. It shares the visual language of the four mode
 * glyphs (viewBox, stroke weight, optical sizing) but its silhouette is
 * unique: an orbit with a spinner centre.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RandomGlyph } from '../RandomGlyph';

describe('RandomGlyph contract', () => {
  it('renders a single svg on the shared viewBox', () => {
    const { container } = render(<RandomGlyph size={44} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute('viewBox')).toBe('0 0 48 48');
  });

  it('carries NO letterform — a word game must not draw letters into its icons', () => {
    const { container } = render(<RandomGlyph size={44} />);
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelector('tspan')).toBeNull();
    expect(container.querySelector('textPath')).toBeNull();
  });

  it('inks only in currentColor so the keycap owns the color', () => {
    const { container } = render(<RandomGlyph size={44} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    for (const el of Array.from(svg.querySelectorAll('*'))) {
      const fill = el.getAttribute('fill');
      const stroke = el.getAttribute('stroke');
      if (fill) expect(['currentColor', 'none']).toContain(fill);
      if (stroke) expect(['currentColor', 'none']).toContain(stroke);
    }
  });

  it('renders at the requested pixel size', () => {
    const { container } = render(<RandomGlyph size={31} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('31');
    expect(svg.getAttribute('height')).toBe('31');
  });

  it('has a distinct silhouette from the four mode glyphs (orbit + spinner)', () => {
    const { container } = render(<RandomGlyph size={44} />);
    const svg = container.querySelector('svg')!;
    const markup = svg.innerHTML;

    // Should contain a spinner centre (circle with currentColor fill)
    expect(markup).toContain('fill="currentColor"');
    // Should contain an orbit ring (circle with opacity)
    expect(markup).toContain('opacity');
    // Should contain multiple circles (orbit, satellites, centre)
    const circles = svg.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(2);
  });

  it('is accessible and hidden from screen readers', () => {
    const { container } = render(<RandomGlyph size={44} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
