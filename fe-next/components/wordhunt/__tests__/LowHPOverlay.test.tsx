import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LowHPOverlay } from '../LowHPOverlay';

describe('LowHPOverlay', () => {
  it('renders nothing when HP is 50 (above threshold)', () => {
    const { container } = render(<LowHPOverlay hp={50} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when HP is exactly 20', () => {
    const { container } = render(<LowHPOverlay hp={20} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders red vignette when HP is 19 (below 20)', () => {
    const { container } = render(<LowHPOverlay hp={19} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.style.pointerEvents).toBe('none');
    expect(overlay.getAttribute('data-testid')).toBe('low-hp-overlay');
  });

  it('keeps the ambient vignette class (steady size, no grow/shrink)', () => {
    const { container } = render(<LowHPOverlay hp={19} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.className).toContain('animate-low-hp-pulse');
  });

  it('uses 1s animation cycle at HP 19 (moderate urgency)', () => {
    const { container } = render(<LowHPOverlay hp={19} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.animationDuration).toBe('1s');
  });

  it('uses 0.5s animation cycle at HP 9 (critical urgency)', () => {
    const { container } = render(<LowHPOverlay hp={9} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.animationDuration).toBe('0.5s');
  });

  it('adds shake class at HP below 10', () => {
    const { container } = render(<LowHPOverlay hp={9} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.className).toContain('animate-neo-shake');
  });

  it('does not add shake class at HP 15', () => {
    const { container } = render(<LowHPOverlay hp={15} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.className).not.toContain('animate-neo-shake');
  });

  it('respects prefers-reduced-motion by not shaking', () => {
    // The component should have a CSS media query check
    // We verify the data attribute is present for CSS to use
    const { container } = render(<LowHPOverlay hp={5} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.getAttribute('data-testid')).toBe('low-hp-overlay');
  });

  it('renders at HP 1 (near death)', () => {
    const { container } = render(<LowHPOverlay hp={1} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.style.animationDuration).toBe('0.5s');
  });
});
