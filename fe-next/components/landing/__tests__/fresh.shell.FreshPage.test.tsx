/**
 * Piece A (shell): the fresh-visitor homepage is ONE responsive page of seven
 * one-idea sections, in a fixed order, with exactly one h1 (the game pitch).
 * PLAY is a real <a href> in the server HTML; a mounted onPlay only upgrades
 * the click (it must never swap the element, which is what caused CLS).
 *
 * Round 5 (fourth run): FreshPage holds the six STORY sections. The seventh,
 * the close, is the page's ending, rendered last by HomepageContentSection
 * below the How to Play / FAQ section, so nothing follows it but the site
 * footer. Its PLAY contract (real link, upgraded to quick play) moved with it:
 * fresh.shell.ending.test ("the finale PLAY opens quick play through the bridge").
 *
 * Round 7: blind critic, "Too many one-off sections stacked with no room to
 * breathe - cut 'Pick your game,' 'Play in your language,' ... down to 3-4
 * sections max, and give each surviving section real vertical padding so it
 * reads as a single beat instead of a scrolling feature list. Also fix the
 * mobile game-carousel so cards don't visibly truncate off-screen." So the
 * story is hero + three beats (daily, friends, classrooms; classrooms stays
 * per SPEC 8 lead override). The modes carousel and the languages section
 * leave the fresh page (their components remain; the locale homepages stay
 * linked from the hreflang alternates and the header language switcher).
 * The ad slot stays, between friends and classrooms.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { FreshPage } from '../fresh/FreshPage';

const cg = { isOnCrazyGamesPlatform: false, isLoading: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => <div data-testid="ad" /> }));
vi.mock('@/components/CrazyGamesBanner', () => ({ default: () => <div /> }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn(), trackGrowthEvent: vi.fn() }));

/** Hero PLAY by contract (a link to multiplayer inside the hero), not by label. */
function heroPlay(container: HTMLElement): HTMLAnchorElement {
  const a = container.querySelector<HTMLAnchorElement>('[data-fresh-section="hero"] a[href="/en/multiplayer"]');
  if (!a) throw new Error('no hero PLAY link to /en/multiplayer');
  return a;
}

const ORDER = ['hero', 'daily', 'friends', 'modes', 'classrooms'];

describe('FreshPage', () => {
  beforeEach(() => {
    cg.isOnCrazyGamesPlatform = false;
    cg.isLoading = false;
  });

  it('renders the story beats in order (the close ends the page elsewhere)', () => {
    const { container } = render(<FreshPage />);
    const ids = [...container.querySelectorAll('[data-fresh-section]')].map((n) =>
      n.getAttribute('data-fresh-section')
    );
    expect(ids).toEqual(ORDER);
  });

  it('has exactly one h1, and it lives in the hero section', () => {
    const { container } = render(<FreshPage />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].closest('[data-fresh-section="hero"]')).not.toBeNull();
  });

  it('every section 2-6 headline is a translated homeFresh key', () => {
    const { container } = render(<FreshPage />);
    const h2s = [...container.querySelectorAll('h2')].map((h) => h.textContent);
    // daily, friends, modes, classrooms (the close's headline is asserted where it
    // lives: fresh.shell.ending.test). Exactly four: no extra beat sneaks back.
    expect(h2s).toHaveLength(4);
    for (const text of h2s) expect(text).toMatch(/^homeFresh\./);
  });

  it('hero PLAY is a real link to multiplayer without JS', () => {
    const { container } = render(<FreshPage />);
    expect(heroPlay(container)).toHaveAttribute('href', '/en/multiplayer');
  });

  it('with onPlay, PLAY clicks open onboarding instead of navigating', () => {
    const onPlay = vi.fn();
    const { container } = render(<FreshPage onPlay={onPlay} />);
    const play = heroPlay(container);
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(play, evt);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(evt.defaultPrevented).toBe(true);
  });

  it('renders no close section: the finale ends the page from HomepageContentSection', () => {
    const { container } = render(<FreshPage onPlay={vi.fn()} />);
    expect(container.querySelector('[data-fresh-section="close"]')).toBeNull();
    expect(screen.queryByRole('link', { name: /homeFresh\.close\.play/ })).toBeNull();
  });

  it('links sections to their destinations', () => {
    const { container } = render(<FreshPage />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/en/daily', '/en/multiplayer', '/en/education']));
  });

  it('hides the classrooms section inside CrazyGames', () => {
    cg.isOnCrazyGamesPlatform = true;
    const { container } = render(<FreshPage />);
    expect(container.querySelector('[data-fresh-section="classrooms"]')).toBeNull();
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/en/education');
  });
});

describe('fresh page source guards', () => {
  const dir = path.resolve(__dirname, '..', 'fresh');
  const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));

  it.each(files)('%s imports no framer-motion or avatar code', (f) => {
    const src = readFileSync(path.join(dir, f), 'utf8');
    expect(src).not.toMatch(/from ['"](framer-motion|motion\/react)['"]/);
    expect(src).not.toMatch(/components\/(Avatar|avatar\/)/);
  });

  it.each(files)('%s stays under 300 lines', (f) => {
    const lines = readFileSync(path.join(dir, f), 'utf8').split('\n').length;
    expect(lines).toBeLessThan(300);
  });
});
