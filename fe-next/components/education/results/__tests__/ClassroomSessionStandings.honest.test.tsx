import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClassroomSessionStandings from '../ClassroomSessionStandings';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('ClassroomSessionStandings — never crowns a lesson nobody won', () => {
  it('Given every total is 0, Then no "wins the lesson" line and no gold row', () => {
    render(
      <ClassroomSessionStandings
        standings={[
          { username: 'Ada', totalScore: 0, roundsPlayed: 5, rank: 1 },
          { username: 'Bo', totalScore: 0, roundsPlayed: 5, rank: 2 },
        ]}
        roundsPlayed={5}
        t={t}
      />
    );
    expect(screen.queryByTestId('classroom-session-winner')).toBeNull();
    expect(screen.getAllByTestId('classroom-session-row')[0].className).not.toContain('bg-neo-yellow');
  });

  it('Given two students share the top total, Then nobody is named the sole winner', () => {
    render(
      <ClassroomSessionStandings
        standings={[
          { username: 'Ada', totalScore: 40, roundsPlayed: 2, rank: 1 },
          { username: 'Bo', totalScore: 40, roundsPlayed: 2, rank: 1 },
        ]}
        roundsPlayed={2}
        t={t}
      />
    );
    expect(screen.queryByTestId('classroom-session-winner')).toBeNull();
  });
});
