/**
 * BlastMoveCounter Tests
 * Displays move count and bonus move indicator
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastMoveCounter } from '../BlastMoveCounter';

// Mock translation hook
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'blast.multiplayer.moves': 'Moves',
        'blast.multiplayer.bonusMove': 'Bonus Move!',
      };
      return translations[key] || key;
    },
  }),
}));

describe('BlastMoveCounter', () => {
  it('should display move count', () => {
    render(<BlastMoveCounter movesUsed={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display label text using translation', () => {
    render(<BlastMoveCounter movesUsed={3} />);
    expect(screen.getByText('Moves')).toBeInTheDocument();
  });

  it('should display zero moves', () => {
    render(<BlastMoveCounter movesUsed={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should show bonus move indicator when bonusMove is true', () => {
    render(<BlastMoveCounter movesUsed={3} bonusMove={true} />);
    expect(screen.getByText('Bonus Move!')).toBeInTheDocument();
  });

  it('should not show bonus move indicator when bonusMove is false', () => {
    render(<BlastMoveCounter movesUsed={3} bonusMove={false} />);
    expect(screen.queryByText('Bonus Move!')).not.toBeInTheDocument();
  });

  it('should not show bonus move indicator by default', () => {
    render(<BlastMoveCounter movesUsed={3} />);
    expect(screen.queryByText('Bonus Move!')).not.toBeInTheDocument();
  });

  it('should have correct test id', () => {
    render(<BlastMoveCounter movesUsed={2} />);
    expect(screen.getByTestId('blast-move-counter')).toBeInTheDocument();
  });
});
