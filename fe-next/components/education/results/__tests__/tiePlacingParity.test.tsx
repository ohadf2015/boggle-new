/**
 * Two phone routes, one tie: /education/live (EduStudentHero) and /multiplayer (StudentRoundOutcome)
 * must both tell a student who shares first place that they are first, tied with the other leader.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next/image', () => ({ default: () => <span data-testid="img" /> }));

import { StudentRoundOutcome } from '../StudentRoundOutcome';
import { EduStudentHero } from '@/components/education/live/EduStudentHero';
import { studentGap, studentPlacing } from '@/components/education/live/eduResultsModel';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const standings = [
  { username: 'Maya', score: 96 },
  { username: 'Leo', score: 96 },
  { username: 'Noa', score: 41 },
];
const TIED = 'mpUi.results.tiedWith:{"name":"Maya"}';

describe('a tie reads the same on both phone routes', () => {
  it('on /multiplayer, the second leader is first, tied with Maya, and beat one classmate', () => {
    render(<StudentRoundOutcome username="Leo" standings={standings} t={t} />);
    expect(screen.getByTestId('student-round-outcome').dataset.rank).toBe('1');
    expect(screen.getByTestId('student-outcome-headline')).toHaveTextContent('education.results.you.won');
    expect(screen.getByTestId('student-outcome-gap')).toHaveTextContent(TIED);
    expect(screen.getByTestId('student-outcome-beat')).toHaveTextContent('"count":1');
    cleanup();
  });

  it('on /education/live, the same student reads #1 of 3, tied with Maya', () => {
    const placing = studentPlacing(standings, 'Leo', 'Ms Cohen')!;
    expect(placing).toEqual({ rank: 1, total: 3, score: 96 });
    render(
      <EduStudentHero
        rank={placing.rank}
        total={placing.total}
        score={placing.score}
        bestWord={null}
        lesson={null}
        xp={null}
        coins={null}
        gap={studentGap(standings, 'Leo', 'Ms Cohen')}
        reduceMotion
        t={t}
      />
    );
    expect(screen.getByTestId('edu-student-rank')).toHaveTextContent('eduLiveRoom.studentResults.rankOf:{"rank":1,"total":3}');
    expect(screen.getByTestId('edu-student-headline')).toHaveTextContent('education.results.you.won');
    expect(screen.getByTestId('edu-student-gap')).toHaveTextContent(TIED);
  });
});
