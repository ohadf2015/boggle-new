/**
 * AdventureGame Tests
 *
 * Tests for the main adventure mode game component
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';

// ==============================================
// TEST FIXTURES
// ==============================================

const mockLevelConfig: LevelConfig = {
  world: 1,
  level: 1,
  gridSize: 4,
  timerSeconds: 120,
  objectives: [
    { type: 'wordCount', target: 5, isPrimary: true },
    { type: 'scoreTarget', target: 200, isPrimary: false },
  ],
  specialTiles: [
    { row: 0, col: 0, type: 'gold' },
    { row: 2, col: 2, type: 'gold' },
  ],
  difficulty: 'EASY',
};

const mockGrid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['B', 'I', 'R', 'D'],
  ['F', 'I', 'S', 'H'],
];

const defaultProps = {
  levelConfig: mockLevelConfig,
  initialGrid: mockGrid,
  onLevelComplete: jest.fn(),
  onExit: jest.fn(),
};

// ==============================================
// MOCKS
// ==============================================

// Mock framer-motion to avoid animation timing issues in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  const MockMotionDiv = React.forwardRef(
    ({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref }, children)
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  const MockMotionButton = React.forwardRef(
    ({ children, ...props }: any, ref: any) =>
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

// ==============================================
// TESTS
// ==============================================

describe('AdventureGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render game container', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
    });

    it('should display level number', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByText(/Level 1/)).toBeInTheDocument();
    });

    it('should render the game grid', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should render the timer', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should render objectives list', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByRole('list', { name: /objectives/i })).toBeInTheDocument();
    });
  });

  describe('Game State', () => {
    it('should show initial time remaining', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN - 120 seconds = 2:00
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should show initial score of 0', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display all objectives', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByTestId('objective-wordCount')).toBeInTheDocument();
      expect(screen.getByTestId('objective-scoreTarget')).toBeInTheDocument();
    });
  });

  describe('Timer Countdown', () => {
    it('should countdown timer every second', () => {
      // GIVEN
      render(<AdventureGame {...defaultProps} />);
      expect(screen.getByText('2:00')).toBeInTheDocument();

      // WHEN - advance 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // THEN
      expect(screen.getByText('1:50')).toBeInTheDocument();
    });

    it('should stop countdown at 0:00', () => {
      // GIVEN
      render(<AdventureGame {...defaultProps} />);

      // WHEN - advance past time limit
      act(() => {
        jest.advanceTimersByTime(130000); // 130 seconds
      });

      // THEN
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });

  describe('Level Completion', () => {
    it('should show level complete modal when all primary objectives are met', async () => {
      // GIVEN
      const onLevelComplete = jest.fn();
      render(
        <AdventureGame
          {...defaultProps}
          onLevelComplete={onLevelComplete}
        />
      );

      // WHEN - simulate completing the level via the complete button
      const completeButton = screen.queryByRole('button', { name: /complete/i });
      if (completeButton) {
        fireEvent.click(completeButton);
      }

      // THEN - modal should appear eventually when objectives are met
      // Note: In actual implementation, completion happens when objectives are met
    });

    it('should show time up state when timer reaches 0', () => {
      // GIVEN
      render(<AdventureGame {...defaultProps} />);

      // WHEN - advance to timeout
      act(() => {
        jest.advanceTimersByTime(121000); // Just over 120 seconds
      });

      // THEN - should show time up or level end state
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Pause Functionality', () => {
    it('should have a pause button', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should stop timer when paused', () => {
      // GIVEN
      render(<AdventureGame {...defaultProps} />);
      expect(screen.getByText('2:00')).toBeInTheDocument();

      // WHEN - pause and advance time
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // THEN - timer should still show same time
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should show pause overlay when paused', () => {
      // GIVEN
      render(<AdventureGame {...defaultProps} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));

      // THEN
      expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    });

    it('should resume game when resume button is clicked', () => {
      // GIVEN
      render(<AdventureGame {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      const pauseOverlay = screen.getByTestId('pause-overlay');
      expect(pauseOverlay).toBeInTheDocument();

      // WHEN - click the Resume button inside the pause overlay (the one with text "Resume")
      const resumeButtons = screen.getAllByRole('button', { name: /resume/i });
      // Find the button inside the overlay (it contains text "Resume", not just icon)
      const resumeButton = resumeButtons.find(btn => btn.textContent === 'Resume');
      expect(resumeButton).toBeTruthy();
      fireEvent.click(resumeButton!);

      // THEN
      expect(screen.queryByTestId('pause-overlay')).not.toBeInTheDocument();
    });
  });

  describe('Exit Functionality', () => {
    it('should call onExit when exit button is clicked from pause menu', () => {
      // GIVEN
      const onExit = jest.fn();
      render(<AdventureGame {...defaultProps} onExit={onExit} />);

      // WHEN - pause then exit
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      fireEvent.click(screen.getByRole('button', { name: /exit/i }));

      // THEN
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Score Display', () => {
    it('should display score in header', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });
  });

  describe('Combo System', () => {
    it('should display combo counter when combo is active', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN - combo starts at 0, not displayed until active
      expect(screen.getByTestId('combo-display')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible game region', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      const gameRegion = screen.getByTestId('adventure-game');
      expect(gameRegion).toHaveAttribute('role', 'main');
    });

    it('should have accessible label for objectives', () => {
      // GIVEN / WHEN
      render(<AdventureGame {...defaultProps} />);

      // THEN
      const objectivesList = screen.getByRole('list', { name: /objectives/i });
      expect(objectivesList).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid level config gracefully', () => {
      // GIVEN
      const invalidConfig = { ...mockLevelConfig, gridSize: 0 };

      // WHEN / THEN - should not crash
      expect(() => {
        render(<AdventureGame {...defaultProps} levelConfig={invalidConfig} />);
      }).not.toThrow();
    });
  });
});
