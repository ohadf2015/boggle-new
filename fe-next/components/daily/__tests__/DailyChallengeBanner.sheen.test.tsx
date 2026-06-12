/**
 * The daily tile must join the homepage "new design" language: an always-on
 * idle "glance" sheen (the same CSS primitive the mode cubes use), NOT only the
 * hover-gated shine it had before. Crucially the idle sheen is CSS-gated on
 * prefers-reduced-motion — it must NOT be tied to the JS `enableComplexAnimations`
 * perf gate (which is mocked false here), so low-end devices still glance.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn() },
  }),
}));

// enableComplexAnimations:false on purpose — the idle sheen must still render.
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: false,
  }),
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
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

import DailyChallengeBanner from '../DailyChallengeBanner';

describe('DailyChallengeBanner idle glance sheen', () => {
  it('renders the shared cube-sheen glance even when complex animations are off', () => {
    render(<DailyChallengeBanner />);
    const sheen = screen.getByTestId('cube-sheen');
    expect(sheen).toBeInTheDocument();
    expect(sheen).toHaveClass('cube-sheen');
  });
});
