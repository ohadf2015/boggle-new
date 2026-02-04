/**
 * AchievementProgressTracker RTL (Hebrew) positioning tests
 *
 * Tests for proper RTL layout - tracker should appear on LEFT side in RTL mode
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AchievementProgressTracker } from '../AchievementProgressTracker';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@testing-library/jest-dom';

// Mock next/navigation for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/he/singleplayer',
}));

// Mock framer-motion to allow class inspection
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

describe('AchievementProgressTracker - RTL Positioning', () => {
  const defaultProps = {
    validWordCount: 30, // 50% of WORDSMITH target (60)
    comboLevel: 5,
    maxCombo: 15, // 60% of COMBO_KING target (25)
    wordLengths: [4, 5, 6],
    timeSinceStart: 30,
    gameDuration: 180,
    earnedAchievements: [],
  };

  const renderWithLanguage = (language: 'he' | 'en' = 'he') => {
    return render(
      <LanguageProvider initialLanguage={language}>
        <AchievementProgressTracker {...defaultProps} />
      </LanguageProvider>
    );
  };

  test('should position tracker on LEFT side in RTL (Hebrew) mode', () => {
    const { container } = renderWithLanguage('he');

    // Find the tracker container (fixed positioned element)
    // The outer container should have the positioning classes
    const tracker = container.querySelector('.fixed');
    expect(tracker).toBeInTheDocument();

    const classNames = tracker?.className || '';

    // In RTL mode, should have left-4 positioning, NOT right-4
    expect(classNames).toMatch(/rtl:left-4|ltr:right-4/);
  });

  test('should position tracker on RIGHT side in LTR (English) mode', () => {
    const { container } = renderWithLanguage('en');

    const tracker = container.querySelector('.fixed');
    expect(tracker).toBeInTheDocument();

    const classNames = tracker?.className || '';

    // In LTR mode, should have right positioning
    expect(classNames).toMatch(/right-4|ltr:right-4/);
  });

  test('should NOT use bare right-4 without RTL handling', () => {
    const { container } = renderWithLanguage('he');

    const tracker = container.querySelector('.fixed');
    expect(tracker).toBeInTheDocument();

    const classNames = tracker?.className || '';

    // Critical test - should NOT have bare "right-4" without RTL utilities
    const hasBareRight4 = /(?<!ltr:|rtl:)right-4/.test(classNames) &&
      !/rtl:left-4/.test(classNames);

    expect(hasBareRight4).toBe(false);
  });
});
