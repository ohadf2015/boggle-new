import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextQuestCta } from '../NextQuestCta';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({
    today: { wordHunt: false, wordWheel: true, wordTower: false, connections: false },
    streak: { current: 1, longest: 1 }, loading: false, refresh: vi.fn(),
  }),
}));

/* The next-quest card is the screen's one job after a daily ends: a solid
   mode-coloured slab with a big title, not a quiet navy row. */
describe('NextQuestCta is the loud primary action', () => {
  it('is a solid accent slab, tall, with a large display title', () => {
    render(<NextQuestCta justFinished="word-wheel" currentLanguage="en" />);
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta.className).toMatch(/\bbg-neo-(orange|yellow|cyan|purple)\b/);
    expect(cta.className).not.toContain('bg-neo-navy');
    expect(cta.className).toMatch(/min-h-\[/);
    expect(cta.className).toContain('border-neo-black');
    const title = cta.querySelector('.font-neo-display');
    expect(title?.className).toMatch(/text-2xl/);
    expect(title?.className).toMatch(/md:text-4xl/);
    expect(title?.className).toContain('uppercase');
  });

  it('skeleton reserves the same height as the slab (no layout jump)', () => {
    render(<NextQuestCta justFinished="word-wheel" currentLanguage="en" />);
    const cta = screen.getByTestId('next-quest-cta');
    const h = cta.className.match(/min-h-\[(\d+px)\]/)?.[1];
    expect(h).toBeTruthy();
  });
});
