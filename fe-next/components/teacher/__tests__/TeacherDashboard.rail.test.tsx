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
vi.mock('@/hooks/useStudentProgressMetrics', () => ({ useStudentProgressMetrics: () => ({ students: [], isLoading: true, error: null, refresh: vi.fn() }) }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));
let lessonsState: Record<string, unknown>;
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => lessonsState }));

import TeacherDashboard from '../TeacherDashboard';

const FREE = { hasPro: false, loading: false, known: true, source: null, refresh: vi.fn() };
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
  beforeEach(() => {
    proState = { ...FREE, hasPro: true };
  });

  it('Given a class, Then one row of three session cards sits right after the hero in the main column, each running for that class', () => {
    render(<TeacherDashboard />);
    const rail = screen.getByTestId('home-session-rail');
    expect(rail.closest('aside')).toBeNull();
    expect(rail.previousElementSibling).toContainElement(screen.getByTestId('home-hero'));
    const cards = within(rail).getAllByTestId('home-session-card');
    expect(cards).toHaveLength(3);
    for (const run of within(rail).getAllByTestId('home-session-run')) {
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
      expect(screen.getAllByTestId('home-session-card')).toHaveLength(3);
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

  it('Given many classes, Then the rail follows the selected class and the hero switcher offers the others', () => {
    classroomsState = { ...classroomsState, classrooms: [...ONE_CLASS, { id: 'c4a', name: '4A', member_count: 20, join_code: 'ZZ11', language: 'he' }] };
    render(<TeacherDashboard />);
    const [run] = screen.getAllByTestId('home-session-run');
    expect(new URL(run.getAttribute('href') ?? '', 'https://x.test').searchParams.get('classroomId')).toBe('c5b');
    expect(within(screen.getByTestId('home-hero')).getByRole('button', { name: 'eduShell.home.switchClass' })).toBeInTheDocument();
  });

  it('Then See all opens every ready-to-run session', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('home-session-see-all'));
    expect(screen.getByTestId('home-session-all')).toBeInTheDocument();
  });

  it('Given any desk, Then its column fills the first screen, so the ready-made games always start below the fold', () => {
    render(<TeacherDashboard />);
    const column = screen.getByTestId('home-hero').closest('[data-testid="home-first-frame"]') as HTMLElement;
    expect(column.className).toContain('min-h-[calc(100dvh-9rem)]');
    expect(column.className).toContain('lg:min-h-[calc(100dvh-2.5rem)]');
    expect(column).not.toContainElement(screen.getByTestId('home-session-rail'));
  });
});

describe('Teacher Home greeting cue, week mascot and Pro strip', () => {
  it('Given an earlier game, Then the greeting stays one line, with no coach cue under it', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-coach-cue')).toBeNull();
  });

  it('Given a free teacher, Then the Teacher Pro offer is one compact strip under the desk with no bullet list', () => {
    render(<TeacherDashboard />);
    const strip = screen.getByTestId('dashboard-pro-offer');
    expect(strip.closest('[aria-label="eduShell.home.railLabel"]')).toBeNull();
    expect(screen.getByTestId('home-first-frame')).toContainElement(strip);
    expect(within(strip).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(strip).getByTestId('dashboard-pro-offer-cta')).toBeInTheDocument();
  });
});
