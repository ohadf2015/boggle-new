/**
 * Piece A (shell), round 1: sections 2, 3, 5 and 6 each carry ONE bespoke
 * visual (SPEC §2), and every piece of it is visible at rest.
 *
 * Round-0 evidence: the full-page capture showed the Languages and Classrooms
 * art as empty navy (loading="lazy" images never load in a capture that does
 * not scroll), and every section reused a generic cube/mascot image.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, within } from '@testing-library/react';
import { FreshDaily } from '../fresh/FreshDaily';
import { FreshFriends } from '../fresh/FreshFriends';
import { FreshLanguages } from '../fresh/FreshLanguages';
import { FreshClassrooms } from '../fresh/FreshClassrooms';

const lang = { language: 'en' };
const cg = { isOnCrazyGamesPlatform: false, isLoading: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.language, dir: lang.language === 'he' ? 'rtl' : 'ltr' }),
}));

function section(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-fresh-section="${id}"]`);
  if (!el) throw new Error(`no section ${id}`);
  return el;
}

/** Mascot/badge art layers, painted as CSS backgrounds. */
function artLayers(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('[class*="bg-[url(/home/shell/"]')];
}

/**
 * Art paints without scrolling (a lazy <img> below the fold never loads in a
 * full-page capture) AND is never fetched by returning visitors, whose copy of
 * the fresh tree is display:none: an eager <img> is fetched even when hidden
 * (preload scanner), a CSS background inside a display:none tree is not.
 */
function expectCssArt(el: HTMLElement) {
  expect(el.querySelectorAll('img')).toHaveLength(0);
  expect(artLayers(el).length).toBeGreaterThan(0);
}

describe('fresh sections: one bespoke visual each', () => {
  beforeEach(() => {
    lang.language = 'en';
    cg.isOnCrazyGamesPlatform = false;
    cg.isLoading = false;
  });

  it('Daily: a seven-day streak with exactly one "today" tile and a streak count', () => {
    const { container } = render(<FreshDaily />);
    const s = section(container, 'daily');
    const art = s.querySelector('[data-fresh-art="streak"]') as HTMLElement;
    expect(art).not.toBeNull();
    expect(art.querySelectorAll('[data-streak-day]')).toHaveLength(7);
    expect(art.querySelectorAll('[data-streak-day="today"]')).toHaveLength(1);
    expect(within(art).getByText('homeFresh.sections.daily.streak')).toBeTruthy();
    expect(s.querySelector('a[href="/en/daily"]')).not.toBeNull();
    expectCssArt(s);
  });

  it('Friends: two racing lanes and a room code', () => {
    const { container } = render(<FreshFriends />);
    const s = section(container, 'friends');
    const art = s.querySelector('[data-fresh-art="race"]') as HTMLElement;
    expect(art).not.toBeNull();
    expect(art.querySelectorAll('[data-race-lane]')).toHaveLength(2);
    const code = art.querySelector('[data-room-code]');
    expect(code?.getAttribute('data-room-code')).toMatch(/^[A-Z0-9]{4}$/);
    expect(within(art).getByText('homeFresh.sections.friends.room')).toBeTruthy();
    expect(s.querySelector('a[href="/en/multiplayer"]')).not.toBeNull();
    expectCssArt(s);
  });

  it('Languages: the same word in six languages, Hebrew right-to-left', () => {
    const { container } = render(<FreshLanguages />);
    const s = section(container, 'languages');
    const faces = [...s.querySelectorAll('[data-lang-face]')];
    expect(faces.map((f) => f.getAttribute('lang')).sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
    const he = faces.find((f) => f.getAttribute('lang') === 'he');
    expect(he?.getAttribute('dir')).toBe('rtl');
    for (const f of faces) expect(f.querySelectorAll('[data-tile]').length).toBeGreaterThan(1);
    expectCssArt(s);
  });

  it("Languages: the visitor's own language is the face shown at rest", () => {
    lang.language = 'he';
    const { container } = render(<FreshLanguages />);
    const first = container.querySelector('[data-lang-face]');
    expect(first?.getAttribute('lang')).toBe('he');
    expect(first?.getAttribute('data-rest')).toBe('true');
    expect(container.querySelectorAll('[data-lang-face][data-rest="true"]')).toHaveLength(1);
  });

  it('Languages: one link per language, labelled with its own name', () => {
    const { container } = render(<FreshLanguages />);
    const s = section(container, 'languages');
    const hrefs = [...s.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs.sort()).toEqual(['/en', '/es', '/he', '/ja', '/ru', '/sv']);
    expect(within(s).getByRole('link', { name: 'עברית' })).toHaveAttribute('href', '/he');
  });

  it('Classrooms: a cluster of teacher badges and a strong teacher CTA', () => {
    const { container } = render(<FreshClassrooms />);
    const s = section(container, 'classrooms');
    const art = s.querySelector('[data-fresh-art="badges"]') as HTMLElement;
    expect(art).not.toBeNull();
    const layers = artLayers(art);
    expect(layers.length).toBeGreaterThanOrEqual(3);
    for (const l of layers) expect(l.className).toMatch(/\/home\/shell\/class-/);
    expect(s.querySelector('a[href="/en/education"]')).not.toBeNull();
    expectCssArt(s);
  });
});
