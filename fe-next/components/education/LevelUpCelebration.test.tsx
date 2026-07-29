/**
 * LevelUpCelebration Component Tests
 *
 * Tests the level-up celebration modal component.
 * Verifies rendering behavior, accessibility, and interactions.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelUpCelebration, type LevelUpPayload } from './LevelUpCelebration';

// Mock fireConfetti
const mockFireConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({
  fireLevelUpConfetti: () => mockFireConfetti(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  // Create a factory function that generates mock components
  const createMockComponent = (Element: string) => {
     
    const Component = React.forwardRef((props: any, ref: any) => {
      const {
        children,
        initial,
        animate,
        exit,
        transition,
        whileHover,
        whileTap,
        ...rest
      } = props;
      return React.createElement(Element, { ...rest, ref }, children);
    });
    Component.displayName = `m.${Element}`;
    return Component;
  };

  return {
    m: {
      div: createMockComponent('div'),
      span: createMockComponent('span'),
      button: createMockComponent('button'),
      p: createMockComponent('p'),
      h2: createMockComponent('h2'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// Mock LanguageContext
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'education.xp.levelUp': 'Level Up!',
    'education.xp.newLevel': 'You reached level',
    'education.xp.newTitleUnlocked': 'New Title Unlocked!',
    'education.xp.continue': 'Continue',
    'common.continue': 'Continue',
  };
  return translations[key] || key;
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    direction: 'ltr',
  }),
}));

describe('LevelUpCelebration', () => {
  const defaultOnClose = vi.fn();

  const defaultLevelUpData: LevelUpPayload = {
    oldLevel: 4,
    newLevel: 5,
    newTitles: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==============================================
  // RENDERING TESTS
  // ==============================================

  describe('Rendering', () => {
    it('renders nothing when levelUpData is null', () => {
      const { container } = render(
        <LevelUpCelebration levelUpData={null} onClose={defaultOnClose} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('shows modal when levelUpData is provided', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Level Up!')).toBeInTheDocument();
    });

    it('displays correct new level number', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      // The level display should show the new level
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('You reached level')).toBeInTheDocument();
    });

    it('displays correct level number for different levels', () => {
      const highLevelData: LevelUpPayload = {
        oldLevel: 14,
        newLevel: 15,
        newTitles: [],
      };
      render(
        <LevelUpCelebration
          levelUpData={highLevelData}
          onClose={defaultOnClose}
        />
      );
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  // ==============================================
  // TITLE UNLOCK TESTS
  // ==============================================

  describe('Title Unlock Section', () => {
    it('shows title unlock section when newTitles present', () => {
      const levelUpWithTitle: LevelUpPayload = {
        oldLevel: 4,
        newLevel: 5,
        newTitles: ['Word Warrior'],
      };
      render(
        <LevelUpCelebration
          levelUpData={levelUpWithTitle}
          onClose={defaultOnClose}
        />
      );
      expect(screen.getByText('New Title Unlocked!')).toBeInTheDocument();
      expect(screen.getByText('Word Warrior')).toBeInTheDocument();
    });

    it('shows multiple titles when multiple unlocked', () => {
      const levelUpWithTitles: LevelUpPayload = {
        oldLevel: 9,
        newLevel: 10,
        newTitles: ['Lexicon Master', 'Double Digits'],
      };
      render(
        <LevelUpCelebration
          levelUpData={levelUpWithTitles}
          onClose={defaultOnClose}
        />
      );
      expect(screen.getByText('Lexicon Master')).toBeInTheDocument();
      expect(screen.getByText('Double Digits')).toBeInTheDocument();
    });

    it('hides title unlock section when no new titles', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      expect(
        screen.queryByText('New Title Unlocked!')
      ).not.toBeInTheDocument();
    });

    it('hides title unlock section when newTitles is empty array', () => {
      const levelUpEmptyTitles: LevelUpPayload = {
        oldLevel: 4,
        newLevel: 5,
        newTitles: [],
      };
      render(
        <LevelUpCelebration
          levelUpData={levelUpEmptyTitles}
          onClose={defaultOnClose}
        />
      );
      expect(
        screen.queryByText('New Title Unlocked!')
      ).not.toBeInTheDocument();
    });
  });

  // ==============================================
  // INTERACTION TESTS
  // ==============================================

  describe('Interactions', () => {
    it('calls onClose when Continue button clicked', async () => {
      const user = userEvent.setup();
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      expect(defaultOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay clicked', async () => {
      const user = userEvent.setup();
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      // Click the overlay (dialog element)
      const overlay = screen.getByRole('dialog');
      await user.click(overlay);
      expect(defaultOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal card clicked', async () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      // Click on the level text inside the modal card
      const levelText = screen.getByText('Level Up!');
      fireEvent.click(levelText);
      // onClose should not be called because click is on card content
      expect(defaultOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key pressed', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(defaultOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ==============================================
  // CONFETTI TESTS
  // ==============================================

  describe('Confetti Integration', () => {
    it('fires confetti when modal opens', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      expect(mockFireConfetti).toHaveBeenCalledTimes(1);
    });

    it('fires confetti only once for same levelUpData', () => {
      const { rerender } = render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      // Rerender with same data
      rerender(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      // Should still only be one call (useEffect dependency on levelUpData)
      expect(mockFireConfetti).toHaveBeenCalledTimes(1);
    });

    it('fires confetti again when levelUpData changes', () => {
      const { rerender } = render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      expect(mockFireConfetti).toHaveBeenCalledTimes(1);

      // Change levelUpData
      const newLevelUpData: LevelUpPayload = {
        oldLevel: 5,
        newLevel: 6,
        newTitles: [],
      };
      rerender(
        <LevelUpCelebration
          levelUpData={newLevelUpData}
          onClose={defaultOnClose}
        />
      );
      expect(mockFireConfetti).toHaveBeenCalledTimes(2);
    });

    it('does not fire confetti when levelUpData is null', () => {
      render(
        <LevelUpCelebration levelUpData={null} onClose={defaultOnClose} />
      );
      expect(mockFireConfetti).not.toHaveBeenCalled();
    });
  });

  // ==============================================
  // ACCESSIBILITY TESTS
  // ==============================================

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      const labelledById = dialog.getAttribute('aria-labelledby');
      // Verify the referenced element exists and contains the title
      const titleElement = document.getElementById(labelledById!);
      expect(titleElement).toBeInTheDocument();
    });

    it('Continue button is focusable', () => {
      render(
        <LevelUpCelebration
          levelUpData={defaultLevelUpData}
          onClose={defaultOnClose}
        />
      );
      const button = screen.getByRole('button', { name: /continue/i });
      expect(button).toBeVisible();
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});
