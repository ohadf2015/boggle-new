/**
 * Piece A (shell), round 5 (fourth run): the closing PLAY IS the ending.
 *
 * Blind critic, same gap four rounds running: "The page doesn't know when to
 * stop: after the big CTA block (which reads like the finale) it keeps going
 * through How-to-Play, blog links, a promo banner, an 8-question FAQ ... Cut
 * everything past the CTA ... so the CTA is actually the ending."
 *
 * Every earlier round made the tail after the CTA quieter; the critic kept
 * reading it as "more page after the finale". This round changes the ORDER:
 * the reference content (How to Play, blog, FAQ) is one section BEFORE the
 * finale, and the finale is the last thing HomepageContentSection renders
 * (page.tsx renders that component last, straight above the site footer).
 *
 * The finale lives outside PageClient's React subtree now, so its PLAY is
 * upgraded to quick play through a tiny bridge that LandingView fills from
 * onStartOnboarding. The <a href> never changes, so nothing shifts.
 *
 * Also here: fresh visitors on the homepage get no app tab bar (QUESTS /
 * FRIENDS / HOME). The critic saw it pinned over the section under the hero;
 * the logged-out page is a marketing page, like the Duolingo bar.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';
import { HomeTreeBoot } from '../homeTree';
import { setFreshPlay, getFreshPlay } from '../fresh/freshPlayBridge';
import LandingView from '../LandingView';

const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (cta: string) => track(cta),
  trackGrowthEvent: vi.fn(),
}));
// Context says "en" on purpose: the finale must take its locale from the prop
// HomepageContentSection already receives (server-rendered, no drift).
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => false,
  hasSupabaseSession: () => false,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
}));
vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('../ReturningHome', () => ({ ReturningHome: () => <div /> }));
vi.mock('../fresh/FreshPage', () => ({ FreshPage: () => <div data-testid="fresh-page" /> }));
vi.mock('../LandingSEOSection', () => ({ LandingSEOSection: () => <section /> }));
vi.mock('../LandingBlogSection', () => ({ LandingBlogSection: () => <section /> }));

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const content = {
  title: 'LexiClash',
  description: 'LexiClash is a free online multiplayer word game.',
  features: [],
  faq: Array.from({ length: 8 }, (_, i) => ({ question: `Q${i + 1}?`, answer: `A${i + 1}.` })),
};

function renderEnding(locale = 'en') {
  const view = render(<HomepageContentSection content={content} locale={locale} />);
  const root = view.container.firstElementChild as HTMLElement;
  const finale = root.lastElementChild as HTMLElement;
  return { ...view, root, finale };
}

const finalePlay = (finale: HTMLElement) =>
  within(finale).getByRole('link', { name: /homeFresh\.close\.play/ }) as HTMLAnchorElement;

beforeEach(() => {
  track.mockClear();
  setFreshPlay(undefined);
});
afterEach(() => setFreshPlay(undefined));

describe('the finale is the last thing on the page', () => {
  it('HomepageContentSection ends with the fresh-only finale, after the FAQ', () => {
    const { finale } = renderEnding();
    expect(finale.getAttribute('data-home-only')).toBe('fresh');
    expect(finale.querySelector('[data-fresh-section="close"]')).not.toBeNull();
    const faq = screen.getByRole('region', { name: 'Frequently asked questions' });
    expect(faq.compareDocumentPosition(finale) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(finale.contains(faq)).toBe(false);
  });

  it('holds the page-ending PLAY: a real link built from the locale prop', () => {
    const { finale } = renderEnding('he');
    expect(finalePlay(finale)).toHaveAttribute('href', '/he/multiplayer');
  });

  it('is the only PLAY in the section: the FAQ block above it has none', () => {
    const { root } = renderEnding();
    const plays = [...root.querySelectorAll('a')].filter((a) => a.getAttribute('href') === '/en/multiplayer');
    expect(plays).toHaveLength(1);
  });

  it('says one thing: a single display headline, no second sign-off line', () => {
    const { finale } = renderEnding();
    const heads = finale.querySelectorAll('h1,h2,h3,h4');
    expect([...heads].map((h) => h.textContent)).toEqual(['homeFresh.close.title']);
    expect(heads[0].tagName).toBe('H2');
    expect(heads[0].className).toMatch(/\bfont-neo-display\b/);
    expect(heads[0].className).toMatch(/\bmd:text-6xl\b/);
    expect(screen.queryByText('homeFresh.close.signoff')).toBeNull();
  });

  it('is a full-bleed band: the band has no max width, its content column does', () => {
    const { finale } = renderEnding();
    const band = finale.querySelector('[data-fresh-section="close"]') as HTMLElement;
    expect(band.className).toMatch(/\bbg-neo-lime\b/);
    expect(band.className).not.toMatch(/\bmax-w-/);
    expect(band.className).not.toMatch(/\bmx-auto\b/);
    expect(band.className).not.toMatch(/\brounded/);
    const column = band.firstElementChild as HTMLElement;
    expect(column.className).toMatch(/\bmax-w-/);
  });

  // Browser finding (390, dev): the 80px mobile-tab-bar reserve (page-content-safe)
  // on a wrapper opened a navy strip between the band and the footer, and on the
  // band it left ~150px of empty lime under PLAY once cookies were accepted
  // (html.has-global-bottom-nav is gone then). Fresh visitors have no tab bar on
  // the homepage (tree CSS below), so their ending needs no reserve at all;
  // returning visitors keep theirs at the end of their page (the finale is hidden
  // for them), on a spacer only they see.
  it('keeps the tab-bar reserve out of the fresh ending; returning visitors keep theirs', () => {
    const { root, finale } = renderEnding();
    const band = finale.querySelector('[data-fresh-section="close"]') as HTMLElement;
    expect(band.className).not.toMatch(/\bpage-content-safe\b/);
    expect(finale.className).not.toMatch(/\bpage-content-safe\b/);
    expect(root.className).not.toMatch(/\bpage-content-safe\b/);
    const spacer = root.querySelector('[data-home-only="returning"]') as HTMLElement;
    expect(spacer).not.toBeNull();
    expect(spacer.className).toMatch(/\bpage-content-safe\b/);
    expect(spacer.getAttribute('aria-hidden')).toBe('true');
    expect(spacer.childElementCount).toBe(0);
    // still before the finale: the finale stays the last element
    expect(spacer.compareDocumentPosition(finale) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('brings the mascot into the finale at hero-art scale (decorative, painted without scrolling)', () => {
    const { finale } = renderEnding();
    const img = finale.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('alt')).toBe('');
    // same floor the old sign-off mascot had (fresh.shell.finale.test, round 4)
    expect(Number(img.getAttribute('width'))).toBeGreaterThanOrEqual(160);
    expect(img.className).not.toMatch(/\bh-(1[0-9]|20)\b/);
    // a lazy image below the fold stays a blank hole in any capture that does not scroll to it
    expect(img.getAttribute('loading')).not.toBe('lazy');
  });

  it('keeps every hover/press move behind motion-safe', () => {
    const s = read('landing/fresh/FreshClose.tsx');
    const moves = s
      .split(/[\s'"`]+/)
      .filter((c) => /(^|:)(hover|active|group-hover):-?(rotate|translate|scale)/.test(c));
    expect(moves.length).toBeGreaterThan(0);
    for (const c of moves) expect(c.startsWith('motion-safe:')).toBe(true);
  });

  it('the old sign-off is gone (one ending beat, not two)', () => {
    expect(read('seo/HomepageContentSection.tsx')).not.toMatch(/FreshSignOff/);
  });
});

describe('the finale PLAY opens quick play through the bridge', () => {
  it('without a registered play it is a plain link (server HTML, no JS, returning)', () => {
    const { finale } = renderEnding();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(finalePlay(finale), evt);
    expect(evt.defaultPrevented).toBe(false);
    expect(track).toHaveBeenCalledWith('bottom_cta');
  });

  it('with a registered play, a click opens onboarding instead of navigating', () => {
    const play = vi.fn();
    const { finale } = renderEnding();
    act(() => setFreshPlay(play));
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(finalePlay(finale), evt);
    expect(play).toHaveBeenCalledTimes(1);
    expect(evt.defaultPrevented).toBe(true);
    expect(track).toHaveBeenCalledWith('bottom_cta');
  });

  it('modified clicks (new tab) keep the native link', () => {
    const play = vi.fn();
    act(() => setFreshPlay(play));
    const { finale } = renderEnding();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    fireEvent(finalePlay(finale), evt);
    expect(play).not.toHaveBeenCalled();
    expect(evt.defaultPrevented).toBe(false);
  });

  it('LandingView fills the bridge from onStartOnboarding and clears it on unmount', () => {
    const start = vi.fn();
    const { unmount, rerender } = render(<LandingView onStartOnboarding={start} />);
    expect(getFreshPlay()).toBe(start);
    rerender(<LandingView />);
    expect(getFreshPlay()).toBeUndefined();
    rerender(<LandingView onStartOnboarding={start} />);
    unmount();
    expect(getFreshPlay()).toBeUndefined();
  });
});

describe('homepage tree CSS', () => {
  const css = () => {
    const { container } = render(<HomeTreeBoot />);
    return container.querySelector('style')?.textContent ?? '';
  };

  it('hides the fresh-only finale for returning visitors', () => {
    expect(css()).toContain('html[data-home="returning"] [data-home-only="fresh"]{display:none}');
  });

  it('shows returning-only blocks to returning visitors only (hidden by default: no script = fresh)', () => {
    const c = css();
    expect(c).toContain('[data-home-only="returning"]{display:none}');
    expect(c).toContain('html[data-home="returning"] [data-home-only="returning"]{display:block}');
    expect(c.indexOf('[data-home-only="returning"]{display:none}')).toBeLessThan(
      c.indexOf('html[data-home="returning"] [data-home-only="returning"]{display:block}')
    );
  });

  it('hides the app tab bar for fresh visitors, by visibility so its height cache stays true', () => {
    const c = css();
    expect(c).toContain('html:not([data-home="returning"]) [data-global-bottom-nav]{visibility:hidden}');
    // display:none would make GlobalBottomNav measure 0 and cache lc_bottom_nav_h=0,
    // which the layout's prime script replays on the NEXT page (a bottom jump there).
    expect(c).not.toMatch(/\[data-global-bottom-nav\]\s*\{\s*display\s*:\s*none/);
  });
});
