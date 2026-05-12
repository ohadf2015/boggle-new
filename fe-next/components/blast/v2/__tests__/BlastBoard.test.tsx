import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import { cellId } from '@/lib/blast/v2/engine';
import type { BlastLevel } from '@/lib/blast/v2/types';

const mockLevel: BlastLevel = {
  id: 'board-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('BlastBoard', () => {
  it('renders all tiles with correct data-cell-id', () => {
    const { container } = render(
      <BlastBoard
        level={mockLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
      />
    );
    expect(container.querySelector('[data-cell-id="c0r0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cell-id="c1r1"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cell-id="c2r2"]')).toBeInTheDocument();
  });

  it('HE locale sets dir=rtl on root', () => {
    const heLevel = { ...mockLevel, locale: 'he' as any };
    const { container } = render(
      <BlastBoard
        level={heLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
      />
    );
    const board = container.querySelector('[data-testid="blast-board"]');
    expect(board).toHaveAttribute('dir', 'rtl');
  });
});
