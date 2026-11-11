import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', display_name: 'Dana Levi' }, loading: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/components/education/shell/TeacherAccountMenu', () => ({ TeacherAccountMenu: () => null }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => null }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentCreator: ({ isOpen, initialLessonId }: { isOpen: boolean; initialLessonId?: string }) =>
    isOpen ? <div data-testid="assignment-creator">{initialLessonId ?? 'none'}</div> : null,
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
const getRecent = vi.fn();
vi.mock('@/lib/supabase/analyticsLastGame', () => ({ getRecentClassroomGames: (...a: unknown[]) => getRecent(...a) }));

let classroomsState: Record<string, unknown>;
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classroomsState }));
let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
let activation: Record<string, unknown>;
vi.mock('@/hooks/useTeacherActivationProgress', () => ({ useTeacherActivationProgress: () => activation }));
let week: Record<string, unknown>;
vi.mock('@/hooks/useTeacherWeekStats', () => ({ useTeacherWeekStats: () => week }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));
vi.mock('@/hooks/useStudentProgressMetrics', () => ({ useStudentProgressMetrics: () => ({ students: [], isLoading: true, error: null, refresh: vi.fn() }) }));
let lessons: Record<string, unknown>;
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => lessons }));

import TeacherDashboard from '../TeacherDashboard';

const FREE = { hasPro: false, loading: false, source: null, refresh: vi.fn() };
const PRO = { hasPro: true, loading: false, source: 'polar', status: 'active', refresh: vi.fn() };
const CLASS = { id: 'c5b', name: '5B - English', member_count: 5, join_code: 'K7Q2' };
const W = [{ word: 'cat' }];

function player(id: string, found: number, missed: number) {
  return { studentId: id, name: id, score: 1, lessonWordsFound: Array(found).fill('a'), lessonWordsMissed: Array(missed).fill('b'), accuracyPct: found + missed ? Math.round((found / (found + missed)) * 100) : 0 };
}
const DAY = 86_400_000;
const PLAYED = new Date(Date.now() - 2 * DAY).toISOString();
const GAME = {
  gameCode: 'G1', gameMode: 'word-hunt', playedAt: PLAYED, lessonIds: ['l1'],
  players: [player('ava', 9, 1), player('liam', 8, 2), player('noah', 4, 6)],
  missedWords: [], totalLessonWords: 10, wordsNobodyFound: [], coveragePct: 100, averageAccuracyPct: 70,
  participation: { played: 3, roster: 5 }, absentStudents: [{ studentId: 'm', name: 'Maria' }, { studentId: 's', name: 'Sofia' }],
};

