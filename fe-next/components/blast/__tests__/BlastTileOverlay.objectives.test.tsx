/**
 * Tests for objective tile highlighting in BlastTileOverlay.
 * Tiles matching current wave objectives should have a pulsing highlight.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  Star: () => <span />,
  Bomb: () => <span />,
  Rainbow: () => <span />,
  Snowflake: () => <span />,
  Shuffle: () => <span />,
  Zap: () => <span />,
  Magnet: () => <span />,
  Sparkles: () => <span />,
  Diamond: () => <span />,
  Gem: () => <span />,
  CircleDollarSign: () => <span />,
}));

import { BlastTileOverlay } from '../BlastTileOverlay';
import type { BlastTileState } from '../types';

function makeTile(row: number, col: number, type: string, hitsRemaining = 0): BlastTileState {
  return { row, col, type: type as any, hitsRemaining, isCleared: false, activationEffect: null };
}

describe('BlastTileOverlay objective highlighting', () => {
  const tileStates: BlastTileState[][] = [
    [makeTile(0, 0, 'bomb'), makeTile(0, 1, 'standard')],
    [makeTile(1, 0, 'ice'), makeTile(1, 1, 'gem')],
  ];

  it('applies blast-tile-objective class to tiles matching objectiveTileTypes', () => {
    const { container } = render(
      <BlastTileOverlay
        tileStates={tileStates}
        gridSize={2}
        objectiveTileTypes={new Set(['bomb'])}
      />
    );
    // The bomb tile at (0,0) should have the objective highlight class
    const bombOverlay = container.querySelector('.blast-tile-objective');
    expect(bombOverlay).not.toBeNull();
  });

  it('does not apply blast-tile-objective to non-matching tiles', () => {
    const { container } = render(
      <BlastTileOverlay
        tileStates={tileStates}
        gridSize={2}
        objectiveTileTypes={new Set(['bomb'])}
      />
    );
    // Count how many objective-highlighted tiles there are
    const highlighted = container.querySelectorAll('.blast-tile-objective');
    expect(highlighted).toHaveLength(1); // only the bomb tile
  });

  it('highlights multiple tile types when objectives reference multiple types', () => {
    const { container } = render(
      <BlastTileOverlay
        tileStates={tileStates}
        gridSize={2}
        objectiveTileTypes={new Set(['bomb', 'ice'])}
      />
    );
    const highlighted = container.querySelectorAll('.blast-tile-objective');
    expect(highlighted).toHaveLength(2); // bomb + ice
  });

  it('does not apply objective class when objectiveTileTypes is empty', () => {
    const { container } = render(
      <BlastTileOverlay
        tileStates={tileStates}
        gridSize={2}
        objectiveTileTypes={new Set()}
      />
    );
    const highlighted = container.querySelectorAll('.blast-tile-objective');
    expect(highlighted).toHaveLength(0);
  });

  it('does not apply objective class when objectiveTileTypes is undefined', () => {
    const { container } = render(
      <BlastTileOverlay
        tileStates={tileStates}
        gridSize={2}
      />
    );
    const highlighted = container.querySelectorAll('.blast-tile-objective');
    expect(highlighted).toHaveLength(0);
  });
});
