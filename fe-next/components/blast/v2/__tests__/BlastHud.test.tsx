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

  it('lvl 5 shows shuffle button (mechanic gated at lvl 4)', () => {
    render(
      <BlastHud levelNumber={5} coins={100} chestProgress={0.5} onShuffle={vi.fn()} onHint={vi.fn()} />
    );
    expect(screen.getByTestId('shuffle-btn')).toBeInTheDocument();
  });

  it('lvl 1 hides shuffle button', () => {
    render(
      <BlastHud levelNumber={1} coins={100} chestProgress={0.5} onShuffle={vi.fn()} onHint={vi.fn()} />
    );
    expect(screen.queryByTestId('shuffle-btn')).not.toBeInTheDocument();
  });

  it('lvl 18 shows hint button (mechanic gated at lvl 17)', () => {
    render(
      <BlastHud levelNumber={18} coins={100} chestProgress={0.5} onShuffle={vi.fn()} onHint={vi.fn()} />
    );
    expect(screen.getByTestId('hint-btn')).toBeInTheDocument();
  });
});
