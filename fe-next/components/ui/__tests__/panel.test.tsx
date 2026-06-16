/**
 * Tests for NeoPanel — shared lightweight neo-brutalist box shell.
 *
 * NeoPanel consolidates the most hand-rolled pattern in the app:
 * `border-3 border-neo-black rounded-neo` + tone bg + shadow-hard*.
 * Boundary: lightweight box (vs heavy full-height `Card`).
 */

import React from 'react';
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { NeoPanel } from '../panel';

describe('NeoPanel', () => {
  it('always renders the neo-brutalist box base', () => {
    const { container } = render(<NeoPanel>x</NeoPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('border-3', 'border-neo-black', 'rounded-neo');
  });

  it('defaults to shadow-hard (md) and no tone bg', () => {
    const { container } = render(<NeoPanel>x</NeoPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('shadow-hard');
    expect(el.className).not.toMatch(/bg-neo-/);
  });

  describe('tone', () => {
    it('navy → bg-neo-navy', () => {
      const { container } = render(<NeoPanel tone="navy">x</NeoPanel>);
      expect(container.firstChild as HTMLElement).toHaveClass('bg-neo-navy');
    });
    it('cream → bg-neo-cream', () => {
      const { container } = render(<NeoPanel tone="cream">x</NeoPanel>);
      expect(container.firstChild as HTMLElement).toHaveClass('bg-neo-cream');
    });
  });

  describe('shadow', () => {
    it('sm → shadow-hard-sm', () => {
      const { container } = render(<NeoPanel shadow="sm">x</NeoPanel>);
      expect(container.firstChild as HTMLElement).toHaveClass('shadow-hard-sm');
    });
    it('lg → shadow-hard-lg', () => {
      const { container } = render(<NeoPanel shadow="lg">x</NeoPanel>);
      expect(container.firstChild as HTMLElement).toHaveClass('shadow-hard-lg');
    });
    it('none → no shadow class', () => {
      const { container } = render(<NeoPanel shadow="none">x</NeoPanel>);
      expect((container.firstChild as HTMLElement).className).not.toMatch(/shadow-hard/);
    });
  });

  describe('radius', () => {
    it('neo-lg → rounded-neo-lg (not plain rounded-neo)', () => {
      const { container } = render(<NeoPanel radius="neo-lg">x</NeoPanel>);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass('rounded-neo-lg');
      // base rounded-neo must NOT also be present (would double-apply radius)
      expect(el.className.split(/\s+/)).not.toContain('rounded-neo');
    });
  });

  it('passes through className (padding/layout owned by caller)', () => {
    const { container } = render(<NeoPanel className="p-4 space-y-3">x</NeoPanel>);
    expect(container.firstChild as HTMLElement).toHaveClass('p-4', 'space-y-3');
  });

  it('forwards arbitrary div props and ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <NeoPanel ref={ref} data-testid="panel" role="region" aria-label="stats">
        x
      </NeoPanel>
    );
    const el = getByTestId('panel');
    expect(el).toHaveAttribute('role', 'region');
    expect(el).toHaveAttribute('aria-label', 'stats');
    expect(ref.current).toBe(el);
  });

  describe('asChild (compose with motion / custom elements)', () => {
    it('renders the child element, merging panel classes onto it', () => {
      const { container } = render(
        <NeoPanel asChild tone="navy" shadow="lg">
          <section className="p-5 max-w-[280px]">content</section>
        </NeoPanel>
      );
      const el = container.firstChild as HTMLElement;
      // child element type preserved (section, not div)
      expect(el.tagName).toBe('SECTION');
      // panel variant classes merged onto the child
      expect(el).toHaveClass('border-3', 'border-neo-black', 'bg-neo-navy', 'shadow-hard-lg');
      // child's own className preserved
      expect(el).toHaveClass('p-5', 'max-w-[280px]');
    });

    it('preserves the child class set ∪ panel classes (motion-wrapper contract)', () => {
      // Mirrors a real motion panel: <m.div className="bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard-lg p-5 ...">
      const { container } = render(
        <NeoPanel asChild tone="navy" shadow="lg">
          <div className="p-5 max-w-[280px] flex flex-col items-center gap-3">x</div>
        </NeoPanel>
      );
      const got = new Set((container.firstChild as HTMLElement).className.split(/\s+/));
      [
        'bg-neo-navy', 'border-3', 'border-neo-black', 'rounded-neo', 'shadow-hard-lg',
        'p-5', 'max-w-[280px]', 'flex', 'flex-col', 'items-center', 'gap-3',
      ].forEach((c) => expect(got.has(c)).toBe(true));
    });

    it('forwards child-owned props (e.g. onClick) untouched', () => {
      const onClick = vi.fn();
      const { getByTestId } = render(
        <NeoPanel asChild tone="cream">
          <div data-testid="c" onClick={onClick}>x</div>
        </NeoPanel>
      );
      getByTestId('c').click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  it('reproduces a real navy panel class set verbatim (class-equality contract)', () => {
    // Mirrors e.g. `bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard p-4`
    const { container } = render(
      <NeoPanel tone="navy" shadow="md" className="p-4">x</NeoPanel>
    );
    const got = new Set((container.firstChild as HTMLElement).className.split(/\s+/));
    ['bg-neo-navy', 'border-3', 'border-neo-black', 'rounded-neo', 'shadow-hard', 'p-4'].forEach(
      (c) => expect(got.has(c)).toBe(true)
    );
  });
});
