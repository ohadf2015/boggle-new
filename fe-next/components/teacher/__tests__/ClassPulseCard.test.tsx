/**
 * ClassPulseCard — the teacher's class, legible without reading.
 *
 * The assertions that matter here are the ones about honesty: the card
 * replaces a strip that printed the enrolment count under the words "are in
 * {classroom} right now". So "enrolled" must never be rendered as presence,
 * a class that has never played must not show a participation line at all,
 * and a capped list must still report the true size of the problem.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassPulseCard from '../ClassPulseCard';
import { deriveClassPulse, STRUGGLING_LIST_LIMIT } from '@/lib/education/classPulse';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    // Echo the key plus its params so a test can assert WHICH key was used and
    // what was interpolated, without pinning English copy.
    t: (key: string, a?: unknown, b?: unknown) => {
      const params = (typeof a === 'object' && a !== null ? a : b) as
        | Record<string, unknown>
        | undefined;
      if (!params) return key;
      const rendered = Object.entries(params)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ');
      return `${key} ${rendered}`;
    },
  }),
  LanguageContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-15T10:00:00.000Z');

function playedGame(overrides = {}) {
  return {
    playedAt: new Date(NOW - DAY).toISOString(),
    gameMode: 'vocab-quiz',
    participation: { played: 7, roster: 10 },
    averageAccuracyPct: 74,
    players: [
      { studentId: 's1', name: 'Ada', accuracyPct: 95 },
      { studentId: 's2', name: 'Dov', accuracyPct: 35 },
    ],
    missedWords: [{ word: 'ephemeral', pct: 80 }],
    ...overrides,
  };
}

describe('ClassPulseCard', () => {
  describe('given a class that has never played', () => {
    it('states the enrolled count without ever claiming those students are present', () => {
      const pulse = deriveClassPulse({ rosterCount: 28, lastGame: null, now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      // The number is shown, and the label that carries it is the enrolment
      // key — not the presence copy the old strip used.
      expect(screen.getByTestId('class-pulse-roster')).toHaveTextContent('28');
      expect(screen.getByTestId('class-pulse-roster')).toHaveTextContent('teacher.pulse.enrolled');
      expect(screen.queryByText(/right now/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('class-pulse-participation')).not.toBeInTheDocument();
    });

    it('derives play state (button suppressed in dashboard context)', () => {
      // CONSOLIDATION FIX: when nextAction is 'play', the button is
      // suppressed because GO LIVE (PlayNowLauncher) is the primary path.
      const pulse = deriveClassPulse({ rosterCount: 28, lastGame: null, now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      // The pulse card correctly derives nextAction as 'play', but the
      // button is not rendered (suppressed in the dashboard context).
      expect(pulse.nextAction).toBe('play');
      expect(screen.queryByTestId('class-pulse-action')).not.toBeInTheDocument();
    });
  });

  describe('given an empty class', () => {
    it('asks the teacher to invite students', () => {
      const pulse = deriveClassPulse({ rosterCount: 0, lastGame: null, now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      expect(screen.getByTestId('class-pulse-action')).toHaveTextContent('teacher.pulse.action.invite');
    });
  });

  describe('state is encoded in form, not only in words', () => {
    it.each([
      ['noRoster', { rosterCount: 0, lastGame: null }],
      ['neverPlayed', { rosterCount: 10, lastGame: null }],
      ['needsReview', { rosterCount: 10, lastGame: playedGame() }],
      [
        'ready',
        {
          rosterCount: 10,
          lastGame: playedGame({
            players: [{ studentId: 's1', name: 'Ada', accuracyPct: 95 }],
            missedWords: [],
          }),
        },
      ],
    ])('carries a distinct data-state and a matching stripe for %s', (expected, input) => {
      const pulse = deriveClassPulse({ ...(input as never), now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      expect(screen.getByTestId('class-pulse')).toHaveAttribute('data-state', expected);
      // The stripe is the non-textual carrier of the same fact — a teacher
      // scanning a column of classes reads the edge, not the sentence.
      expect(screen.getByTestId('class-pulse-stripe')).toHaveAttribute('data-state', expected);
    });
  });

  describe('given a game the class struggled with', () => {
    it('separates who played from who was absent', () => {
      const pulse = deriveClassPulse({ rosterCount: 10, lastGame: playedGame(), now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      const participation = screen.getByTestId('class-pulse-participation');
      expect(participation).toHaveTextContent('played=7');
      expect(participation).toHaveTextContent('absent=3');
    });

    it('names the struggling students', () => {
      const pulse = deriveClassPulse({ rosterCount: 10, lastGame: playedGame(), now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      expect(screen.getByTestId('class-pulse-struggling')).toHaveTextContent('Dov');
    });

    it('reports the true number of strugglers even though the named list is capped', () => {
      const players = Array.from({ length: STRUGGLING_LIST_LIMIT + 4 }, (_, i) => ({
        studentId: `s${i}`,
        name: `Student ${i}`,
        accuracyPct: 10 + i,
      }));
      const pulse = deriveClassPulse({
        rosterCount: 20,
        lastGame: playedGame({ players }),
        now: NOW,
      });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      // The count, not the length of the list the teacher can see.
      expect(screen.getByTestId('class-pulse-struggling')).toHaveTextContent(
        `count=${STRUGGLING_LIST_LIMIT + 4}`
      );
    });

    it('uses singular copy for one struggling student', () => {
      // Interpolating a count into a plural template reads as broken grammar
      // in most of the six locales — Hebrew rendered "1 מתקשים" (1 struggling,
      // plural) and Swedish/Spanish are no better. The singular is its own key.
      const pulse = deriveClassPulse({ rosterCount: 10, lastGame: playedGame(), now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      expect(screen.getByTestId('class-pulse-struggling')).toHaveTextContent(
        'teacher.pulse.strugglingOne'
      );
    });

    it('uses singular copy for a game played one day ago', () => {
      // "לפני 1 ימים" — before 1 days.
      const pulse = deriveClassPulse({
        rosterCount: 10,
        lastGame: playedGame({ playedAt: new Date(NOW - DAY).toISOString() }),
        now: NOW,
      });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} />);

      expect(screen.getByTestId('class-pulse-lastgame')).toHaveTextContent(
        'teacher.pulse.lastPlayedOneDay'
      );
    });

    it('offers the missed words to the review action', async () => {
      const onReviewWords = vi.fn();
      const pulse = deriveClassPulse({ rosterCount: 10, lastGame: playedGame(), now: NOW });

      render(
        <ClassPulseCard classroomName="3rd Grade" pulse={pulse} onReviewWords={onReviewWords} />
      );
      await userEvent.click(screen.getByTestId('class-pulse-action'));

      expect(onReviewWords).toHaveBeenCalledWith(['ephemeral']);
    });
  });

  describe('given a healthy class', () => {
    it('shows playAgain state (button suppressed in dashboard context)', () => {
      // CONSOLIDATION FIX: when nextAction is 'playAgain', the button is
      // suppressed because GO LIVE (PlayNowLauncher) is the primary path.
      // This test verifies the state is derived correctly, not clickability.
      const onAction = vi.fn();
      const pulse = deriveClassPulse({
        rosterCount: 10,
        lastGame: playedGame({
          players: [{ studentId: 's1', name: 'Ada', accuracyPct: 95 }],
          missedWords: [],
        }),
        now: NOW,
      });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} onAction={onAction} />);
      expect(screen.queryByTestId('class-pulse-struggling')).not.toBeInTheDocument();

      // The pulse card correctly derives nextAction as 'playAgain', but the
      // button is not rendered (suppressed in the dashboard context).
      expect(pulse.nextAction).toBe('playAgain');
      expect(screen.queryByTestId('class-pulse-action')).not.toBeInTheDocument();
      expect(onAction).not.toHaveBeenCalled();
    });
  });

  describe('while the last game is still loading', () => {
    it('claims no participation number it cannot yet back up', () => {
      // Pitfall class 1: render the pessimistic state until every source has
      // resolved. An optimistic "0 absent" here flips to "3 absent" a moment
      // later, which is exactly the flash this codebase keeps re-learning.
      const pulse = deriveClassPulse({ rosterCount: 10, lastGame: null, now: NOW });

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} isLoading />);

      expect(screen.getByTestId('class-pulse-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('class-pulse-participation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('class-pulse-action')).not.toBeInTheDocument();
    });

    it('does not name a state it has not resolved yet', () => {
      // Caught live at 1920x1080: a class that HAD played rendered the chip
      // "NOT PLAYED YET" above its own loading skeleton, then flipped to
      // "NEEDS REVIEW" when the read landed. While loading, the derivation
      // sees `lastGame: null` and honestly says "neverPlayed" — but the CARD
      // must not publish that as a finding (pitfall class 1: the optimistic
      // render a later source overwrites).
      const pulse = deriveClassPulse({ rosterCount: 10, lastGame: null, now: NOW });
      expect(pulse.state).toBe('neverPlayed');

      render(<ClassPulseCard classroomName="3rd Grade" pulse={pulse} isLoading />);

      expect(screen.getByTestId('class-pulse')).toHaveAttribute('data-state', 'loading');
      expect(screen.getByTestId('class-pulse-stripe')).toHaveAttribute('data-state', 'loading');
      expect(screen.queryByText('teacher.pulse.state.neverPlayed')).not.toBeInTheDocument();
    });
  });
});
