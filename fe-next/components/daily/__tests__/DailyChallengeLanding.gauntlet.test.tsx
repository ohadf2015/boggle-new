/**
 * Tests for ScoreGauntletBanner integration in DailyChallengeLanding.
 *
 * Requirements:
 * 1. When URL params include whChallenger, whChallengeScore, whChallengeEmoji → show ScoreGauntletBanner
 * 2. When no challenge params → banner is absent
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';

// --- next/navigation mocks (overridden per test) ---
const mockUseSearchParams = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/en/daily',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}));

// --- Mock ScoreGauntletBanner to keep tests lightweight ---
jest.mock('../ScoreGauntletBanner', () => ({
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
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// --- Utility mocks ---
jest.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: jest.fn(() => null),
}));

jest.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: jest.fn(() => 'test-fingerprint'),
}));

// --- Sub-component mocks to avoid deep render trees ---
jest.mock('../landing/DailyMissionsHeader', () => ({
  DailyMissionsHeader: () => <div data-testid="missions-header" />,
}));

jest.mock('../landing/QuestCard', () => ({
  QuestCard: ({ challengeId }: { challengeId: string }) => (
    <div data-testid={`quest-card-${challengeId}`} />
  ),
}));

jest.mock('../landing/StreakCounter', () => ({
  StreakCounter: () => <div data-testid="streak-counter" />,
}));

jest.mock('../landing/LeaderboardTeaser', () => ({
  LeaderboardTeaser: () => <div data-testid="leaderboard-teaser" />,
}));

jest.mock('../landing/ConfettiBackground', () => ({
  ConfettiBackground: () => null,
}));

jest.mock('../landing/FloatingDecorations', () => ({
  FloatingDecorations: () => null,
}));

// --- framer-motion mock ---
jest.mock('framer-motion', () => ({
  motion: {
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
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ available: true, data: {}, streak: 0 }),
  });
});

const defaultProps = {
  onSelectWordHunt: jest.fn(),
  currentLanguage: 'en' as const,
};

describe('DailyChallengeLanding - ScoreGauntletBanner integration', () => {
  describe('GIVEN URL has challenge params', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams(
          'whChallenger=Ohad&whChallengeScore=847&whChallengeEmoji=%F0%9F%8E%AF'
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
        new URLSearchParams('whChallenger=Ohad')
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
