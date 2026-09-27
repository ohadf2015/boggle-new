/**
 * BlastTile visual identity tests — TDD for tile personality improvements.
 * Covers: idle animation classes, multi-hit crack states, multiplier badges.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';
import type { BlastTileType } from '@/shared/types/blast';

// Mock reduced motion to always return false for consistent tests
jest.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

const baseProps = {
  letter: 'A',
  phase: 'idle' as const,
  isSelected: false,
  isCleared: false,
  onClick: jest.fn(),
};

describe('BlastTile', () => {
  describe('idle animation classes', () => {
    const tileTypes: BlastTileType[] = [
      'gold', 'bomb', 'rainbow', 'ice', 'lightning', 'magnet',
      'prism', 'gem', 'frozen', 'diamond',
    ];

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

  describe('multi-hit crack progression', () => {
    it('renders blast-tile-cracked class when hitsRemaining = 1 on ice tile', () => {
      render(<BlastTile {...baseProps} type="ice" hitsRemaining={1} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-cracked');
    });

    it('does NOT render blast-tile-cracked when hitsRemaining = 2 (full health)', () => {
      render(<BlastTile {...baseProps} type="ice" hitsRemaining={2} />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-cracked');
    });

    it('renders blast-tile-cracked on prism with hitsRemaining = 1', () => {
      render(<BlastTile {...baseProps} type="prism" hitsRemaining={1} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-cracked');
    });

    it('renders blast-tile-critical class on gem with hitsRemaining = 1 (about to break)', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={1} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-critical');
    });

    it('renders blast-tile-cracked on gem with hitsRemaining = 2 (mid damage)', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={2} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-cracked');
    });

    it('does NOT render crack classes on gem with hitsRemaining = 3 (full)', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={3} />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-cracked');
      expect(button.className).not.toContain('blast-tile-critical');
    });
  });

  describe('multiplier badges', () => {
    it('renders ×3 badge for gold tiles', () => {
      render(<BlastTile {...baseProps} type="gold" />);
      expect(screen.getByText('×3')).toBeInTheDocument();
    });

    it('renders ×5 badge for diamond tiles', () => {
      render(<BlastTile {...baseProps} type="diamond" />);
      expect(screen.getByText('×5')).toBeInTheDocument();
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

    it('lightning clearing stretches vertically', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="lightning" phase="clearing" />
      );
      const button = container.querySelector('button');
      expect(button?.style.transform).toContain('scaleY(3.5)');
      expect(button?.style.transform).toContain('scaleX(0.15)');
    });

    it('standard clearing uses default spin+scale', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" phase="clearing" clearRotate={10} />
      );
      const button = container.querySelector('button');
      expect(button?.style.transform).toContain('scale(1.3)');
      expect(button?.style.transform).toContain('rotate(10deg)');
    });

    it('magnet clearing implodes (shrinks + spins)', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="magnet" phase="clearing" />
      );
      const button = container.querySelector('button');
      expect(button?.style.transform).toContain('scale(0.05)');
      expect(button?.style.transform).toContain('rotate(1080deg)');
    });
  });

  describe('gem shard progress indicator', () => {
    it('renders 3 shard dots for gem tile', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={3} />);
      const shards = screen.getByTestId('gem-shards');
      expect(shards).toBeInTheDocument();
      expect(shards.children).toHaveLength(3);
    });

    it('fills shards as gem takes damage (3 hits = 0 filled, 2 = 1 filled, 1 = 2 filled)', () => {
      const { rerender } = render(<BlastTile {...baseProps} type="gem" hitsRemaining={3} />);
      let shards = screen.getByTestId('gem-shards');
      // All 3 unfilled at full health
      expect(shards.querySelectorAll('.bg-white\\/80')).toHaveLength(0);
      expect(shards.querySelectorAll('.bg-white\\/20')).toHaveLength(3);

      rerender(<BlastTile {...baseProps} type="gem" hitsRemaining={2} />);
      shards = screen.getByTestId('gem-shards');
      expect(shards.querySelectorAll('.bg-white\\/80')).toHaveLength(1);
      expect(shards.querySelectorAll('.bg-white\\/20')).toHaveLength(2);

      rerender(<BlastTile {...baseProps} type="gem" hitsRemaining={1} />);
      shards = screen.getByTestId('gem-shards');
      expect(shards.querySelectorAll('.bg-white\\/80')).toHaveLength(2);
      expect(shards.querySelectorAll('.bg-white\\/20')).toHaveLength(1);
    });

    it('does NOT render shard dots for non-gem tiles', () => {
      render(<BlastTile {...baseProps} type="ice" hitsRemaining={2} />);
      expect(screen.queryByTestId('gem-shards')).not.toBeInTheDocument();
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
    it('renders frost-shatter class when activationEffect is frost-free', () => {
      render(<BlastTile {...baseProps} type="frozen" activationEffect="frost-free" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-frost-shatter');
    });

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
    it('scales first tile at 1.1x (selectionIndex=0)', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" isSelected selectionIndex={0} selectionTotal={5} />
      );
      const button = container.querySelector('button');
      expect(button?.style.transform).toContain('scale(1.1)');
    });

    it('scales last tile at 1.22x (selectionIndex=total-1)', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" isSelected selectionIndex={4} selectionTotal={5} />
      );
      const button = container.querySelector('button');
      expect(button?.style.transform).toContain('scale(1.22)');
    });

    it('interpolates scale for middle tiles', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="standard" isSelected selectionIndex={2} selectionTotal={5} />
      );
      const button = container.querySelector('button');
      // midpoint: 1.10 + (2/4) * 0.12 = 1.16
      expect(button?.style.transform).toContain('scale(1.16)');
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

  describe('locked tile overlay (ice/frozen)', () => {
    it('renders locked overlay for unthawed ice tile', () => {
      render(<BlastTile {...baseProps} type="ice" isLocked />);
      expect(screen.getByTestId('locked-overlay')).toBeInTheDocument();
    });

    it('renders locked overlay for unthawed frozen tile', () => {
      render(<BlastTile {...baseProps} type="frozen" isLocked />);
      expect(screen.getByTestId('locked-overlay')).toBeInTheDocument();
    });

    it('does NOT render locked overlay when isLocked is false', () => {
      render(<BlastTile {...baseProps} type="ice" isLocked={false} />);
      expect(screen.queryByTestId('locked-overlay')).not.toBeInTheDocument();
    });

    it('does NOT render locked overlay for non-lockable tiles', () => {
      render(<BlastTile {...baseProps} type="bomb" />);
      expect(screen.queryByTestId('locked-overlay')).not.toBeInTheDocument();
    });

    it('applies reduced opacity class when locked', () => {
      render(<BlastTile {...baseProps} type="ice" isLocked />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-locked');
    });

    it('renders the "nearby" hint inside the locked overlay for a plain locked tile', () => {
      // The hint text itself comes from t('blast.tileNearby'); the locked
      // overlay must render it (regression guard for the locked-tile branch).
      render(<BlastTile {...baseProps} type="ice" isLocked />);
      expect(screen.getByTestId('locked-overlay')).toBeInTheDocument();
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
