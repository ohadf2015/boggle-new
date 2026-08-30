/**
 * BlastMobileResponsive — TDD tests for mobile responsive UI improvements.
 * Covers: safe area insets, container queries on indicators, gap scaling.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';
import { BlastHUD } from '../BlastHUD';

// Mock reduced motion
jest.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

const baseTileProps = {
  letter: 'A',
  type: 'standard' as const,
  phase: 'idle' as const,
  isSelected: false,
  isCleared: false,
  onClick: jest.fn(),
};

describe('Blast Mobile Responsive', () => {
  describe('BlastTile indicator scaling with container queries', () => {
    it('renders indicator icon with cqw-based clamp sizing', () => {
      render(<BlastTile {...baseTileProps} type="bomb" />);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('class') ?? '').toContain('w-[clamp(20px,6cqw,28px)]');
    });

    it('renders hits remaining with cqw-based clamp sizing', () => {
      render(<BlastTile {...baseTileProps} type="ice" hitsRemaining={2} />);
      const hitsEl = screen.getByLabelText('2 hits remaining');
      expect(hitsEl.className).toContain('text-[clamp(0.6rem,2.2cqw,0.85rem)]');
    });

    it('renders multiplier badge with cqw-based clamp sizing', () => {
      render(<BlastTile {...baseTileProps} type="gold" />);
      const button = screen.getByRole('button');
      const badges = button.querySelectorAll('[aria-hidden="true"]');
      const multiplierBadge = Array.from(badges).find(el => el.textContent === '\u00d73');
      expect(multiplierBadge).toBeTruthy();
      expect(multiplierBadge?.className).toContain('text-[clamp(0.35rem,1.3cqw,0.5rem)]');
    });

    it('tile button has container-type inline-size for cqw units', () => {
      render(<BlastTile {...baseTileProps} type="bomb" />);
      const button = screen.getByRole('button');
      expect(button.style.containerType).toBe('inline-size');
    });
  });

  describe('BlastHUD safe area', () => {
    const hudProps = {
      score: 100,
      wordsFoundCount: 5,
      movesRemaining: 10,
      totalMoves: 20,
      waveNumber: 1,
      tilesCleared: 5,
      totalTiles: 36,
      onQuit: jest.fn(),
      t: (key: string) => key,
    };

    it('renders HUD with pt-safe class for notch phones', () => {
      render(<BlastHUD {...hudProps} />);
      const hud = screen.getByTestId('blast-hud');
      // pt-safe is now on the inner top row, not the outer container
      expect(hud.querySelector('.pt-safe') || hud.innerHTML.includes('pt-safe')).toBeTruthy();
    });
  });
});
