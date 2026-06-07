/**
 * Performance regression guards for DailyChallengeBanner (2026-06-07).
 *
 * This banner is the measured LCP element on `/en` (desktop). It used to:
 *  (1) render an `opacity-0` skeleton in the pre-hydration (`!isClient`) branch
 *      → the SSR HTML was invisible, so LCP could not fire until hydration; and
 *  (2) reveal its `/modes/daily.png` image via an opacity:0 framer-motion spring
 *      with no `priority` on the <Image>.
 * Both delayed LCP to ~5s p75. These tests lock the fix.
 */
/* eslint-disable @next/next/no-img-element -- next/image is mocked to a plain <img> to inspect the forwarded priority prop */
import React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({ ref: { current: null }, style: {}, handlers: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn() } }),
}));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: false }),
}));
vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-01-29',
  getPuzzleNumber: () => 123,
  getSecondsUntilNextDaily: () => 3600,
  formatCountdown: () => '01:00:00',
  getWordHuntStatusToday: () => null,
  getDailyStreak: () => ({ currentStreak: 0 }),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, alt, src }: { priority?: boolean; alt?: string; src?: string }) => (
    <img alt={alt} data-priority={priority ? 'true' : 'false'} src={typeof src === 'string' ? src : ''} />
  ),
}));

import DailyChallengeBanner from '../DailyChallengeBanner';

describe('DailyChallengeBanner LCP', () => {
  it('server-renders a VISIBLE placeholder (no opacity-0) so LCP can paint pre-hydration', () => {
    // renderToStaticMarkup never runs effects → isClient stays false → skeleton branch
    const html = renderToStaticMarkup(<DailyChallengeBanner />);
    expect(html).not.toContain('opacity-0');
  });

  it('server-renders the LCP illustration itself (not hydration-floored) with priority', () => {
    // The desktop LCP element is /modes/daily.png. It must exist in the SSR
    // (pre-hydration) markup — gating it behind isClient would floor LCP at the
    // hydration time. priority also emits the preload <link> at SSR.
    const html = renderToStaticMarkup(<DailyChallengeBanner />);
    expect(html).toContain('daily.png');
    expect(html).toContain('data-priority="true"');
  });

  it('loads the banner illustration with high priority', () => {
    const { container } = render(<DailyChallengeBanner />);
    const img = Array.from(container.querySelectorAll('img')).find((i) => (i.getAttribute('src') || '').includes('daily.png'));
    expect(img).toBeTruthy();
    expect(img?.getAttribute('data-priority')).toBe('true');
  });
});
