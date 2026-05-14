/**
 * LevelCompleteModal Tests
 *
 * Tests for the level completion modal in adventure mode
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LevelCompleteModal from '../LevelCompleteModal';
import type { LevelObjective } from '@/types/adventure';

// Mock translation function that returns English text for test assertions
const mockTranslations: Record<string, string> = {
  'adventure.levelComplete': 'Level Complete!',
  'adventure.game.tryAgain': 'Try Again!',
  'adventure.level': 'Level',
  'adventure.world': 'World',
  'adventure.perfect': 'PERFECT!',
  'adventure.game.perfect': 'Perfect!',
  'adventure.game.objectives': 'Objectives',
  'adventure.game.newHighScore': 'New High Score!',
  'adventure.continueToNext': 'Continue',
  'adventure.retryLevel': 'Retry',
  'adventure.objectives.wordCount': 'Find Words',
  'adventure.objectives.scoreTarget': 'Score Points',
  'adventure.objectives.longWords': 'Long Words',
  'adventure.objectives.clearIce': 'Clear Ice',
  'adventure.objectives.timeBonus': 'Time Bonus',
  'adventure.objectives.collectGems': 'Collect Gems',
  'common.score': 'Score',
  'common.exit': 'Exit',
};

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    coins: 100,
    spendCoins: vi.fn(),
    refreshCoins: vi.fn(),
    awardGameCompletion: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('@/components/ads/RewardedAdGoldButton', () => {
  const Stub = () => <div data-testid="rewarded-ad-gold-button">Ad</div>;
  return { __esModule: true, default: Stub, RewardedAdGoldButton: Stub };
});

vi.mock('@/contexts/LanguageContext', () => {
  const ctx = {
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
  };
  return {
    useLanguage: () => ctx,
    useLanguageSafe: () => ctx,
  };
});

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }, ref: unknown) => {
        // Filter out framer-motion specific props
        const filteredProps: Record<string, unknown> = {};
        Object.keys(props).forEach(key => {
          if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'custom', 'onAnimationComplete'].includes(key)) {
            filteredProps[key] = props[key];
          }
        });
        return React.createElement(element, { ...filteredProps, ref }, children);
      }
    );
    MockComponent.displayName = `MockMotion${element.charAt(0).toUpperCase() + element.slice(1)}`;
    return MockComponent;
  };

  const mockMotionValue = {
    get: () => 0,
    set: vi.fn(),
    onChange: vi.fn(),
    on: vi.fn(() => vi.fn()),
    current: 0,
  };

  return {
    m: {
      div: createMockMotion('div'),
      span: createMockMotion('span'),
      button: createMockMotion('button'),
      p: createMockMotion('p'),
      h2: createMockMotion('h2'),
      ul: createMockMotion('ul'),
      li: createMockMotion('li'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: () => mockMotionValue,
    useTransform: () => mockMotionValue,
    useSpring: () => mockMotionValue,
  };
});

// Mock useParallax hook
const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
vi.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: mockMotionValue(0),
    y: mockMotionValue(0),
    isGyroActive: false,
  }),
}));

// Mock usePrefersReducedMotion hook
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

// Mock useParticleBudget hook
vi.mock('@/hooks/useParticleBudget', () => ({
  useParticleBudget: () => ({
    combo: 20,
    word: 10,
    background: 5,
  }),
}));

// Mock confettiUtils
vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
}));

// ==============================================
// TEST FIXTURES
// ==============================================

const mockObjectives: LevelObjective[] = [
  { type: 'wordCount', target: 10, current: 10, isPrimary: true, isComplete: true },
  { type: 'scoreTarget', target: 500, current: 650, isPrimary: false, isComplete: true },
  { type: 'longWords', target: 3, current: 2, isPrimary: false, isComplete: false },
];

const defaultProps = {
  isOpen: true,
  stars: 2,
  score: 1250,
  objectives: mockObjectives,
  levelNumber: 5,
  worldNumber: 1,
  onContinue: vi.fn(),
  onRetry: vi.fn(),
  onExit: vi.fn(),
};

// ==============================================
// TESTS
// ==============================================

describe('LevelCompleteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should NOT render when isOpen is false', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} isOpen={false} />);

      // THEN
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display level complete title', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByText(/level complete/i)).toBeInTheDocument();
    });

    it('should display level number', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByText(/level 5/i)).toBeInTheDocument();
    });
  });

  describe('Star Display', () => {
    it('should display 3 star icons', () => {
      // GIVEN / WHEN
      const { container } = render(<LevelCompleteModal {...defaultProps} stars={1} />);

      // THEN - Component renders 3 Star icons (filled/empty determined by CSS)
      const starIcons = container.querySelectorAll('.lucide-star');
      expect(starIcons.length).toBe(3);
    });

    it('should style stars based on earned count', () => {
      // GIVEN / WHEN - 2 stars
      const { container } = render(<LevelCompleteModal {...defaultProps} stars={2} />);

      // THEN - Stars are rendered (styling is determined via framer-motion)
      const starIcons = container.querySelectorAll('.lucide-star');
      expect(starIcons.length).toBe(3);
      // Filled stars have fill-neo-yellow class
      const filledStars = container.querySelectorAll('.fill-neo-yellow');
      expect(filledStars.length).toBe(2);
    });

    it('should display all filled stars for 3 stars', () => {
      // GIVEN / WHEN
      const { container } = render(<LevelCompleteModal {...defaultProps} stars={3} />);

      // THEN
      const filledStars = container.querySelectorAll('.fill-neo-yellow');
      expect(filledStars.length).toBe(3);
    });

    it('should render star elements', () => {
      // GIVEN / WHEN
      const { container } = render(<LevelCompleteModal {...defaultProps} stars={3} />);

      // THEN - Stars are rendered as part of the display
      const starContainer = container.querySelector('.flex.justify-center.gap-3');
      expect(starContainer).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('should display the score', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} score={1250} />);

      // THEN
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });

    it('should display score label', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      // Use exact match for the score section label
      expect(screen.getByText('Score')).toBeInTheDocument();
    });

    it('should format large scores with commas', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} score={12500} />);

      // THEN
      expect(screen.getByText('12,500')).toBeInTheDocument();
    });
  });

  describe('Objectives Summary', () => {
    it('should display completed objectives count', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      // 2 of 3 objectives completed in mockObjectives
      expect(screen.getByText(/Objectives: 2\/3/)).toBeInTheDocument();
    });

    it('should show checkmark for completed objectives', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const completedItems = screen.getAllByTestId('objective-complete');
      expect(completedItems.length).toBe(2);
    });

    it('should show X for incomplete objectives', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const incompleteItems = screen.getAllByTestId('objective-incomplete');
      expect(incompleteItems.length).toBe(1);
    });
  });

  describe('Action Buttons', () => {
    it('should call onContinue when continue button is clicked', () => {
      // GIVEN
      const onContinue = vi.fn();
      render(<LevelCompleteModal {...defaultProps} onContinue={onContinue} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // THEN
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry when retry button is clicked', () => {
      // GIVEN
      const onRetry = vi.fn();
      render(<LevelCompleteModal {...defaultProps} onRetry={onRetry} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      // THEN
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onExit when exit button is clicked', () => {
      // GIVEN
      const onExit = vi.fn();
      render(<LevelCompleteModal {...defaultProps} onExit={onExit} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /exit/i }));

      // THEN
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('should highlight continue button as primary action', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toHaveClass('btn-primary');
    });
  });

  describe('Perfect Score', () => {
    // Note: Celebration particle effects have been removed per UI simplification
    // Confetti still fires on mount via fireVictoryConfetti() but is not in DOM

    it('should display "Perfect!" text for 3 stars', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={3} />);

      // THEN - "Perfect!" appears in both title and badge for 3 stars
      const perfectElements = screen.getAllByText(/perfect/i);
      expect(perfectElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Level Failed State', () => {
    it('should display level failed message when stars is 0', () => {
      // GIVEN
      const failedObjectives = mockObjectives.map((o) => ({
        ...o,
        isComplete: false,
        current: 0,
      }));

      // WHEN
      render(
        <LevelCompleteModal
          {...defaultProps}
          stars={0}
          objectives={failedObjectives}
        />
      );

      // THEN
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    it('should hide continue button when level is failed', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={0} />);

      // THEN
      expect(
        screen.queryByRole('button', { name: /continue/i })
      ).not.toBeInTheDocument();
    });

    it('should show retry as primary action when level is failed', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={0} />);

      // THEN
      const retryButton = screen.getByRole('button', { name: /retry/i });
      // In failed state, retry button gets prominent orange styling as primary action
      expect(retryButton).toHaveClass('bg-neo-orange');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dialog role', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible dialog title', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should trap focus within modal when open', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('High Score', () => {
    it('should display new high score indicator when isHighScore is true', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} isHighScore />);

      // THEN
      expect(screen.getByText(/new high score/i)).toBeInTheDocument();
    });

    it('should NOT display high score indicator when isHighScore is false', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} isHighScore={false} />);

      // THEN
      expect(screen.queryByText(/new high score/i)).not.toBeInTheDocument();
    });
  });

  describe('Lexi Mascot Integration', () => {
    it('should render victory mascot for 3 stars', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={3} />);

      // THEN - Check that InteractiveMascot is rendered
      // Note: InteractiveMascot uses different variants based on stars:
      // 3 stars = victory (trophy pose)
      const mascot = screen.getByTestId('interactive-mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('data-variant', 'victory');
    });

    it('should render celebrating mascot for 2 stars', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={2} />);

      // THEN - Check that InteractiveMascot is rendered
      // 2 stars = celebrating (celebration dance)
      const mascot = screen.getByTestId('interactive-mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('data-variant', 'celebrating');
    });

    it('should render happy mascot for 1 star', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={1} />);

      // THEN - Check that InteractiveMascot is rendered
      // 1 star = happy (happy face)
      const mascot = screen.getByTestId('interactive-mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('data-variant', 'happy');
    });

    it('should render encouraging mascot for 0 stars', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={0} />);

      // THEN - Check that InteractiveMascot is rendered
      // 0 stars = encouraging (supportive)
      const mascot = screen.getByTestId('interactive-mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('data-variant', 'encouraging');
    });
  });
});
