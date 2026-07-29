/**
 * BossDialogue Component Tests
 *
 * Tests boss taunt overlay rendering, visibility toggling,
 * positioning, speech-bubble styling, and avatar display.
 */

import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BossDialogue from '../BossDialogue';
import type { BossConfig } from '@/types/boss';

// ==============================================
// MOCKS
// ==============================================

const mockTranslations: Record<string, string> = {
  'adventure.bosses.msGrammar.name': 'Ms. Grammar',
  'adventure.bosses.msGrammar.taunts.goodWord1': 'Acceptable. But no extra credit.',
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

vi.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: { src: string; alt: string }) => {
    return React.createElement('img', { src, alt, ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, React.PropsWithChildren<Record<string, unknown>>>(
    ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }, ref) => (
      <div ref={ref} {...props}>{children as React.ReactNode}</div>
    )
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  return {
    m: { div: MockMotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ==============================================
// FIXTURES
// ==============================================

const mockBoss: BossConfig = {
  id: 'msGrammar',
  worldId: 1,
  displayName: 'adventure.bosses.msGrammar.name',
  personality: 'A prim owl schoolteacher',
  visualTheme: 'school-owl',
  imagePath: '/images/adventure/bosses/ms-grammar.webp',
  images: {
    idle: '/images/adventure/bosses/ms-grammar.webp',
    attack: '/images/adventure/bosses/ms-grammar.webp',
    hurt: '/images/adventure/bosses/ms-grammar.webp',
    enraged: '/images/adventure/bosses/ms-grammar.webp',
    defeated: '/images/adventure/bosses/ms-grammar.webp',
  },
  storylineIntro: 'adventure.bosses.msGrammar.storylineIntro',
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

// ==============================================
// TESTS
// ==============================================

describe('BossDialogue', () => {
  const defaultProps = {
    boss: mockBoss,
    currentTaunt: 'adventure.bosses.msGrammar.taunts.goodWord1',
    isVisible: true,
  };

  describe('visibility', () => {
    it('should render taunt text when visible', () => {
      render(<BossDialogue {...defaultProps} />);

      expect(screen.getByText('Acceptable. But no extra credit.')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      render(<BossDialogue {...defaultProps} isVisible={false} />);

      expect(screen.queryByTestId('boss-dialogue')).not.toBeInTheDocument();
    });
  });

  describe('boss identity', () => {
    it('should show boss name', () => {
      render(<BossDialogue {...defaultProps} />);

      expect(screen.getByText('Ms. Grammar')).toBeInTheDocument();
    });

    it('should show boss avatar image', () => {
      render(<BossDialogue {...defaultProps} />);

      const avatar = screen.getByRole('img', { name: 'Ms. Grammar' });
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', '/images/adventure/bosses/ms-grammar.webp');
    });
  });

  describe('positioning', () => {
    it('should position at top by default, clear of header AND boss HUD strip', () => {
      render(<BossDialogue {...defaultProps} />);

      const container = screen.getByTestId('boss-dialogue');
      // top-32 sits below the header (top-0..12) AND the boss HUD strip (top-12..28)
      // so the dialogue does not clip the boss HP bar.
      expect(container).toHaveClass('top-32');
      expect(container).toHaveClass('sm:top-36');
      expect(container).not.toHaveClass('top-28');
      expect(container).not.toHaveClass('bottom-4');
    });

    it('should position at bottom when position="bottom"', () => {
      render(<BossDialogue {...defaultProps} position="bottom" />);

      const container = screen.getByTestId('boss-dialogue');
      expect(container).toHaveClass('bottom-4');
      expect(container).not.toHaveClass('top-32');
    });
  });

  describe('styling', () => {
    it('should have speech-bubble styling', () => {
      render(<BossDialogue {...defaultProps} />);

      const container = screen.getByTestId('boss-dialogue');
      // Neo-brutalist speech bubble uses border and shadow-hard
      expect(container.querySelector('[data-testid="boss-speech-bubble"]')).toBeInTheDocument();
    });

    it('should have data-testid="boss-dialogue"', () => {
      render(<BossDialogue {...defaultProps} />);

      expect(screen.getByTestId('boss-dialogue')).toBeInTheDocument();
    });
  });
});
