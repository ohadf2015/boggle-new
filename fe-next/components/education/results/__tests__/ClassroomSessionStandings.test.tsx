/**
 * The projector's answer to "who won the lesson".
 *
 * Each round's podium is its own reset-to-zero contest
 * (`resetScoresForNewRound`), so after round two the podium answers a different
 * question than the teacher is asking. Reported 2026-09-14: "by the end we
 * weren't sure who had actually won."
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClassroomSessionStandings from '../ClassroomSessionStandings';
import type { ClassroomSessionStanding } from '@/shared/types/classroom';

/** Echoes the key so a missing translation is visible, and interpolates. */
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const rows: ClassroomSessionStanding[] = [
  { username: 'bo', totalScore: 50, roundsPlayed: 2, rank: 1 },
  { username: 'ana', totalScore: 35, roundsPlayed: 2, rank: 2 },
  { username: 'cy', totalScore: 20, roundsPlayed: 1, rank: 3 },
];

describe('ClassroomSessionStandings', () => {
  it('names the session winner unmistakably', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={2} t={t} />);
    expect(screen.getByTestId('classroom-session-winner')).toHaveTextContent('bo');
  });

  it('lists every student, not just the top three', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      username: `s${i}`, totalScore: 100 - i, roundsPlayed: 2, rank: i + 1,
    }));
    render(<ClassroomSessionStandings standings={many} roundsPlayed={2} t={t} />);
    expect(screen.getAllByTestId('classroom-session-row')).toHaveLength(9);
  });

  it('shows each student their cumulative score, not the last round', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={2} t={t} />);
    const row = screen.getAllByTestId('classroom-session-row')[1];
    expect(row).toHaveTextContent('ana');
    expect(row).toHaveTextContent('35');
  });

  it('says how many rounds the total covers', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={3} t={t} />);
    expect(screen.getByTestId('classroom-session-subtitle')).toHaveTextContent('3');
  });

  /** Nothing to say is better than an empty box on a wall. */
  it('renders nothing without standings', () => {
    const { container } = render(
      <ClassroomSessionStandings standings={[]} roundsPlayed={2} t={t} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  /** Every visible string must come from t() — CLAUDE.md, no hardcoded copy. */
  it('takes all of its copy from t()', () => {
    render(<ClassroomSessionStandings standings={rows} roundsPlayed={2} t={t} />);
    expect(screen.getByTestId('classroom-session-title').textContent).toContain(
      'education.results.session.title'
    );
  });
});