beforeEach(() => {
  classroomsState = { classrooms: [CLASS], isLoading: false, error: null, refresh: vi.fn() };
  proState = FREE;
  activation = { progress: { inviteCopied: true, liveStarted: true, roomOpened: true, dismissed: false }, ready: true, markInviteCopied: vi.fn(), dismiss: vi.fn() };
  week = { status: 'ready', summary: { gamesPlayed: 1, gamesLast30d: 1, totalStudents: 5, activeClasses: 1, lastPlayedAt: { c5b: PLAYED } } };
  lessons = {
    isLoading: false,
    lessons: [
      { id: 'l1', name: 'Week 1', classroom_id: 'c5b', created_at: '2026-10-28T08:00:00.000Z', words: W, language: 'en' },
      { id: 'l2', name: 'Week 2', classroom_id: 'c5b', created_at: '2026-11-05T08:00:00.000Z', words: W, language: 'en' },
    ],
  };
  getRecent.mockReset();
  getRecent.mockResolvedValue({ data: [GAME], error: null });
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(() => cleanup());

async function settle() {
  await act(async () => {});
}

describe('Teacher Home week-two loop', () => {
  it('Given a class that played last week, Then one tap replays the last mode with this week\'s list', async () => {
    render(<TeacherDashboard />);
    await settle();
    const play = screen.getByTestId('home-play-again');
    const q = Object.fromEntries(new URL(play.getAttribute('href')!, 'https://x').searchParams);
    expect(q).toEqual({ flow: 'quick', classroomId: 'c5b', lessonId: 'l2', mode: 'word-hunt' });
    expect(screen.getByTestId('home-play-again-detail')).toHaveTextContent('Week 2');
    expect(screen.queryByTestId('home-start-live')).toBeNull();
    expect(getRecent).toHaveBeenCalledWith('c5b', 1, expect.anything());
  });

  it('Then Ready for the test counts students at 80% or more, free, and opens the results hub with no lock on Home', async () => {
    render(<TeacherDashboard />);
    await settle();
    const chip = screen.getByTestId('home-ready-chip');
    expect(chip).toHaveTextContent('eduShell.home.loop.ready:{"ready":2,"total":3}');
    expect(chip).toHaveAttribute('href', '/en/teacher/reports?classroomId=c5b');
    expect(screen.queryByTestId('home-ready-lock')).toBeNull();
  });

  it('Given a Pro teacher, Then the same chip opens the report without a lock', async () => {
    proState = PRO;
    render(<TeacherDashboard />);
    await settle();
    expect(screen.getByTestId('home-ready-chip')).toBeInTheDocument();
    expect(screen.queryByTestId('home-ready-lock')).toBeNull();
  });

  it('Then students who missed the game get homework on this week\'s list in one tap', async () => {
    render(<TeacherDashboard />);
    await settle();
    fireEvent.click(screen.getByTestId('home-homework'));
    expect(screen.getByTestId('assignment-creator')).toHaveTextContent('l2');
  });

  it('Given the game read is still in flight, Then the primary slot waits instead of flashing Start live', () => {
    getRecent.mockReturnValue(new Promise(() => undefined));
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-start-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('home-start-live')).toBeNull();
  });

  it('Given a teacher who never hosted, Then Start live shows at once, no waiting on a game read', () => {
    getRecent.mockReturnValue(new Promise(() => undefined));
    activation = { ...activation, progress: { inviteCopied: true, liveStarted: false, roomOpened: false, dismissed: false } };
    week = { status: 'ready', summary: { gamesPlayed: 0, gamesLast30d: 0, totalStudents: 5, activeClasses: 0, lastPlayedAt: {} } };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-start-live')).toBeInTheDocument();
    expect(screen.queryByTestId('home-start-pending')).toBeNull();
  });

  it('Given the game read fails, Then Start live is back and no chip claims a number', async () => {
    getRecent.mockResolvedValue({ data: [], error: { message: 'boom' } });
    render(<TeacherDashboard />);
    await settle();
    expect(screen.getByTestId('home-start-live')).toBeInTheDocument();
    expect(screen.queryByTestId('home-ready-chip')).toBeNull();
    expect(screen.queryByTestId('home-week-loop')).toBeNull();
  });

  it('Given the last game was weeks ago, Then Play again stays but no stale ready count or absentee list shows', async () => {
    getRecent.mockResolvedValue({ data: [{ ...GAME, playedAt: new Date(Date.now() - 40 * DAY).toISOString() }], error: null });
    render(<TeacherDashboard />);
    await settle();
    expect(screen.getByTestId('home-play-again')).toBeInTheDocument();
    expect(screen.queryByTestId('home-week-loop')).toBeNull();
  });

  it('Given a game saved before word results existed, Then the chip is a plain empty line, not zero ready', async () => {
    getRecent.mockResolvedValue({ data: [{ ...GAME, players: [player('ava', 0, 0)], absentStudents: undefined }], error: null });
    render(<TeacherDashboard />);
    await settle();
    expect(screen.getByTestId('home-ready-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('home-ready-chip')).toBeNull();
    expect(screen.getByTestId('home-play-again')).toBeInTheDocument();
  });

  it('Given a new teacher with no classes, Then onboarding shows and no game is read', async () => {
    classroomsState = { ...classroomsState, classrooms: [] };
    render(<TeacherDashboard />);
    await settle();
    expect(screen.getByTestId('home-onboarding')).toBeInTheDocument();
    expect(screen.queryByTestId('home-play-again')).toBeNull();
    expect(getRecent).not.toHaveBeenCalled();
  });
});
