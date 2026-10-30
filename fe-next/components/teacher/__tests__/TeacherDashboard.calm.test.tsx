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
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ lessons: [], isLoading: false, error: null }) }));

import TeacherDashboard from '../TeacherDashboard';

const CLASS_A = { id: 'c5b', name: '5B - English', member_count: 28, join_code: 'K7Q2', language: 'en' };
const CLASS_B = { id: 'c4a', name: '4A - Reading', member_count: 26, join_code: 'ZZ11', language: 'en' };
const COLOR_FILL = /(^|\s)bg-neo-(lime|cyan|pink|purple|orange|yellow)(\/\d+)?(\s|$)/;

function colorFills(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[class]')).filter((el) => COLOR_FILL.test(el.getAttribute('class') ?? ''));
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

describe('Teacher Home: calm, one primary', () => {
  it('Given one class and a Pro offer, Then Start live is the only colored fill on the page apart from the small PRO badge', () => {
    render(<TeacherDashboard proOffer={{ kind: 'trial', onDismiss: vi.fn(), tracked: true }} />);
    const fills = colorFills(screen.getByTestId('teacher-home'));
    const start = screen.getByTestId('home-start-live');
    const badge = screen.getByTestId('home-pro-badge');
    expect(fills.filter((el) => el !== start && el !== badge)).toEqual([]);
    expect(fills).toContain(start);
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
    expect(after.every((el) => el.tagName === 'ASIDE')).toBe(true);
    expect(colorFills(home).filter((el) => el !== screen.getByTestId('home-start-live'))).toEqual([]);
  });

  it('Then no decorative art sits behind the text and nothing in the hero bobs', () => {
    const { container } = render(<TeacherDashboard />);
    expect(container.innerHTML).not.toContain('teacher-hq-bg');
    expect(screen.getByTestId('home-hero').innerHTML).not.toMatch(/animate-\[edu-mascot-bob/);
  });

  it('Then the class name is cream, not a giant lime headline', () => {
    render(<TeacherDashboard />);
    const title = screen.getByRole('heading', { level: 2, name: '5B - English' });
    expect(title.className).toContain('text-neo-cream');
    expect(title.className).not.toMatch(/text-neo-lime|text-5xl/);
  });

  it('Then the insight is one inline line inside the hero, not a boxed big number', () => {
    render(<TeacherDashboard />);
    const insight = within(screen.getByTestId('home-hero')).getByTestId('home-insight');
    expect(within(insight).getByTestId('home-insight-value').className).not.toMatch(/text-5xl|text-neo-(lime|orange|cyan|pink|purple)/);
    expect(insight.parentElement?.className ?? '').not.toContain('border');
  });

  it('Then the ready-to-run sessions are one row of three cards without descriptions', () => {
    render(<TeacherDashboard />);
    const rail = screen.getByTestId('home-session-rail');
    expect(within(rail).getAllByTestId('home-session-card')).toHaveLength(3);
    expect(rail.textContent ?? '').not.toMatch(/\.when/);
  });

  it('Then week stats and weekly reports stay off the phone first frame while the Pro card stays', () => {
    render(<TeacherDashboard proOffer={{ kind: 'trial', onDismiss: vi.fn(), tracked: true }} />);
    expect(screen.getByTestId('home-week').closest('.max-lg\\:hidden')).not.toBeNull();
    expect(screen.getByTestId('home-weekly-reports').closest('.max-lg\\:hidden')).not.toBeNull();
    expect(screen.getByTestId('home-pro-card').closest('.max-lg\\:hidden')).toBeNull();
  });
});
