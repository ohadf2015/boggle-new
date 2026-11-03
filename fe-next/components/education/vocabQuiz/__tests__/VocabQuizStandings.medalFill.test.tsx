import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VocabQuizStandings } from '../VocabQuizStandings';
import { MEDAL_FILL } from '../../results/PodiumStage';
import type { VocabQuizStanding } from '@/shared/types/vocabQuiz';

const t = (key: string) => key;

const standing = (username: string, score: number): VocabQuizStanding => ({
  username,
  score,
  streak: 0,
  bestStreak: 0,
  correctCount: 0,
});

describe('VocabQuizStandings medal fill', () => {
  it('paints each mid-quiz medal with the board podium plate metal', () => {
    render(<VocabQuizStandings standings={[standing('A', 3), standing('B', 2), standing('C', 1)]} t={t} />);
    const medals = screen.getAllByTestId('standings-medal');
    expect(medals.map((m) => m.getAttribute('data-medal'))).toEqual(['gold', 'silver', 'bronze']);
    for (const m of medals) {
      const metal = m.getAttribute('data-medal') as keyof typeof MEDAL_FILL;
      expect(m.className.split(/\s+/)).toContain(MEDAL_FILL[metal]);
    }
  });
});
