/**
 * BlastTile frost-identity tests — TDD for the "remove locked tiles" + visible
 * one-hit melt fun-pass (2026-06-07).
 *
 * Two behaviours:
 *  1. Un-thawed ice/frozen tiles must read as ICE, not a padlock. The legacy
 *     padlock (lucide Lock) confused players into thinking the tile was a
 *     separate "locked" mechanic. They now show a frost/snowflake identity.
 *  2. The FIRST hit on a frozen tile (activationEffect='frost-crack') must show
 *     a visible partial-melt indicator — previously the first hit had no
 *     distinct feedback.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';

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

describe('BlastTile frost identity (no padlock)', () => {
  it('un-thawed frozen tile shows a frost overlay but NO padlock icon', () => {
    const { container } = render(
      <BlastTile {...baseProps} type="frozen" isLocked innerType="bomb" />,
    );
    expect(screen.getByTestId('locked-overlay')).toBeInTheDocument();
    // The padlock must be gone — it read as a separate "locked" mechanic.
    expect(container.querySelector('.lucide-lock')).toBeNull();
    // A frost identity (snowflake) is shown instead.
    expect(container.querySelector('.lucide-snowflake')).toBeInTheDocument();
  });

  it('un-thawed ice tile shows frost identity, not a padlock', () => {
    const { container } = render(
      <BlastTile {...baseProps} type="ice" isLocked />,
    );
    expect(container.querySelector('.lucide-lock')).toBeNull();
    expect(container.querySelector('.lucide-snowflake')).toBeInTheDocument();
  });
});

describe('BlastTile visible one-hit melt', () => {
  it('shows a frost-melt indicator on the first hit (frost-crack)', () => {
    render(
      <BlastTile {...baseProps} type="frozen" hitsRemaining={1} activationEffect="frost-crack" />,
    );
    expect(screen.getByTestId('frost-melt')).toBeInTheDocument();
  });

  it('shows a frost-melt indicator on the first hit of an ice tile (ice-crack)', () => {
    render(
      <BlastTile {...baseProps} type="ice" hitsRemaining={1} activationEffect="ice-crack" />,
    );
    expect(screen.getByTestId('frost-melt')).toBeInTheDocument();
  });

  it('does NOT show frost-melt indicator at full health (no activation)', () => {
    render(<BlastTile {...baseProps} type="frozen" hitsRemaining={2} />);
    expect(screen.queryByTestId('frost-melt')).toBeNull();
  });
});
