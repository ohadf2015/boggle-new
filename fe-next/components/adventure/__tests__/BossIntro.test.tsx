/**
 * BossIntro Component Tests
 *
 * Tests for the pre-battle boss introduction cutscene in adventure mode.
 * Following TDD: Write tests FIRST, then implement.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BossIntro from '../BossIntro';
import type { BossConfig } from '@/types/boss';

// ==============================================
// MOCKS
// ==============================================

const mockTranslations: Record<string, string> = {
  'adventure.bosses.msGrammar.name': 'Ms. Grammar',
  'adventure.bosses.msGrammar.mechanic': 'Pop Quiz Protocol',
  'adventure.bosses.msGrammar.taunts.start1': 'Class is in session!',
  'adventure.bosses.bossIntro': 'Boss Battle!',
  'adventure.bosses.skipIntro': 'Skip',
  'adventure.bosses.readyToFight': "Let's Go!",
  'adventure.bosses.twistMechanic': 'Boss Twist',
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/AdventureThemeContext', () => ({
  useBossFightTheme: () => ({
    dialogueBg: 'bg-neo-navy/95',
    dialogueBorder: 'border-neo-white/20',
    bossNameColor: 'text-neo-red',
    hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
    telegraphColor: 'bg-neo-red/20',
    telegraphProgressColor: 'bg-neo-red',
    playerHealthNormal: 'bg-neo-lime',
    playerHealthLow: 'bg-neo-red',
    phaseColors: {
      phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
      phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
      enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
    },
    avatarGlow: 'rgba(239, 68, 68, 0.4)',
    victoryGlow: 'rgba(163, 230, 53, 0.6)',
    arenaEffect: 'none',
  }),
}));

// Mock framer-motion to render static elements for testing
vi.mock('framer-motion', () => {
  const React = require('react');

  const MockMotionDiv = React.forwardRef(
    ({ children, ...props }: Record<string, unknown>, ref: unknown) =>
      React.createElement('div', { ...props, ref }, children)
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  const MockMotionH1 = React.forwardRef(
    ({ children, ...props }: Record<string, unknown>, ref: unknown) =>
      React.createElement('h1', { ...props, ref }, children)
  );
  MockMotionH1.displayName = 'MockMotionH1';

  const MockMotionP = React.forwardRef(
    ({ children, ...props }: Record<string, unknown>, ref: unknown) =>
      React.createElement('p', { ...props, ref }, children)
  );
  MockMotionP.displayName = 'MockMotionP';

  const MockMotionImg = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      React.createElement('img', { ...props, ref })
  );
  MockMotionImg.displayName = 'MockMotionImg';

  return {
    m: {
      div: MockMotionDiv,
      h1: MockMotionH1,
      p: MockMotionP,
      img: MockMotionImg,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ==============================================
// TEST FIXTURES
// ==============================================

const mockBoss: BossConfig = {
  id: 'msGrammar',
  worldId: 1,
  displayName: 'adventure.bosses.msGrammar.name',
  personality: 'strict but fair teacher',
  visualTheme: 'academic',
  imagePath: '/images/adventure/bosses/ms-grammar.webp',
  twistMechanic: {
    type: 'popQuiz',
    description: 'adventure.bosses.msGrammar.mechanic',
    params: {},
  },
  taunts: {
    onStart: ['adventure.bosses.msGrammar.taunts.start1'],
    onGoodWord: ['adventure.bosses.msGrammar.taunts.goodWord1'],
    onBadWord: ['adventure.bosses.msGrammar.taunts.badWord1'],
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

const defaultProps = {
  boss: mockBoss,
  worldNumber: 1,
  onStart: vi.fn(),
  onSkip: vi.fn(),
};

// ==============================================
// TESTS
// ==============================================

describe('BossIntro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render boss name from translation key', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      expect(screen.getByText('Ms. Grammar')).toBeInTheDocument();
    });

    it('should render boss mechanic description', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      expect(screen.getByText('Pop Quiz Protocol')).toBeInTheDocument();
    });

    it('should show boss image with correct src and alt', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      const bossImage = screen.getByRole('img', { name: /ms\. grammar/i });
      expect(bossImage).toBeInTheDocument();
      expect(bossImage).toHaveAttribute('src', '/images/adventure/bosses/ms-grammar.webp');
    });

    it('should show "Boss Battle!" heading', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      expect(screen.getByText('Boss Battle!')).toBeInTheDocument();
    });

    it('should show the start taunt from the boss', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      expect(screen.getByText(/class is in session!/i)).toBeInTheDocument();
    });
  });

  describe('Buttons', () => {
    it('should show the "Let\'s Go!" button text', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      expect(screen.getByRole('button', { name: /let's go/i })).toBeInTheDocument();
    });

    it('should show the "Skip" button text', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });

    it('should call onStart when fight button is clicked', () => {
      // GIVEN
      const onStart = vi.fn();
      render(<BossIntro {...defaultProps} onStart={onStart} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /let's go/i }));

      // THEN
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onSkip when skip button is clicked', () => {
      // GIVEN
      const onSkip = vi.fn();
      render(<BossIntro {...defaultProps} onSkip={onSkip} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /skip/i }));

      // THEN
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible role="dialog" and aria-modal', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby referencing the boss name heading', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'boss-intro-title');
    });

    it('should have the "Boss Twist" label for mechanic section', () => {
      // GIVEN / WHEN
      render(<BossIntro {...defaultProps} />);

      // THEN
      expect(screen.getByText('Boss Twist')).toBeInTheDocument();
    });
  });
});
