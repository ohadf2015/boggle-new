import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { start, controls } = vi.hoisted(() => {
  const start = vi.fn(() => Promise.resolve());
  return { start, controls: { start, stop: () => {}, set: () => {} } };
});
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useAnimationControls: () => controls,
}));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => false }));
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

import { SkipAnimationsProvider } from '../AdaptiveMotion';
import { PopIn, Stagger } from '../PopIn';
import { SpringProgress } from '../SpringProgress';
import { MascotRig } from '../MascotRig';

describe('PopIn / Stagger', () => {
  it('starts small and lower when motion is allowed, without hiding the content', () => {
    render(<PopIn data-testid="p">Hi</PopIn>);
    const el = screen.getByTestId('p');
    expect(el.style.transform).toMatch(/scale\(0\.92\)/);
    expect(el.style.opacity).toBe('');
  });

  it('renders static under reduced motion', () => {
    render(
      <SkipAnimationsProvider skip>
        <PopIn data-testid="p">Hi</PopIn>
      </SkipAnimationsProvider>,
    );
    expect(screen.getByTestId('p').style.transform).toBe('');
  });

  it('wraps each child of Stagger in its own pop', () => {
    render(
      <Stagger as="ul" itemAs="li" data-testid="list">
        <span>a</span>
        <span>b</span>
      </Stagger>,
    );
    const list = screen.getByTestId('list');
    expect(list.tagName).toBe('UL');
    expect(list.querySelectorAll(':scope > li')).toHaveLength(2);
  });
});

describe('SpringProgress', () => {
  it('exposes value to assistive tech and scales the fill', () => {
    render(
      <SkipAnimationsProvider skip>
        <SpringProgress value={3} max={4} label="Daily goal" />
      </SkipAnimationsProvider>,
    );
    const bar = screen.getByRole('progressbar', { name: 'Daily goal' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
    expect(bar.querySelector<HTMLElement>('[data-part="fill"]')!.style.transform).toBe('scaleX(0.75)');
  });

  it('clamps out-of-range values', () => {
    render(
      <SkipAnimationsProvider skip>
        <SpringProgress value={9} max={4} label="x" />
      </SkipAnimationsProvider>,
    );
    expect(screen.getByRole('progressbar').querySelector<HTMLElement>('[data-part="fill"]')!.style.transform).toBe('scaleX(1)');
  });

  it('treats a non-finite value as empty instead of re-rendering forever', () => {
    const { rerender } = render(<SpringProgress value={Number.NaN} max={4} label="x" />);
    rerender(<SpringProgress value={Number.NaN} max={4} label="x" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar.querySelector('[data-part="shine"]')).toBeNull();
  });

  it('sweeps a shine only when the value goes up', () => {
    const { rerender } = render(<SpringProgress value={1} max={4} label="x" />);
    const bar = () => screen.getByRole('progressbar');
    expect(bar().querySelector('[data-part="shine"]')).toBeNull();
    rerender(<SpringProgress value={2} max={4} label="x" />);
    expect(bar().querySelector('[data-part="shine"]')).not.toBeNull();
    rerender(<SpringProgress value={1} max={4} label="x" />);
    expect(bar().querySelector('[data-part="shine"]')).toBeNull();
  });

  it('never shines under reduced motion', () => {
    const { rerender } = render(
      <SkipAnimationsProvider skip>
        <SpringProgress value={1} max={4} label="x" />
      </SkipAnimationsProvider>,
    );
    rerender(
      <SkipAnimationsProvider skip>
        <SpringProgress value={3} max={4} label="x" />
      </SkipAnimationsProvider>,
    );
    expect(screen.getByRole('progressbar').querySelector('[data-part="shine"]')).toBeNull();
  });

  it('has a calm cream tone', () => {
    render(<SpringProgress value={1} max={2} label="x" tone="cream" />);
    expect(screen.getByRole('progressbar').querySelector('[data-part="fill"]')).toHaveClass('bg-neo-cream');
  });

  it('draws segment ticks between segments', () => {
    render(<SpringProgress value={1} max={5} segments={5} label="x" />);
    expect(screen.getByRole('progressbar').querySelectorAll('[data-part="tick"]')).toHaveLength(4);
  });
});

describe('MascotRig', () => {
  beforeEach(() => start.mockClear());

  it('breathes when idle and plays a one-shot when the state changes', () => {
    const { rerender } = render(<MascotRig state="idle"><span role="img" aria-label="mascot" /></MascotRig>);
    const rig = screen.getByTestId('mascot-rig');
    expect(rig.className).toContain('neo-mascot-idle');
    expect(start).not.toHaveBeenCalled();
    rerender(<MascotRig state="hop"><span role="img" aria-label="mascot" /></MascotRig>);
    expect(start).toHaveBeenCalledTimes(1);
    expect(rig).toHaveAttribute('data-state', 'hop');
  });

  it('replays the same reaction when play changes', () => {
    const { rerender } = render(<MascotRig state="wiggle" play={0}><span role="img" aria-label="m" /></MascotRig>);
    rerender(<MascotRig state="wiggle" play={1}><span role="img" aria-label="m" /></MascotRig>);
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('is fully still under reduced motion', () => {
    render(
      <SkipAnimationsProvider skip>
        <MascotRig state="cheer"><span role="img" aria-label="m" /></MascotRig>
      </SkipAnimationsProvider>,
    );
    expect(start).not.toHaveBeenCalled();
    expect(screen.getByTestId('mascot-rig').className).not.toContain('neo-mascot-idle');
    expect(screen.getByRole('img', { name: 'm' })).toBeInTheDocument();
  });
});

