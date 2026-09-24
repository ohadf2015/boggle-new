/**
 * Piece B (hero): the first viewport. One h1 that carries the "multiplayer word
 * game" meaning, the playable HeroGrid, ONE primary PLAY (a real <a> to
 * /{locale}/multiplayer in server HTML, upgraded by onPlay) and a secondary
 * "I have an account" that opens sign-in (never on CrazyGames).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FreshHero } from '../fresh/FreshHero';

const cg = { isOnCrazyGamesPlatform: false, isLoading: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p && typeof p === 'object' ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...a: unknown[]) => track(...a),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('next/dynamic', () => ({
  default: () =>
    function AuthModalStub({ isOpen }: { isOpen: boolean }) {
      return isOpen ? <div data-testid="auth-modal" /> : null;
    },
}));

function hero(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-fresh-section="hero"]');
  if (!el) throw new Error('no hero');
  return el;
}

describe('FreshHero', () => {
  beforeEach(() => {
    cg.isOnCrazyGamesPlatform = false;
    track.mockClear();
  });

  it('has exactly one h1 carrying the pitch and the multiplayer-word-game kicker', () => {
    const { container } = render(<FreshHero />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toContain('homeFresh.hero.kicker');
    expect(h1s[0].textContent).toContain('homeFresh.hero.title');
  });

  it('server HTML already has the h1, the board and PLAY as a real link (no JS needed)', () => {
    const html = renderToString(<FreshHero />);
    expect(html).toContain('<h1');
    expect(html).toContain('data-hero-grid');
    expect(html).toMatch(/<a[^>]*href="\/en\/multiplayer"/);
  });

  it('has exactly ONE link to multiplayer (one PLAY)', () => {
    const { container } = render(<FreshHero />);
    expect(hero(container).querySelectorAll('a[href="/en/multiplayer"]')).toHaveLength(1);
  });

  it('PLAY with onPlay opens onboarding instead of navigating, and is tracked', () => {
    const onPlay = vi.fn();
    const { container } = render(<FreshHero onPlay={onPlay} />);
    const play = hero(container).querySelector<HTMLAnchorElement>('a[href="/en/multiplayer"]')!;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(play, evt);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(evt.defaultPrevented).toBe(true);
    expect(track).toHaveBeenCalledWith('fresh_hero_play');
  });

  it('"I have an account" opens sign-in', () => {
    render(<FreshHero />);
    expect(screen.queryByTestId('auth-modal')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'homeFresh.hero.account' }));
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });

  it('hides "I have an account" on CrazyGames', () => {
    cg.isOnCrazyGamesPlatform = true;
    render(<FreshHero />);
    expect(screen.queryByRole('button', { name: 'homeFresh.hero.account' })).toBeNull();
  });

  it('finding the demo word marks PLAY as the next step', () => {
    const { container } = render(<FreshHero />);
    const click = (r: number, c: number) =>
      fireEvent.click(container.querySelector(`button[data-cell="${r}-${c}"]`)!);
    const actions = hero(container).querySelector('[data-hero-actions]')!;
    expect(actions).toHaveAttribute('data-found', 'false');
    click(0, 0);
    click(0, 1);
    click(1, 1);
    expect(actions).toHaveAttribute('data-found', 'true');
    expect(actions.querySelector('a[href="/en/multiplayer"]')).not.toBeNull();
  });
});

describe('hero source guards', () => {
  const dir = path.resolve(__dirname, '..', 'fresh');
  it.each(['FreshHero.tsx', 'HeroGrid.tsx'])('%s: no framer-motion, no interpolated Tailwind classes', (f) => {
    const src = readFileSync(path.join(dir, f), 'utf8');
    expect(src).not.toMatch(/framer-motion|motion\/react/);
    expect(src).not.toMatch(/className=\{`[^`]*\$\{/);
  });

  it('HeroGrid never starts a layer at opacity 0 waiting for JS (animations are CSS keyframes)', () => {
    const src = readFileSync(path.join(dir, 'HeroGrid.tsx'), 'utf8');
    expect(src).not.toMatch(/IntersectionObserver/);
    expect(src).toMatch(/prefers-reduced-motion/);
  });
});
