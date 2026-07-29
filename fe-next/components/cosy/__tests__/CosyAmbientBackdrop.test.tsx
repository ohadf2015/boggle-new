import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CosyAmbientBackdrop } from '../CosyAmbientBackdrop';

let cosyOn = false;
vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => cosyOn,
}));

describe('CosyAmbientBackdrop', () => {
  beforeEach(() => {
    cosyOn = false;
  });

  it('renders nothing when cosy mode is off (zero cost for the loud default)', () => {
    cosyOn = false;
    const { container } = render(<CosyAmbientBackdrop />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a soft ambient layer when cosy mode is on', () => {
    cosyOn = true;
    render(<CosyAmbientBackdrop />);
    expect(screen.getByTestId('cosy-ambient-backdrop')).toBeInTheDocument();
  });

  it('is purely decorative and never interactive (aria-hidden, no pointer events)', () => {
    cosyOn = true;
    render(<CosyAmbientBackdrop />);
    const layer = screen.getByTestId('cosy-ambient-backdrop');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.className).toContain('pointer-events-none');
  });

  it('sits behind app content (fixed, negative z) so it is atmosphere, not chrome', () => {
    cosyOn = true;
    render(<CosyAmbientBackdrop />);
    const layer = screen.getByTestId('cosy-ambient-backdrop');
    expect(layer.className).toContain('fixed');
    expect(layer.className).toMatch(/-z-/);
  });
});
