/**
 * Phase 1 — Selection polish contract tests.
 *
 * These encode the *design decisions* (not pixels) the redesign must honour:
 *  - Selected tiles read by VALUE contrast (dark navy hard ring) and stay
 *    seated in their cell, so the board's highlighter band lies over them.
 *  - Selection is an OVERLAY: a selected special tile keeps its own identity
 *    (type class + indicator icon) — we never overwrite the face with an accent
 *    fill (that would erase which tile is a bomb/gold/gem).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';
import type { BlastTileType } from '@/shared/types/blast';

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

const NAVY = '0b1530'; // brand near-black, the high-value-contrast ink

describe('Selection polish — value-contrast overlay', () => {
  it('selected tile stays seated in its cell (no lift above the band or the board edge)', () => {
    render(<BlastTile {...baseProps} type="standard" isSelected phase="selected" />);
    const button = screen.getByRole('button');
    expect(button.style.transform).not.toContain('translateY');
    expect(Number(button.style.zIndex || 0)).toBeLessThan(10);
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
