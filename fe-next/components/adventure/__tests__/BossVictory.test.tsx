/**
 * BossVictory Tests
 *
 * Tests for the boss victory/defeat modal in adventure mode.
 * Replaces LevelCompleteModal for boss levels with personality-driven UI.
 * Following TDD: Write tests FIRST, then implement.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BossVictory from '../BossVictory';
import type { BossConfig } from '@/types/boss';
import type { AdventureGameState } from '@/types/adventure';

// ==============================================
// MOCKS
// ==============================================

const mockTranslations: Record<string, string> = {
  'adventure.bosses.msGrammar.name': 'Ms. Grammar',
  'adventure.bosses.msGrammar.taunts.victory': 'A gold star for you!',
  'adventure.bosses.msGrammar.taunts.defeat': 'See me after class...',
  'adventure.bosses.bossDefeated': 'Boss Defeated!',
  'adventure.bosses.bossWins': 'Boss Wins...',
  'adventure.continueToNext': 'Continue',
  'adventure.retryLevel': 'Retry',
  'common.score': 'Score',
  'adventure.starsEarned': 'Stars Earned',
  'adventure.game.wordsFound': 'Words Found',
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const levelCompleteHapticSpy = vi.fn();
vi.mock('@/hooks/useHaptics', () => ({
  useHaptics: () => ({
    levelComplete: levelCompleteHapticSpy,
    success: vi.fn(),
    tap: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    selection: vi.fn(),
    bossHit: vi.fn(),
    trigger: vi.fn(),
    triggerCustom: vi.fn(),
    isSupported: () => false,
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');

  const MockMotionDiv = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('div', { ...props, ref }, children)
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  const MockMotionH2 = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('h2', { ...props, ref }, children)
  );
  MockMotionH2.displayName = 'MockMotionH2';

  const MockMotionP = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('p', { ...props, ref }, children)
  );
  MockMotionP.displayName = 'MockMotionP';

  const MockMotionImg = React.forwardRef((props: any, ref: any) =>
    React.createElement('img', { ...props, ref })
  );
  MockMotionImg.displayName = 'MockMotionImg';

  return {
    m: {
      div: MockMotionDiv,
      h2: MockMotionH2,
      p: MockMotionP,
      img: MockMotionImg,
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

// ==============================================
// TEST FIXTURES
// ==============================================

const mockBoss: BossConfig = {
  id: 'msGrammar',
  worldId: 1,
  displayName: 'adventure.bosses.msGrammar.name',
  personality: 'Strict but fair schoolteacher',
  visualTheme: 'classroom',
  imagePath: '/images/adventure/bosses/ms-grammar.webp',
  twistMechanic: {
    type: 'popQuiz',
    description: 'adventure.bosses.msGrammar.mechanic',
    params: {},
  },
  taunts: {
    onStart: ['adventure.bosses.msGrammar.taunts.start1'],
    onGoodWord: ['adventure.bosses.msGrammar.taunts.good1'],
    onBadWord: ['adventure.bosses.msGrammar.taunts.bad1'],
    onMechanic: ['adventure.bosses.msGrammar.taunts.mechanic1'],
    onLowTime: ['adventure.bosses.msGrammar.taunts.lowTime1'],
    onVictory: 'adventure.bosses.msGrammar.taunts.victory',
    onDefeat: 'adventure.bosses.msGrammar.taunts.defeat',
  },
  phases: [
    { nameKey: 'adventure.bosses.msGrammar.phases.lecture', hpThreshold: 100, mechanicModifiers: { speedMultiplier: 1 } },
    { nameKey: 'adventure.bosses.msGrammar.phases.popTest', hpThreshold: 66, mechanicModifiers: { speedMultiplier: 1.5 } },
    { nameKey: 'adventure.bosses.msGrammar.phases.finalExam', hpThreshold: 33, mechanicModifiers: { speedMultiplier: 2.0 } },
  ],
};

const mockGameState: AdventureGameState = {
  levelConfig: {
    world: 1,
    level: 7,
    gridSize: 4,
    timerSeconds: 120,
    objectives: [],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 3,
    levelInChapter: 3,
    isBossLevel: true,
  },
  tiles: [],
  score: 1250,
  wordsFound: ['HELLO', 'WORLD', 'TEST'],
  objectives: [],
  comboCount: 0,
  cascadeActive: false,
  isComplete: true,
  stars: 2,
};

const defaultProps = {
  boss: mockBoss,
  isVictory: true,
  stars: 2 as const,
  score: 1250,
  wordsFound: ['HELLO', 'WORLD', 'TEST'],
  gameState: mockGameState,
  onContinue: vi.fn(),
  onRetry: vi.fn(),
};

// ==============================================
// TESTS
// ==============================================

describe('BossVictory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    levelCompleteHapticSpy.mockClear();
  });

  describe('Victory State', () => {
    it('should render "Boss Defeated!" when victory', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} isVictory={true} />);

      // THEN
      expect(screen.getByText('Boss Defeated!')).toBeInTheDocument();
    });

    it('GF-003: fires level-complete haptic exactly once on mount when isVictory', () => {
      render(<BossVictory {...defaultProps} isVictory={true} />);
      expect(levelCompleteHapticSpy).toHaveBeenCalledTimes(1);
    });

    it('GF-003: does NOT fire haptic on defeat', () => {
      render(<BossVictory {...defaultProps} isVictory={false} />);
      expect(levelCompleteHapticSpy).not.toHaveBeenCalled();
    });

    it('should show boss victory taunt when player wins', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} isVictory={true} />);

      // THEN - boss's onVictory taunt is resolved through t(), wrapped in curly quotes
      expect(screen.getByText(
        (_content, element) => element?.textContent === '\u201CA gold star for you!\u201D'
      )).toBeInTheDocument();
    });
  });

  describe('Defeat State', () => {
    it('should render "Boss Wins..." when defeat', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} isVictory={false} stars={0} />);

      // THEN
      expect(screen.getByText('Boss Wins...')).toBeInTheDocument();
    });

    it('should show boss defeat taunt when player loses', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} isVictory={false} stars={0} />);

      // THEN - boss's onDefeat taunt is resolved through t(), wrapped in curly quotes
      expect(screen.getByText(
        (_content, element) => element?.textContent === '\u201CSee me after class...\u201D'
      )).toBeInTheDocument();
    });
  });

  describe('Boss Display', () => {
    it('should show boss name', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} />);

      // THEN
      expect(screen.getByText('Ms. Grammar')).toBeInTheDocument();
    });

    it('should show boss image', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} />);

      // THEN
      const bossImage = screen.getByRole('img', { name: /ms\. grammar/i });
      expect(bossImage).toBeInTheDocument();
      expect(bossImage).toHaveAttribute('src', '/images/adventure/bosses/ms-grammar.webp');
    });
  });

  describe('Stats Display', () => {
    it('should show score', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} score={1250} />);

      // THEN
      expect(screen.getByText('Score')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });

    it('should show words found count', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} wordsFound={['HELLO', 'WORLD', 'TEST']} />);

      // THEN
      expect(screen.getByText('Words Found')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should call onContinue when continue button clicked (victory only)', () => {
      // GIVEN
      const onContinue = vi.fn();
      render(<BossVictory {...defaultProps} isVictory={true} onContinue={onContinue} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // THEN
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry when retry button clicked', () => {
      // GIVEN
      const onRetry = vi.fn();
      render(<BossVictory {...defaultProps} onRetry={onRetry} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      // THEN
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show continue button on defeat', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} isVictory={false} stars={0} />);

      // THEN
      expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog" and aria-modal', () => {
      // GIVEN / WHEN
      render(<BossVictory {...defaultProps} />);

      // THEN
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });
});
