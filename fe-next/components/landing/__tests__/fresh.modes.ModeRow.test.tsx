/**
 * Piece C (modes): section 4 of the fresh homepage is a swipeable scroll-snap
 * row of mode cards. Given a fresh (logged-out) visitor, the row must only
 * offer modes that visitor can actually open (adventure / crossword / quick
 * play are beta-gated and would land them on a blocked route), keep the
 * `mode_card` + `mode_selected` events the old hub cubes fired (the before /
 * after funnel depends on them), and be visible at rest (no opacity-0 start).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

const lang = { language: 'en', dir: 'ltr' as 'ltr' | 'rtl' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.language, dir: lang.dir }),
}));
const trackLandingCtaClick = vi.fn();
const trackModeSelected = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...a: unknown[]) => trackLandingCtaClick(...a),
  trackModeSelected: (...a: unknown[]) => trackModeSelected(...a),
}));

import { ModeRow, FRESH_MODE_KEYS } from '../fresh/ModeRow';
import { modeRoute } from '@/lib/landing/modeMeta';

const PUBLIC_HREFS = FRESH_MODE_KEYS.map((k) => modeRoute(k, 'en'));

function cards(container: HTMLElement) {
  const ul = container.querySelector('[data-fresh-section="modes"] ul');
  if (!ul) throw new Error('no lead row');
  return [...ul.querySelectorAll<HTMLAnchorElement>('a')];
}

describe('ModeRow (fresh section 4)', () => {
  beforeEach(() => {
    lang.language = 'en';
    lang.dir = 'ltr';
    trackLandingCtaClick.mockClear();
    trackModeSelected.mockClear();
  });

  it('has exactly one h2 (the translated section title), and card titles are not h2s', () => {
    const { container } = render(<ModeRow />);
    const h2s = container.querySelectorAll('h2');
    expect(h2s).toHaveLength(1);
    expect(h2s[0].textContent).toBe('homeFresh.modes.title');
  });

  it('offers only public modes in the row, with blast lifted out of it', () => {
    const { container } = render(<ModeRow />);
    expect(cards(container).map((a) => a.getAttribute('href'))).toEqual(PUBLIC_HREFS);
    expect(FRESH_MODE_KEYS).not.toContain('blast');
  });

  describe('featured Blast card', () => {
    const featured = (c: HTMLElement) => c.querySelector<HTMLAnchorElement>('[data-fresh-section="modes"] a[data-featured="true"]');

    it('leads the section, above the row, and links to the public V1 route', () => {
      const { container } = render(<ModeRow />);
      const card = featured(container)!;
      expect(card).not.toBeNull();
      expect(card.getAttribute('href')).toBe('/en/blast');
      expect(card.closest('ul')).toBeNull();
      expect(card.compareDocumentPosition(cards(container)[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('carries the Recommended badge, its title and the hook line', () => {
      const { container } = render(<ModeRow />);
      const text = featured(container)!.textContent;
      expect(text).toContain('landing.badge.recommended');
      expect(text).toContain('homeFresh.modes.items.blast.title');
      expect(text).toContain('homeFresh.modes.items.blast.line');
    });

    it('localises its link', () => {
      lang.language = 'he';
      const { container } = render(<ModeRow />);
      expect(featured(container)!.getAttribute('href')).toBe('/he/blast');
    });

    it('is absent where Blast has no letters (ru), and nothing else links to /blast', () => {
      lang.language = 'ru';
      const { container } = render(<ModeRow />);
      expect(featured(container)).toBeNull();
      expect(container.querySelector('a[href*="/blast"]')).toBeNull();
    });

    it('fires the same click events, flagged as featured', () => {
      const { container } = render(<ModeRow />);
      fireEvent.click(featured(container)!);
      expect(trackModeSelected).toHaveBeenCalledWith('blast', 'home');
      expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'blast', featured: true, surface: 'fresh' }));
    });

    it('only moves when motion is welcome (motion-safe idle)', () => {
      const { container } = render(<ModeRow />);
      const html = featured(container)!.innerHTML;
      expect(html).not.toMatch(/(^|\s)animate-/);
      expect(html).not.toMatch(/opacity-0/);
    });
  });

  it('never links a fresh visitor to a beta-gated route', () => {
    const { container } = render(<ModeRow />);
    for (const a of cards(container)) {
      expect(a.getAttribute('href')).not.toMatch(/crossword|quick-play|blast\/v2/);
    }
    expect(FRESH_MODE_KEYS).not.toContain('crossword');
  });

  it('localises links by the current language', () => {
    lang.language = 'he';
    const { container } = render(<ModeRow />);
    expect(cards(container)[0].getAttribute('href')).toBe('/he/multiplayer');
  });

  it('each card carries its own homeFresh title and one line', () => {
    const { container } = render(<ModeRow />);
    const list = cards(container);
    FRESH_MODE_KEYS.forEach((key, i) => {
      expect(list[i].textContent).toContain(`homeFresh.modes.items.${key}.title`);
      expect(list[i].textContent).toContain(`homeFresh.modes.items.${key}.line`);
    });
  });

  it('each card names who you play with (Multiplayer / Solo / vs bot) in a chip', () => {
    const { container } = render(<ModeRow />);
    const byKey = (k: string) => container.querySelector(`a[data-mode="${k}"]`) as HTMLElement;
    expect(byKey('arena').textContent).toContain('landing.home.modeTag.multiplayer');
    expect(byKey('wordCraft').textContent).toContain('landing.home.modeTag.vsBot');
    expect(byKey('wordCraft').textContent).toContain('landing.home.modeTag.untimed');
    expect(byKey('adventure').textContent).toContain('landing.home.modeTag.solo');
  });

  it('a card click keeps the hub instrumentation (mode_card + mode_selected)', () => {
    const { container } = render(<ModeRow />);
    fireEvent.click(cards(container)[0]);
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'arena' }));
    expect(trackModeSelected).toHaveBeenCalledWith('arena', 'home');
  });

  it('is a bento wall, not a scroll row: Arena is the feature tile, the rest vary in footprint', () => {
    const { container } = render(<ModeRow />);
    const ul = container.querySelector('[data-fresh-section="modes"] ul')!;
    expect(ul.className).toMatch(/\blg:grid-cols-12\b/);
    expect(ul.className).not.toMatch(/overflow-x-auto|snap-x/);
    expect(container.querySelector('a[data-mode="arena"]')!.getAttribute('data-shape')).toBe('feature');
    const shapes = new Set([...cards(container)].map((a) => a.dataset.shape));
    expect(shapes.size).toBeGreaterThanOrEqual(3);
  });

  it('has no prev/next pager (nothing is hidden off-screen)', () => {
    const { queryByRole } = render(<ModeRow />);
    expect(queryByRole('button')).toBeNull();
  });

  it('a card takes its colour from its mode, so neighbours are not recoloured by position', () => {
    const { container } = render(<ModeRow />);
    const cls = (k: string) => (container.querySelector(`a[data-mode="${k}"]`) as HTMLElement).className;
    expect(cls('arena')).toMatch(/border-neo-pink/);
    expect(cls('adventure')).toMatch(/border-neo-lime/);
  });


  it('is visible at rest: nothing starts at opacity-0', () => {
    const { container } = render(<ModeRow />);
    expect(container.innerHTML).not.toMatch(/opacity-0/);
  });

  it('card art is decorative (the title names the card)', () => {
    const { container } = render(<ModeRow />);
    for (const img of container.querySelectorAll('li img')) expect(img.getAttribute('alt')).toBe('');
  });

  it('each card renders its art image with valid src', () => {
    const { container } = render(<ModeRow />);
    const images = [...container.querySelectorAll<HTMLImageElement>('[data-fresh-section="modes"] li img')];
    expect(images.length).toBeGreaterThan(0);
    // All images should have src attribute set
    for (const img of images) {
      expect(img.getAttribute('src')).toBeTruthy();
      // Verify it's a next/image wrapped URL with the cubes path
      const src = img.getAttribute('src') || '';
      expect(src).toMatch(/modes.*cubes/);
    }
  });

  it('Given a fresh visitor, Then every public mode is a visible card, not a link hidden in a collapsed list', () => {
    const { container } = render(<ModeRow />);
    expect(cards(container).map((a) => a.dataset.mode)).toEqual([...FRESH_MODE_KEYS]);
    expect(FRESH_MODE_KEYS.length).toBeGreaterThanOrEqual(5);
    expect(container.querySelector('details')).toBeNull();
  });
});
