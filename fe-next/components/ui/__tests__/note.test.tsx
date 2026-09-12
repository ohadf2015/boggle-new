/**
 * Tests for NeoNote — the tinted callout tile.
 *
 * Consolidates the hand-rolled `p-3 rounded-neo border border-neo-<accent>/40
 * bg-neo-<accent>/10` pattern (15 inline copies across 9 education files, with
 * border opacity drifting 30/40/60 and fill drifting 10/60).
 *
 * Contrast contract: a translucent accent border on navy fails the 3:1 non-text
 * edge gate (pink/40 = 1.69:1, red/40 = 1.72:1). Solid accent borders pass
 * (min 4.35:1) and match the brand's "solid borders" rule.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NeoNote } from '../note';

describe('NeoNote', () => {
  it('renders the shared tile base', () => {
    const { container } = render(<NeoNote>x</NeoNote>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('rounded-neo', 'border-2', 'p-3');
  });

  describe('tone → literal class strings', () => {
    // Tailwind v4 generates arbitrary/opacity utilities ONLY from literal class
    // strings, so each variant must hold its complete string — never built by
    // interpolation.
    const cases: Array<[string, string, string]> = [
      ['ok', 'border-neo-lime', 'bg-neo-lime/10'],
      ['alert', 'border-neo-pink', 'bg-neo-pink/10'],
      ['info', 'border-neo-cyan', 'bg-neo-cyan/10'],
      ['danger', 'border-neo-red', 'bg-neo-red/10'],
      ['muted', 'border-neo-cream/40', 'bg-neo-navy/60'],
    ];
    it.each(cases)('%s → %s + %s', (tone, border, bg) => {
      const { container } = render(<NeoNote tone={tone as never}>x</NeoNote>);
      expect(container.firstChild as HTMLElement).toHaveClass(border, bg);
    });
  });

  it('never emits a translucent accent border (fails the 3:1 edge gate)', () => {
    (['ok', 'alert', 'info', 'danger'] as const).forEach((tone) => {
      const { container } = render(<NeoNote tone={tone}>x</NeoNote>);
      const cls = (container.firstChild as HTMLElement).className;
      expect(cls).not.toMatch(/border-neo-(lime|pink|cyan|red)\/\d+/);
    });
  });

  it('never lands a bare `ring` class (Tailwind utility — paints a blue box)', () => {
    const { container } = render(<NeoNote tone="ok">x</NeoNote>);
    expect((container.firstChild as HTMLElement).className.split(/\s+/)).not.toContain('ring');
  });

  it('supports a dashed border for placeholder/redacted notes', () => {
    const { container } = render(<NeoNote tone="muted" dashed>x</NeoNote>);
    expect(container.firstChild as HTMLElement).toHaveClass('border-dashed');
  });

  it('passes through className and arbitrary props', () => {
    const { getByTestId } = render(
      <NeoNote className="mb-4" data-testid="n" role="status">x</NeoNote>
    );
    const el = getByTestId('n');
    expect(el).toHaveClass('mb-4');
    expect(el).toHaveAttribute('role', 'status');
  });

  it('forwards a ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByTestId } = render(<NeoNote ref={ref} data-testid="n">x</NeoNote>);
    expect(ref.current).toBe(getByTestId('n'));
  });
});
