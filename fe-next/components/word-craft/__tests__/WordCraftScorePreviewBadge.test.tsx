import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftScorePreviewBadge } from '../WordCraftScorePreviewBadge';
import { createBoard } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      key === 'wordcraft.territory.claimPreview' ? `Claim ${params?.count}` : key,
  }),
}));

const t = (rackTileId: string, row: number, col: number, letter: string, value: number): PlacedTile => ({
  rackTileId,
  row,
  col,
  letter,
  value,
  isBlank: false,
});

describe('WordCraftScorePreviewBadge (Conquest territory preview)', () => {
  it('renders nothing when there are no pending placements', () => {
    const board = createBoard(11, { premiums: false });
    const { container } = render(<WordCraftScorePreviewBadge board={board} placements={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('previews the number of cells the pending word will claim', () => {
    const board = createBoard(11, { premiums: false });
    const placements: PlacedTile[] = [
      t('1', 5, 4, 'C', 3),
      t('2', 5, 5, 'A', 1),
      t('3', 5, 6, 'T', 1),
    ];
    render(<WordCraftScorePreviewBadge board={board} placements={placements} />);
    expect(screen.getByText('Claim 3')).toBeInTheDocument();
  });
});
