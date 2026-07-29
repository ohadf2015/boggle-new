import { render, screen } from '@testing-library/react';
import { MyStatsCard, deriveStats } from '../MyStatsCard';
import type { LadderWord } from '../../WordsLadder';

const wd = (word: string, score: number, ts = 0, userId = 'u1', inputMethod: 'kb' | 'drag' = 'drag'): LadderWord => ({
  word, score, ts, userId, inputMethod,
});

describe('deriveStats', () => {
  it('returns nulls/zeros on empty', () => {
    const s = deriveStats([]);
    expect(s.bestWord).toBeNull();
    expect(s.wordsPerMin).toBe(0);
    expect(s.kbBonusUses).toBe(0);
    expect(s.totalScore).toBe(0);
  });

  it('picks longest word at score tie', () => {
    const s = deriveStats([wd('AB', 5), wd('LONGER', 5)]);
    expect(s.bestWord?.word).toBe('LONGER');
  });

  it('picks highest score', () => {
    const s = deriveStats([wd('A', 2), wd('BIG', 12)]);
    expect(s.bestWord?.score).toBe(12);
  });

  it('counts kb-bonus uses', () => {
    const s = deriveStats([wd('A', 1, 0, 'u1', 'kb'), wd('B', 1, 0, 'u1', 'drag'), wd('C', 1, 0, 'u1', 'kb')]);
    expect(s.kbBonusUses).toBe(2);
  });

  it('sums totalScore', () => {
    const s = deriveStats([wd('A', 1), wd('B', 2), wd('C', 3)]);
    expect(s.totalScore).toBe(6);
  });
});

describe('MyStatsCard', () => {
  it('renders stat cells for non-empty word list', () => {
    render(
      <MyStatsCard mode="classic" meId="u1" foundWords={[wd('CAT', 3, Date.now()), wd('LIGHT', 8, Date.now(), 'u1', 'kb')]} />
    );
    expect(screen.getByTestId('best-word')).toBeInTheDocument();
    expect(screen.getByTestId('wpm')).toBeInTheDocument();
    expect(screen.getByTestId('kb-uses')).toBeInTheDocument();
    expect(screen.getByText('LIGHT')).toBeInTheDocument();
  });

  it('renders em-dash when no words yet', () => {
    render(<MyStatsCard mode="classic" meId="u1" foundWords={[]} />);
    expect(screen.getByTestId('best-word').textContent).toContain('—');
  });

  it('only counts my words when meId is set', () => {
    render(
      <MyStatsCard
        mode="classic"
        meId="u1"
        foundWords={[wd('MINE', 3, Date.now(), 'u1'), wd('THEIRS', 50, Date.now(), 'u2')]}
      />
    );
    expect(screen.getByText('MINE')).toBeInTheDocument();
  });
});
