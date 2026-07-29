import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftScorePreviewBadge } from '../WordCraftScorePreviewBadge';
import { createBoard } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'wordcraft.scorePreview.bingoReady' ? 'BINGO!' : key),
  }),
}));

const t = (rackTileId: string, row: number, col: number, letter: string, value: number): PlacedTile => ({
  rackTileId,
  row,
  col,
  letter,
  value,
});

describe('WordCraftScorePreviewBadge', () => {
  it('renders nothing when there are no pending placements', () => {
    const board = createBoard(15);
    const { container } = render(<WordCraftScorePreviewBadge board={board} placements={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders +N when placements form a valid layout', () => {
    const board = createBoard(15);
    const placements: PlacedTile[] = [
      t('1', 7, 6, 'C', 3),
      t('2', 7, 7, 'A', 1),
      t('3', 7, 8, 'T', 1),
    ];
    render(<WordCraftScorePreviewBadge board={board} placements={placements} />);
    expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
  });

  it('shows BINGO when 7+ tiles are pending', () => {
    const board = createBoard(15);
    const placements: PlacedTile[] = [
      t('1', 7, 4, 'A', 1), t('2', 7, 5, 'B', 3), t('3', 7, 6, 'C', 3),
      t('4', 7, 7, 'D', 2), t('5', 7, 8, 'E', 1), t('6', 7, 9, 'F', 4),
      t('7', 7, 10, 'G', 2),
    ];
    render(<WordCraftScorePreviewBadge board={board} placements={placements} />);
    expect(screen.getByText('BINGO!')).toBeInTheDocument();
  });
});
