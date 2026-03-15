/**
 * BlastHotTileOverlay - Tests for hot tile visual overlay.
 * TDD: written before implementation (RED phase).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---- Mocks ----

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
  },
  m: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock('@/contexts/AccessibilityContext', () => ({
  useShouldReduceMotion: () => false,
}));

// Import AFTER mocks
import { BlastHotTileOverlay } from '../BlastHotTileOverlay';
import type { HotTile } from '../hooks/useBlastHotTiles';

// ==================== Tests ====================

describe('BlastHotTileOverlay', () => {
  const now = Date.now();

  const makeHotTiles = (count: number): HotTile[] =>
    Array.from({ length: count }, (_, i) => ({
      row: i,
      col: i,
      multiplier: 3,
      createdAt: now,
      expiresAt: now + 8000,
    }));

  it('should render a golden overlay for each hot tile', () => {
    const hotTiles = makeHotTiles(2);
    render(<BlastHotTileOverlay hotTiles={hotTiles} gridSize={5} />);

    const overlays = screen.getAllByTestId('hot-tile-overlay');
    expect(overlays).toHaveLength(2);
  });

  it('should render "3x" badge for each hot tile', () => {
    const hotTiles = makeHotTiles(1);
    render(<BlastHotTileOverlay hotTiles={hotTiles} gridSize={5} />);

    expect(screen.getByTestId('hot-tile-badge')).toHaveTextContent('3x');
  });

  it('should render nothing when no hot tiles', () => {
    const { container } = render(
      <BlastHotTileOverlay hotTiles={[]} gridSize={5} />,
    );

    expect(screen.queryAllByTestId('hot-tile-overlay')).toHaveLength(0);
  });
});
