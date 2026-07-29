import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyChallengeRouter from '../DailyChallengeRouter';

// Mock getWordHuntStatusToday
const mockGetWordHuntStatusToday = vi.fn();
vi.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: (...args: unknown[]) => mockGetWordHuntStatusToday(...args),
}));

// Mock useRouter
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: ({
    onSelectWordHunt,
    onSelectWordWheel,
  }: {
    onSelectWordHunt: () => void;
    onSelectWordWheel: () => void;
  }) => (
    <div data-testid="daily-challenge-landing">
      <button onClick={onSelectWordHunt} data-testid="select-word-hunt">Select Word Hunt</button>
      <button onClick={onSelectWordWheel} data-testid="select-word-wheel">Select Word Wheel</button>
    </div>
  ),
}));

vi.mock('../../Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header">Header</header>,
}));

vi.mock('@/components/ui/PageLoader', () => ({
  __esModule: true,
  default: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));

describe('DailyChallengeRouter - Smart Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('redirect when not played today', () => {
    test('redirects to word hunt via router.replace when user has not played today', () => {
      // GIVEN: user has not played today's word hunt
      mockGetWordHuntStatusToday.mockReturnValue(null);

      // WHEN: component renders
      render(<DailyChallengeRouter />);

      // THEN: should redirect to word hunt using replace (not push)
      expect(mockReplace).toHaveBeenCalledWith('/en/daily/word-hunt');
      expect(mockPush).not.toHaveBeenCalled();
    });

    test('does not show landing page when redirecting', () => {
      // GIVEN: user has not played
      mockGetWordHuntStatusToday.mockReturnValue(null);

      // WHEN
      render(<DailyChallengeRouter />);

      // THEN: landing page should not be visible
      expect(screen.queryByTestId('daily-challenge-landing')).not.toBeInTheDocument();
    });
  });

  describe('show landing when already played', () => {
    test('shows landing page when user has already played (solved)', () => {
      // GIVEN: user solved today's word hunt
      mockGetWordHuntStatusToday.mockReturnValue({ solved: true });

      // WHEN
      render(<DailyChallengeRouter />);

      // THEN: should see landing page, no redirect
      expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('shows landing page when user played but did not solve', () => {
      // GIVEN: user played but didn't solve
      mockGetWordHuntStatusToday.mockReturnValue({ solved: false });

      // WHEN
      render(<DailyChallengeRouter />);

      // THEN: should see landing page (played = show results)
      expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('landing page interactions (when played)', () => {
    beforeEach(() => {
      // User already played — landing page is shown
      mockGetWordHuntStatusToday.mockReturnValue({ solved: true });
    });

    test('selecting Word Hunt navigates to Word Hunt page', () => {
      render(<DailyChallengeRouter />);

      fireEvent.click(screen.getByTestId('select-word-hunt'));

      expect(mockPush).toHaveBeenCalledWith('/en/daily/word-hunt');
    });
  });
});
