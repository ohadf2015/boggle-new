/**
 * Prestige Tier Chip — neo-brutalist visual + per-tier glint stack.
 * Verifies chip swaps emoji for filled <Star/>, layers extra glints by tier,
 * and exposes prestige level via data attribute for QA hooks.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import XpProgressBar from '../XpProgressBar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params && Object.keys(params).length) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  }),
}));

vi.mock('../engagement/PrestigeModal', () => ({
  __esModule: true,
  default: () => null,
}));

const xpForLevel20 = 20 * 100; // sufficient totalXp; exact internal numbers irrelevant for chip test

describe('XpProgressBar — Prestige Tier Chip', () => {
  it('does NOT render chip when prestigeLevel is 0', () => {
    render(<XpProgressBar totalXp={xpForLevel20} prestigeLevel={0} />);
    expect(screen.queryByTestId('prestige-tier-chip')).toBeNull();
  });

  it('renders chip for prestige 1 with zero extra glints (bronze)', () => {
    const { container } = render(<XpProgressBar totalXp={xpForLevel20} prestigeLevel={1} />);
    const chip = screen.getByTestId('prestige-tier-chip');
    expect(chip).toBeInTheDocument();
    expect(chip.getAttribute('data-prestige-level')).toBe('1');
    // Bronze gradient class baked in
    expect(chip.className).toMatch(/from-amber-600/);
    // Star icon (lucide renders <svg class="lucide-star">)
    expect(chip.querySelector('svg')).not.toBeNull();
    // Bronze tier — only the single star surface glint, no scattered background glints
    const positionedGlints = chip.querySelectorAll('span[style*="inset-inline-start"]');
    expect(positionedGlints.length).toBe(1);
  });

  it('layers more glints as tier rises (cosmic = 4 extra + 1 surface = 5)', () => {
    render(<XpProgressBar totalXp={xpForLevel20} prestigeLevel={5} />);
    const chip = screen.getByTestId('prestige-tier-chip');
    expect(chip.className).toMatch(/from-fuchsia-600/);
    const positionedGlints = chip.querySelectorAll('span[style*="inset-inline-start"]');
    // 4 background glints + 1 surface glint on the star
    expect(positionedGlints.length).toBe(5);
  });

  it('uses dark numeral on silver tier (light bg) and white elsewhere', () => {
    const { rerender } = render(<XpProgressBar totalXp={xpForLevel20} prestigeLevel={2} />);
    let numeral = screen.getByTestId('prestige-tier-chip').querySelector('span.font-black');
    expect(numeral?.className).toMatch(/text-neo-black/);

    rerender(<XpProgressBar totalXp={xpForLevel20} prestigeLevel={3} />);
    numeral = screen.getByTestId('prestige-tier-chip').querySelector('span.font-black');
    expect(numeral?.className).toMatch(/text-white/);
  });
});
