/**
 * Mode glyph contract.
 *
 * The set this replaced failed as a SET, not as individual drawings: four
 * unrelated metaphors, four inks, and nonsense letterforms baked into the
 * raster art. These assertions are the contract that stops that recurring —
 * they are cheap and they are the rules a human eye misses on a contact sheet.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ModeGlyph, MODE_GLYPHS, GLYPH_VIEWBOX } from '../ModeGlyph';
import { QUICK_MODES } from '../types';

describe('ModeGlyph contract', () => {
  it('provides exactly one glyph per quick mode', () => {
    expect(Object.keys(MODE_GLYPHS).sort()).toEqual([...QUICK_MODES].sort());
  });

  it.each(QUICK_MODES)('%s renders a single svg on the shared viewBox', (mode) => {
    const { container } = render(<ModeGlyph mode={mode} size={44} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute('viewBox')).toBe(GLYPH_VIEWBOX);
  });

  it.each(QUICK_MODES)('%s carries NO letterform — a word game must not draw letters into its icons', (mode) => {
    const { container } = render(<ModeGlyph mode={mode} size={44} />);
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelector('tspan')).toBeNull();
    expect(container.querySelector('textPath')).toBeNull();
  });

  it.each(QUICK_MODES)('%s inks only in currentColor so the keycap owns the color', (mode) => {
    const { container } = render(<ModeGlyph mode={mode} size={44} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    for (const el of Array.from(svg.querySelectorAll('*'))) {
      const fill = el.getAttribute('fill');
      const stroke = el.getAttribute('stroke');
      if (fill) expect(['currentColor', 'none']).toContain(fill);
      if (stroke) expect(['currentColor', 'none']).toContain(stroke);
    }
  });

  it.each(QUICK_MODES)('%s renders at the requested pixel size', (mode) => {
    const { container } = render(<ModeGlyph mode={mode} size={31} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('31');
    expect(svg.getAttribute('height')).toBe('31');
  });

  it('draws a distinct silhouette per mode (no two glyphs share geometry)', () => {
    const markup = QUICK_MODES.map((mode) => {
      const { container } = render(<ModeGlyph mode={mode} size={44} />);
      return container.querySelector('svg')!.innerHTML;
    });
    expect(new Set(markup).size).toBe(QUICK_MODES.length);
  });
});
