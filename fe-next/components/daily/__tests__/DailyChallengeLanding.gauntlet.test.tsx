/**
 * Tests for ScoreGauntletBanner integration in DailyChallengeLanding.
 *
 * Requirements:
 * 1. When URL params include whName, whScore, whEmoji (the rival contract) → show ScoreGauntletBanner
 * 2. When no challenge params → banner is absent
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';

// --- next/navigation mocks (overridden per test) ---
const mockUseSearchParams = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/daily',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}));

// --- Mock ScoreGauntletBanner to keep tests lightweight ---
vi.mock('../ScoreGauntletBanner', () => ({
  ScoreGauntletBanner: ({
    challengerName,
    challengerScore,
  }: {
    challengerName: string | null;
    challengerScore: number | null;
  }) =>
    challengerName !== null && challengerScore !== null ? (
      <div data-testid="score-gauntlet-banner">
        {challengerName} - {challengerScore}
      </div>
    ) : null,
}));

// --- Context mocks ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// --- Utility mocks ---
vi.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: vi.fn(() => null),
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'test-fingerprint'),
}));

// --- Sub-component mocks to avoid deep render trees ---
vi.mock('../landing/DailyMissionsHeader', () => ({
  DailyMissionsHeader: () => <div data-testid="missions-header" />,
}));

vi.mock('../landing/QuestCard', () => ({
  QuestCard: ({ challengeId }: { challengeId: string }) => (
    <div data-testid={`quest-card-${challengeId}`} />
  ),
}));

vi.mock('../landing/StreakCounter', () => ({
  StreakCounter: () => <div data-testid="streak-counter" />,
}));

vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tabbed-daily-leaderboard" />,
}));

vi.mock('../landing/ConfettiBackground', () => ({
  ConfettiBackground: () => null,
}));

vi.mock('../landing/FloatingDecorations', () => ({
  FloatingDecorations: () => null,
}));

// --- framer-motion mock ---
vi.mock('framer-motion', () => ({
  m: {
    a: ({ children, className, style, ...props }: React.ComponentProps<'a'> & { animate?: unknown; initial?: unknown; transition?: unknown; whileHover?: unknown; whileTap?: unknown }) => (
      <a className={className} style={style} {...props}>{children}</a>
    ),
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ComponentProps<'button'>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// --- fetch mock ---
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ available: true, data: {}, streak: 0 }),
  });
});

const defaultProps = {
  onSelectWordHunt: vi.fn(),
    onSelectWordWheel: vi.fn(),
  currentLanguage: 'en' as const,
};

describe('DailyChallengeLanding - ScoreGauntletBanner integration', () => {
  describe('GIVEN URL has challenge params', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams(
          'whName=Ohad&whScore=847&whEmoji=%F0%9F%8E%AF'
        )
      );
    });

    it('THEN shows ScoreGauntletBanner with challenger name and score', () => {
      render(<DailyChallengeLanding {...defaultProps} />);

      expect(screen.getByTestId('score-gauntlet-banner')).toBeInTheDocument();
      expect(screen.getByText(/Ohad/)).toBeInTheDocument();
      expect(screen.getByText(/847/)).toBeInTheDocument();
    });

    it('THEN banner appears above the Word Hunt quest card', () => {
      const { container } = render(<DailyChallengeLanding {...defaultProps} />);

      const banner = container.querySelector('[data-testid="score-gauntlet-banner"]');
      const wordHuntCard = container.querySelector('[data-testid="quest-card-wordHunt"]');

      expect(banner).toBeInTheDocument();
      expect(wordHuntCard).toBeInTheDocument();

      // Banner should come before the wordHunt quest card in the DOM
      const position =
        banner!.compareDocumentPosition(wordHuntCard!) &
        Node.DOCUMENT_POSITION_FOLLOWING;
      expect(position).toBeTruthy();
    });
  });

  describe('GIVEN URL has NO challenge params', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams(''));
    });

    it('THEN does NOT render ScoreGauntletBanner', () => {
      render(<DailyChallengeLanding {...defaultProps} />);

      expect(screen.queryByTestId('score-gauntlet-banner')).not.toBeInTheDocument();
    });
  });

  describe('GIVEN URL has challenger name but no score', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams('whName=Ohad')
      );
    });

    it('THEN does NOT render ScoreGauntletBanner (score required)', () => {
      render(<DailyChallengeLanding {...defaultProps} />);

      expect(screen.queryByTestId('score-gauntlet-banner')).not.toBeInTheDocument();
    });
  });

  describe('GIVEN useSearchParams returns null', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue(null);
    });

    it('THEN does NOT crash and banner is absent', () => {
      expect(() => render(<DailyChallengeLanding {...defaultProps} />)).not.toThrow();
      expect(screen.queryByTestId('score-gauntlet-banner')).not.toBeInTheDocument();
    });
  });
});
