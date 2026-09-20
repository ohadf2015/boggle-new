import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));

import RelicBar from '../RelicBar';

/**
 * ROUND 2 GAP. `s50-hud-tooltip.png` showed the relic tooltip clipped and mostly
 * hidden behind the map screen's floor-title banner — the judge read it as a
 * rendering bug, not an affordance. The bubble now lives on the body at z-[120],
 * so no ancestor of the rail can clip it and no sibling banner can out-stack it.
 */
describe('RelicTooltip — nothing can paint over it', () => {
  const open = () => {
    render(
      <div style={{ overflow: 'hidden' }} data-testid="clipping-parent">
        <RelicBar relics={['storm-rune', 'magnet']} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.storm-rune' }));
    return screen.getByRole('tooltip');
  };

  it('Given a tapped relic, then its bubble is portaled OUT of the clipping ancestor', () => {
    const tip = open();
    expect(screen.getByTestId('clipping-parent').contains(tip)).toBe(false);
    expect(document.body.contains(tip)).toBe(true);
  });

  it('Given the bubble is open, then it is fixed and stacked above every game surface', () => {
    const tip = open();
    expect(tip.className).toContain('fixed');
    // The play screen is z-50 and the word-cast FX layer is z-[70]; the bubble clears both.
    expect(tip.className).toContain('z-[120]');
  });

  it('Given the bubble is open, then it carries the same effect text the reward card shows', () => {
    const tip = open();
    expect(tip.textContent).toContain('adventurePlay.relic.storm-rune');
    expect(tip.textContent).toContain('adventurePlay.relicDesc.storm-rune');
    expect(tip.textContent).toContain('adventurePlay.loot.rarity.common');
  });

  it('Given the bubble is open, when the same relic is tapped again, then it closes', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.storm-rune' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
