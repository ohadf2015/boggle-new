import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false, known: true, source: null, refresh: vi.fn() }) }));
vi.mock('@/hooks/useTeacherActivationProgress', () => ({
  useTeacherActivationProgress: () => ({ progress: { inviteCopied: true, liveStarted: true, roomOpened: true, dismissed: false }, ready: true, markInviteCopied: vi.fn(), dismiss: vi.fn() }),
}));
let week: Record<string, unknown>;
vi.mock('@/hooks/useTeacherWeekStats', () => ({ useTeacherWeekStats: () => week }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));
vi.mock('@/hooks/useStudentProgressMetrics', () => ({ useStudentProgressMetrics: () => ({ students: [], isLoading: true, error: null, refresh: vi.fn() }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ lessons: [], isLoading: false, error: null }) }));

import TeacherDashboard from '../TeacherDashboard';

const CLASS_A = { id: 'c5b', name: '5B - English', member_count: 28, join_code: 'K7Q2', language: 'en' };

beforeEach(() => {
  classroomsState = { classrooms: [CLASS_A], isLoading: false, error: null, refresh: vi.fn() };
  week = { status: 'ready', summary: { gamesPlayed: 0, totalStudents: 28, activeClasses: 0, lastPlayedAt: {} }, insights: [] };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(cleanup);

const follows = (a: Element, b: Element) => Boolean(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Teacher Home first frame: the class desk leads', () => {
  it('Given a class, Then the week digest sits under the desk, not above the Start button', () => {
    render(<TeacherDashboard />);
    const week = screen.getByTestId('classroom-week-section');
    expect(follows(week, screen.getByTestId('home-hero'))).toBe(true);
    expect(follows(week, screen.getByTestId('home-desk-board'))).toBe(true);
  });

  it('Then the hero is the first block in the first frame', () => {
    render(<TeacherDashboard />);
    const frame = screen.getByTestId('home-first-frame');
    const first = frame.querySelector('section, aside, [data-testid]');
    expect(first?.closest('[data-tm]')?.contains(screen.getByTestId('home-hero'))).toBe(true);
  });

  it('Then Start sinks into its lip on press, like every chunky button', () => {
    render(<TeacherDashboard />);
    const start = screen.getByTestId('home-start-live');
    fireEvent.pointerDown(start, { button: 0 });
    expect(start).toHaveAttribute('data-pressed', 'true');
    fireEvent.pointerUp(start);
    expect(start).not.toHaveAttribute('data-pressed');
  });

  it('Then the secondary tile presses too, and is shorter than Start', () => {
    render(<TeacherDashboard />);
    const rehearse = screen.getByTestId('try-as-student');
    fireEvent.pointerDown(rehearse, { button: 0 });
    expect(rehearse).toHaveAttribute('data-pressed', 'true');
    expect(rehearse.className).toContain('min-h-14');
    expect(screen.getByTestId('home-start-live').className).toContain('min-h-[72px]');
  });

  it('Then the desk sits on the calm teacher backdrop, which holds no controls', () => {
    const { container } = render(<TeacherDashboard />);
    const backdrop = container.querySelector('[data-ambient]');
    expect(backdrop).not.toBeNull();
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop?.querySelector('a,button')).toBeNull();
  });

  it('Then the See results row under the desk presses the same way as Start', () => {
    render(<TeacherDashboard />);
    const row = screen.getByTestId('home-open-results');
    fireEvent.pointerDown(row, { button: 0 });
    expect(row).toHaveAttribute('data-pressed', 'true');
    expect(row.className).not.toMatch(/hover:-translate-y/);
  });
});
