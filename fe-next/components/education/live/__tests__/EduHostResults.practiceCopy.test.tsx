import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, loading: false, isTeacher: true }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));

const nav = vi.hoisted(() => ({ path: '/en/education/live/host', search: '' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.path, useSearchParams: () => new URLSearchParams(nav.search) }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const TEACHER = 'Ms. Cohen';

const summary = (over: Partial<ClassroomSummary> = {}): ClassroomSummary => ({
  teacherName: TEACHER,
  lessonNames: ['Unit 3'],
  lessonIds: ['l1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'atlas', foundBy: ['Noa'] },
    { word: 'basalt', foundBy: ['Dan'] },
    { word: 'crater', foundBy: [] },
    { word: 'delta', foundBy: [] },
  ],
  missedWords: ['crater', 'delta'],
  masteryByPlayer: { [TEACHER]: { found: 0, total: 4 }, Noa: { found: 1, total: 4 }, Dan: { found: 1, total: 4 } },
  podium: [
    { username: TEACHER, score: 0, rank: 1, wordsFound: 0, totalWords: 4 },
    { username: 'Noa', score: 40, rank: 2, wordsFound: 1, totalWords: 4 },
    { username: 'Dan', score: 20, rank: 3, wordsFound: 1, totalWords: 4 },
  ],
  ...over,
});

const zeroLesson = (): ClassroomSummary =>
  summary({
    classFoundCount: 0,
    coverage: ['atlas', 'basalt', 'crater', 'delta'].map((word) => ({ word, foundBy: [] })),
    missedWords: ['atlas', 'basalt', 'crater', 'delta'],
    masteryByPlayer: { [TEACHER]: { found: 0, total: 4 }, Pupil: { found: 0, total: 4 } },
    podium: [{ username: 'Pupil', score: 0, rank: 1, wordsFound: 0, totalWords: 4 }],
  });

const host = { username: TEACHER, score: 0, isHost: true };
const practiceRoster = [{ username: 'Pupil', score: 0, wordsFoundCount: 0, isPractice: true }, host] as unknown as PlayerResult[];
const classRoster = [{ username: 'Pupil', score: 0, wordsFoundCount: 0 }, host] as unknown as PlayerResult[];

const REAL_ROUND_KEYS = ['education.results.wholeLessonAgain', 'eduResultsV3.coverageLabel', 'eduLive.results.zeroTitle', 'eduLive.results.zeroBody', 'eduLive.results.zeroNoteHint'];
const PRACTICE_KEYS = [
  'eduLive.results.practice.coverageNote',
  'eduLive.results.practice.coverageHeading',
  'eduLive.results.practice.zeroTitle',
  'eduLive.results.practice.zeroBody',
  'eduLive.results.practice.zeroNote',
];

function wallText(players: PlayerResult[]): string {
  render(<EduHostResults summary={zeroLesson()} players={players} t={t} onRematch={vi.fn()} />);
  act(() => {
    vi.advanceTimersByTime(10_000);
  });
  return screen.getByTestId('edu-host-results').textContent ?? '';
}

describe('EduHostResults copy: a rehearsal is not a class that failed', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    pro.hasPro = false;
    pro.loading = false;
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    nav.search = '';
  });

  it('Given a practice-run room whose practice seat is missing from the scores, When results show, Then it still reads as a rehearsal', () => {
    nav.search = 'room=AB12&practice=1';
    const text = wallText([host] as unknown as PlayerResult[]);
    expect(text).toContain('eduLive.results.practice.zeroTitle');
    expect(text).not.toContain('eduLive.results.zeroBody');
  });

  it('Given a real class round where nobody scored or found a lesson word, When results show, Then the class-performance copy is unchanged', () => {
    const text = wallText(classRoster);
    for (const key of REAL_ROUND_KEYS) expect(text).toContain(key);
    for (const key of PRACTICE_KEYS) expect(text).not.toContain(key);
  });

  it('Given a teacher rehearsal with the practice student at zero, When results show, Then it says what the teacher saw and what the class will see', () => {
    const text = wallText(practiceRoster);
    for (const key of PRACTICE_KEYS) expect(text).toContain(key);
    for (const key of REAL_ROUND_KEYS) expect(text).not.toContain(key);
  });

  it('Given a teacher rehearsal, When results show, Then the practice score is the real one (no faked points)', () => {
    wallText(practiceRoster);
    expect(screen.queryByTestId('coverage-meter')).toBeNull();
    expect(screen.getByTestId('edu-host-results')).toHaveAttribute('data-outcome', 'zero');
  });
});
