/**
 * "Some buttons and options blend with the background too much."
 *
 * The dashboard surface is `bg-neo-navy`. A control filled `bg-neo-navy-light`
 * and outlined `border-black` is invisible on it twice over: the fill differs
 * from the page by about 1.2:1 and a black border on navy by about 1.3:1, both
 * far under the 3:1 an edge needs to read as an edge. That is the whole of the
 * user's complaint, and it is measurable — `contrast-check.js` computes exactly
 * those two ratios in the live page.
 *
 * jsdom resolves no Tailwind colours, so these assert the literal class strings
 * that produce them. That is not a proxy for the live check — it is the thing
 * the live check will read, pinned so a later edit cannot quietly re-introduce
 * a navy-on-navy button.
 *
 * Also pinned here: the decision-fatigue rules that landed after this screen
 * was built (one primary action, at most three visible options in a picker row,
 * a pre-selected recommendation), and the Class-5 motion rule — no entrance
 * opacity tween on a large layer.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [{ id: 'c1', name: 'Class 1' }],
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
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div />,
  AssignmentCreator: () => <div />,
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div /> }));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div /> }));
vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div /> }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false, source: null, periodEnd: null, refresh: vi.fn(), grantExpired: false }),
}));
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));

import TeacherDashboard from '../TeacherDashboard';

/** A control reads as a control if its fill OR its border separates from navy. */
const separatesFromNavy = (className: string) =>
  // A solid neo fill is its own edge…
  /\bbg-neo-(lime|pink|cyan|purple|yellow|orange|cream|white|red)\b/.test(className) ||
  // …otherwise a light border must carry it. `border-black` on navy cannot.
  /\bborder-(2|3|4)?-?\s*/.test(className) &&
    /\bborder-neo-(cream|white|lime|cyan|pink|purple)\b/.test(className);

describe('<TeacherDashboard> — every control reads as a control', () => {
  it('gives the three shortcut buttons an edge against the navy surface', () => {
    render(<TeacherDashboard />);
    const shortcuts = screen.getByTestId('teacher-shortcuts');
    const controls = [...shortcuts.querySelectorAll('[data-testid^="shortcut-"]')];
    expect(controls).toHaveLength(3);
    for (const el of controls) {
      const cls = el.className.toString();
      expect(separatesFromNavy(cls), `${el.getAttribute('data-testid')}: ${cls}`).toBe(true);
      // The specific thing the user saw: a black border swallowed by navy.
      expect(cls).not.toMatch(/border-black(?!\/)/);
    }
  });

  it('gives the tools disclosure summary an edge too — a summary is tappable', () => {
    render(<TeacherDashboard />);
    const summary = screen.getByTestId('teacher-tools').querySelector('summary');
    expect(summary).not.toBeNull();
    expect(separatesFromNavy(summary!.className.toString())).toBe(true);
  });
});

describe('<TeacherDashboard> — motion is Class-5 safe', () => {
  it('never tweens the whole content column up from opacity 0', () => {
    // A full-width column fading in promotes a GPU layer the size of the page;
    // on the Chromium mobile renderer that is the flash this repo keeps
    // re-learning about. The resting state must paint on the first frame.
    const src = readFileSync(path.join(ROOT, 'components', 'teacher', 'TeacherDashboard.tsx'), 'utf8');
    expect(src).not.toMatch(/initial="hidden"/);
  });
});

describe('PLAY NOW — no decision fatigue', () => {
  const launcher = readFileSync(
    path.join(ROOT, 'components', 'teacher', 'dashboard', 'PlayNowLauncher.tsx'),
    'utf8',
  );

  it('shows at most three lists in the picker row', () => {
    const limit = launcher.match(/RECENT_LIMIT\s*=\s*(\d+)/);
    expect(limit, 'RECENT_LIMIT must be declared').not.toBeNull();
    expect(Number(limit![1])).toBeLessThanOrEqual(3);
  });

  it('names the pre-armed pick as the recommendation rather than leaving it silent', () => {
    expect(launcher).toMatch(/teacher\.playNow\.recommended/);
  });
});
