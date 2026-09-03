/**
 * Ranking URL play embed — first-time visitor can form a word on
 * /en/daily-word-wheel without navigating to /daily/word-wheel.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RankingPlayEmbed } from '../RankingPlayEmbed';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  puzzleDate: '2026-09-03',
  language: 'en',
  puzzleNumber: 1,
};

describe('RankingPlayEmbed', () => {
  it('shows every wheel letter including the center', () => {
    render(<RankingPlayEmbed puzzle={puzzle} validateWord={async () => true} />);
    expect(screen.getByTestId('ranking-wheel-play')).toBeTruthy();
    for (const letter of puzzle.allLetters) {
      expect(screen.getByRole('button', { name: letter })).toBeTruthy();
    }
    expect(screen.getByTestId('found-count')).toHaveTextContent('0');
  });

  it('submits a valid word and moves the found-count', async () => {
    const validateWord = vi.fn().mockResolvedValue(true);
    render(<RankingPlayEmbed puzzle={puzzle} validateWord={validateWord} />);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    fireEvent.click(screen.getByTestId('ranking-wheel-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('found-count')).toHaveTextContent('1');
    });
    expect(validateWord).toHaveBeenCalledWith('CAB');
  });
});
