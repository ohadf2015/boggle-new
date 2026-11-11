import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
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
const CLASS_B = { id: 'c4a', name: '4A - Reading', member_count: 26, join_code: 'ZZ11', language: 'en' };
const LIME_FILL = /(^|\s)bg-neo-lime(\/\d+)?(\s|$)/;

/** Lime marks the one main action. Color blocks (pink hero, yellow code, cyan practice) are the approved neo-brutalist look. */
function limeFills(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[class]')).filter((el) => LIME_FILL.test(el.getAttribute('class') ?? '') && !el.closest('[data-accent-decor]'));
}

beforeEach(() => {
  classroomsState = { classrooms: [CLASS_A], isLoading: false, error: null, refresh: vi.fn() };
  week = {
    status: 'ready',
    summary: { gamesPlayed: 0, totalStudents: 28, activeClasses: 0, lastPlayedAt: { c5b: new Date(Date.now() - 21 * 864e5).toISOString() } },
    insights: [{ id: 'quiet', value: 21 }],
  };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(cleanup);

describe('Teacher Home: one primary, chunky blocks', () => {
  it('Then color comes back as decoration only: accent pieces hold no buttons or links', () => {
    render(<TeacherDashboard />);
    const home = screen.getByTestId('teacher-home');
    for (const decor of home.querySelectorAll('[data-accent-decor]')) expect(decor.querySelector('a,button')).toBeNull();
  });

  it('Given one class and the free Pro entry, Then Start a game is the only lime fill on the page', () => {
    render(<TeacherDashboard />);
    expect(limeFills(screen.getByTestId('teacher-home'))).toEqual([screen.getByTestId('home-start-live')]);
  });

  it('Then the hero is one bold color block', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-hero').className).toMatch(/(^|\s)bg-neo-pink(\s|$)/);
  });

  it('Given three classes, Then the hero switcher picks the class and no class list stacks under the sessions', () => {
    const CLASS_C = { id: 'c9h', name: 'Year 9 Hebrew', member_count: 12, join_code: 'HH99', language: 'he' };
    classroomsState = { ...classroomsState, classrooms: [CLASS_A, CLASS_B, CLASS_C] };
    render(<TeacherDashboard />);
    const home = screen.getByTestId('teacher-home');
    expect(within(home).queryAllByTestId('home-class-row')).toHaveLength(0);
    expect(within(screen.getByTestId('home-hero')).getByRole('button', { name: 'eduShell.home.switchClass' })).toBeInTheDocument();
    const rail = screen.getByTestId('home-session-rail');
    const after = Array.from(home.children).slice(Array.from(home.children).indexOf(rail) + 1);
    expect(after.every((el) => el.tagName === 'ASIDE' || el.getAttribute('data-testid') === 'home-footer')).toBe(true);
    expect(limeFills(home)).toEqual([screen.getByTestId('home-start-live')]);
  });

  it('Then the Start button has a shine sweep that sits behind its label', () => {
    render(<TeacherDashboard />);
    const start = screen.getByTestId('home-start-live');
    expect(start.className).toContain('animate-edu-shine');
    expect(start.querySelector(':scope > .edu-shine-track[aria-hidden="true"]')).not.toBeNull();
  });

  it('Then no decorative art sits behind the text and nothing in the hero bobs', () => {
    const { container } = render(<TeacherDashboard />);
    expect(container.innerHTML).not.toContain('teacher-hq-bg');
    expect(screen.getByTestId('home-hero').innerHTML).not.toMatch(/animate-\[edu-mascot-bob/);
  });

  it('Then the class name is white on the color block, not a giant lime headline', () => {
    render(<TeacherDashboard />);
    const title = screen.getByRole('heading', { level: 2, name: '5B - English' });
    expect(title.className).toContain('text-white');
    expect(title.className).not.toMatch(/text-neo-lime|text-5xl/);
  });

  it('Then the hero carries no insight line or free-class count, only the class and its one Start button', () => {
    render(<TeacherDashboard />);
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).queryByTestId('home-insight')).toBeNull();
    expect(within(hero).queryByTestId('home-class-cap')).toBeNull();
  });

  it('Given a free desk with no roster, Then the ready-made games are one slim row of three links, not big cards', () => {
    render(<TeacherDashboard />);
    const rail = screen.getByTestId('home-session-rail');
    expect(within(rail).getAllByTestId('home-session-chip')).toHaveLength(3);
    expect(within(rail).queryByTestId('home-session-card')).toBeNull();
  });

  it('Given a free desk with the slim games strip, Then nothing stretches, so the seat meter sits right under the strip with no empty band', () => {
    render(<TeacherDashboard />);
    const home = screen.getByTestId('teacher-home');
    expect(home.className).not.toContain('lg:min-h-full');
    expect(home.className).not.toMatch(/lg:grid-rows-\[auto_1fr/);
  });

  it('Then the rail carries no week stats block, while the one Results tile sits under the desk on every screen', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-week-games')).toBeNull();
    expect(screen.getByTestId('home-weekly-reports').closest('.max-lg\\:hidden')).toBeNull();
    expect(screen.getByTestId('home-desk-board')).toContainElement(screen.getByTestId('home-weekly-reports'));
    expect(screen.getByTestId('home-class-insight').closest('.max-lg\\:hidden')).toBeNull();
  });
});
