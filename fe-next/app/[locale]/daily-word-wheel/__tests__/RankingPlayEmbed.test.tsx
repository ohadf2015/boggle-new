/**
 * Ranking URL play embed — listed hunt (finite target list), not open dictionary.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RankingPlayEmbed } from '../RankingPlayEmbed';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  puzzleDate: '2026-09-03',
  language: 'en',
  puzzleNumber: 1,
  targetWords: ['BEAD', 'FACE', 'CAFE', 'IDEA', 'CADGE'],
};

describe('RankingPlayEmbed', () => {
  it('defaults to a 9-letter centre wheel (1 required centre + 8 outer)', () => {
    render(<RankingPlayEmbed locale="en" validateWord={async () => true} />);
    const play = screen.getByTestId('ranking-wheel-play');
    const tiles = play.querySelectorAll('[data-wheel-letter]');
    expect(tiles).toHaveLength(9);
    expect(play.querySelector('[data-wheel-index="0"]')).toBeTruthy();
    expect(play.querySelectorAll('[data-wheel-index]')).toHaveLength(9);
  });

  it('shows every wheel letter including the center', () => {
    render(<RankingPlayEmbed puzzle={puzzle} validateWord={async () => true} />);
    expect(screen.getByTestId('ranking-wheel-play')).toBeTruthy();
    for (const letter of puzzle.allLetters) {
      expect(screen.getByRole('button', { name: letter })).toBeTruthy();
    }
  });

  it('shows 0/N and 4–9 length buckets against the finite target list', () => {
    render(<RankingPlayEmbed puzzle={puzzle} />);
    expect(screen.getByTestId('found-count')).toHaveTextContent('0/5');
    expect(screen.getByTestId('length-bucket-4')).toHaveTextContent('0/4');
    expect(screen.getByTestId('length-bucket-5')).toHaveTextContent('0/1');
    expect(screen.getByTestId('length-bucket-6')).toHaveTextContent('0/0');
    expect(screen.getByTestId('length-bucket-7')).toHaveTextContent('0/0');
    expect(screen.getByTestId('length-bucket-8')).toHaveTextContent('0/0');
    expect(screen.getByTestId('length-bucket-9')).toHaveTextContent('0/0');
    expect(screen.getByTestId('ranking-wheel-submit')).toHaveTextContent('CHECK');
  });

  it('CHECK accepts a listed word and updates 0/N and the length bucket', async () => {
    render(<RankingPlayEmbed puzzle={puzzle} />);

    fireEvent.click(screen.getByRole('button', { name: 'F' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    fireEvent.click(screen.getByTestId('ranking-wheel-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('found-count')).toHaveTextContent('1/5');
    });
    expect(screen.getByTestId('length-bucket-4')).toHaveTextContent('1/4');
  });

  it('CHECK rejects a dictionary word that is not on the target list', async () => {
    const validateWord = vi.fn().mockResolvedValue(true);
    render(<RankingPlayEmbed puzzle={puzzle} validateWord={validateWord} />);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    fireEvent.click(screen.getByTestId('ranking-wheel-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('found-count')).toHaveTextContent('0/5');
    });
    expect(validateWord).not.toHaveBeenCalled();
  });
});
