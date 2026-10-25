import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', display_name: 'Dana Levi' }, loading: false }),
}));
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/components/education/shell/TeacherAccountMenu', () => ({ TeacherAccountMenu: () => null }));
vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: ({ initialReviewWords }: { initialReviewWords: string[] }) => <div data-testid="lesson-builder">{initialReviewWords.join(',')}</div>,
}));
const viewed = vi.fn();
vi.mock('@/lib/education/telemetry', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  trackEduTeacherDashboardViewed: (s: unknown) => viewed(s),
}));
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

import TeacherDashboard from '../TeacherDashboard';

const FREE = { hasPro: false, loading: false, source: null, refresh: vi.fn() };
const PRO = { hasPro: true, loading: false, source: 'polar', status: 'active', refresh: vi.fn() };
const CLASSES = [
  { id: 'c5b', name: '5B - English', member_count: 28, join_code: 'K7Q2' },
  { id: 'c4a', name: '4A - Reading', member_count: 26, join_code: 'ZZ11' },
];

beforeEach(() => {
  classroomsState = { classrooms: CLASSES, isLoading: false, error: null, refresh: vi.fn() };
  proState = FREE;
  activation = { progress: { inviteCopied: true, liveStarted: true, dismissed: false }, ready: true, markInviteCopied: vi.fn(), markLiveStarted: vi.fn(), dismiss: vi.fn() };
  week = { status: 'ready', summary: { gamesPlayed: 12, totalStudents: 54, activeClasses: 2, lastPlayedAt: { c5b: new Date().toISOString() } } };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  search = '';
  viewed.mockReset();
});

describe('Teacher Home — rehearse with bots', () => {
  it('Given a teacher with a class, Then the hero offers a quiet rehearsal beside the one primary Start', () => {
    render(<TeacherDashboard />);
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByTestId('rehearse-with-bots')).toBeInTheDocument();
    expect(within(hero).getByTestId('rehearse-with-bots').className).not.toMatch(/bg-neo-lime/);
  });

  it('Given a teacher with no class yet, Then the first-run card offers the rehearsal too', () => {
    classroomsState = { ...classroomsState, classrooms: [] };
    render(<TeacherDashboard />);
    expect(within(screen.getByTestId('home-onboarding')).getByTestId('rehearse-with-bots')).toBeInTheDocument();
  });
});
