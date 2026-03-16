/**
 * TDD tests for multi-hit tile visual display in BlastTileOverlay.
 * Tests that:
 * - Frozen tile label shows ×2 (matching FROST_HITS_REQUIRED=2)
 * - Frozen tile does NOT appear cracked at initial hitsRemaining
 * - Multi-hit tiles show cracked state only after being hit
 *
 * Written BEFORE fix (RED phase).
 */
import { render } from '@testing-library/react';
import { FROST_HITS_REQUIRED, type BlastTileState } from '../types';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
        return <div ref={ref} {...props}>{children}</div>;
      }),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const React = require('react');
  const Icon = (name: string) => {
    const IconComponent = React.forwardRef(
      (props: any, ref: any) => <svg ref={ref} data-testid={`icon-${name}`} {...props} />
    );
    IconComponent.displayName = name;
    return IconComponent;
  };
  return {
    Star: Icon('star'),
    Bomb: Icon('bomb'),
    Rainbow: Icon('rainbow'),
    Snowflake: Icon('snowflake'),
    Shuffle: Icon('shuffle'),
    Zap: Icon('zap'),
    Sparkles: Icon('sparkles'),
    Diamond: Icon('diamond'),
    Magnet: Icon('magnet'),
    Gem: Icon('gem'),
    CircleDollarSign: Icon('circle-dollar-sign'),
  };
});

import { BlastTileOverlay } from '../BlastTileOverlay';

function makeTile(overrides: Partial<BlastTileState> = {}): BlastTileState {
  return {
    row: 0,
    col: 0,
    type: 'standard',
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
    ...overrides,
  };
}

describe('BlastTileOverlay multi-hit labels', () => {
  it('frozen tile label shows ×2 matching FROST_HITS_REQUIRED', () => {
    // FROST_HITS_REQUIRED should be 2
    expect(FROST_HITS_REQUIRED).toBe(2);

    const { container } = render(
      <BlastTileOverlay
        tileStates={[[makeTile({ type: 'frozen', hitsRemaining: FROST_HITS_REQUIRED })]]}
        gridSize={1}
      />,
    );

    // The label should show ×2, not ×3
    const text = container.textContent;
    expect(text).toContain('×2');
    expect(text).not.toContain('×3');
  });

  it('frozen tile does NOT appear cracked at initial hitsRemaining=2', () => {
    const { container } = render(
      <BlastTileOverlay
        tileStates={[[makeTile({ type: 'frozen', hitsRemaining: FROST_HITS_REQUIRED })]]}
        gridSize={1}
      />,
    );

    // At initial hits, the background should use the normal frozen style, not the cracked one
    const tileDiv = container.querySelector('[class*="blast-tile-frozen"]');
    expect(tileDiv).toBeTruthy();

    // The cracked frozen has warmer tones (rgba(255,200,150,...)); initial should not
    const style = tileDiv?.getAttribute('style') || '';
    expect(style).not.toContain('rgba(255,200,150');
  });

  it('frozen tile appears cracked after one hit (hitsRemaining=1)', () => {
    const { container } = render(
      <BlastTileOverlay
        tileStates={[[makeTile({ type: 'frozen', hitsRemaining: 1 })]]}
        gridSize={1}
      />,
    );

    const tileDiv = container.querySelector('[class*="blast-tile-frozen"]');
    expect(tileDiv).toBeTruthy();

    // The cracked frozen has warmer tones revealing inner tile
    const style = tileDiv?.getAttribute('style') || '';
    expect(style).toContain('rgba(255,200,150');
  });
});
