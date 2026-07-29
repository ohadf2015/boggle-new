/**
 * BossArena Component Tests
 *
 * Tests for the world-specific arena visual effects during boss fights.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the theme context
const mockUseBossFightTheme = vi.fn();
vi.mock('@/contexts/AdventureThemeContext', () => ({
  useBossFightTheme: () => mockUseBossFightTheme(),
}));

import BossArena from '../BossArena';

// ==============================================
// HELPERS
// ==============================================

function renderArena(worldId: number, arenaEffect = 'none') {
  mockUseBossFightTheme.mockReturnValue({
    arenaEffect,
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
  });
  return render(<BossArena worldId={worldId} />);
}

// ==============================================
// TESTS
// ==============================================

describe('BossArena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the arena container', () => {
      renderArena(1, 'chalkboard');
      expect(screen.getByTestId('boss-arena')).toBeInTheDocument();
    });

    it('should be a background overlay (pointer-events-none)', () => {
      renderArena(1, 'chalkboard');
      const arena = screen.getByTestId('boss-arena');
      expect(arena).toHaveClass('pointer-events-none');
    });

    it('should render nothing when arenaEffect is "none"', () => {
      renderArena(1, 'none');
      expect(screen.queryByTestId('boss-arena')).not.toBeInTheDocument();
    });
  });

  describe('Arena Effects', () => {
    it('should render chalkboard effect for world 1', () => {
      renderArena(1, 'chalkboard');
      expect(screen.getByTestId('arena-effect-chalkboard')).toBeInTheDocument();
    });

    it('should render honeycomb effect for world 2', () => {
      renderArena(2, 'honeycomb');
      expect(screen.getByTestId('arena-effect-honeycomb')).toBeInTheDocument();
    });

    it('should render crystal-cavern effect for world 3', () => {
      renderArena(3, 'crystal-cavern');
      expect(screen.getByTestId('arena-effect-crystal-cavern')).toBeInTheDocument();
    });

    it('should render ocean-deck effect for world 4', () => {
      renderArena(4, 'ocean-deck');
      expect(screen.getByTestId('arena-effect-ocean-deck')).toBeInTheDocument();
    });

    it('should render gear-factory effect for world 5', () => {
      renderArena(5, 'gear-factory');
      expect(screen.getByTestId('arena-effect-gear-factory')).toBeInTheDocument();
    });

    it('should render maze effect for world 6', () => {
      renderArena(6, 'maze');
      expect(screen.getByTestId('arena-effect-maze')).toBeInTheDocument();
    });

    it('should render mirror effect for world 7', () => {
      renderArena(7, 'mirror');
      expect(screen.getByTestId('arena-effect-mirror')).toBeInTheDocument();
    });

    it('should render starfield effect for world 8', () => {
      renderArena(8, 'starfield');
      expect(screen.getByTestId('arena-effect-starfield')).toBeInTheDocument();
    });

    it('should render aurora effect for world 9', () => {
      renderArena(9, 'aurora');
      expect(screen.getByTestId('arena-effect-aurora')).toBeInTheDocument();
    });

    it('should render dragon-library effect for world 10', () => {
      renderArena(10, 'dragon-library');
      expect(screen.getByTestId('arena-effect-dragon-library')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden since it is decorative', () => {
      renderArena(1, 'chalkboard');
      const arena = screen.getByTestId('boss-arena');
      expect(arena).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
