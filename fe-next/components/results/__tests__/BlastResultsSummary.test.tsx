/**
 * BlastResultsSummary Tests
 * Tests the blast mode results summary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BlastResultsSummary from '../BlastResultsSummary';

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('BlastResultsSummary', () => {
  it('should render moves used', () => {
    render(<BlastResultsSummary movesUsed={15} tilesCleared={8} tileBonus={25} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('blast.multiplayer.moves')).toBeInTheDocument();
  });

  it('should render tiles cleared count', () => {
    render(<BlastResultsSummary movesUsed={10} tilesCleared={12} tileBonus={30} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should render tile bonus total', () => {
    render(<BlastResultsSummary movesUsed={10} tilesCleared={8} tileBonus={45} />);
    expect(screen.getByText('+45')).toBeInTheDocument();
  });

  it('should render with zero values', () => {
    render(<BlastResultsSummary movesUsed={0} tilesCleared={0} tileBonus={0} />);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
  });
});
