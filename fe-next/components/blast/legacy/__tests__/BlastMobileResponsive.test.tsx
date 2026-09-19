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
    it('sizes the letter relative to the TILE (cqw on a child of the tile container)', () => {
      // cqw on the button itself resolves against an ANCESTOR container, so the
      // old clamp floor always bound (17.6px on a 53px tile). The letter span is a
      // child of the tile container, so its cqw is a share of the tile width.
      render(<BlastTile {...baseTileProps} letter="M" />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('4.5cqw');
      const letter = screen.getByTestId('blast-tile-letter');
      expect(letter.className).toContain('text-[clamp(1.1rem,54cqw,3.25rem)]');
      expect(letter.textContent).toBe('M');
    });

    it('outlines white letters in ink so they read on every bright special face', () => {
      render(<BlastTile {...baseTileProps} type="bomb" />);
      const letter = screen.getByTestId('blast-tile-letter');
      expect(letter.style.textShadow).toContain('#0b1530');
    });

    it('does not stroke dark letters on light faces', () => {
      render(<BlastTile {...baseTileProps} />);
      const letter = screen.getByTestId('blast-tile-letter');
      expect(letter.style.textShadow).not.toContain('#0b1530');
    });

    it('renders the special-type icon inside a solid corner chip', () => {
      render(<BlastTile {...baseTileProps} type="bomb" />);
      const chip = screen.getByTestId('blast-tile-type-chip');
      expect(chip.className).toContain('bg-neo-navy');
      expect(chip.className).toContain('w-[clamp(15px,30cqw,28px)]');
      expect(screen.getByTestId('blast-tile-letter').className).toContain('me-[18cqw]');
      expect(chip.querySelector('svg')).toBeTruthy();
    });

    it('renders hits remaining with cqw-based clamp sizing', () => {
      render(<BlastTile {...baseTileProps} type="ice" hitsRemaining={2} />);
      const hitsEl = screen.getByLabelText('2 hits remaining');
      expect(hitsEl.className).toContain('text-[clamp(0.6rem,2.2cqw,0.85rem)]');
    });

    it('renders a readable multiplier badge', () => {
      render(<BlastTile {...baseTileProps} type="gold" />);
      const button = screen.getByRole('button');
      const badges = button.querySelectorAll('[aria-hidden="true"]');
      const multiplierBadge = Array.from(badges).find(el => el.textContent === '\u00d73');
      expect(multiplierBadge).toBeTruthy();
      expect(multiplierBadge?.className).toContain('text-[clamp(0.6rem,22cqw,0.95rem)]');
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
