import { act, render, screen } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import type { LetterGrid } from '@/shared/types/game';

let onSelectionChange: ((cells: Array<{ row: number; col: number; letter: string }>) => void) | null = null;

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: (props: { onSelectionChange: typeof onSelectionChange }) => {
    onSelectionChange = props.onSelectionChange;
    return null;
  },
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useEquippedCosmetic', () => ({ useEquippedCosmetic: () => null }));

const grid: LetterGrid = [['A', 'B'], ['C', 'D']];
const tile = (row: number, col: number, type: string) => ({ row, col, letter: grid[row][col], type });
const tileStates = [[tile(0, 0, 'bomb'), tile(0, 1, 'standard')], [tile(1, 0, 'standard'), tile(1, 1, 'standard')]];

const renderBoard = () =>
  render(
    <BlastBoard
      grid={grid}
      tileStates={tileStates as never}
      gridSize={2}
      language="en"
      interactive
      onWordSubmit={vi.fn()}
      onPathSubmit={vi.fn()}
      onWordChange={vi.fn()}
    />,
  );

describe('special tile explanation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('given a drag that starts on a special tile and moves on, then no explanation covers the board', () => {
    renderBoard();
    act(() => onSelectionChange?.([{ row: 0, col: 0, letter: 'A' }]));
    act(() => { vi.advanceTimersByTime(200); });
    act(() => onSelectionChange?.([{ row: 0, col: 0, letter: 'A' }, { row: 0, col: 1, letter: 'B' }]));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByTestId('blast-tile-tooltip')).toBeNull();
  });

  it('given a finger held on a special tile, then its explanation appears', () => {
    renderBoard();
    act(() => onSelectionChange?.([{ row: 0, col: 0, letter: 'A' }]));
    expect(screen.queryByTestId('blast-tile-tooltip')).toBeNull();
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByTestId('blast-tile-tooltip')).toBeInTheDocument();
  });
});
