/**
 * Phase 1 — Selection polish contract tests.
 *
 * These encode the *design decisions* (not pixels) the redesign must honour:
 *  - Selected tiles read by VALUE contrast (dark navy hard ring + real lift),
 *    so they pop against BOTH the white standard face AND bright specials.
 *  - Selection is an OVERLAY: a selected special tile keeps its own identity
 *    (type class + indicator icon) — we never overwrite the face with an accent
 *    fill (that would erase which tile is a bomb/gold/gem).
 *  - The drag trail uses a dark underlay for value contrast, not a thin hairline.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';
import { BlastDragTrail } from '../BlastDragTrail';
import type { BlastTileType } from '@/shared/types/blast';

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

const NAVY = '0b1530'; // brand near-black, the high-value-contrast ink

describe('Selection polish — value-contrast overlay', () => {
  it('selected tile lifts with translateY (real lift, not just scale)', () => {
    render(<BlastTile {...baseProps} type="standard" isSelected phase="selected" />);
    const style = screen.getByRole('button').getAttribute('style') ?? '';
    expect(style).toContain('translateY');
  });

  it('selected tile carries a dark navy ring for value contrast against any face', () => {
    render(<BlastTile {...baseProps} type="standard" isSelected phase="selected" />);
    const style = (screen.getByRole('button').getAttribute('style') ?? '').toLowerCase();
    // box-shadow must include the navy ink so the outline reads on white tiles
    // (where lime fails) as well as on bright specials.
    expect(style).toContain(NAVY);
  });

  it('selected SPECIAL tile keeps its identity (overlay, never a fill)', () => {
    render(<BlastTile {...baseProps} type="gold" isSelected phase="selected" />);
    const button = screen.getByRole('button');
    // Type class preserved → face is not overwritten by the selection accent.
    expect(button.className).toContain('blast-tile-gold');
    // Indicator icon still rendered (gold uses a lucide Star <svg>).
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('unselected tile has neither the lift nor the selection ring', () => {
    render(<BlastTile {...baseProps} type="standard" />);
    const style = (screen.getByRole('button').getAttribute('style') ?? '').toLowerCase();
    expect(style).not.toContain('translatey');
  });
});

describe('Drag trail — chunky, value-contrasting', () => {
  const cells = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ];

  it('renders a dark navy underlay stroke so the trail reads on a busy board', () => {
    const { container } = render(
      <BlastDragTrail selectedCells={cells} gridSize={6} containerWidth={360} padding={8} />,
    );
    const strokes = Array.from(container.querySelectorAll('polyline')).map(
      (p) => (p.getAttribute('stroke') ?? '').toLowerCase(),
    );
    expect(strokes.some((s) => s.includes(NAVY))).toBe(true);
  });

  it('keeps a bright accent core on top of the dark underlay', () => {
    const { container } = render(
      <BlastDragTrail selectedCells={cells} gridSize={6} containerWidth={360} padding={8} />,
    );
    const strokes = Array.from(container.querySelectorAll('polyline')).map(
      (p) => (p.getAttribute('stroke') ?? '').toUpperCase(),
    );
    // default accent is lime #BFFF00
    expect(strokes.some((s) => s.includes('BFFF00'))).toBe(true);
  });
});
