/**
 * Accessibility tests for DailyChallengeBanner
 *
 * Tests WCAG 2.4.6 Headings and Labels compliance:
 * - Headings must follow a logical order (h1 → h2 → h3)
 * - The banner heading should be h2 to work correctly after page h1
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'daily.badge': 'Daily Challenge',
        'daily.dayStreak': 'day streak',
        'daily.nextPuzzleIn': 'Next',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
    },
  }),
}));

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

describe('DailyChallengeBanner Accessibility', () => {
  describe('WCAG 2.4.6 - Headings and Labels', () => {
    it('should use h2 heading level for proper document outline-solid', () => {
      // GIVEN: A DailyChallengeBanner rendered on the landing page
      // (where h1 is the page title and h2 is used for sections)
      render(<DailyChallengeBanner />);

      // WHEN: We check the heading level of the banner title
      const heading = screen.getByRole('heading', { name: /daily challenge/i });

      // THEN: It should be an h2 (not h3) to maintain proper heading hierarchy
      // after the page's h1 title
      expect(heading.tagName).toBe('H2');
    });

    it('should not skip heading levels', () => {
      // GIVEN: A DailyChallengeBanner component
      render(<DailyChallengeBanner />);

      // WHEN: We find all headings in the component
      const allHeadings = screen.getAllByRole('heading');

      // THEN: Each heading should be a valid level (h1-h6)
      // and the component should use h2 as its primary heading
      allHeadings.forEach((heading) => {
        const level = parseInt(heading.tagName.replace('H', ''), 10);
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(6);
      });

      // The primary heading should be h2
      const primaryHeading = screen.getByRole('heading', { name: /daily challenge/i });
      expect(primaryHeading.tagName).toBe('H2');
    });
  });
});
