import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => false }));
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

import { SkipAnimationsProvider } from '../AdaptiveMotion';
import { AmbientBackdrop } from '../AmbientBackdrop';

const layer = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-ambient]')!;

describe('AmbientBackdrop', () => {
  it('is decorative: hidden from assistive tech, untappable, clipped', () => {
    const { container } = render(<AmbientBackdrop theme="home" />);
    const el = layer(container);
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toContain('pointer-events-none');
    expect(el.className).toContain('overflow-hidden');
  });

  it('drifts when motion is allowed and is static under reduced motion', () => {
    const { container, unmount } = render(<AmbientBackdrop theme="daily" />);
    expect(layer(container).querySelectorAll('.neo-ambient-bob').length).toBeGreaterThan(0);
    unmount();
    const still = render(
      <SkipAnimationsProvider skip>
        <AmbientBackdrop theme="daily" />
      </SkipAnimationsProvider>,
    );
    expect(layer(still.container).querySelectorAll('.neo-ambient-bob')).toHaveLength(0);
  });

  it('draws more shapes when lively, within 4-8', () => {
    const calm = render(<AmbientBackdrop theme="solo" density="calm" />);
    const n1 = layer(calm.container).querySelectorAll('[data-shape]').length;
    calm.unmount();
    const lively = render(<AmbientBackdrop theme="solo" density="lively" />);
    const n2 = layer(lively.container).querySelectorAll('[data-shape]').length;
    expect(n1).toBeGreaterThanOrEqual(4);
    expect(n2).toBeGreaterThan(n1);
    expect(n2).toBeLessThanOrEqual(8);
  });

  it('tints shapes with the theme accent', () => {
    const { container } = render(<AmbientBackdrop theme="multiplayer" />);
    expect(layer(container).innerHTML).toContain('neo-pink');
    expect(layer(container).innerHTML).not.toContain('neo-lime');
  });

  it('covers the teacher and student themes', () => {
    const teacher = render(<AmbientBackdrop theme="teacher" />);
    expect(layer(teacher.container).innerHTML).toContain('neo-yellow');
    teacher.unmount();
    const student = render(<AmbientBackdrop theme="student" />);
    expect(layer(student.container).innerHTML).toContain('neo-cyan');
  });

  it('outlines every shape crisply in the accent over a faint fill', () => {
    const { container } = render(<AmbientBackdrop theme="daily" density="lively" />);
    const html = layer(container).innerHTML;
    expect(html).toContain('border-neo-orange/40');
    expect(html).toContain('stroke-neo-orange/40');
    expect(html).toContain('bg-neo-orange/12');
  });

  it('puts one big letter on each tile, the same on server and client', () => {
    const letters = () => {
      const { container, unmount } = render(<AmbientBackdrop theme="home" density="lively" />);
      const out = [...layer(container).querySelectorAll('[data-letter]')].map((n) => n.textContent);
      unmount();
      return out;
    };
    const a = letters();
    expect(a).toHaveLength(3);
    a.forEach((l) => expect(l).toMatch(/^[A-Z]$/));
    expect(letters()).toEqual(a);
  });

  it('draws the bottom hill unless hill is off', () => {
    const on = render(<AmbientBackdrop theme="home" />);
    expect(layer(on.container).querySelector('[data-hill]')).not.toBeNull();
    on.unmount();
    const off = render(<AmbientBackdrop theme="home" hill={false} />);
    expect(layer(off.container).querySelector('[data-hill]')).toBeNull();
    expect(layer(off.container).querySelectorAll('[data-shape]').length).toBeGreaterThan(0);
  });

  it('pauses while the tab is hidden', () => {
    const { container } = render(<AmbientBackdrop theme="profile" />);
    const vis = vi.spyOn(document, 'visibilityState', 'get');
    vis.mockReturnValue('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(layer(container)).toHaveAttribute('data-paused', 'true');
    vis.mockReturnValue('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(layer(container)).not.toHaveAttribute('data-paused');
    vis.mockRestore();
  });
});
