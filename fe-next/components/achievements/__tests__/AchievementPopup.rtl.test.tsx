/**
 * AchievementPopup RTL (Hebrew) positioning tests
 *
 * Tests for proper RTL layout - popup should appear on LEFT side in RTL mode
 * and slide from LEFT instead of right.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AchievementPopup from '../AchievementPopup';
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

// Mock confettiUtils
jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

// Mock useSoundEffects
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playAchievementSound: jest.fn(),
  }),
}));

// Mock framer-motion to allow class inspection
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
    h3: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <h3 className={className} {...props}>{children}</h3>
    ),
    p: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <p className={className} {...props}>{children}</p>
    ),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

describe('AchievementPopup - RTL Positioning', () => {
  const testAchievement = {
    key: 'FIRST_BLOOD',
    icon: '🩸',
  };

  const renderWithLanguage = (language: 'he' | 'en' = 'he') => {
    return render(
      <LanguageProvider initialLanguage={language}>
        <AchievementPopup achievement={testAchievement} onComplete={jest.fn()} />
      </LanguageProvider>
    );
  };

  test('should position popup on LEFT side in RTL (Hebrew) mode', () => {
    const { container } = renderWithLanguage('he');

    // Find the popup container (fixed positioned element)
    const popup = container.querySelector('[data-testid="motion-div"]');
    expect(popup).toBeInTheDocument();

    // In RTL mode, should have left-4 positioning, NOT right-4
    // The popup should use RTL-aware classes
    const classNames = popup?.className || '';

    // Should have RTL-aware positioning via logical property (end-4)
    // end-4 maps to right in LTR and left in RTL — correct approach
    expect(classNames).toMatch(/end-4/);
  });

  test('should position popup on RIGHT side in LTR (English) mode', () => {
    const { container } = renderWithLanguage('en');

    const popup = container.querySelector('[data-testid="motion-div"]');
    expect(popup).toBeInTheDocument();

    const classNames = popup?.className || '';

    // In LTR mode, end-4 resolves to right — correct logical property
    expect(classNames).toMatch(/end-4/);
  });

  test('should NOT use bare right-4 without RTL handling', () => {
    const { container } = renderWithLanguage('he');

    const popup = container.querySelector('[data-testid="motion-div"]');
    expect(popup).toBeInTheDocument();

    const classNames = popup?.className || '';

    // This is the critical test - we should NOT have bare "right-4" without RTL utilities
    // The regex matches "right-4" that is NOT preceded by "ltr:" or "rtl:"
    const hasBareRight4 = /(?<!ltr:|rtl:)right-4/.test(classNames) &&
      !/rtl:left-4/.test(classNames);

    expect(hasBareRight4).toBe(false);
  });
});
