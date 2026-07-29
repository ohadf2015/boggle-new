import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftLegendChip } from '../WordCraftLegendChip';

const t = (k: string) => `[${k}]`;

describe('WordCraftLegendChip', () => {
  it('renders 4 premium swatches whose tints match the board (pink word, cyan letter)', () => {
    const { container } = render(<WordCraftLegendChip t={t} />);
    // Legend must mirror WordCraftBoard PREMIUM_TINT: word bonuses are pink,
    // letter bonuses are cyan. Previously the legend used lime/purple, which
    // disagreed with the actual board colours and confused players.
    expect(container.querySelector('[data-premium="TW"]')?.className).toMatch(/bg-neo-pink/);
    expect(container.querySelector('[data-premium="DW"]')?.className).toMatch(/bg-neo-pink/);
    expect(container.querySelector('[data-premium="TL"]')?.className).toMatch(/bg-neo-cyan/);
    expect(container.querySelector('[data-premium="DL"]')?.className).toMatch(/bg-neo-cyan/);
  });

  it('uses translation keys for labels', () => {
    render(<WordCraftLegendChip t={t} />);
    expect(screen.getByText('[wordcraft.legend.tw]')).toBeTruthy();
    expect(screen.getByText('[wordcraft.legend.dw]')).toBeTruthy();
    expect(screen.getByText('[wordcraft.legend.tl]')).toBeTruthy();
    expect(screen.getByText('[wordcraft.legend.dl]')).toBeTruthy();
  });

  it('exposes the title via aria-label', () => {
    const { container } = render(<WordCraftLegendChip t={t} />);
    expect((container.firstChild as HTMLElement)?.getAttribute('aria-label'))
      .toBe('[wordcraft.legend.title]');
  });
});
