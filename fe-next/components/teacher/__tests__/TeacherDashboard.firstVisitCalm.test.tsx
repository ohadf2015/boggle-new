/**
 * First visit to HQ with the cookie sheet up: the sheet overlays a screen built to fit one viewport
 * instead of padding it into a scroll, and nothing auto-opens over GO LIVE.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const classroomsMock = { value: [{ id: 'c1', name: 'Class 1' }] as Array<{ id: string; name: string }> };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: classroomsMock.value,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createClassroom: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div data-testid="teacher-onboarding" />,
}));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div data-testid="classroom-manager" /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div data-testid="lesson-builder" /> }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div data-testid="assignment-panel" />,
  AssignmentCreator: () => <div data-testid="assignment-creator" />,
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard" />,
}));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({
  LastGameInsights: () => <div data-testid="last-game-insights" />,
}));
vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div data-testid="students-present" /> }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false, source: null, periodEnd: null, refresh: vi.fn(), grantExpired: false }),
}));
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));

import TeacherDashboard from '../TeacherDashboard';

const src = readFileSync(path.join(__dirname, '..', 'TeacherDashboard.tsx'), 'utf8');

describe('Teacher HQ first visit — cookie sheet', () => {
  it('cancels the sheet reservation on screens tall enough to fit HQ (important, so it beats the unlayered globals rule)', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('education-shell-scroll').className).toContain(
      '[@media(min-height:501px)]:[html.has-cookie-consent_&]:pb-0!',
    );
  });

  it('keeps the reservation on a phone turned sideways, where the sheet would sit on GO LIVE with no way to scroll it clear', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('education-shell-scroll').className).not.toMatch(/(^|\s)\[html\.has-cookie-consent_&\]:pb-0!/);
  });
});

describe('Teacher HQ first visit — walkthrough never blocks GO LIVE', () => {
  it('mounts the walkthrough as a chip, not an auto-opened modal', () => {
    expect(src).toMatch(/<TeacherOnboarding onDismiss=[\s\S]{0,200}presentation="chip"/);
  });

  it('does not hold the Pro welcome hostage to a walkthrough the teacher never opened', () => {
    expect(src).not.toMatch(/onboardingClear\s*&&\s*\(\s*<ProWelcomeCelebration/);
    expect(src).toMatch(/!walkthroughOpen\s*&&\s*\(\s*<TeacherHqWelcome/);
  });
});
