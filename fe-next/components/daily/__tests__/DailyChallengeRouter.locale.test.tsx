/**
 * Test: DailyChallengeRouter respects user-selected language
 * Bug: Navigation to daily challenges reverts to geolocation language
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import DailyChallengeRouter from '../DailyChallengeRouter';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock Header component
vi.mock('../../Header', () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));

// Mock DailyChallengeLanding
vi.mock('../DailyChallengeLanding', () => ({
  __esModule: true,
  DailyChallengeLanding: ({ onSelectWordHunt, onSelectWordWheel }: {
    onSelectWordHunt: () => void;
    onSelectWordWheel: () => void;
  }) => (
    <div>
      <button data-testid="select-word-hunt" onClick={onSelectWordHunt}>Word Hunt</button>
      <button data-testid="select-word-wheel" onClick={onSelectWordWheel}>Word Wheel</button>
    </div>
  ),
}));

// Mock storage — simulate user already played so landing page shows
vi.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: () => ({ solved: true }),
}));

// Mock PageLoader
vi.mock('@/components/ui/PageLoader', () => ({
  __esModule: true,
  default: ({ text }: { text?: string }) => <div data-testid="page-loader">{text}</div>,
  PageLoader: ({ text }: { text?: string }) => <div data-testid="page-loader">{text}</div>,
}));

describe('DailyChallengeRouter - Language Routing', () => {
  const mockPush = vi.fn();
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  const renderWithLanguage = (locale: Language) => {
    mockUsePathname.mockReturnValue(`/${locale}/daily`);

    return render(
      <LanguageProvider initialLanguage={locale}>
        <DailyChallengeRouter />
      </LanguageProvider>
    );
  };

  describe('Word Hunt navigation', () => {
    it('should navigate to Word Hunt with Swedish locale prefix', () => {
      renderWithLanguage('sv');

      const wordHuntButton = screen.getByTestId('select-word-hunt');
      fireEvent.click(wordHuntButton);

      expect(mockPush).toHaveBeenCalledWith('/sv/daily/word-hunt');
    });

    it('should navigate to Word Hunt with Japanese locale prefix', () => {
      renderWithLanguage('ja');

      const wordHuntButton = screen.getByTestId('select-word-hunt');
      fireEvent.click(wordHuntButton);

      expect(mockPush).toHaveBeenCalledWith('/ja/daily/word-hunt');
    });

    it('should navigate to Word Hunt with English locale prefix', () => {
      renderWithLanguage('en');

      const wordHuntButton = screen.getByTestId('select-word-hunt');
      fireEvent.click(wordHuntButton);

      expect(mockPush).toHaveBeenCalledWith('/en/daily/word-hunt');
    });

    it('should navigate to Word Hunt with Hebrew locale prefix', () => {
      renderWithLanguage('he');

      const wordHuntButton = screen.getByTestId('select-word-hunt');
      fireEvent.click(wordHuntButton);

      expect(mockPush).toHaveBeenCalledWith('/he/daily/word-hunt');
    });
  });

  describe('Bug fix verification', () => {
    it('should NEVER navigate without locale prefix (bug)', () => {
      renderWithLanguage('sv');

      const wordHuntButton = screen.getByTestId('select-word-hunt');
      fireEvent.click(wordHuntButton);

      // Verify we don't navigate to paths without locale
      expect(mockPush).not.toHaveBeenCalledWith('/daily/word-hunt');
      expect(mockPush).not.toHaveBeenCalledWith('daily/word-hunt');

      // Should include locale
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/sv/'));
    });

    it('should preserve user language selection during navigation', () => {
      // User selects Swedish
      renderWithLanguage('sv');

      // Navigate to Word Hunt
      const wordHuntButton = screen.getByTestId('select-word-hunt');
      fireEvent.click(wordHuntButton);

      // Should maintain Swedish locale, not revert to geolocation
      const calls = mockPush.mock.calls;
      expect(calls[0][0]).toBe('/sv/daily/word-hunt');
      expect(calls[0][0]).not.toMatch(/^\/(en|he|ja|es)\//); // Not other locales
    });
  });
});
