/**
 * The session story has to travel: sessionStorage -> hook -> card -> chip.
 *
 * `StudentRoundOutcome.momentum.test.tsx` already covers the chip when a
 * `momentum` object is handed to it. That is the easy half. The half that
 * actually broke people's confidence in round 6 is the WIRING — whether the
 * round banked under `sessionKeyFor(summary)` is the round the next card reads
 * back. Nothing pinned it, so "the chip is absent" could not be told apart
 * from "the chip is correctly absent" (round 1 renders none, by design).
 *
 * Verified live on 2026-09-12 (room 6FUPT9, :3011): round 1 banked
 * `{score:110,rank:1,players:2}` and rendered no chip; after REMATCH, round 2
 * rendered "110 down on last round" and "Round 2 this session". These cases
 * pin exactly that sequence.
 *
 * NOTE on the projector: it deliberately has NO per-student delta. A wall
 * showing one child's "+40" in front of thirty is the opposite of what the
 * podium is for, so ClassroomTvResults takes only `roundNumber` and
 * `sweepStreak` from the same hook, under its own `::class` key.
 */
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

import { ClassroomResultsCard } from '../../ClassroomResultsCard';
import ClassroomTvResults from '../ClassroomTvResults';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const summary: ClassroomSummary = {
  teacherName: 'Mr. Gauntlet B',
  lessonNames: ['Common English'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'house', foundBy: ['Noa'] },
    { word: 'water', foundBy: ['Dan'] },
    { word: 'light', foundBy: [] },
    { word: 'earth', foundBy: [] },
  ],
  missedWords: ['light', 'earth'],
  masteryByPlayer: { Noa: { found: 2, total: 4 }, Dan: { found: 1, total: 4 } },
  podium: [
    { username: 'Noa', score: 60, rank: 1 },
    { username: 'Dan', score: 40, rank: 2 },
  ],
};

const standings = [
  { username: 'Noa', score: 60, rank: 1 },
  { username: 'Dan', score: 40, rank: 2 },
];

/** What the previous round left behind, exactly as the hook writes it. */
function seedPreviousRound(key: string, score: number, rank = 1) {
  window.sessionStorage.setItem(
    key,
    JSON.stringify([{ score, rank, players: 2, sweep: false, at: 1 }]),
  );
}

const card = () => (
  <ClassroomResultsCard summary={summary} username="Noa" standings={standings} t={t} />
);

describe('momentum reaches the student card', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it('round 1 renders NO chip — an honest blank, not a broken one', async () => {
    render(card());
    await waitFor(() => expect(screen.getByTestId('student-round-outcome')).toBeInTheDocument());
    expect(screen.queryByTestId('student-outcome-delta')).toBeNull();
    expect(screen.queryByTestId('student-outcome-round')).toBeNull();
  });

  it('round 2 reads the banked round back and prints the delta UP', async () => {
    seedPreviousRound(sessionKeyFor(summary), 20);
    render(card());
    const delta = await screen.findByTestId('student-outcome-delta');
    // 60 this round against 20 last round.
    // The literal string a QA sweep greps for. It renders.
    expect(delta.textContent).toContain('+40 vs last round');
    expect((await screen.findByTestId('student-outcome-round')).textContent).toContain('2');
  });

  it('and the delta DOWN, which is the case that reads as "no chip" if you grep for "vs last round"', async () => {
    seedPreviousRound(sessionKeyFor(summary), 170);
    render(card());
    const delta = await screen.findByTestId('student-outcome-delta');
    // NOT "vs last round" — a down round reads "110 down on last round", which
    // is why grepping for one phrasing reports a working chip as missing.
    expect(delta.textContent).toContain('110 down on last round');
    expect(delta.textContent).not.toContain('vs last round');
  });

  it('banks the round it just rendered, so the NEXT round has something to beat', async () => {
    render(card());
    await waitFor(() =>
      expect(window.sessionStorage.getItem(sessionKeyFor(summary))).not.toBeNull(),
    );
    const banked = JSON.parse(window.sessionStorage.getItem(sessionKeyFor(summary))!);
    expect(banked).toHaveLength(1);
    expect(banked[0]).toMatchObject({ score: 60, rank: 1, players: 2 });
  });

  it('a teacher card banks nothing — a report is not a scoreboard', async () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Mr. Gauntlet B"
        standings={standings}
        isTeacher
        t={t}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('coverage-words')).toBeInTheDocument());
    expect(window.sessionStorage.getItem(sessionKeyFor(summary))).toBeNull();
  });
});

describe('momentum reaches the projector, as a round counter', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it('round 2 names the round on the wall', async () => {
    seedPreviousRound(`${sessionKeyFor(summary)}::class`, 2, 0);
    render(<ClassroomTvResults summary={summary} onRematch={() => {}} t={t} />);
    expect((await screen.findByTestId('classroom-tv-round')).textContent).toContain('2');
  });

  it('round 1 names nothing', () => {
    render(<ClassroomTvResults summary={summary} onRematch={() => {}} t={t} />);
    expect(screen.queryByTestId('classroom-tv-round')).toBeNull();
  });

  it('the wall writes its own key, never the student card\'s', async () => {
    render(<ClassroomTvResults summary={summary} onRematch={() => {}} t={t} />);
    await waitFor(() =>
      expect(window.sessionStorage.getItem(`${sessionKeyFor(summary)}::class`)).not.toBeNull(),
    );
    // A teacher device that renders both must not have them overwrite each
    // other (Pitfall Class 1: one value, two writers).
    expect(window.sessionStorage.getItem(sessionKeyFor(summary))).toBeNull();
  });
});
