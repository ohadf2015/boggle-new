import { render, screen, cleanup, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '',
  CLASS_SWEEP_SOUND: '',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: true, loading: false }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ClassroomTvResults } from '../ClassroomTvResults';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const LESSON = ['house', 'water', 'light', 'earth', 'plant', 'sleep'];

// The critic's frame: Maya 44 / Noam 5 / Liam 0, and not one lesson word found.
const noLessonHits = (): ClassroomSummary => ({
  teacherName: 'Ms. T',
  lessonNames: ['Common English'],
  lessonIds: ['l1'],
  totalWords: LESSON.length,
  classFoundCount: 0,
  coverage: LESSON.map((word) => ({ word, foundBy: [] })),
  missedWords: [...LESSON],
  neverPlacedWords: LESSON.slice(0, 4),
  masteryByPlayer: {
    Maya: { found: 0, total: LESSON.length },
    Noam: { found: 0, total: LESSON.length },
    Liam: { found: 0, total: LESSON.length },
  },
  podium: [
    { username: 'Maya', score: 44, rank: 1, wordsFound: 0, totalWords: LESSON.length },
    { username: 'Noam', score: 5, rank: 2, wordsFound: 0, totalWords: LESSON.length },
    { username: 'Liam', score: 0, rank: 3, wordsFound: 0, totalWords: LESSON.length },
  ],
});

const someLessonHits = (): ClassroomSummary => ({
  ...noLessonHits(),
  classFoundCount: 2,
  coverage: LESSON.map((word, i) => ({ word, foundBy: i === 0 ? ['Maya'] : i === 1 ? ['Maya', 'Noam'] : [] })),
  missedWords: LESSON.slice(2),
  masteryByPlayer: {
    Maya: { found: 2, total: LESSON.length },
    Noam: { found: 1, total: LESSON.length },
    Liam: { found: 0, total: LESSON.length },
  },
  podium: [
    { username: 'Maya', score: 44, rank: 1, wordsFound: 2, totalWords: LESSON.length },
    { username: 'Noam', score: 5, rank: 2, wordsFound: 1, totalWords: LESSON.length },
    { username: 'Liam', score: 0, rank: 3, wordsFound: 0, totalWords: LESSON.length },
  ],
});

const word = (w: string, validated = true) => ({ word: w, score: w.length, validated }) as never;

const finalScores = (): PlayerResult[] => [
  { username: 'Maya', score: 44, allWords: [word('stone'), word('notes'), word('tons'), word('xq', false)] },
  { username: 'Noam', score: 5, allWords: [word('tons'), word('one')] },
  { username: 'Liam', score: 0, allWords: [] },
  { username: 'Speedy Bot', score: 90, isBot: true, allWords: [word('monstrous')] },
  { username: 'Ms. T', score: 0, isHost: true, allWords: [word('teacher')] },
];

describe('ClassroomTvResults — every number on the wall comes from one tally', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it('Given points but zero lesson words, Then no "0 of N" lesson number is shown anywhere', () => {
    render(<ClassroomTvResults summary={noLessonHits()} players={finalScores()} onRematch={() => {}} t={t} revealSettled />);
    const wall = screen.getByTestId('classroom-tv-results');
    expect(screen.queryByTestId('class-chest')).toBeNull();
    expect(screen.queryByTestId('coverage-meter')).toBeNull();
    expect(screen.queryByTestId(/^podium-detail-/)).toBeNull();
    expect(wall.textContent).not.toContain('education.results.classCoverage');
    expect(wall.textContent).not.toContain('"found":0');
  });

  it('Given zero lesson words, Then the words still to teach stay listed under a plain heading, not a 0/N meter', () => {
    render(<ClassroomTvResults summary={noLessonHits()} players={finalScores()} onRematch={() => {}} t={t} revealSettled />);
    const panel = screen.getByTestId('no-lesson-words-panel');
    expect(within(panel).getByTestId('coverage-heading')).toHaveTextContent('eduLive.results.noLessonReteach');
    expect(within(panel).getByTestId('coverage-words')).toBeInTheDocument();
  });

  it('Given points but zero lesson words, Then the winner and the real score still stand', () => {
    render(<ClassroomTvResults summary={noLessonHits()} players={finalScores()} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('classroom-tv-results')).toHaveAttribute('data-outcome', 'winner');
    expect(screen.getAllByText('44').length).toBeGreaterThan(0);
  });

  it('Given zero lesson words, Then the panel says so and shows the words students actually found (no bots, no teacher, no rejects)', () => {
    render(<ClassroomTvResults summary={noLessonHits()} players={finalScores()} onRematch={() => {}} t={t} revealSettled />);
    const panel = screen.getByTestId('no-lesson-words-panel');
    expect(panel).toHaveTextContent('eduLive.results.noLessonTitle');
    const chips = within(panel).getAllByTestId(/^class-word-/).map((c) => c.getAttribute('data-word'));
    expect(chips).toEqual(expect.arrayContaining(['stone', 'notes', 'tons', 'one']));
    expect(chips).not.toContain('monstrous');
    expect(chips).not.toContain('teacher');
    expect(chips).not.toContain('xq');
    expect(chips.filter((w) => w === 'tons')).toHaveLength(1);
  });

  it('Given a Hebrew room, Then the best finds are shown with their final letters, not the normalized trace', () => {
    const players: PlayerResult[] = [{ username: 'Maya', score: 9, allWords: [word('שלומ')] }];
    render(<ClassroomTvResults summary={noLessonHits()} players={players} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('no-lesson-words-panel')).toHaveTextContent('שלום');
  });

  it('Given nobody scored at all, Then the wall keeps the plain 0/N meter and never claims points came from other words', () => {
    const zero = noLessonHits();
    zero.podium = zero.podium!.map((p) => ({ ...p, score: 0 }));
    render(<ClassroomTvResults summary={zero} players={[]} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.queryByTestId('no-lesson-words-panel')).toBeNull();
    expect(screen.getByTestId('coverage-meter')).toBeInTheDocument();
    expect(screen.queryByTestId('class-chest')).toBeNull();
  });

  it('Given lesson words were found, Then chest, meter and plinths all read the same server tally', () => {
    const summary = someLessonHits();
    render(<ClassroomTvResults summary={summary} players={finalScores()} onRematch={() => {}} t={t} revealSettled />);
    expect(within(screen.getByTestId('class-chest')).getByText('2', { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByTestId('coverage-words')).toBeInTheDocument();
    expect(screen.queryByTestId('no-lesson-words-panel')).toBeNull();
    expect(screen.getByTestId('podium-detail-1')).toHaveTextContent('eduLive.results.podiumLessonWords:{"found":2,"total":6}');
    expect(screen.getByTestId('podium-detail-2')).toHaveTextContent('eduLive.results.podiumLessonWords:{"found":1,"total":6}');
    expect(screen.queryByTestId('podium-detail-3')).toBeNull();
  });
});
