import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders undo button when canUndo and onUndo provided', () => {
    render(
      <BlastHud
        levelNumber={1}
        coins={100}
        chestProgress={0.5}
        onShuffle={vi.fn()}
        onHint={vi.fn()}
        canUndo={true}
        onUndo={vi.fn()}
      />
    );
    expect(screen.getByTestId('undo-btn')).toBeInTheDocument();
  });

  it('hides undo button when canUndo is false', () => {
    render(
      <BlastHud
        levelNumber={1}
        coins={100}
        chestProgress={0.5}
        onShuffle={vi.fn()}
        onHint={vi.fn()}
        canUndo={false}
        onUndo={vi.fn()}
      />
    );
    expect(screen.queryByTestId('undo-btn')).not.toBeInTheDocument();
  });

  it('invokes onUndo when undo button clicked', () => {
    const onUndo = vi.fn();
    render(
      <BlastHud
        levelNumber={1}
        coins={100}
        chestProgress={0.5}
        onShuffle={vi.fn()}
        onHint={vi.fn()}
        canUndo={true}
        onUndo={onUndo}
      />
    );
    fireEvent.click(screen.getByTestId('undo-btn'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  describe('target-word clue gating (only first 3 levels)', () => {
    const words = ['CAT', 'SUN', 'EGG'];

    it('shows the target-word strip on levels 1-3', () => {
      for (const n of [1, 2, 3]) {
        const { unmount } = render(
          <BlastHud levelNumber={n} coins={0} chestProgress={0} onShuffle={vi.fn()} onHint={vi.fn()} targetWords={words} foundWords={[]} />
        );
        expect(screen.getByTestId('hud-words-strip')).toBeInTheDocument();
        unmount();
      }
    });

    it('hides the target-word strip from level 4 onward (no word clues)', () => {
      for (const n of [4, 5, 10, 30]) {
        const { unmount } = render(
          <BlastHud levelNumber={n} coins={0} chestProgress={0} onShuffle={vi.fn()} onHint={vi.fn()} targetWords={words} foundWords={[]} />
        );
        expect(screen.queryByTestId('hud-words-strip')).not.toBeInTheDocument();
        unmount();
      }
    });

    it('still shows the bonus-word counter after level 3 (it is a reward, not a clue)', () => {
      render(
        <BlastHud levelNumber={8} coins={0} chestProgress={0} onShuffle={vi.fn()} onHint={vi.fn()} targetWords={words} foundWords={[]} bonusWordCount={2} />
      );
      expect(screen.queryByTestId('hud-words-strip')).not.toBeInTheDocument();
      expect(screen.getByTestId('hud-bonus-count')).toBeInTheDocument();
    });
  });
});
