/**
 * Live Vocab Quiz — the moment the round is building towards.
 *
 * Round 2 ended on a Trophy icon, a heading and a list. That is a scoreboard,
 * not a payoff: the critic's verdict was that "the number that mattered
 * vanishes". The wall now gets a finale — the class's own three numbers, Lexi
 * holding the trophy, and the podium underneath — and it is asserted here
 * rather than eyeballed, because a celebration nobody can test is a
 * celebration nobody can keep.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabQuizFinale } from '../VocabQuizFinale';
import { classFinaleStats } from '../vocabQuizJuice';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const STANDINGS = [
  { username: 'ana', score: 480, streak: 4, bestStreak: 5, correctCount: 4 },
  { username: 'bo', score: 300, streak: 0, bestStreak: 2, correctCount: 3 },
  { username: 'cy', score: 120, streak: 0, bestStreak: 1, correctCount: 1 },
];

describe('classFinaleStats', () => {
  it('reads the class as a whole, not as three separate scores', () => {
    // 8 correct out of 3 players × 5 questions = 15 attempts → 53%.
    expect(classFinaleStats(STANDINGS, 5)).toEqual({
      players: 3,
      correct: 8,
      attempts: 15,
      accuracy: 53,
      topStreak: 5,
    });
  });

  it('never divides by a round that asked nothing', () => {
    expect(classFinaleStats(STANDINGS, 0).accuracy).toBe(0);
    expect(classFinaleStats([], 5).accuracy).toBe(0);
  });

  it('reports the best streak anyone reached, not the one they ended on', () => {
    // ana ended the round on 4 but hit 5 — the class remembers the 5.
    expect(classFinaleStats(STANDINGS, 5).topStreak).toBe(5);
  });
});

describe('VocabQuizFinale', () => {
  it('puts the class numbers on the wall', () => {
    render(<VocabQuizFinale standings={STANDINGS} totalQuestions={5} t={t} />);

    expect(screen.getByTestId('quiz-finale-accuracy')).toHaveTextContent('53');
    expect(screen.getByTestId('quiz-finale-words')).toHaveTextContent('8');
    expect(screen.getByTestId('quiz-finale-streak')).toHaveTextContent('5');
  });

  it('stages the top three on the podium the board modes use', () => {
    render(<VocabQuizFinale standings={STANDINGS} totalQuestions={5} t={t} />);

    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('ana');
    expect(screen.getByTestId('podium-place-3')).toHaveTextContent('cy');
  });

  it('carries the mascot — every surface does', () => {
    render(<VocabQuizFinale standings={STANDINGS} totalQuestions={5} t={t} />);

    expect(screen.getByTestId('quiz-finale-mascot')).toBeInTheDocument();
  });

  it('holds an empty room without inventing a result', () => {
    render(<VocabQuizFinale standings={[]} totalQuestions={5} t={t} />);

    expect(screen.queryByTestId('podium-place-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('quiz-finale-accuracy')).toHaveTextContent('0');
  });
});
