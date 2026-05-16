import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastHud } from '../BlastHud';

describe('BlastHud', () => {
  it('renders coin count', () => {
    render(
      <BlastHud levelNumber={1} coins={100} chestProgress={0.5} onShuffle={vi.fn()} onHint={vi.fn()} />
    );
    expect(screen.getByTestId('coin-counter')).toHaveTextContent('100');
  });

  it('never renders the shuffle button — Blast V2 is shuffle-free at every level', () => {
    for (const n of [1, 5, 9, 25, 100]) {
      const { unmount } = render(
        <BlastHud levelNumber={n} coins={100} chestProgress={0.5} onShuffle={vi.fn()} onHint={vi.fn()} />
      );
      expect(screen.queryByTestId('shuffle-btn')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('lvl 18 shows hint button (mechanic gated at lvl 17)', () => {
    render(
      <BlastHud levelNumber={18} coins={100} chestProgress={0.5} onShuffle={vi.fn()} onHint={vi.fn()} />
    );
    expect(screen.getByTestId('hint-btn')).toBeInTheDocument();
  });
});
