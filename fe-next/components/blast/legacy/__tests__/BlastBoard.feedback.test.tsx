import { act, render } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import type { LetterGrid } from '@/shared/types/game';
import type { WordFeedback } from '@/components/game/WordFormingArea';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedProps = props;
    return null;
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useEquippedCosmetic', () => ({
  useEquippedCosmetic: () => null,
}));

const grid: LetterGrid = [
  ['A', 'B'],
  ['C', 'D'],
];

describe('BlastBoard word verdict', () => {
  it('given a verdict on the last word, then the shared board receives it to play the release reward', () => {
    const feedback = { id: 'accept-1', type: 'accepted', word: 'CAB', score: 61, timestamp: 1 } as WordFeedback;
    render(
      <BlastBoard
        grid={grid}
        tileStates={[]}
        gridSize={2}
        language="en"
        interactive
        onWordSubmit={vi.fn()}
        onPathSubmit={vi.fn()}
        onWordChange={vi.fn()}
        submitFeedback={feedback}
      />,
    );
    expect(capturedProps?.submitFeedback).toBe(feedback);
  });
});

describe('BlastBoard selection hook', () => {
  it('given a drag over cells, then onSelectionCellsChange receives the selected cells', () => {
    const onSelectionCellsChange = vi.fn();
    render(
      <BlastBoard
        grid={grid}
        tileStates={[]}
        gridSize={2}
        language="en"
        interactive
        onWordSubmit={vi.fn()}
        onPathSubmit={vi.fn()}
        onWordChange={vi.fn()}
        onSelectionCellsChange={onSelectionCellsChange}
      />,
    );
    const cells = [{ row: 0, col: 0, letter: 'A' }, { row: 0, col: 1, letter: 'B' }];
    act(() => { (capturedProps?.onSelectionChange as (c: typeof cells) => void)(cells); });
    expect(onSelectionCellsChange).toHaveBeenCalledWith(cells);
  });
});

