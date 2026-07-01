/**
 * LevelPreviewCard Tests
 *
 * Tests for the level preview card that shows before starting a level.
 * Following TDD: Write tests FIRST, then implement.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LevelPreviewCard from '../LevelPreviewCard';
import type { LevelConfig } from '@/types/adventure';

// Mock translations
const mockTranslations: Record<string, string> = {
  'adventure.preview.title': 'Level Preview',
  'adventure.preview.objectives': 'Objectives',
  'adventure.preview.timer': 'Time Limit',
  'adventure.preview.seconds': 'seconds',
  'adventure.preview.specialTiles': 'Special Tiles',
  'adventure.preview.noSpecialTiles': 'Standard tiles only',
  'adventure.preview.start': 'Start Level',
  'adventure.preview.back': 'Back',
  'adventure.preview.bestAttempt': 'Your Best',
  'adventure.preview.notAttempted': 'Not attempted yet',
  'adventure.level': 'Level',
  'adventure.worldLabel': 'World',
  'adventure.bossLabel': 'Boss',
  'common.score': 'Score',
  'common.wordsFound': 'Words',
  'adventure.objectives.wordCount': 'Find words',
  'adventure.objectives.scoreTarget': 'Reach score',
  'adventure.objectives.longWords': 'Long words (5+)',
  'adventure.objectives.clearIce': 'Clear ice tiles',
  'adventure.tiles.gold': 'Gold (3x points)',
  'adventure.tiles.ice': 'Ice (obstacle)',
  'adventure.tiles.bomb': 'Bomb (clears row)',
  'adventure.tiles.rainbow': 'Rainbow (wild)',
  'adventure.tiles.chain': 'Chain (combo)',
  'adventure.tiles.time': 'Time (+5 sec)',
};

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

  return {
    m: {
      div: MockMotionDiv,
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

describe('LevelPreviewCard', () => {
  const mockLevelConfig: LevelConfig = {
    world: 1,
    level: 3,
    gridSize: 4,
    timerSeconds: 120,
    objectives: [
      { type: 'wordCount', target: 10, isPrimary: true },
      { type: 'scoreTarget', target: 500, isPrimary: false },
    ],
    specialTiles: [
      { row: 0, col: 0, type: 'gold' },
      { row: 2, col: 2, type: 'ice' },
    ],
    difficulty: 'MEDIUM',
    chapterNumber: 1,
    levelInChapter: 3,
    isBossLevel: false,
  };

  const defaultProps = {
    levelConfig: mockLevelConfig,
    worldNumber: 1,
    levelNumber: 3,
    onStart: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Level Information', () => {
    it('should display level number', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText(/level 3/i)).toBeInTheDocument();
    });

    it('should display world number', () => {
      render(<LevelPreviewCard {...defaultProps} worldNumber={2} />);
      expect(screen.getByText(/world 2/i)).toBeInTheDocument();
    });

    it('should display timer duration', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('seconds')).toBeInTheDocument();
    });
  });

  describe('Objectives Display', () => {
    it('should display objectives section header', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText('Objectives')).toBeInTheDocument();
    });

    it('should display all objectives', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText(/find words/i)).toBeInTheDocument();
      expect(screen.getByText(/reach score/i)).toBeInTheDocument();
    });

    it('should display objective targets', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText('10')).toBeInTheDocument(); // wordCount target
      expect(screen.getByText('500')).toBeInTheDocument(); // scoreTarget
    });
  });

  describe('Special Tiles Display', () => {
    it('should display special tiles section', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText('Special Tiles')).toBeInTheDocument();
    });

    it('should display unique special tile types', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText(/gold/i)).toBeInTheDocument();
      expect(screen.getByText(/ice/i)).toBeInTheDocument();
    });

    it('should show "no special tiles" message when none exist', () => {
      const configWithoutSpecials: LevelConfig = {
        ...mockLevelConfig,
        specialTiles: [],
      };
      render(<LevelPreviewCard {...defaultProps} levelConfig={configWithoutSpecials} />);
      expect(screen.getByText('Standard tiles only')).toBeInTheDocument();
    });
  });

  describe('Best Attempt Display', () => {
    it('should show "not attempted" when no best attempt exists', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByText('Not attempted yet')).toBeInTheDocument();
    });

    it('should display best attempt stats when available', () => {
      const bestAttempt = {
        world: 1,
        level: 3,
        bestWords: 8,
        bestScore: 350,
        bestTimeRemaining: 45,
        objectiveProgress: {},
        attemptCount: 3,
        consecutiveFailures: 1,
        firstAttemptAt: '2025-01-20T12:00:00Z',
        lastAttemptAt: '2025-01-20T12:30:00Z',
      };
      render(<LevelPreviewCard {...defaultProps} bestAttempt={bestAttempt} />);
      expect(screen.getByText('8')).toBeInTheDocument(); // bestWords
      expect(screen.getByText('350')).toBeInTheDocument(); // bestScore
    });
  });

  describe('Buttons', () => {
    it('should display Start button', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByRole('button', { name: /start level/i })).toBeInTheDocument();
    });

    it('should display Back button', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should call onStart when Start is clicked', () => {
      const onStart = vi.fn();
      render(<LevelPreviewCard {...defaultProps} onStart={onStart} />);

      fireEvent.click(screen.getByRole('button', { name: /start level/i }));
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onBack when Back is clicked', () => {
      const onBack = vi.fn();
      render(<LevelPreviewCard {...defaultProps} onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Boss Level Indicator', () => {
    it('should show boss indicator for boss levels', () => {
      const bossConfig: LevelConfig = {
        ...mockLevelConfig,
        isBossLevel: true,
      };
      render(<LevelPreviewCard {...defaultProps} levelConfig={bossConfig} />);
      expect(screen.getByTestId('boss-indicator')).toBeInTheDocument();
    });

    it('should not show boss indicator for normal levels', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.queryByTestId('boss-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have accessible button labels', () => {
      render(<LevelPreviewCard {...defaultProps} />);
      expect(screen.getByRole('button', { name: /start level/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /back/i })).toHaveAccessibleName();
    });
  });
});
