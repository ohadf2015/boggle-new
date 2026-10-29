import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent, act } from '@testing-library/react';
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
vi.mock('@/components/teacher/assignments', () => ({ AssignmentCreator: () => null }));

let classroomsState: Record<string, unknown>;
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classroomsState }));
let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
let activation: Record<string, unknown>;
vi.mock('@/hooks/useTeacherActivationProgress', () => ({ useTeacherActivationProgress: () => activation }));
let week: Record<string, unknown>;
vi.mock('@/hooks/useTeacherWeekStats', () => ({ useTeacherWeekStats: () => week }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));
let lessonsState: Record<string, unknown>;
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => lessonsState }));

import TeacherDashboard from '../TeacherDashboard';

const FREE = { hasPro: false, loading: false, source: null, refresh: vi.fn() };
const ONE_CLASS = [{ id: 'c5b', name: '5B - English', member_count: 28, join_code: 'K7Q2', language: 'en' }];

beforeEach(() => {
  classroomsState = { classrooms: ONE_CLASS, isLoading: false, error: null, refresh: vi.fn() };
  proState = FREE;
  activation = { progress: { inviteCopied: true, liveStarted: true, roomOpened: true, dismissed: false }, ready: true, markInviteCopied: vi.fn(), dismiss: vi.fn() };
  week = { status: 'ready', summary: { gamesPlayed: 3, totalStudents: 28, activeClasses: 1, lastPlayedAt: { c5b: new Date(Date.now() - 3 * 864e5).toISOString() } } };
  lessonsState = { lessons: [], isLoading: false, error: null };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(cleanup);

describe('Teacher Home ready-to-run rail', () => {
  it('Given a class, Then 4-6 session cards sit right after the hero in the main column, each running for that class', () => {
    render(<TeacherDashboard />);
    const rail = screen.getByTestId('home-session-rail');
    expect(rail.closest('aside')).toBeNull();
    expect(rail.previousElementSibling?.lastElementChild).toContainElement(screen.getByTestId('home-hero'));
    const runs = within(rail).getAllByTestId('home-session-run');
    expect(runs.length).toBeGreaterThanOrEqual(4);
    expect(runs.length).toBeLessThanOrEqual(6);
    for (const run of runs) {
      const url = new URL(run.getAttribute('href') ?? '', 'https://x.test');
      expect(url.searchParams.get('classroomId')).toBe('c5b');
      expect(url.searchParams.get('session')).toBeTruthy();
    }
  });

  it('Then each card has decorative mascot art, a minutes chip, a grade chip and a language chip', () => {
    render(<TeacherDashboard />);
    const [card] = within(screen.getByTestId('home-session-rail')).getAllByTestId('home-session-card');
    expect(card.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(within(card).getByTestId('home-session-minutes')).toBeInTheDocument();
    expect(within(card).getByTestId('home-session-grade')).toBeInTheDocument();
    expect(within(card).getByTestId('home-session-language')).toHaveTextContent('languages.english');
  });

  it('Given lessons in one language, Then no language chip row', () => {
    lessonsState = { lessons: [{ classroom_id: 'c5b', language: 'en', grade_band: 'g35' }], isLoading: false, error: null };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-session-languages')).toBeNull();
  });

  it('Given lessons in two languages, Then a language chip row switches the cards to that language', () => {
    lessonsState = { lessons: [{ classroom_id: 'c5b', language: 'en' }, { classroom_id: 'c5b', language: 'es' }], isLoading: false, error: null };
    render(<TeacherDashboard />);
    const row = screen.getByTestId('home-session-languages');
    fireEvent.click(within(row).getByRole('radio', { name: 'languages.spanish' }));
    const [card] = screen.getAllByTestId('home-session-card');
    expect(within(card).getByTestId('home-session-language')).toHaveTextContent('languages.spanish');
  });

  it('Given lessons still loading, Then the rail waits instead of reshuffling later', () => {
    lessonsState = { lessons: [], isLoading: true, error: null };
    render(<TeacherDashboard />);
    expect(screen.queryAllByTestId('home-session-card')).toHaveLength(0);
  });

  it('Given a lessons read that never answers, Then the rail fails open after a short cap', () => {
    vi.useFakeTimers();
    try {
      lessonsState = { lessons: [], isLoading: true, error: null };
      render(<TeacherDashboard />);
      act(() => vi.advanceTimersByTime(2600));
      expect(screen.getAllByTestId('home-session-card').length).toBeGreaterThanOrEqual(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Given no class yet, Then no rail and no cue', () => {
    classroomsState = { ...classroomsState, classrooms: [] };
    activation = { ...activation, progress: { inviteCopied: false, liveStarted: false, roomOpened: false, dismissed: false } };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-session-rail')).toBeNull();
    expect(screen.queryByTestId('home-coach-cue')).toBeNull();
  });

  it('Given many classes, Then the rail follows the selected class and the class list still renders', () => {
    classroomsState = { ...classroomsState, classrooms: [...ONE_CLASS, { id: 'c4a', name: '4A', member_count: 20, join_code: 'ZZ11', language: 'he' }] };
    render(<TeacherDashboard />);
    const [run] = screen.getAllByTestId('home-session-run');
    expect(new URL(run.getAttribute('href') ?? '', 'https://x.test').searchParams.get('classroomId')).toBe('c5b');
    expect(screen.getAllByTestId('home-class-row')).toHaveLength(2);
  });

  it('Then See all opens every ready-to-run session', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('home-session-see-all'));
    expect(screen.getByTestId('home-session-all')).toBeInTheDocument();
  });
});

describe('Teacher Home greeting cue, week mascot and Pro strip', () => {
  it('Given an earlier game, Then the greeting carries one coach cue from real data', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-coach-cue').textContent).toMatch(/^eduShell\.home\.cue\.season\./);
  });

  it('Given games this week, Then the week row shows the cheering mascot', () => {
    render(<TeacherDashboard />);
    expect(within(screen.getByTestId('home-week')).getByTestId('edu-mascot-success')).toBeInTheDocument();
  });

  it('Given a quiet week after earlier games, Then the mascot nudges', () => {
    week = { status: 'ready', summary: { gamesPlayed: 0, totalStudents: 28, activeClasses: 0, lastPlayedAt: { c5b: '2026-09-01T10:00:00Z' } } };
    render(<TeacherDashboard />);
    expect(within(screen.getByTestId('home-week')).getByTestId('edu-mascot-tip')).toBeInTheDocument();
  });

  it('Given a Pro offer, Then it is one compact strip at the bottom of the rail with no bullet list', () => {
    render(<TeacherDashboard proOffer={{ kind: 'trial', onDismiss: vi.fn(), tracked: true }} />);
    const strip = screen.getByTestId('home-pro-card');
    const aside = strip.closest('aside');
    expect(aside).not.toBeNull();
    expect(aside?.lastElementChild?.contains(strip)).toBe(true);
    expect(within(strip).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(strip).getByTestId('home-pro-cta')).toBeInTheDocument();
  });
});
