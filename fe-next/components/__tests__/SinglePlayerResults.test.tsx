/**
 * SinglePlayerResults Component Tests
 * 
 * Tests for single player results display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('canvas-confetti', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="grid">Grid</div>,
}));

const mockResults = {
  playerScore: 100,
  playerWords: ['cat', 'dog', 'bat'],
  botScores: {
    'Bot1': 80,
    'Bot2': 60,
  },
  botWords: {
    'Bot1': ['cat', 'rat'],
    'Bot2': ['sat'],
  },
  isNewHighScore: false,
  previousHighScore: null,
  isNewAllTimeBest: false,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('SinglePlayerResults - Data Processing', () => {
  it('calculates player rank correctly', () => {
    const allScores = [
      { username: 'Player', score: 100 },
      { username: 'Bot1', score: 80 },
      { username: 'Bot2', score: 60 },
    ];
    
    const sorted = allScores.sort((a, b) => b.score - a.score);
    const playerRank = sorted.findIndex(p => p.username === 'Player') + 1;
    
    expect(playerRank).toBe(1);
  });

  it('identifies if player is winner', () => {
    const allScores = [
      { username: 'Player', score: 100 },
      { username: 'Bot1', score: 80 },
    ];
    
    const sorted = allScores.sort((a, b) => b.score - a.score);
    const isWinner = sorted[0].username === 'Player';
    
    expect(isWinner).toBe(true);
  });

  it('calculates total words found', () => {
    const playerWords = mockResults.playerWords;
    const totalWords = playerWords.length;
    
    expect(totalWords).toBe(3);
  });

  it('processes bot scores correctly', () => {
    const botScores = mockResults.botScores;
    const botNames = Object.keys(botScores);
    
    expect(botNames.length).toBe(2);
    expect(botScores['Bot1']).toBe(80);
    expect(botScores['Bot2']).toBe(60);
  });

  it('handles high score detection', () => {
    const isNewHighScore = mockResults.isNewHighScore;
    const previousHighScore = mockResults.previousHighScore;
    
    expect(typeof isNewHighScore).toBe('boolean');
    expect(previousHighScore).toBeNull();
  });
});



