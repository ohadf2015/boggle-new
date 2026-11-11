import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RARITY_ORDER, RARITY_TOKENS } from '@/lib/avatar/rarity';
import { RARITY_COLORS, COSMETICS } from '@/lib/cosmetics';
import { RarityChip } from '../RarityChip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

describe('RarityChip — one rarity look everywhere', () => {
  it.each(RARITY_ORDER)('renders the shared %s label and color', (rarity) => {
    // Given a rarity from the shared scheme
    render(<RarityChip rarity={rarity} />);
    // Then the chip shows the shared label with the shared token color
    const chip = screen.getByTestId('rarity-chip');
    expect(chip).toHaveAttribute('data-rarity', rarity);
    expect(chip).toHaveTextContent(RARITY_TOKENS[rarity].labelKey);
    expect(chip.className).toContain(RARITY_TOKENS[rarity].text);
  });

  it('cosmetics use the avatar rarity colors, not their own scheme', () => {
    // Given the cosmetics color map
    // Then each rarity matches the avatar token text + border
    for (const r of RARITY_ORDER) {
      expect(RARITY_COLORS[r]).toContain(RARITY_TOKENS[r].text);
      expect(RARITY_COLORS[r]).toContain(RARITY_TOKENS[r].border);
    }
  });

  it('every cosmetic rarity is one of the four shared tiers', () => {
    for (const c of COSMETICS) expect(RARITY_ORDER).toContain(c.rarity);
  });
});
