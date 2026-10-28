/**
 * BlastTile visual identity tests — TDD for tile personality improvements.
 * Covers: idle animation classes, multi-hit crack states, multiplier badges.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';
import type { BlastTileType } from '@/shared/types/blast';
import { DIAMOND_CLEAR_BONUS } from '../types';

// Mock reduced motion to always return false for consistent tests
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

const baseProps = {
  letter: 'A',
  phase: 'idle' as const,
  isSelected: false,
  isCleared: false,
  onClick: vi.fn(),
};

describe('BlastTile', () => {
  describe('idle animation classes', () => {
    const tileTypes: BlastTileType[] = ['gold', 'bomb', 'diamond'];

    it.each(tileTypes)('renders blast-tile-%s class for %s type', (type) => {
      render(<BlastTile {...baseProps} type={type} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain(`blast-tile-${type}`);
    });

    it('does NOT render blast-tile-standard class for standard type', () => {
      render(<BlastTile {...baseProps} type="standard" />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-standard');
    });
  });

  describe('multiplier badges', () => {
    it('renders ×3 badge for gold tiles', () => {
      render(<BlastTile {...baseProps} type="gold" />);
      expect(screen.getByText('×3')).toBeInTheDocument();
    });

    it('renders the flat bonus badge for diamond tiles', () => {
      render(<BlastTile {...baseProps} type="diamond" />);
      expect(screen.getByText(`+${DIAMOND_CLEAR_BONUS}`)).toBeInTheDocument();
    });

    it('does NOT render multiplier badge for standard tiles', () => {
      render(<BlastTile {...baseProps} type="standard" />);
      expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });

    it('does NOT render multiplier badge for non-multiplier specials like bomb', () => {
      render(<BlastTile {...baseProps} type="bomb" />);
      expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });
  });

  describe('type-specific clearing animations', () => {
    it('bomb clearing scales larger than standard (2.2 vs 1.3)', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="bomb" phase="clearing" clearRotate={5} />
      );
      const button = container.querySelector('button');
      expect(button?.style.transform).toContain('scale(2.2)');
    });

    it('standard clearing pops: swell, flash lime, shrink-spin to nothing', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" phase="clearing" clearRotate={10} />
      );
      const button = container.querySelector('button');
      expect(button?.style.animation).toContain('blastTilePop');
      expect(button?.style.getPropertyValue('--pop-rot')).toBe('30deg');
      expect(button?.style.opacity).not.toBe('0');
    });

    it('standard anticipation charges the tile lime before it pops', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" phase="anticipation" />
      );
      const button = container.querySelector('button');
      expect(button?.style.background).toMatch(/rgb\(191, 255, 0\)|#BFFF00/i);
      expect(button?.style.transform).toContain('scale(1.12)');
    });

  });

  describe('rare letter glow', () => {
    it.each(['Q', 'Z', 'X', 'J'])('renders blast-rare-letter class for %s', (letter) => {
      render(<BlastTile {...baseProps} type="standard" letter={letter} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-rare-letter');
    });

    it('does NOT render blast-rare-letter for common letters', () => {
      render(<BlastTile {...baseProps} type="standard" letter="E" />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-rare-letter');
    });

    it('renders blast-rare-letter even on special tiles', () => {
      render(<BlastTile {...baseProps} type="gold" letter="Q" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-rare-letter');
    });
  });

  describe('combo preview glow', () => {
    it('renders blast-combo-preview class when isComboPreview is true', () => {
      render(<BlastTile {...baseProps} type="bomb" isComboPreview />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-combo-preview');
    });

    it('does NOT render blast-combo-preview when false', () => {
      render(<BlastTile {...baseProps} type="bomb" isComboPreview={false} />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-combo-preview');
    });
  });

  describe('activation effects', () => {
    it('renders earned class when activationEffect is tile-earned', () => {
      render(<BlastTile {...baseProps} type="gold" activationEffect="tile-earned" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-earned');
    });

    it('does NOT render effect classes without activationEffect', () => {
      render(<BlastTile {...baseProps} type="frozen" />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-frost-shatter');
      expect(button.className).not.toContain('blast-tile-earned');
    });
  });

  describe('cleared tiles', () => {
    it('renders invisible placeholder when cleared', () => {
      render(<BlastTile {...baseProps} type="gold" isCleared />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('progressive selection scale', () => {
    const scaleOf = (index: number) => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" isSelected selectionIndex={index} selectionTotal={5} />
      );
      const match = /scale\(([\d.]+)\)/.exec(container.querySelector('button')?.style.transform ?? '');
      return Number(match?.[1]);
    };

    it('grows along the word, from the first tile to the last', () => {
      expect(scaleOf(4)).toBeGreaterThan(scaleOf(0));
    });

    it('stays inside its cell gap so the top row is never clipped by the board', () => {
      expect(scaleOf(4)).toBeLessThanOrEqual(1.06);
      expect(scaleOf(0)).toBeGreaterThan(1);
    });
  });

  describe('landing bounce spring curve', () => {
    it('uses an overshoot cubic-bezier for landing phase', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" phase="landing" />
      );
      const button = container.querySelector('button');
      expect(button?.style.transition).toContain('cubic-bezier(0.34, 1.7, 0.5, 1)');
    });

    it('lands with an impact squash (short-and-wide, scaleY<1)', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" phase="landing" />
      );
      const button = container.querySelector('button');
      // Impact compresses the tile shorter + wider — the same for every tile type.
      expect(button?.style.transform).toContain('scaleY(0.88)');
      expect(button?.style.transform).toContain('scaleX(1.1)');
    });
  });

  describe('selection pop animation', () => {
    it('applies blast-tile-select-pop class when selected', () => {
      render(
        <BlastTile {...baseProps} type="standard" isSelected selectionIndex={0} selectionTotal={1} />
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-select-pop');
    });

    it('does NOT apply blast-tile-select-pop when not selected', () => {
      render(<BlastTile {...baseProps} type="standard" />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-select-pop');
    });
  });

  describe('empty / invalid cell guard', () => {
    // A `standard` tile with an empty letter is an empty cell — e.g. the
    // {type:'standard', isCleared:false, letter:''} state an interrupted
    // magnet/vortex letter-swap can strand. It must render as the invisible
    // placeholder, never a playable white square.
    it('renders no button for an empty-letter standard tile (idle)', () => {
      render(<BlastTile {...baseProps} letter="" type="standard" isCleared={false} phase="idle" />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders no button for an empty-letter standard tile even mid-animation (stranded appearing)', () => {
      render(<BlastTile {...baseProps} letter="" type="standard" isCleared={false} phase="appearing" />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('still renders a standard tile that HAS a letter', () => {
      render(<BlastTile {...baseProps} letter="A" type="standard" isCleared={false} phase="idle" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('still renders an empty-letter SPECIAL tile (specials carry an icon, not a letter)', () => {
      render(<BlastTile {...baseProps} letter="" type="bomb" isCleared={false} phase="idle" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('zone preview indicators', () => {
    it('renders zone-preview for bomb tile when selected', () => {
      render(<BlastTile {...baseProps} type="bomb" isSelected zonePreview="bomb" selectionIndex={0} selectionTotal={1} />);
      expect(screen.getByTestId('zone-preview')).toBeInTheDocument();
    });

    it('renders zone-preview for lightning tile when selected', () => {
      render(<BlastTile {...baseProps} type="lightning" isSelected zonePreview="lightning" selectionIndex={0} selectionTotal={1} />);
      expect(screen.getByTestId('zone-preview')).toBeInTheDocument();
    });

    it('renders zone-preview for prism tile when selected', () => {
      render(<BlastTile {...baseProps} type="prism" isSelected zonePreview="prism" selectionIndex={0} selectionTotal={1} />);
      expect(screen.getByTestId('zone-preview')).toBeInTheDocument();
    });

    it('renders zone-preview for magnet tile when selected', () => {
      render(<BlastTile {...baseProps} type="magnet" isSelected zonePreview="magnet" selectionIndex={0} selectionTotal={1} />);
      expect(screen.getByTestId('zone-preview')).toBeInTheDocument();
    });

    it('does NOT render zone-preview when not selected', () => {
      render(<BlastTile {...baseProps} type="bomb" zonePreview="bomb" />);
      expect(screen.queryByTestId('zone-preview')).not.toBeInTheDocument();
    });

    it('does NOT render zone-preview for non-zone tiles', () => {
      render(<BlastTile {...baseProps} type="gold" isSelected selectionIndex={0} selectionTotal={1} />);
      expect(screen.queryByTestId('zone-preview')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('includes tile type in aria-label for special tiles', () => {
      render(<BlastTile {...baseProps} type="bomb" />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'A bomb tile');
    });

    it('does not include type in aria-label for standard tiles', () => {
      render(<BlastTile {...baseProps} type="standard" />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'A');
    });

    it('shows tooltip title for special tiles', () => {
      render(<BlastTile {...baseProps} type="bomb" />);
      expect(screen.getByRole('button')).toHaveAttribute('title', expect.stringContaining('Bomb'));
    });

    it('does not show tooltip title for standard tiles', () => {
      render(<BlastTile {...baseProps} type="standard" />);
      expect(screen.getByRole('button')).not.toHaveAttribute('title');
    });
  });
});
