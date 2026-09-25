/**
 * Test: Adventure card appears on fresh (guest) homepage with NEW badge,
 * positioned first in the mode row (with Word Tower V2 second).
 *
 * Regression: adventure.playCount = 0 on the server, so it doesn't appear in
 * the popularity-ranked list. The guest row must still surface it like the
 * returning-visitor hub does (class-1 dual source of truth: force-append when
 * popularity data has no stats).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const lang = { language: 'en', dir: 'ltr' as 'ltr' | 'rtl' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.language, dir: lang.dir }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
  trackModeSelected: vi.fn(),
}));

import { ModeRow, FRESH_MODE_KEYS } from '../fresh/ModeRow';

describe('ModeRow (fresh) — Adventure card for guests', () => {
  it('Adventure is the first card in FRESH_MODE_KEYS', () => {
    expect(FRESH_MODE_KEYS[0]).toBe('adventure');
  });

  it('Word Tower V2 is the second card', () => {
    expect(FRESH_MODE_KEYS[1]).toBe('wordTowerV2');
  });

  it('renders adventure as the first mode card with href /en/adventure', () => {
    const { container } = render(<ModeRow />);
    const cards = [...container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')];
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0];
    expect(firstCard.getAttribute('data-mode')).toBe('adventure');
    expect(firstCard.getAttribute('href')).toBe('/en/adventure');
  });

  it('second card is word tower v2 with href /en/word-tower', () => {
    const { container } = render(<ModeRow />);
    const cards = [...container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')];
    expect(cards[1].getAttribute('data-mode')).toBe('wordTowerV2');
    expect(cards[1].getAttribute('href')).toBe('/en/word-tower');
  });

  it('does not filter out adventure from FRESH_MODE_KEYS', () => {
    expect(FRESH_MODE_KEYS).toContain('adventure');
  });

  it('all mode cards are accessible (links have localized hrefs)', () => {
    const { container } = render(<ModeRow />);
    const cards = [...container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')];
    for (const card of cards) {
      const href = card.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^\/en\//);
    }
  });

  it('Adventure card displays a NEW badge', () => {
    const { container } = render(<ModeRow />);
    const cards = [...container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')];
    const adventureCard = cards[0];
    expect(adventureCard.getAttribute('data-mode')).toBe('adventure');
    const badge = adventureCard.querySelector('[data-testid="mode-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.toUpperCase()).toContain('NEW');
  });

  it('Word Tower V2 card displays a NEW badge', () => {
    const { container } = render(<ModeRow />);
    const cards = [...container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')];
    const wtv2Card = cards[1];
    expect(wtv2Card.getAttribute('data-mode')).toBe('wordTowerV2');
    const badge = wtv2Card.querySelector('[data-testid="mode-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.toUpperCase()).toContain('NEW');
  });

  it('Blast card does NOT display a badge (only featured modes show badges)', () => {
    const { container } = render(<ModeRow />);
    const cards = [...container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')];
    const blastCard = cards.find((c) => c.getAttribute('data-mode') === 'blast');
    expect(blastCard).toBeTruthy();
    const badge = blastCard?.querySelector('[data-testid="mode-badge"]');
    expect(badge).toBeFalsy();
  });
});
