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
  'common.exit': 'Exit',
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
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
    motion: {
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
    onRetry: jest.fn(),
    onRetryWithBonus: jest.fn(),
    onRetryWithHint: jest.fn(),
    onExit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
      const onRetry = jest.fn();
      render(<RetryAssistModal {...defaultProps} onRetry={onRetry} />);

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onRetryWithBonus when Bonus Time is clicked', () => {
      const onRetryWithBonus = jest.fn();
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
      const onRetryWithHint = jest.fn();
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
      const onExit = jest.fn();
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
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Retry options');
    });
  });

  describe('Progressive Assistance', () => {
    it('should show only Try Again and Exit for first failure', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={1} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // Try Again, Exit
    });

    it('should show Try Again, Bonus Time, and Exit after 2 failures', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={2} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3); // Try Again, Bonus Time, Exit
    });

    it('should show all options after 3+ failures', () => {
      render(<RetryAssistModal {...defaultProps} consecutiveFailures={3} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4); // Try Again, Bonus Time, Hint, Exit
    });
  });
});
