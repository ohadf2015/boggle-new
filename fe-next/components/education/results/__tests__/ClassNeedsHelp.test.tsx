/**
 * "Who needs help", at the moment it is still actionable.
 *
 * Kahoot's bar puts this in a report a teacher opens later — `Need help 3`,
 * three names, three percentages, one click deep in Reports. The class has gone
 * to lunch by then. Ours sits on the end-of-round screen the room is already
 * looking at, so the teacher can pull two children aside before the next round.
 *
 * The rule has to be defensible out loud: under half the lesson words. Not a
 * percentile, not "bottom three" — bottom-three shames somebody in every class,
 * including a class where everyone did fine.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClassNeedsHelp, pickStudentsNeedingHelp } from '../ClassNeedsHelp';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const mastery = {
  Maya: { found: 8, total: 10 },
  Noa: { found: 2, total: 10 },
  Eitan: { found: 5, total: 10 },
  Dana: { found: 0, total: 10 },
};

describe('pickStudentsNeedingHelp', () => {
  it('names only the students under half the list, furthest behind first', () => {
    expect(pickStudentsNeedingHelp(mastery)).toEqual([
      { username: 'Dana', found: 0, total: 10 },
      { username: 'Noa', found: 2, total: 10 },
    ]);
  });

  it('treats exactly half as keeping up — a borderline student is not called out', () => {
    expect(pickStudentsNeedingHelp({ Eitan: { found: 5, total: 10 } })).toEqual([]);
  });

  it('is empty when the round carried no words, instead of dividing by zero', () => {
    // Two players, so the solo guard is not what makes this pass.
    expect(
      pickStudentsNeedingHelp({ Noa: { found: 0, total: 0 }, Dana: { found: 0, total: 0 } })
    ).toEqual([]);
  });

  it('caps the list so a rough round does not print the whole register', () => {
    const rough = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`S${i}`, { found: 0, total: 10 }])
    );
    expect(pickStudentsNeedingHelp(rough)).toHaveLength(4);
  });

  it('never volunteers a single-player room — there is no class to compare', () => {
    expect(pickStudentsNeedingHelp({ Noa: { found: 0, total: 10 } })).toEqual([]);
  });
});

describe('ClassNeedsHelp', () => {
  it('lists each student with the words they actually found', () => {
    render(<ClassNeedsHelp masteryByPlayer={mastery} t={t} />);
    const panel = screen.getByTestId('class-needs-help');
    expect(panel).toHaveTextContent('Dana');
    expect(panel).toHaveTextContent('Noa');
    expect(panel).not.toHaveTextContent('Maya');
  });

  it('says so out loud when the whole class kept up — silence reads as a bug', () => {
    render(
      <ClassNeedsHelp
        masteryByPlayer={{ Maya: { found: 9, total: 10 }, Noa: { found: 8, total: 10 } }}
        t={t}
      />
    );
    expect(screen.getByTestId('class-needs-help-none')).toBeInTheDocument();
  });

  it('renders nothing at all when no one has a mastery row yet', () => {
    const { container } = render(<ClassNeedsHelp masteryByPlayer={{}} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
