/**
 * RetryAssistModal Tests
 *
 * Tests for the retry assist modal that helps players who are stuck.
 * Following TDD: Write tests FIRST, then implement.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RetryAssistModal from '../RetryAssistModal';

// Mock translations
const mockTranslations: Record<string, string> = {
  'adventure.retry.title': 'Almost There!',
  'adventure.retry.subtitle': "Don't give up - you're getting closer!",
  'adventure.retry.tryAgain': 'Try Again',
  'adventure.retry.bonusTime': 'Try with Bonus Time',
  'adventure.retry.bonusTimeDesc': '+30 seconds to find words',
  'adventure.retry.startWithHint': 'Start with a Hint',
  'adventure.retry.startWithHintDesc': 'Shows one word to get started',
  'adventure.retry.yourProgress': 'Your Progress',
  'adventure.retry.bestWords': 'Best Words',
  'adventure.retry.bestScore': 'Best Score',
  'adventure.retry.attempts': 'Attempts',
  'adventure.retry.nearMissTitle': 'So Close!',
  'adventure.retry.objectiveProgress': 'How You Did',
  'adventure.objectives.wordCount': 'Find words',
  'adventure.objectives.scoreTarget': 'Reach score',
  'adventure.objectives.clearIce': 'Clear ice',
  'adventure.objectives.longWords': 'Long words (5+)',
  'adventure.nearMiss.scoreAway': 'Only {remaining} points away!',
  'adventure.nearMiss.wordsAway': 'Just {remaining} more words!',
  'adventure.nearMiss.countAway': 'Only {remaining} more to go!',
  'common.exit': 'Exit',
};

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle',
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    showAd: vi.fn(),
    error: null,
    rewardAmount: 30,
    canShowAd: true,
    viewsToday: 0,
    maxViews: 10,
    isDailyLimitReached: false,
    isPlaceholder: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');

  const MockMotionDiv = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('div', { ...props, ref }, children)
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  const MockMotionButton = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('button', { ...props, ref }, children)
  );
  MockMotionButton.displayName = 'MockMotionButton';

  return {
    m: {
      div: MockMotionDiv,
      button: MockMotionButton,
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

describe('RetryAssistModal', () => {
  const defaultProps = {
    isOpen: true,
    consecutiveFailures: 2,
    bestWords: 5,
    bestScore: 250,
    attemptCount: 3,
    onRetry: vi.fn(),
    onRetryWithBonus: vi.fn(),
    onRetryWithHint: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.getByTestId('retry-assist-modal')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<RetryAssistModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('retry-assist-modal')).not.toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('should display encouraging title', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.getByText('Almost There!')).toBeInTheDocument();
    });

    it('should display encouraging subtitle', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.getByText("Don't give up - you're getting closer!")).toBeInTheDocument();
    });

    it('should display best words stat', () => {
      render(<RetryAssistModal {...defaultProps} bestWords={8} />);
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Best Words')).toBeInTheDocument();
    });

    it('should display best score stat', () => {
      render(<RetryAssistModal {...defaultProps} bestScore={450} />);
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('Best Score')).toBeInTheDocument();
    });

    it('should display attempt count', () => {
      // Use different value than bestWords to avoid duplicate text
      render(<RetryAssistModal {...defaultProps} attemptCount={7} />);
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('Attempts')).toBeInTheDocument();
    });
  });

  describe('Buttons', () => {
    it('should always show Try Again button', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={1} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should show Bonus Time button after 2+ failures', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={2} />);
      expect(screen.getByRole('button', { name: /bonus time/i })).toBeInTheDocument();
    });

    it('should not show Bonus Time button after 1 failure', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={1} />);
      expect(screen.queryByRole('button', { name: /bonus time/i })).not.toBeInTheDocument();
    });

    it('should show Start with Hint button after 3+ failures', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={3} />);
      expect(screen.getByRole('button', { name: /start with a hint/i })).toBeInTheDocument();
    });

    it('should not show Start with Hint button after 2 failures', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={2} />);
      expect(screen.queryByRole('button', { name: /start with a hint/i })).not.toBeInTheDocument();
    });

    it('should show Exit button', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
    });
  });

  describe('Button Callbacks', () => {
    it('should call onRetry when Try Again is clicked', () => {
      const onRetry = vi.fn();
      render(<RetryAssistModal {...defaultProps} onRetry={onRetry} />);

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onRetryWithBonus when Bonus Time is clicked', () => {
      const onRetryWithBonus = vi.fn();
      render(
        <RetryAssistModal
          {...defaultProps}
          consecutiveFailures={2}
          onRetryWithBonus={onRetryWithBonus}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /bonus time/i }));
      expect(onRetryWithBonus).toHaveBeenCalledTimes(1);
    });

    it('should call onRetryWithHint when Start with Hint is clicked', () => {
      const onRetryWithHint = vi.fn();
      render(
        <RetryAssistModal
          {...defaultProps}
          consecutiveFailures={3}
          onRetryWithHint={onRetryWithHint}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /start with a hint/i }));
      expect(onRetryWithHint).toHaveBeenCalledTimes(1);
    });

    it('should call onExit when Exit is clicked', () => {
      const onExit = vi.fn();
      render(<RetryAssistModal {...defaultProps} onExit={onExit} />);

      fireEvent.click(screen.getByRole('button', { name: /exit/i }));
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have descriptive aria-label', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'adventure.game.retryOptions');
    });
  });

  describe('Progressive Assistance', () => {
    it('should show only Try Again and Exit for first failure', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={1} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3); // Rewarded, Try Again, Exit
    });

    it('should show Try Again, Bonus Time, and Exit after 2 failures', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={2} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4); // Rewarded, Try Again, Bonus Time, Exit
    });

    it('should show all options after 3+ failures', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={3} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5); // Rewarded, Try Again, Bonus Time, Hint, Exit
    });
  });

  describe('Near-Miss Messages', () => {
    it('should render near-miss messages when provided', () => {
      const nearMissMessages = [
        { type: 'scoreTarget' as const, translationKey: 'adventure.nearMiss.scoreAway', params: { remaining: 25 } },
      ];
      render(<RetryAssistModal {...defaultProps} nearMissMessages={nearMissMessages} />);
      expect(screen.getByTestId('near-miss-section')).toBeInTheDocument();
      expect(screen.getByText('So Close!')).toBeInTheDocument();
    });

    it('should render multiple near-miss messages', () => {
      const nearMissMessages = [
        { type: 'scoreTarget' as const, translationKey: 'adventure.nearMiss.scoreAway', params: { remaining: 25 } },
        { type: 'wordCount' as const, translationKey: 'adventure.nearMiss.wordsAway', params: { remaining: 1 } },
      ];
      render(<RetryAssistModal {...defaultProps} nearMissMessages={nearMissMessages} />);
      const section = screen.getByTestId('near-miss-section');
      expect(section).toBeInTheDocument();
    });

    it('should not render near-miss section when no messages', () => {
      render(<RetryAssistModal {...defaultProps} nearMissMessages={[]} />);
      expect(screen.queryByTestId('near-miss-section')).not.toBeInTheDocument();
    });

    it('should not render near-miss section when prop is undefined', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.queryByTestId('near-miss-section')).not.toBeInTheDocument();
    });
  });

  describe('Objective Progress (F5)', () => {
    it('renders a progress bar for each incomplete objective', () => {
      render(
        <RetryAssistModal
          {...defaultProps}
          objectives={[
            { type: 'wordCount', target: 8, current: 5, isComplete: false },
            { type: 'clearIce', target: 6, current: 4, isComplete: false },
          ]}
        />
      );
      const bars = screen.getAllByRole('progressbar');
      expect(bars).toHaveLength(2);
      expect(bars[0]).toHaveAttribute('aria-valuenow', '5');
      expect(bars[0]).toHaveAttribute('aria-valuemax', '8');
      expect(bars[1]).toHaveAttribute('aria-valuenow', '4');
      expect(bars[1]).toHaveAttribute('aria-valuemax', '6');
    });

    it('shows current/target fraction for each incomplete objective', () => {
      render(
        <RetryAssistModal
          {...defaultProps}
          objectives={[{ type: 'wordCount', target: 8, current: 5, isComplete: false }]}
        />
      );
      expect(screen.getByText('5 / 8')).toBeInTheDocument();
    });

    it('labels each progress bar with the objective name', () => {
      render(
        <RetryAssistModal
          {...defaultProps}
          objectives={[{ type: 'wordCount', target: 8, current: 5, isComplete: false }]}
        />
      );
      expect(screen.getByRole('progressbar')).toHaveAccessibleName(/find words/i);
    });

    it('omits completed objectives so the player sees only the gap', () => {
      render(
        <RetryAssistModal
          {...defaultProps}
          objectives={[
            { type: 'wordCount', target: 8, current: 5, isComplete: false },
            { type: 'scoreTarget', target: 200, current: 200, isComplete: true },
          ]}
        />
      );
      expect(screen.getAllByRole('progressbar')).toHaveLength(1);
      expect(screen.queryByText('200 / 200')).not.toBeInTheDocument();
    });

    it('treats missing current as zero (player did not progress that objective)', () => {
      render(
        <RetryAssistModal
          {...defaultProps}
          objectives={[{ type: 'wordCount', target: 8 }]}
        />
      );
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0 / 8')).toBeInTheDocument();
    });

    it('does not render the progress section when objectives prop is missing', () => {
      render(<RetryAssistModal {...defaultProps} />);
      expect(screen.queryByTestId('objective-progress-section')).not.toBeInTheDocument();
    });

    it('does not render the progress section when every objective is complete', () => {
      render(
        <RetryAssistModal
          {...defaultProps}
          objectives={[{ type: 'wordCount', target: 8, current: 8, isComplete: true }]}
        />
      );
      expect(screen.queryByTestId('objective-progress-section')).not.toBeInTheDocument();
    });
  });
});
