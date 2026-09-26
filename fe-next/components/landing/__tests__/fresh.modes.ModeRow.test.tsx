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

const PUBLIC_HREFS = [
  '/en/word-craft',
  '/en/connections/pyramid',
  '/en/brain',
  '/en/blast',
];

function cards(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')];
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

  it('offers only public modes, newcomer-friendly first and blast last', () => {
    const { container } = render(<ModeRow />);
    expect(cards(container).map((a) => a.getAttribute('href'))).toEqual(PUBLIC_HREFS);
  });

  it('never links a fresh visitor to a beta-gated route', () => {
    const { container } = render(<ModeRow />);
    for (const a of cards(container)) {
      expect(a.getAttribute('href')).not.toMatch(/crossword|quick-play|sealed-bid|blast\/v2/);
    }
    // Adventure is now public (GA) and should appear for guests
    expect(FRESH_MODE_KEYS).not.toContain('adventure'); // featured in the spotlight above the row
    expect(FRESH_MODE_KEYS).not.toContain('crossword');
  });

  it('localises links by the current language', () => {
    lang.language = 'he';
    const { container } = render(<ModeRow />);
    expect(cards(container)[0].getAttribute('href')).toBe('/he/word-craft');
  });

  it('each card carries its own homeFresh title and one line', () => {
    const { container } = render(<ModeRow />);
    const list = cards(container);
    FRESH_MODE_KEYS.forEach((key, i) => {
      expect(list[i].textContent).toContain(`homeFresh.modes.items.${key}.title`);
      expect(list[i].textContent).toContain(`homeFresh.modes.items.${key}.line`);
    });
  });

  it('a card click keeps the hub instrumentation (mode_card + mode_selected)', () => {
    const { container } = render(<ModeRow />);
    fireEvent.click(cards(container)[1]);
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'connections' }));
    expect(trackModeSelected).toHaveBeenCalledWith('connections', 'home');
  });

  it('is a scroll-snap row whose first card clears the gutter', () => {
    const { container } = render(<ModeRow />);
    const ul = container.querySelector('[data-fresh-section="modes"] ul')!;
    expect(ul.className).toMatch(/\bsnap-x\b/);
    expect(ul.className).toMatch(/\bsnap-mandatory\b/);
    expect(ul.className).toMatch(/\bscroll-px-4\b/);
    for (const li of ul.querySelectorAll('li')) expect(li.className).toMatch(/\bsnap-start\b/);
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

  it('wordCraft, connections, brainGym all render with art', () => {
    const { container } = render(<ModeRow />);
    const cardsByMode = new Map<string, HTMLElement>();
    for (const link of container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] li a')) {
      const mode = link.getAttribute('data-mode');
      if (mode) cardsByMode.set(mode, link);
    }
    for (const mode of ['wordCraft', 'connections', 'brainGym']) {
      const card = cardsByMode.get(mode);
      expect(card).toBeTruthy();
      const img = card?.querySelector('img');
      expect(img).toBeTruthy();
      const src = img?.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toMatch(/cubes/);
    }
  });

  describe('prev / next buttons', () => {
    const scrollBy = vi.fn();
    beforeEach(() => {
      scrollBy.mockClear();
      Object.defineProperty(HTMLElement.prototype, 'scrollBy', { value: scrollBy, configurable: true, writable: true });
    });

    it('are labelled for screen readers', () => {
      const { getByRole } = render(<ModeRow />);
      expect(getByRole('button', { name: 'homeFresh.modes.next' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'homeFresh.modes.prev' })).toBeInTheDocument();
    });

    it('next scrolls forward (rightward in LTR)', () => {
      const { getByRole } = render(<ModeRow />);
      fireEvent.click(getByRole('button', { name: 'homeFresh.modes.next' }));
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);
    });

    it('next scrolls forward (leftward in RTL Hebrew)', () => {
      lang.dir = 'rtl';
      const { getByRole } = render(<ModeRow />);
      fireEvent.click(getByRole('button', { name: 'homeFresh.modes.next' }));
      const left = scrollBy.mock.calls[0][0].left;
      fireEvent.click(getByRole('button', { name: 'homeFresh.modes.prev' }));
      const back = scrollBy.mock.calls[1][0].left;
      expect(Math.sign(left)).toBe(-Math.sign(back));
      expect(left).toBeLessThan(0);
    });
  });
});
