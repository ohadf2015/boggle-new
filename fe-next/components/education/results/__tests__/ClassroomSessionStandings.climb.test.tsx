/**
 * From round two on the session list is the "who is winning today" answer,
 * and the round that just ended is what moved it. The rows start where they
 * stood before this round (total minus this round's points) and settle into
 * the new order once the podium reveal is done.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClassroomSessionStandings from '../ClassroomSessionStandings';
import type { ClassroomSessionStanding } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

// Before this round: ana 30, bo 20, cy 15. This round: bo +30, ana +5, cy +5.
const rows: ClassroomSessionStanding[] = [
  { username: 'bo', totalScore: 50, roundsPlayed: 2, rank: 1 },
  { username: 'ana', totalScore: 35, roundsPlayed: 2, rank: 2 },
  { username: 'cy', totalScore: 20, roundsPlayed: 2, rank: 3 },
];
const roundScores = { bo: 30, ana: 5, cy: 5 };

const order = () => screen.getAllByTestId('classroom-session-row').map((r) => r.getAttribute('data-username'));

describe('ClassroomSessionStandings — the round that moved the table', () => {
  it('starts in the order the class stood in before this round', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={2} roundScores={roundScores} settled={false} t={t} />);
    expect(order()).toEqual(['ana', 'bo', 'cy']);
  });

  it('settles into the new order once the reveal is done', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={2} roundScores={roundScores} settled t={t} />);
    expect(order()).toEqual(['bo', 'ana', 'cy']);
  });

  it('marks the student who climbed, and by how many places', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={2} roundScores={roundScores} settled t={t} />);
    const climbs = screen.getAllByTestId('classroom-session-climb');
    expect(climbs).toHaveLength(1);
    expect(climbs[0].closest('[data-username]')).toHaveAttribute('data-username', 'bo');
    expect(climbs[0]).toHaveTextContent('1');
  });

  it('without this round\'s scores, shows the server order and no climb', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={2} t={t} />);
    expect(order()).toEqual(['bo', 'ana', 'cy']);
    expect(screen.queryByTestId('classroom-session-climb')).toBeNull();
  });

  it('on a locked wall, prints the top rows and counts the rest, so a class of thirty never pushes Play again off', () => {
    const many: ClassroomSessionStanding[] = Array.from({ length: 30 }, (_, i) => ({ username: `s${i}`, totalScore: 300 - i, roundsPlayed: 3, rank: i + 1 }));
    render(<ClassroomSessionStandings standings={many} roundsPlayed={3} maxRows={5} t={t} />);
    expect(screen.getAllByTestId('classroom-session-row')).toHaveLength(5);
    expect(screen.getByTestId('classroom-session-more')).toHaveTextContent('education.results.moreWords:25');
  });
});
