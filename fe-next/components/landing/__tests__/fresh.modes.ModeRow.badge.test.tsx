/**
 * Test: ModeRow NEW badges on featured cards (adventure, wordTowerV2).
 *
 * Enforcement: Featured cards (adventure and wordTowerV2) display a NEW badge
 * (no other cards in the fresh row have badges). The badge text comes from
 * landing.badge.new in translations, and the badge appears in the top-right
 * corner of the card.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

const lang = { language: 'en', dir: 'ltr' as 'ltr' | 'rtl' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => {
      if (k === 'landing.badge.new') return 'New';
      if (k === 'landing.badge.beta') return 'Beta';
      return k;
    },
    language: lang.language,
    dir: lang.dir,
  }),
}));

const trackLandingCtaClick = vi.fn();
const trackModeSelected = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...a: unknown[]) => trackLandingCtaClick(...a),
  trackModeSelected: (...a: unknown[]) => trackModeSelected(...a),
  trackGrowthEvent: vi.fn(),
}));

import { ModeRow } from '../fresh/ModeRow';

describe('ModeRow — NEW badges on featured cards', () => {
  beforeEach(() => {
    lang.language = 'en';
    lang.dir = 'ltr';
    trackLandingCtaClick.mockClear();
    trackModeSelected.mockClear();
  });

  it('adventure card displays NEW badge', () => {
    const { container } = render(<ModeRow />);
    const adventureCard = container.querySelector('[data-mode="adventure"]');
    expect(adventureCard).toBeTruthy();

    const badge = adventureCard?.querySelector('[data-testid="mode-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.toUpperCase()).toBe('NEW');
  });

  it('wordTowerV2 card displays NEW badge', () => {
    const { container } = render(<ModeRow />);
    const wtCard = container.querySelector('[data-mode="wordTowerV2"]');
    expect(wtCard).toBeTruthy();

    const badge = wtCard?.querySelector('[data-testid="mode-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.toUpperCase()).toBe('NEW');
  });

  it('other cards (wordCraft, connections, brainGym, blast) do NOT display badges', () => {
    const { container } = render(<ModeRow />);
    for (const mode of ['wordCraft', 'connections', 'brainGym', 'blast']) {
      const card = container.querySelector(`[data-mode="${mode}"]`);
      const badge = card?.querySelector('[data-testid="mode-badge"]');
      expect(badge, `${mode} should NOT have a badge`).toBeNull();
    }
  });

  it('badges have correct styling (positioned top-right, lime bg for featured cards)', () => {
    const { container } = render(<ModeRow />);
    const adventureBadge = container.querySelector('[data-mode="adventure"] [data-testid="mode-badge"]');
    const classes = adventureBadge?.getAttribute('class') || '';

    // Should have positioning and styling classes
    expect(classes).toContain('absolute');
    expect(classes).toContain('top-');
    expect(classes).toContain('end-');
    expect(classes).toContain('bg-neo-lime'); // Featured cards use lime bg
  });
});
