/**
 * BlastTile — special-tile explanation tooltip gating.
 *
 * Special tiles (bomb, gold, …) carry a native `title` hint describing their
 * mechanic — a useful learning aid in single-player. In multiplayer the board
 * passes `hideTooltip` so these explanations are suppressed: during a timed,
 * competitive round the per-tile descriptions are distracting clutter.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

import { BlastTile } from '../BlastTile';

const baseProps = {
  letter: 'A',
  type: 'bomb' as const,
  phase: 'idle' as const,
  isSelected: false,
  isCleared: false,
};

describe('BlastTile explanation tooltip', () => {
  it('renders the special-tile title hint by default (single-player learning aid)', () => {
    render(<BlastTile {...baseProps} />);
    expect(screen.getByRole('button')).toHaveAttribute('title');
  });

  it('suppresses the title hint when hideTooltip is set (multiplayer)', () => {
    render(<BlastTile {...baseProps} hideTooltip />);
    expect(screen.getByRole('button')).not.toHaveAttribute('title');
  });
});
