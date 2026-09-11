/**
 * The student's own end-of-round moment.
 *
 * The projector gets the podium; a fifteen-year-old holding a phone wants one
 * answer — "where did I come?" — and a reason to want the rematch. Kahoot's
 * player screen gives a flat placing and nothing else; this gives the placing,
 * how many classmates they beat, how close the next place was, and how much of
 * the lesson they personally landed.
 *
 * Every number is derived from the standings the SERVER sorted plus the
 * server-built `masteryByPlayer` — never recomputed from a second ranking, so
 * the phone and the wall can never disagree (Class 3).
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StudentRoundOutcome } from '../StudentRoundOutcome';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const standings = [
  { username: 'Maya', score: 240 },
  { username: 'Noa', score: 200 },
  { username: 'Eitan', score: 90 },
  { username: 'Dana', score: 40 },
];

const mastery = { found: 3, total: 4 };

describe('StudentRoundOutcome', () => {
  it('leads with the placing and the score', () => {
    render(<StudentRoundOutcome username="Noa" standings={standings} mastery={mastery} t={t} />);
    const card = screen.getByTestId('student-round-outcome');
    expect(card).toHaveTextContent('2');
    expect(card).toHaveTextContent('200');
    expect(card.dataset.rank).toBe('2');
  });

  it('celebrates a win differently from a mid-pack finish', () => {
    const { unmount } = render(
      <StudentRoundOutcome username="Maya" standings={standings} mastery={mastery} t={t} />
    );
    expect(screen.getByTestId('student-outcome-headline')).toHaveTextContent(
      'education.results.you.won'
    );
    unmount();

    render(<StudentRoundOutcome username="Dana" standings={standings} mastery={mastery} t={t} />);
    expect(screen.getByTestId('student-outcome-headline')).toHaveTextContent(
      'education.results.you.finished'
    );
  });

  it('tells the student how many classmates they beat', () => {
    render(<StudentRoundOutcome username="Noa" standings={standings} mastery={mastery} t={t} />);
    expect(screen.getByTestId('student-outcome-beat')).toHaveTextContent('"count":2');
  });

  it('says nothing about beating anyone when the student came last', () => {
    render(<StudentRoundOutcome username="Dana" standings={standings} mastery={mastery} t={t} />);
    expect(screen.queryByTestId('student-outcome-beat')).not.toBeInTheDocument();
  });

  it('shows how close the next place was — the reason to tap rematch', () => {
    render(<StudentRoundOutcome username="Noa" standings={standings} mastery={mastery} t={t} />);
    expect(screen.getByTestId('student-outcome-gap')).toHaveTextContent('"points":40');
  });

  it('shows no gap line for the winner — there is nobody above them', () => {
    render(<StudentRoundOutcome username="Maya" standings={standings} mastery={mastery} t={t} />);
    expect(screen.queryByTestId('student-outcome-gap')).not.toBeInTheDocument();
  });

  it('reports the student\'s own lesson-word haul, not the class total', () => {
    render(<StudentRoundOutcome username="Noa" standings={standings} mastery={mastery} t={t} />);
    expect(screen.getByTestId('student-outcome-words')).toHaveTextContent('"found":3');
    expect(screen.getByTestId('student-outcome-words')).toHaveTextContent('"total":4');
  });

  it('renders nothing when this player is not in the standings at all', () => {
    const { container } = render(
      <StudentRoundOutcome username="Ghost" standings={standings} mastery={mastery} t={t} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('matches the player case-insensitively — the server echoes names as typed', () => {
    render(<StudentRoundOutcome username="nOa" standings={standings} mastery={mastery} t={t} />);
    expect(screen.getByTestId('student-round-outcome').dataset.rank).toBe('2');
  });

  it('counts the room the way the server\'s podium does — bots are not classmates', () => {
    // The server's podium filters `!p.isBot` (backend/modules/classroomResultsExtras).
    // Counting bots here would print "#3 of 4" under a podium that shows two
    // names — two rankings that disagree on one card.
    const withBots = [
      { username: 'Maya', score: 240 },
      { username: 'BotZed', score: 210, isBot: true },
      { username: 'Noa', score: 200 },
      { username: 'BotAmi', score: 10, isBot: true },
    ];
    render(<StudentRoundOutcome username="Noa" standings={withBots} mastery={mastery} t={t} />);
    const hero = screen.getByTestId('student-round-outcome');
    expect(hero.dataset.rank).toBe('2');
    expect(hero).toHaveTextContent('education.results.you.of:{"total":2}');
    expect(screen.queryByTestId('student-outcome-beat')).not.toBeInTheDocument();
    expect(screen.getByTestId('student-outcome-gap')).toHaveTextContent('Maya');
  });

  it('omits the word line when the student has no mastery row (a late joiner)', () => {
    render(<StudentRoundOutcome username="Noa" standings={standings} t={t} />);
    expect(screen.queryByTestId('student-outcome-words')).not.toBeInTheDocument();
  });

  /**
   * Same Class 5 defect as the podium: a fullscreen-ish card whose entrance
   * keyframe starts at `opacity: 0` is a card that a mobile renderer can show
   * blank. The student's placing is the one thing this screen exists for.
   */
  it('paints the placing immediately — no entrance fade', () => {
    render(<StudentRoundOutcome username="Noa" standings={standings} t={t} />);
    const card = screen.getByTestId('student-round-outcome');
    expect(card.className).not.toContain('animate-neo-pop');
    expect(card.style.opacity).not.toBe('0');
  });
});
