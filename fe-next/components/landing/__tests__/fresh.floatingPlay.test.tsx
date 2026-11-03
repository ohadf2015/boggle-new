/**
 * Growth proposal "Fix landing→onboarding gap: 93% of visitors never enter
 * onboarding" — the mobile hero stacks copy → board → actions, so the primary
 * CTA can sit below the first viewport. FreshFloatingPlay pins a PLAY pill to
 * the bottom of the fresh homepage so a CTA is one thumb-reach away at every
 * scroll depth.
 *
 * Contract (mirrors FreshHero/FreshPlayLink):
 * - real <a href> in the server HTML (no-JS navigates to the coached round);
 * - a mounted onPlay only upgrades the click (no element swap → no CLS);
 * - its own landing_cta_clicked cta id (floating_play) so the funnel can
 *   attribute onboarding starts to the pill vs the hero button.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { FreshPage } from '../fresh/FreshPage';

const cg = { isOnCrazyGamesPlatform: false, isLoading: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => <div data-testid="ad" /> }));
vi.mock('@/components/CrazyGamesBanner', () => ({ default: () => <div /> }));
const trackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...args: unknown[]) => trackLandingCtaClick(...args),
  trackGrowthEvent: vi.fn(),
}));

function floatingPlay(container: HTMLElement): HTMLAnchorElement {
  const a = container.querySelector<HTMLAnchorElement>('[data-fresh-floating-play] a');
  if (!a) throw new Error('no floating PLAY link');
  return a;
}

describe('FreshFloatingPlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cg.isOnCrazyGamesPlatform = false;
  });

  it('is a real link to the coached first game without JS', () => {
    const { container } = render(<FreshPage />);
    expect(floatingPlay(container)).toHaveAttribute('href', '/en/singleplayer?autoStart=coach');
  });

  it('with onPlay, the click opens onboarding instead of navigating', () => {
    const onPlay = vi.fn();
    const { container } = render(<FreshPage onPlay={onPlay} />);
    const play = floatingPlay(container);
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(play, evt);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(evt.defaultPrevented).toBe(true);
  });

  it('tracks landing_cta_clicked with its own cta id', () => {
    const { container } = render(<FreshPage onPlay={vi.fn()} />);
    fireEvent.click(floatingPlay(container));
    expect(trackLandingCtaClick).toHaveBeenCalledWith('floating_play');
  });

  it('is pinned clear of the bottom nav / ad banner and the cookie sheet', () => {
    const { container } = render(<FreshPage />);
    const pill = container.querySelector('[data-fresh-floating-play]');
    expect(pill).not.toBeNull();
    expect(pill!.className).toContain('fixed');
    expect(pill!.className).toContain('md:hidden');
    // Clearance itself (bottom-stack-height + cookie-consent-height) lives in
    // FreshFloatingPlay.module.css — asserted structurally here.
    expect(pill!.className).toContain('floatingPlay');
  });

  it('renders exactly one floating PLAY on the fresh page', () => {
    const { container } = render(<FreshPage onPlay={vi.fn()} />);
    expect(container.querySelectorAll('[data-fresh-floating-play]')).toHaveLength(1);
  });
});
