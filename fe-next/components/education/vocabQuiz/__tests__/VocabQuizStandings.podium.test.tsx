/**
 * Vocab Quiz gets the same podium as every other classroom mode.
 *
 * The quiz used to end on a ranked list — the one mode where the room did not
 * get a moment. `podium` swaps the top three for plinths and leaves the rest
 * of the standings underneath, so a class of thirty still sees where it placed.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VocabQuizStandings } from '../VocabQuizStandings';
import type { VocabQuizStanding } from '@/shared/types/vocabQuiz';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const standing = (username: string, score: number, correctCount: number): VocabQuizStanding => ({
  username,
  score,
  streak: 0,
  bestStreak: 0,
  correctCount,
});

const five = [
  standing('Maya', 900, 9),
  standing('Noa', 700, 7),
  standing('Eitan', 500, 5),
  standing('Dana', 300, 3),
  standing('Omri', 100, 1),
];

describe('VocabQuizStandings — podium', () => {
  it('puts the top three on plinths', () => {
    render(<VocabQuizStandings standings={five} podium limit={5} t={t} />);
    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('Maya');
    expect(screen.getByTestId('podium-place-2')).toHaveTextContent('Noa');
    expect(screen.getByTestId('podium-place-3')).toHaveTextContent('Eitan');
  });

  it('captions each plinth with how many the player got right', () => {
    render(<VocabQuizStandings standings={five} podium limit={5} t={t} />);
    expect(screen.getByTestId('podium-detail-1')).toHaveTextContent(
      'education.results.podium.correct:{"count":9}'
    );
  });

  it('still lists everyone below the podium', () => {
    render(<VocabQuizStandings standings={five} podium limit={5} t={t} />);
    expect(screen.getByText('Dana')).toBeInTheDocument();
    expect(screen.getByText('Omri')).toBeInTheDocument();
  });

  it('does not repeat a podium finisher in the list below', () => {
    render(<VocabQuizStandings standings={five} podium limit={5} t={t} />);
    expect(screen.getAllByText('Maya')).toHaveLength(1);
  });

  it('renders a podium alone when nobody placed fourth', () => {
    render(<VocabQuizStandings standings={five.slice(0, 3)} podium limit={5} t={t} />);
    expect(screen.getByTestId('podium-place-3')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'vocabQuiz.standings.title' })).not.toBeInTheDocument();
  });

  it('leaves the between-question strip exactly as it was', () => {
    render(<VocabQuizStandings standings={five} limit={5} t={t} />);
    expect(screen.queryByTestId('podium-place-1')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'vocabQuiz.standings.title' })).toBeInTheDocument();
  });

  it('says the room is empty rather than drawing a bare podium', () => {
    render(<VocabQuizStandings standings={[]} podium t={t} />);
    expect(screen.getByText('vocabQuiz.standings.empty')).toBeInTheDocument();
    expect(screen.queryByTestId('podium-place-1')).not.toBeInTheDocument();
  });
});
