/**
 * WordHuntResultsSummary Tests
 * Tests the word hunt mode results summary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WordHuntResultsSummary from '../WordHuntResultsSummary';

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('WordHuntResultsSummary', () => {
  it('should reveal the target word', () => {
    render(
      <WordHuntResultsSummary
        targetWord="PUZZLE"
        foundTarget={true}
        isFirstFinder={false}
        survivalTime={120}
        discoveryWords={8}
      />
    );
    expect(screen.getByText('PUZZLE')).toBeInTheDocument();
  });

  it('should show first finder badge when applicable', () => {
    render(
      <WordHuntResultsSummary
        targetWord="PUZZLE"
        foundTarget={true}
        isFirstFinder={true}
        survivalTime={120}
        discoveryWords={8}
      />
    );
    expect(screen.getByText('wordHunt.multiplayer.firstFinder')).toBeInTheDocument();
  });

  it('should not show first finder badge when not first', () => {
    render(
      <WordHuntResultsSummary
        targetWord="PUZZLE"
        foundTarget={true}
        isFirstFinder={false}
        survivalTime={120}
        discoveryWords={8}
      />
    );
    expect(screen.queryByText('wordHunt.multiplayer.firstFinder')).not.toBeInTheDocument();
  });

  it('should show survival time', () => {
    render(
      <WordHuntResultsSummary
        targetWord="PUZZLE"
        foundTarget={false}
        isFirstFinder={false}
        survivalTime={95}
        discoveryWords={5}
      />
    );
    expect(screen.getByText('95s')).toBeInTheDocument();
  });

  it('should show discovery words count', () => {
    render(
      <WordHuntResultsSummary
        targetWord="PUZZLE"
        foundTarget={false}
        isFirstFinder={false}
        survivalTime={120}
        discoveryWords={12}
      />
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should show not found indicator when target not found', () => {
    render(
      <WordHuntResultsSummary
        targetWord="PUZZLE"
        foundTarget={false}
        isFirstFinder={false}
        survivalTime={120}
        discoveryWords={5}
      />
    );
    expect(screen.getByText('wordHunt.multiplayer.notFound')).toBeInTheDocument();
  });
});
