/**
 * UnfinishedBoardCardConnected Tests
 *
 * Tests for the self-contained wrapper that connects useUnfinishedBoard
 * to UnfinishedBoardCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useUnfinishedBoard
const mockGetUnfinishedBoard = vi.fn();
vi.mock('@/hooks/useUnfinishedBoard', () => ({
  useUnfinishedBoard: () => ({
    getUnfinishedBoard: mockGetUnfinishedBoard,
    saveUnfinishedBoard: vi.fn(),
    clearUnfinishedBoard: vi.fn(),
  }),
}));

// Mock UnfinishedBoardCard
vi.mock('../UnfinishedBoardCard', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="unfinished-board-card" data-score={props.score as number}>
      UnfinishedBoardCard
    </div>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

import { UnfinishedBoardCardConnected } from '../UnfinishedBoardCardConnected';

describe('UnfinishedBoardCardConnected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no unfinished board exists', () => {
    mockGetUnfinishedBoard.mockReturnValue(null);

    const { container } = render(<UnfinishedBoardCardConnected />);
    expect(container.innerHTML).toBe('');
  });

  it('renders UnfinishedBoardCard when saved board exists', () => {
    mockGetUnfinishedBoard.mockReturnValue({
      grid: [['A', 'B'], ['C', 'D']],
      missedWords: ['HELLO', 'WORLD', 'TEST'],
      date: '2026-03-21',
      mode: 'classic',
      score: 150,
    });

    render(<UnfinishedBoardCardConnected />);
    expect(screen.getByTestId('unfinished-board-card')).toBeInTheDocument();
    expect(screen.getByTestId('unfinished-board-card')).toHaveAttribute('data-score', '150');
  });

  it('returns null when board data has empty grid', () => {
    mockGetUnfinishedBoard.mockReturnValue({
      grid: [],
      missedWords: [],
      date: '2026-03-21',
      mode: 'classic',
      score: 0,
    });

    const { container } = render(<UnfinishedBoardCardConnected />);
    expect(container.innerHTML).toBe('');
  });
});
