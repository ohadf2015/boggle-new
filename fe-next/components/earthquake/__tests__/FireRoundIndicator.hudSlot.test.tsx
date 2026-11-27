import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FireRoundIndicator, HUD_FIRE_SLOT } from '../FireRoundIndicator';

const a11y = vi.hoisted(() => ({ reduce: false, noLights: false }));
vi.mock('@/contexts/AccessibilityContext', () => ({
  useDisableFireRoundLights: () => a11y.noLights,
  useShouldReduceMotion: () => a11y.reduce,
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

function Hud() {
  return <div data-testid="hud"><span {...{ [HUD_FIRE_SLOT]: '' }} /></div>;
}

describe('FireRoundIndicator lives in the HUD row, never over the board', () => {
  beforeEach(() => { a11y.reduce = false; a11y.noLights = false; });

  it.each([
    ['full motion', false],
    ['reduced motion', true],
  ])('renders inside the HUD fire slot with no fixed positioning (%s)', (_label, reduce) => {
    a11y.reduce = reduce;
    render(<><Hud /><FireRoundIndicator isActive remainingSeconds={12} /></>);
    const chip = screen.getByRole('status');
    expect(screen.getByTestId('hud').contains(chip)).toBe(true);
    let el: HTMLElement | null = chip;
    while (el) { expect(el.className).not.toMatch(/\bfixed\b/); el = el.parentElement; }
    expect(chip).toHaveTextContent('12s');
    expect(chip).toHaveTextContent('earthquake.fireChip');
    expect(chip).toHaveTextContent('earthquake.effect');
  });

  it('renders nothing once the fire round ends', () => {
    const { rerender } = render(<><Hud /><FireRoundIndicator isActive remainingSeconds={1} /></>);
    rerender(<><Hud /><FireRoundIndicator isActive={false} remainingSeconds={0} /></>);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders nothing when no HUD slot is mounted, so it can never float over the board', () => {
    render(<FireRoundIndicator isActive remainingSeconds={12} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
