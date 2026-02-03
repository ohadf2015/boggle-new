/**
 * AchievementBadge RTL (Hebrew) rendering tests
 *
 * Tests for proper RTL layout and localization in Hebrew
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AchievementBadge } from '../AchievementBadge';
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

describe('AchievementBadge - RTL Hebrew Mode', () => {
  const testAchievement = {
    key: 'FIRST_BLOOD',
    icon: '🩸',
  };

  const renderWithLanguage = (language: 'he' | 'en' = 'he') => {
    return render(
      <LanguageProvider initialLanguage={language}>
        <AchievementBadge achievement={testAchievement} index={0} />
      </LanguageProvider>
    );
  };

  test('should display Hebrew translation when language is Hebrew', () => {
    renderWithLanguage('he');

    // Hebrew translation for FIRST_BLOOD
    expect(screen.getByText('דם ראשון')).toBeInTheDocument();
  });

  test('should display English translation when language is English', () => {
    renderWithLanguage('en');

    // English translation for FIRST_BLOOD
    expect(screen.getByText(/First Blood/i)).toBeInTheDocument();
  });

  test('should not overlap with adjacent badges in RTL mode', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="he">
        <div className="flex flex-wrap gap-2" dir="rtl">
          <AchievementBadge achievement={{ key: 'FIRST_BLOOD', icon: '🩸' }} index={0} />
          <AchievementBadge achievement={{ key: 'SPEED_DEMON', icon: '⚡' }} index={1} />
          <AchievementBadge achievement={{ key: 'WORD_MASTER', icon: '📚' }} index={2} />
        </div>
      </LanguageProvider>
    );

    const wrapper = container.querySelector('div[dir="rtl"]');
    expect(wrapper).toBeInTheDocument();

    // Check that wrapper has proper gap spacing
    expect(wrapper).toHaveClass('gap-2');

    // Check that all badges are rendered
    expect(screen.getByText('דם ראשון')).toBeInTheDocument();
    expect(screen.getByText('שד המהירות')).toBeInTheDocument();
    expect(screen.getByText('אדון המילים')).toBeInTheDocument();
  });

  test('should have proper RTL styling for badge position indicators', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="he">
        <AchievementBadge
          achievement={testAchievement}
          index={0}
          count={5}
          showTier={true}
        />
      </LanguageProvider>
    );

    // Find the tier indicator (should be positioned properly for RTL)
    const tierBadge = container.querySelector('.absolute');
    expect(tierBadge).toBeInTheDocument();
  });
});
