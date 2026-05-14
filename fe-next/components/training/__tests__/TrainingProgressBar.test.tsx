import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TrainingProgressBar from '../TrainingProgressBar';

// Mock dependencies
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'training.progress.title': 'Training Progress',
        'training.progress.firstWord': 'Find First Word',
        'training.progress.diagonal': 'Swipe Diagonally',
        'training.progress.directionChange': 'Change Direction',
        'training.progress.targetScore': 'Score 15 Points',
        'training.progress.fiveWords': 'Find 5 Words',
        'common.collapse': 'Collapse',
        'training.progress.getStarted': "Let's get started!",
        'training.progress.tapForDetails': 'Tap for details',
      };
      return translations[key] || undefined;
    },
  }),
}));

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { onClick, onKeyDown, role, tabIndex, className } = props as {
        onClick?: () => void;
        onKeyDown?: (e: React.KeyboardEvent) => void;
        role?: string;
        tabIndex?: number;
        className?: string;
      };
      return (
        <div
          onClick={onClick}
          onKeyDown={onKeyDown}
          role={role}
          tabIndex={tabIndex}
          className={className}
        >
          {children}
        </div>
      );
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { onClick, className } = props as {
        onClick?: () => void;
        className?: string;
      };
      return (
        <button onClick={onClick} className={className}>
          {children}
        </button>
      );
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('TrainingProgressBar', () => {
  const defaultProps = {
    completedSkills: new Set<string>(),
    score: 0,
    wordsFound: 0,
  };

  describe('expand/collapse functionality', () => {
    it('should toggle from collapsed to expanded when clicking compact bar', () => {
      const onToggleExpand = vi.fn();
      render(
        <TrainingProgressBar
          {...defaultProps}
          compact={true}
          expanded={false}
          onToggleExpand={onToggleExpand}
        />
      );

      // The compact bar should be clickable
      const compactBar = screen.getByRole('button');
      fireEvent.click(compactBar);

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('should toggle from expanded to collapsed when clicking expanded container', () => {
      const onToggleExpand = vi.fn();
      render(
        <TrainingProgressBar
          {...defaultProps}
          compact={true}
          expanded={true}
          onToggleExpand={onToggleExpand}
        />
      );

      // Find the outer container by its accessible name (includes all text content)
      const expandedContainer = screen.getByRole('button', { name: /Training Progress/i });
      fireEvent.click(expandedContainer);

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('should toggle when clicking Collapse button in expanded state', () => {
      const onToggleExpand = vi.fn();
      render(
        <TrainingProgressBar
          {...defaultProps}
          compact={true}
          expanded={true}
          onToggleExpand={onToggleExpand}
        />
      );

      // There should be a "Collapse" button visible
      const collapseButton = screen.getByText('Collapse');
      fireEvent.click(collapseButton);

      expect(onToggleExpand).toHaveBeenCalled();
    });

    it('should collapse when pressing Enter on expanded container', () => {
      const onToggleExpand = vi.fn();
      render(
        <TrainingProgressBar
          {...defaultProps}
          compact={true}
          expanded={true}
          onToggleExpand={onToggleExpand}
        />
      );

      // Find the outer container by its accessible name
      const expandedContainer = screen.getByRole('button', { name: /Training Progress/i });
      fireEvent.keyDown(expandedContainer, { key: 'Enter' });

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe('visual indication for clickability', () => {
    it('should show tap hint in compact collapsed state', () => {
      render(
        <TrainingProgressBar
          {...defaultProps}
          compact={true}
          expanded={false}
          onToggleExpand={() => {}}
        />
      );

      // Should have visual indication that it's tappable
      expect(screen.getByText('Tap for details')).toBeInTheDocument();
    });
  });
});
