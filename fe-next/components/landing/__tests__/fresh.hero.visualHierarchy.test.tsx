/**
 * Visual hierarchy contract for the fresh hero (landing audit, 2026-11-09:
 * hierarchy already well-executed — this file keeps it that way).
 *
 * The audit's hierarchy claims, pinned as a regression test:
 * - PLAY (FreshHero.tsx:112-123) is the single prominent action: the only
 *   filled, hard-shadowed, poster-font CTA in the action row.
 * - "Play a friend" and "I have an account" (FreshHero.tsx:124-144) stay
 *   visually subordinate: underlined text links, no fill, no shadow,
 *   smaller min-height than PLAY.
 * - Every action in the row carries a focus-visible outline
 *   (FreshHero.tsx:116,128,139), so keyboard users get the same hierarchy.
 *
 * Complements fresh.hero.FreshHero.test.tsx (structure/behaviour) and
 * fresh.motion.guard.test.tsx (reduced-motion).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FreshHero } from '../fresh/FreshHero';

const cg = { isOnCrazyGamesPlatform: false, isLoading: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('next/dynamic', () => ({
  default: () =>
    function AuthModalStub({ isOpen }: { isOpen: boolean }) {
      return isOpen ? <div data-testid="auth-modal" /> : null;
    },
}));

function actions(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-hero-actions]');
  if (!el) throw new Error('no hero actions');
  return el;
}

describe('FreshHero visual hierarchy', () => {
  it('PLAY is the single filled, shadowed action in the row', () => {
    const { container } = render(<FreshHero />);
    const bar = actions(container);
    const play = bar.querySelector<HTMLAnchorElement>('a[href="/en/quick-play?mode=classic"]')!;
    expect(play).not.toBeNull();

    // Filled lime + hard shadow + poster font: no other action in the row
    // may carry those prominence markers.
    for (const marker of ['bg-neo-lime', 'shadow-hard-xl', 'font-neo-poster']) {
      expect(play.className).toContain(marker);
    }
    const others = [...bar.querySelectorAll<HTMLElement>('a, button')].filter((el) => el !== play);
    expect(others.length).toBeGreaterThan(0);
    for (const el of others) {
      expect(el.className).not.toMatch(/(^|\s)bg-neo-(lime|pink|cyan|purple)(\s|$)/);
      expect(el.className).not.toMatch(/shadow-hard/);
      expect(el.className).not.toContain('font-neo-poster');
    }
  });

  it('secondary actions stay subordinate: underlined text, smaller hit target than PLAY', () => {
    const { container } = render(<FreshHero />);
    const bar = actions(container);
    const play = bar.querySelector<HTMLAnchorElement>('a[href="/en/quick-play?mode=classic"]')!;
    expect(play.className).toContain('min-h-14');

    const secondary = [
      bar.querySelector<HTMLElement>('a[href="/en/multiplayer"]')!,
      bar.querySelector<HTMLElement>('button')!,
    ];
    for (const el of secondary) {
      expect(el.className).toContain('underline');
      expect(el.className).not.toMatch(/(^|\s)bg-neo-/);
      expect(el.className).toContain('min-h-11');
    }
  });

  it('every action exposes a focus-visible outline (same hierarchy for keyboard users)', () => {
    const { container } = render(<FreshHero />);
    const controls = [...actions(container).querySelectorAll<HTMLElement>('a, button')];
    expect(controls.length).toBeGreaterThanOrEqual(3);
    for (const el of controls) {
      expect(el.className).toContain('focus-visible:outline-3');
      expect(el.className).toContain('focus-visible:outline-offset-2');
    }
  });
});
