import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WordHuntResultsHero } from '../WordHuntResultsHero';

const heroProps = vi.fn();
vi.mock('../DailyResultsHero', () => ({
  DailyResultsHero: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    heroProps(props);
    return <section data-testid="daily-results-hero">{props.children}</section>;
  },
}));

const t = (key: string) => key;
const base = {
  solved: true, attemptsUsed: 3, targetWord: 'CRANE', efficiencyScore: 640, lifeRemaining: 42.6,
  wordsDiscovered: [{ word: 'CAR', lifeGained: 1, tokensGained: 0, timestamp: 1 }, { word: 'RAN', lifeGained: 1, tokensGained: 0, timestamp: 2 }],
};

describe('WordHuntResultsHero', () => {
  it('Given a fresh solve, When results open, Then the shared hero gets the outcome, #puzzle, score, run stats and celebrates', () => {
    render(<WordHuntResultsHero result={base as never} puzzleNumber={312} celebrate t={t}><button>share</button></WordHuntResultsHero>);
    const p = heroProps.mock.calls.at(-1)![0];
    expect(p).toMatchObject({ mode: 'word-hunt', outcome: 'win', headline: 'daily.solved', eyebrow: '#312', score: 640, celebrate: true });
    expect(p.stats).toEqual([
      { value: '3/10', label: 'wordHunt.attempts' },
      { value: 2, label: 'wordHunt.results.wordsFound' },
      { value: 43, label: 'wordHunt.score.lifeLeft' },
    ]);
    expect(screen.getByText('share')).toBeInTheDocument();
  });

  it('Given a lost run seen again later, When results open, Then it reads as a loss and does not celebrate', () => {
    render(<WordHuntResultsHero result={{ ...base, solved: false, efficiencyScore: 0 } as never} puzzleNumber={312} celebrate={false} t={t} />);
    expect(heroProps.mock.calls.at(-1)![0]).toMatchObject({ outcome: 'loss', headline: 'wordHunt.results.gameOver', score: 0, celebrate: false });
  });
});
