/**
 * AchievementUnlockModal RTL (Hebrew) positioning tests
 *
 * Tests for proper RTL layout - toast should appear on LEFT side in RTL mode
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AchievementUnlockModal } from '../AchievementUnlockModal';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@testing-library/jest-dom';

// Mock next/navigation for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/he/education',
}));

// Mock confettiUtils
jest.mock('@/utils/confettiUtils', () => ({
  fireLevelUpConfetti: jest.fn(),
}));

// Mock framer-motion to allow class inspection
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, role, ...props }: React.PropsWithChildren<{ className?: string; role?: string }>) => (
      <div className={className} role={role} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <button className={className} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

describe('AchievementUnlockModal - RTL Positioning (Toast Mode)', () => {
  const bronzeUnlock = {
    tier: 'bronze' as const,
    icon: '🏆',
    isNew: true,
    isUpgrade: false,
  };

  const goldUnlock = {
    tier: 'gold' as const,
    icon: '🏆',
    isNew: true,
    isUpgrade: false,
  };

  const renderWithLanguage = (
    unlock: typeof bronzeUnlock | typeof goldUnlock,
    language: 'he' | 'en' = 'he'
  ) => {
    return render(
      <LanguageProvider initialLanguage={language}>
        <AchievementUnlockModal unlock={unlock} onClose={jest.fn()} />
      </LanguageProvider>
    );
  };

  test('should position TOAST (bronze) on LEFT side in RTL (Hebrew) mode', () => {
    const { container } = renderWithLanguage(bronzeUnlock, 'he');

    // Find the toast container - it's the dialog with fixed positioning
    const toast = container.querySelector('[role="dialog"]');
    expect(toast).toBeInTheDocument();

    const classNames = toast?.className || '';

    // In RTL mode for toast, should have left-4 positioning
    expect(classNames).toMatch(/rtl:left-4|ltr:right-4/);
  });

  test('should position TOAST (bronze) on RIGHT side in LTR (English) mode', () => {
    const { container } = renderWithLanguage(bronzeUnlock, 'en');

    const toast = container.querySelector('[role="dialog"]');
    expect(toast).toBeInTheDocument();

    const classNames = toast?.className || '';

    // In LTR mode, should have right positioning
    expect(classNames).toMatch(/right-4|ltr:right-4/);
  });

  test('should NOT use bare right-4 without RTL handling for toast', () => {
    const { container } = renderWithLanguage(bronzeUnlock, 'he');

    const toast = container.querySelector('[role="dialog"]');
    expect(toast).toBeInTheDocument();

    const classNames = toast?.className || '';

    // Critical test - should NOT have bare "right-4" without RTL utilities
    const hasBareRight4 = /(?<!ltr:|rtl:)right-4/.test(classNames) &&
      !/rtl:left-4/.test(classNames);

    expect(hasBareRight4).toBe(false);
  });

  test('should use CENTERED positioning for full modal (gold/platinum)', () => {
    const { container } = renderWithLanguage(goldUnlock, 'he');

    // Find the modal container - it's the dialog with fixed positioning
    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toBeInTheDocument();

    const classNames = modal?.className || '';

    // Full modal should be centered with inset-0, not positioned to a side
    expect(classNames).toContain('inset-0');
  });
});
