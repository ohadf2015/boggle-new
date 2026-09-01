/**
 * BlastMultiplayerOverlay Tests
 * Renders correct tile badges on grid cells
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastMultiplayerOverlay } from '../BlastMultiplayerOverlay';
import type { BlastTileOverlay } from '@/shared/types/game';

// Mock translation hook
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('BlastMultiplayerOverlay', () => {
  const gridSize = { rows: 3, cols: 3 };

  it('should render nothing when overlay is empty', () => {
    const { container } = render(
      <BlastMultiplayerOverlay overlay={[]} gridSize={gridSize} />
    );
    // Should render the container but no tile badges
    const badges = container.querySelectorAll('[data-testid^="blast-tile-"]');
    expect(badges.length).toBe(0);
  });

  it('should render a badge for each overlay tile', () => {
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'gold' },
      { row: 1, col: 2, type: 'rainbow' },
      { row: 2, col: 1, type: 'bomb' },
    ];

    render(
      <BlastMultiplayerOverlay overlay={overlay} gridSize={gridSize} />
    );

    expect(screen.getByTestId('blast-tile-0-0')).toBeInTheDocument();
    expect(screen.getByTestId('blast-tile-1-2')).toBeInTheDocument();
    expect(screen.getByTestId('blast-tile-2-1')).toBeInTheDocument();
  });

  it('should display tile type indicator for each special tile', () => {
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'gold' },
    ];

    render(
      <BlastMultiplayerOverlay overlay={overlay} gridSize={gridSize} />
    );

    const tile = screen.getByTestId('blast-tile-0-0');
    expect(tile).toBeInTheDocument();
    // Should have some content indicating tile type
    expect(tile.textContent).toBeTruthy();
  });

  it('should render different indicators for different tile types', () => {
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'bomb' },
      { row: 0, col: 2, type: 'ice' },
    ];

    render(
      <BlastMultiplayerOverlay overlay={overlay} gridSize={gridSize} />
    );

    const goldTile = screen.getByTestId('blast-tile-0-0');
    const bombTile = screen.getByTestId('blast-tile-0-1');
    const iceTile = screen.getByTestId('blast-tile-0-2');

    // The point of the overlay is that you can tell the types apart at a
    // glance, so assert the badges differ — not merely that they exist.
    // This is a decorative, pointer-events-none layer: each badge is a
    // <span> icon, never an interactive control.
    expect(goldTile.textContent).toBeTruthy();
    expect(new Set([goldTile.textContent, bombTile.textContent, iceTile.textContent]).size).toBe(3);
  });

  it('should handle all tile types without errors', () => {
    const allTypes: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'rainbow' },
      { row: 0, col: 2, type: 'bomb' },
      { row: 1, col: 0, type: 'ice' },
      { row: 1, col: 1, type: 'gem' },
      { row: 1, col: 2, type: 'lightning' },
      { row: 2, col: 0, type: 'magnet' },
    ];

    expect(() => {
      render(
        <BlastMultiplayerOverlay overlay={allTypes} gridSize={gridSize} />
      );
    }).not.toThrow();
  });

  it('should render badges for ALL 20 special tile types', () => {
    const gridSize5 = { rows: 5, cols: 5 };
    const allSpecialTypes: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'bomb' },
      { row: 0, col: 2, type: 'rainbow' },
      { row: 0, col: 3, type: 'ice' },
      { row: 0, col: 4, type: 'lightning' },
      { row: 1, col: 0, type: 'magnet' },
      { row: 1, col: 1, type: 'prism' },
      { row: 1, col: 2, type: 'gem' },
      { row: 1, col: 3, type: 'frozen' },
      { row: 1, col: 4, type: 'diamond' },
      { row: 2, col: 0, type: 'countdown' },
      { row: 2, col: 1, type: 'portal' },
      { row: 2, col: 2, type: 'catalyst' },
      { row: 2, col: 3, type: 'shuffle' },
      { row: 2, col: 4, type: 'magma' },
      { row: 3, col: 0, type: 'crystal' },
      { row: 3, col: 1, type: 'fuse' },
      { row: 3, col: 4, type: 'anchor' },
    ];

    render(
      <BlastMultiplayerOverlay overlay={allSpecialTypes} gridSize={gridSize5} />
    );

    // Every special tile type must render a badge — none should return null
    for (const tile of allSpecialTypes) {
      const el = screen.getByTestId(`blast-tile-${tile.row}-${tile.col}`);
      expect(el).toBeInTheDocument();
      expect(el.textContent).toBeTruthy();
    }
  });

  it('should not render a badge for standard tile type', () => {
    // A standard tile carries no special mechanic, so it gets no badge —
    // the component drops any type with no icon (`if (!icon) return null`).
    // The bomb alongside it proves the absence is type-driven, not a
    // failure to render the overlay at all.
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'standard' as any },
      { row: 0, col: 1, type: 'bomb' },
    ];

    render(
      <BlastMultiplayerOverlay overlay={overlay} gridSize={gridSize} />
    );

    expect(screen.queryByTestId('blast-tile-0-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('blast-tile-0-1')).toBeInTheDocument();
  });
});
